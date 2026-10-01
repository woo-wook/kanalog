#!/usr/bin/env python3
"""Check a private MAX conversion's counts, references, and copied media."""

from __future__ import annotations

import argparse
import collections
import hashlib
import json
from pathlib import Path


def read_lines(path: Path):
    with path.open(encoding="utf-8") as file:
        for number, line in enumerate(file, 1):
            try:
                yield json.loads(line)
            except json.JSONDecodeError as error:
                raise ValueError(f"{path.name} line {number}: invalid JSON") from error


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path)
    args = parser.parse_args()
    root = args.directory
    report = json.loads((root / "report.json").read_text(encoding="utf-8"))
    cards = list(read_lines(root / "notes.jsonl"))
    media = list(read_lines(root / "media.jsonl"))
    keys = [(card["sourceGuid"], card["cardDirection"]) for card in cards]
    assert len(keys) == len(set(keys)), "duplicate GUID/direction"
    by_deck = dict(sorted(collections.Counter(card["deckPath"] for card in cards).items()))
    assert len(cards) == report["convertedCards"], "converted card count mismatch"
    assert by_deck == report["convertedByDeck"], "deck counts mismatch"
    assert report["sourceCards"] == len(cards) + sum(report["excludedByReason"].values()), "source card reconciliation failed"
    names = {item["name"] for item in media}
    assert len(names) == len(media) == report["mediaExtracted"], "duplicate or mismatched media"
    references = set()
    for card in cards:
        if card["kind"] == "vocabulary":
            if card["wordAudio"]:
                references.add(card["wordAudio"])
            references.update(example["audio"] for example in card["examples"] if example["audio"])
    if report["missingMediaReferences"] == 0:
        assert not references - names, "unresolved media references"
    for item in media:
        file = Path(item["path"])
        if not file.is_absolute():
            file = root / file
        assert file.is_file() and file.resolve().parent == (root / "media").resolve(), "media path escaped output"
        checksum = hashlib.sha256()
        with file.open("rb") as stream:
            for block in iter(lambda: stream.read(1024 * 1024), b""):
                checksum.update(block)
        assert checksum.hexdigest() == item["sha256"], "media checksum mismatch"
    print(json.dumps({"cards": len(cards), "media": len(media), "decks": by_deck}, ensure_ascii=False))


if __name__ == "__main__":
    main()
