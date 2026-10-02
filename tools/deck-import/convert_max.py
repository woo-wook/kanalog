#!/usr/bin/env python3
"""Convert the official JLPT MAX v2.1.2 APKG to private JSONL and media.

This tool uses only the Python standard library. It does not execute Anki card
templates, import Anki review history, or write to the application database.
"""

from __future__ import annotations

import argparse
import collections
import hashlib
import html
from html.parser import HTMLParser
import json
import mimetypes
from pathlib import Path, PurePosixPath
import re
import shutil
import sqlite3
import sys
import tempfile
import zipfile


VERSION = "2.1.2"
EXPECTED_SHA256 = "c0898a086a7d440e4081c8a68fcd0c63e678bb345012888d1fc8e5270d762532"
VOCAB_MODEL = "JLPT MAX덱 어휘"
GRAMMAR_MODEL = "JLPT MAX덱 문법"
SOUND = re.compile(r"\[sound:([^\]]+)\]", re.IGNORECASE)
EXAMPLE_SECTION = re.compile(r'<section class="[^"]*\b_j4a\b[^"]*"[^>]*>(.*?)</section>', re.DOTALL)
EXAMPLE_JP = re.compile(r'<div class="[^"]*\b_j48\b[^"]*"[^>]*>(.*?)</div>', re.DOTALL)
EXAMPLE_KO = re.compile(r'<div class="[^"]*\b_j49\b[^"]*"[^>]*>(.*?)</div>', re.DOTALL)
MAX_ARCHIVE_SIZE = 2_000_000_000
MAX_UNCOMPRESSED = 3_000_000_000
MAX_MEMBER = 500_000_000
MAX_MEMBERS = 50_000


class TextOnly(HTMLParser):
    """Render untrusted card HTML as plain text; scripts never enter JSONL."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self.suppressed = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in ("script", "style", "iframe", "object", "svg", "rt"):
            self.suppressed += 1
        elif not self.suppressed and tag in ("br", "p", "div", "li", "tr", "hr", "section"):
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag in ("script", "style", "iframe", "object", "svg", "rt"):
            self.suppressed = max(0, self.suppressed - 1)
        elif not self.suppressed and tag in ("p", "div", "li", "tr", "section"):
            self.parts.append("\n")

    def handle_data(self, data: str) -> None:
        if not self.suppressed:
            self.parts.append(data)


def clean(value: str) -> str:
    parser = TextOnly()
    parser.feed(SOUND.sub("", value))
    parser.close()
    return "\n".join(line.strip() for line in html.unescape("".join(parser.parts)).splitlines() if line.strip())


class MarkedText(TextOnly):
    """Use the existing text sanitizer and retain only the confirmed MAX mark flag."""

    def __init__(self) -> None:
        super().__init__()
        self.marks: list[bool] = []
        self.characters: list[tuple[str, bool]] = []

    def capture(self, previous: int) -> None:
        for part in self.parts[previous:]:
            self.characters.extend((char, any(self.marks)) for char in html.unescape(part))

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "mark":
            self.marks.append(not self.suppressed and "_j4y" in (dict(attrs).get("class") or "").split())
        previous = len(self.parts)
        super().handle_starttag(tag, attrs)
        self.capture(previous)

    def handle_endtag(self, tag: str) -> None:
        if tag == "mark" and self.marks:
            self.marks.pop()
        previous = len(self.parts)
        super().handle_endtag(tag)
        self.capture(previous)

    def handle_data(self, data: str) -> None:
        previous = len(self.parts)
        super().handle_data(data)
        self.capture(previous)


def grammar_focus(raw: str) -> dict | None:
    parser = MarkedText()
    parser.feed(SOUND.sub("", raw))
    parser.close()
    lines: list[list[tuple[str, bool]]] = [[]]
    for char, highlighted in parser.characters:
        if char == "\n":
            lines.append([])
        else:
            lines[-1].append((char, highlighted))
    normalized: list[tuple[str, bool]] = []
    for line in lines:
        start, end = 0, len(line)
        while start < end and line[start][0].isspace():
            start += 1
        while end > start and line[end - 1][0].isspace():
            end -= 1
        if start == end:
            continue
        if normalized:
            normalized.append(("\n", False))
        normalized.extend(line[start:end])
    segments: list[dict] = []
    for char, flag in normalized:
        if segments and segments[-1]["highlighted"] == flag:
            segments[-1]["text"] += char
        else:
            segments.append({"text": char, "highlighted": flag})
    title = " … ".join(part["text"].strip() for part in segments if part["highlighted"] and part["text"].strip())
    if not title or "".join(part["text"] for part in segments) != clean(raw):
        return None
    return {"title": title, "segments": segments}


def safe_name(value: str) -> str:
    if not value or value in (".", "..") or "\x00" in value or "\\" in value:
        raise ValueError("unsafe media filename")
    path = PurePosixPath(value)
    if path.is_absolute() or len(path.parts) != 1 or path.name != value:
        raise ValueError("unsafe media filename")
    return value


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def validate_archive(path: Path, verify_hash: bool) -> zipfile.ZipFile:
    if not path.is_file() or path.stat().st_size > MAX_ARCHIVE_SIZE:
        raise ValueError("APKG missing or exceeds 2 GB limit")
    if verify_hash and sha256(path) != EXPECTED_SHA256:
        raise ValueError("official v2.1.2 SHA-256 mismatch")
    archive = zipfile.ZipFile(path)
    infos = archive.infolist()
    if len(infos) > MAX_MEMBERS or sum(i.file_size for i in infos) > MAX_UNCOMPRESSED:
        archive.close()
        raise ValueError("archive entry count or expanded size limit exceeded")
    seen: set[str] = set()
    for info in infos:
        if info.file_size > MAX_MEMBER:
            archive.close()
            raise ValueError("archive member size limit exceeded")
        name = safe_name(info.filename)
        if name in seen:
            archive.close()
            raise ValueError("duplicate archive filename")
        seen.add(name)
    if "collection.anki21" not in seen or "media" not in seen:
        archive.close()
        raise ValueError("unsupported APKG schema: collection.anki21 and media required")
    return archive


def fields_for(raw: str, field_names: list[str]) -> dict[str, str]:
    values = raw.split("\x1f")
    if len(values) != len(field_names):
        raise ValueError("note field count differs from note type")
    return dict(zip(field_names, values))


def first_sound(value: str) -> str | None:
    match = SOUND.search(value)
    if match:
        return safe_name(match.group(1))
    class AudioSource(HTMLParser):
        def __init__(self) -> None:
            super().__init__()
            self.source: str | None = None

        def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
            if tag in ("audio", "source") and self.source is None:
                self.source = dict(attrs).get("src")

    audio = AudioSource()
    audio.feed(value)
    return safe_name(audio.source) if audio.source else None


def rendered_examples(value: str) -> list[dict[str, str | None]]:
    examples = []
    for section in EXAMPLE_SECTION.findall(value):
        japanese = EXAMPLE_JP.search(section)
        korean = EXAMPLE_KO.search(section)
        if japanese and clean(japanese.group(1)):
            examples.append({"japanese": clean(japanese.group(1)), "reading": "",
                             "korean": clean(korean.group(1)) if korean else "",
                             "audio": first_sound(section)})
    return examples


def write_jsonl(stream, value: dict) -> None:
    stream.write(json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("apkg", type=Path)
    parser.add_argument("output", type=Path, help="private output directory, outside Git and Docker context")
    parser.add_argument("--scope", choices=("n5", "vocabulary-and-grammar"), default="n5")
    parser.add_argument("--skip-hash", action="store_true", help="for synthetic fixtures only")
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    report_path = args.output / "report.json"
    report_path.unlink(missing_ok=True)
    with validate_archive(args.apkg, not args.skip_hash) as archive, tempfile.TemporaryDirectory(prefix="max-import-") as temp:
        db_path = Path(temp) / "collection.anki21"
        with archive.open("collection.anki21") as source, db_path.open("wb") as target:
            shutil.copyfileobj(source, target, 1024 * 1024)
        manifest = json.loads(archive.read("media"))
        if not isinstance(manifest, dict):
            raise ValueError("invalid media manifest")
        archive_names = set(archive.namelist())
        for member, filename in manifest.items():
            safe_name(member)
            safe_name(filename)
            if member not in archive_names:
                raise ValueError("media manifest references absent archive member")
        by_filename = {filename: member for member, filename in manifest.items()}
        if len(by_filename) != len(manifest):
            raise ValueError("duplicate media filename")
        db = sqlite3.connect(str(db_path))
        db.create_collation("unicase", lambda a, b: (a.casefold() > b.casefold()) - (a.casefold() < b.casefold()))
        model_names = dict(db.execute("select id,name from notetypes"))
        if VOCAB_MODEL not in model_names.values() or GRAMMAR_MODEL not in model_names.values():
            raise ValueError("unsupported JLPT MAX note types")
        field_names: dict[int, list[str]] = collections.defaultdict(list)
        for model_id, _, name in db.execute("select ntid,ord,name from fields order by ntid,ord"):
            field_names[model_id].append(name)
        deck_names = {deck_id: name.replace("\x1f", "::") for deck_id, name in db.execute("select id,name from decks")}
        report: dict = {
            "source": "JLPT MAX Deck", "version": VERSION, "sha256": sha256(args.apkg),
            "sourceNotes": db.execute("select count(*) from notes").fetchone()[0],
            "sourceCards": db.execute("select count(*) from cards").fetchone()[0],
            "sourceMedia": len(manifest), "scope": args.scope,
            "convertedCards": 0, "convertedByDeck": {}, "excludedByReason": {},
            "mediaExtracted": 0, "missingMediaReferences": 0,
            "grammarHighlights": 0, "grammarHighlightUnavailable": 0,
        }
        by_deck = collections.Counter()
        excluded = collections.Counter()
        needed_media: set[str] = set()
        notes_path = args.output / "notes.jsonl"
        with notes_path.open("w", encoding="utf-8") as out:
            rows = db.execute("select c.id,c.nid,c.did,c.ord,n.guid,n.mid,n.flds,n.tags from cards c join notes n on n.id=c.nid order by c.id")
            for card_id, note_id, deck_id, ordinal, guid, model_id, raw_fields, raw_tags in rows:
                model = model_names[model_id]
                deck = deck_names.get(deck_id, "")
                parts = deck.split("::")
                if model not in (VOCAB_MODEL, GRAMMAR_MODEL):
                    excluded["unsupported-note-type"] += 1
                    continue
                if ordinal != 0:
                    excluded["unsupported-card-direction"] += 1
                    continue
                if len(parts) < 3 or parts[1] not in ("어휘", "문법") or not re.fullmatch(r"N[1-5]", parts[2]):
                    excluded["outside-learning-decks"] += 1
                    continue
                if args.scope == "n5" and parts[2] != "N5":
                    excluded["outside-selected-level"] += 1
                    continue
                try:
                    fields = fields_for(raw_fields, field_names[model_id])
                    level = parts[2]
                    if model == VOCAB_MODEL:
                        if parts[1] != "어휘":
                            raise ValueError("model-deck-mismatch")
                        word = clean(fields["Word"])
                        reading = clean(fields["Reading"])
                        meaning = clean(fields["Meaning"])
                        if not (word and reading and meaning):
                            raise ValueError("missing-required-vocabulary-field")
                        examples = rendered_examples(fields.get("ExamplesRendered", ""))
                        if not examples:
                            for number in range(1, 6):
                                jp = clean(fields.get(f"Example{number}JP", ""))
                                if jp:
                                    examples.append({"japanese": jp, "reading": clean(fields.get(f"Example{number}Reading", "")),
                                                     "korean": clean(fields.get(f"Example{number}KO", "")),
                                                     "audio": first_sound(fields.get(f"Example{number}Audio", ""))})
                        for example in examples:
                            if example["audio"]:
                                needed_media.add(example["audio"])
                        word_audio = first_sound(fields.get("WordAudio", "")) or first_sound(fields.get("WordAudioFile", ""))
                        if word_audio:
                            needed_media.add(word_audio)
                        record = {"schemaVersion": 1, "sourceVersion": VERSION, "sourceNoteId": note_id,
                                  "sourceGuid": guid, "sourceCardId": card_id, "cardDirection": "recognition",
                                  "deckPath": deck, "kind": "vocabulary", "level": level,
                                  "front": word, "reading": reading, "meaning": meaning,
                                  "partOfSpeech": clean(fields.get("PartOfSpeech", "")), "examples": examples,
                                  "wordAudio": word_audio, "tags": raw_tags.strip().split()}
                    else:
                        if parts[1] != "문법":
                            raise ValueError("model-deck-mismatch")
                        front = clean(fields["FrontHTML"])
                        back = clean(fields["BackHTML"])
                        if not (front and back):
                            raise ValueError("missing-required-grammar-field")
                        focus = grammar_focus(fields["FrontHTML"])
                        report["grammarHighlights" if focus else "grammarHighlightUnavailable"] += 1
                        for field in (fields["FrontHTML"], fields["BackHTML"]):
                            needed_media.update(safe_name(name) for name in SOUND.findall(field))
                        record = {"schemaVersion": 1, "sourceVersion": VERSION, "sourceNoteId": note_id,
                                  "sourceGuid": guid, "sourceCardId": card_id, "cardDirection": "recall",
                                  "deckPath": deck, "kind": "grammar", "level": level,
                                  "front": front, "answer": back, "grammarKind": clean(fields.get("Kind", "")),
                                  "unitId": clean(fields.get("UnitID", "")), "tags": raw_tags.strip().split(),
                                  "grammarFocus": focus}
                    write_jsonl(out, record)
                    by_deck[deck] += 1
                except (KeyError, ValueError) as error:
                    excluded[str(error)] += 1
        media_dir = args.output / "media"
        media_dir.mkdir(exist_ok=True)
        with (args.output / "media.jsonl").open("w", encoding="utf-8") as out:
            for filename in sorted(needed_media):
                member = by_filename.get(filename)
                if member is None:
                    report["missingMediaReferences"] += 1
                    continue
                destination = media_dir / filename
                digest = hashlib.sha256()
                with archive.open(member) as source, destination.open("wb") as target:
                    for chunk in iter(lambda: source.read(1024 * 1024), b""):
                        digest.update(chunk)
                        target.write(chunk)
                write_jsonl(out, {"name": filename, "path": f"media/{filename}", "sha256": digest.hexdigest(), "contentType": mimetypes.guess_type(filename)[0] or "application/octet-stream"})
                report["mediaExtracted"] += 1
        report["convertedCards"] = sum(by_deck.values())
        report["convertedByDeck"] = dict(sorted(by_deck.items()))
        report["excludedByReason"] = dict(sorted(excluded.items()))
        report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        db.close()
    print(json.dumps({"convertedCards": report["convertedCards"], "mediaExtracted": report["mediaExtracted"], "missingMediaReferences": report["missingMediaReferences"]}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, sqlite3.Error, zipfile.BadZipFile, json.JSONDecodeError) as error:
        print(f"MAX conversion failed: {error}", file=sys.stderr)
        raise SystemExit(1)
