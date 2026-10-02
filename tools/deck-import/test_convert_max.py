"""Synthetic APKG regression tests; no JLPT MAX content is embedded here."""

from __future__ import annotations

import json
from pathlib import Path
import sqlite3
import subprocess
import sys
import tempfile
import unittest
import zipfile
import convert_max


SCRIPT = Path(__file__).with_name("convert_max.py")
VOCAB_FIELDS = ("Word", "Reading", "Meaning", "PartOfSpeech", "WordAudioFile", "ExamplesRendered")
GRAMMAR_FIELDS = ("FrontHTML", "BackHTML", "Kind", "UnitID")


def synthetic_database(path: Path, *, missing_meaning: bool = False, short_fields: bool = False) -> None:
    database = sqlite3.connect(path)
    database.executescript("""
        create table notetypes (id integer primary key, name text not null);
        create table fields (ntid integer not null, ord integer not null, name text not null);
        create table decks (id integer primary key, name text not null);
        create table notes (id integer primary key, guid text not null, mid integer not null,
                            flds text not null, tags text not null);
        create table cards (id integer primary key, nid integer not null, did integer not null,
                            ord integer not null);
    """)
    database.executemany("insert into notetypes values (?,?)", [
        (1, "JLPT MAX덱 어휘"), (2, "JLPT MAX덱 문법")])
    database.executemany("insert into fields values (?,?,?)", [
        (model, ordinal, name)
        for model, names in ((1, VOCAB_FIELDS), (2, GRAMMAR_FIELDS))
        for ordinal, name in enumerate(names)
    ])
    database.executemany("insert into decks values (?,?)", [
        (10, "JLPT MAX덱\x1f어휘\x1fN5"), (20, "JLPT MAX덱\x1f문법\x1fN5")])
    example = (
        '<section class="_j4a audio-scope">'
        '<div class="_j48" lang="ja">例<ruby><rb>文</rb><rt>ぶん</rt></ruby></div>'
        '<audio src="example.mp3"></audio>'
        '<div class="_j49">예문</div></section>'
    )
    vocabulary = [
        "試験", "しけん", "" if missing_meaning else "시험",
        "명사", '<audio src="word.mp3"></audio>', example,
    ]
    if short_fields:
        vocabulary.pop()
    grammar = [
        '<div>질문</div><script>stealSecret()</script>',
        '<div>정답 <b>설명</b></div><img src="x" onerror="stealSecret()">',
        "기초", "synthetic-unit",
    ]
    database.executemany("insert into notes values (?,?,?,?,?)", [
        (100, "synthetic-vocabulary", 1, "\x1f".join(vocabulary), " test "),
        (200, "synthetic-grammar", 2, "\x1f".join(grammar), " test "),
    ])
    database.executemany("insert into cards values (?,?,?,?)", [
        (1000, 100, 10, 0), (2000, 200, 20, 0)])
    database.commit()
    database.close()


def synthetic_apkg(
    root: Path, *, missing_meaning: bool = False, short_fields: bool = False,
    missing_media: bool = False, unsafe_entry: bool = False,
    unsafe_media_name: bool = False, old_schema: bool = False,
    unmapped_media: bool = False,
) -> Path:
    database = root / "fixture.sqlite"
    synthetic_database(database, missing_meaning=missing_meaning, short_fields=short_fields)
    archive = root / "fixture.apkg"
    manifest = {"0": "word.mp3"}
    if not unmapped_media:
        manifest["1"] = "../outside.mp3" if unsafe_media_name else "example.mp3"
    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as output:
        output.write(database, "collection.anki2" if old_schema else "collection.anki21")
        output.writestr("media", json.dumps(manifest))
        output.writestr("0", b"synthetic word audio")
        if not missing_media:
            output.writestr("1", b"synthetic example audio")
        if unsafe_entry:
            output.writestr("../outside.txt", b"must never escape")
    return archive


class ConvertMaxTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory(prefix="synthetic-max-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.output = self.root / "converted"

    def convert(self, **options) -> subprocess.CompletedProcess[str]:
        archive = synthetic_apkg(self.root, **options)
        return subprocess.run(
            [sys.executable, str(SCRIPT), str(archive), str(self.output), "--skip-hash"],
            capture_output=True, text=True, check=False,
        )

    def report(self) -> dict:
        return json.loads((self.output / "report.json").read_text(encoding="utf-8"))

    def records(self) -> list[dict]:
        return [json.loads(line) for line in (self.output / "notes.jsonl").read_text(encoding="utf-8").splitlines()]

    def test_safe_content_and_media_are_converted(self) -> None:
        result = self.convert()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.report()["convertedCards"], 2)
        self.assertEqual(self.report()["mediaExtracted"], 2)
        records = self.records()
        self.assertEqual({record["kind"] for record in records}, {"vocabulary", "grammar"})
        vocabulary = next(record for record in records if record["kind"] == "vocabulary")
        grammar = next(record for record in records if record["kind"] == "grammar")
        self.assertEqual(vocabulary["examples"][0]["japanese"], "例文")
        self.assertEqual(vocabulary["examples"][0]["audio"], "example.mp3")
        self.assertNotIn("stealSecret", json.dumps(records, ensure_ascii=False))
        self.assertNotIn("onerror", json.dumps(records, ensure_ascii=False))
        self.assertEqual(grammar["front"], "질문")
        self.assertTrue((self.output / "media" / "word.mp3").is_file())

    def test_grammar_marks_keep_exact_occurrence_and_remove_ruby_scripts(self) -> None:
        raw = '<section class="_j4t"><div>この本は<mark class="_j4y"><ruby>この<rt>ignored</rt></ruby><script>stealSecret()</script></mark>人のです。</div></section>'
        focus = convert_max.grammar_focus(raw)
        self.assertEqual(focus, {"title": "この", "segments": [
            {"text": "この本は", "highlighted": False},
            {"text": "この", "highlighted": True},
            {"text": "人のです。", "highlighted": False},
        ]})
        self.assertEqual(''.join(part['text'] for part in focus['segments']), convert_max.clean(raw))
        self.assertIsNone(convert_max.grammar_focus('<p>Unknown plain sentence</p>'))

    def test_zip_path_traversal_is_rejected(self) -> None:
        result = self.convert(unsafe_entry=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("unsafe media filename", result.stderr)
        self.assertFalse((self.root / "outside.txt").exists())
        self.assertFalse((self.output / "report.json").exists())

    def test_manifest_path_traversal_is_rejected(self) -> None:
        result = self.convert(unsafe_media_name=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("unsafe media filename", result.stderr)
        self.assertFalse((self.root / "outside.mp3").exists())

    def test_missing_required_field_is_reported(self) -> None:
        result = self.convert(missing_meaning=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.report()["convertedCards"], 1)
        self.assertEqual(self.report()["excludedByReason"]["missing-required-vocabulary-field"], 1)

    def test_field_count_mismatch_is_reported(self) -> None:
        result = self.convert(short_fields=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.report()["convertedCards"], 1)
        self.assertEqual(self.report()["excludedByReason"]["note field count differs from note type"], 1)

    def test_missing_media_member_is_rejected(self) -> None:
        result = self.convert(missing_media=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("media manifest references absent archive member", result.stderr)
        self.assertFalse((self.output / "report.json").exists())

    def test_unmapped_media_reference_is_reported(self) -> None:
        result = self.convert(unmapped_media=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.report()["missingMediaReferences"], 1)
        self.assertEqual(self.report()["mediaExtracted"], 1)

    def test_unsupported_collection_schema_is_rejected(self) -> None:
        result = self.convert(old_schema=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("unsupported APKG schema", result.stderr)
        self.assertFalse((self.output / "report.json").exists())


if __name__ == "__main__":
    unittest.main()
