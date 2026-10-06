#!/usr/bin/env python3
"""Verify private package contract without logging Japanese content."""
import argparse
import hashlib
import json
import re
from collections import Counter
from pathlib import Path


def verify(directory):
    root = directory.resolve()
    manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
    if manifest["schemaVersion"] != 1 or len(manifest["files"]) > 60000:
        raise ValueError("Unsupported manifest")
    files = {}
    for entry in manifest["files"]:
        path = entry["path"]
        if path != "personal-content.json" and not re.fullmatch(r"media/[a-f0-9]{64}\.(mp3|wav|ogg|m4a|aac)", path):
            raise ValueError("Unsafe manifest path")
        target = root / path
        if path in files or target.is_symlink() or root not in target.resolve().parents:
            raise ValueError("Duplicate or escaping manifest path")
        if entry["bytes"] != target.stat().st_size or not 0 <= entry["bytes"] <= 64 * 1024 * 1024:
            raise ValueError("Size mismatch")
        sha = hashlib.sha256()
        with target.open("rb") as stream:
            for chunk in iter(lambda: stream.read(1048576), b""):
                sha.update(chunk)
        if sha.hexdigest() != entry["sha256"]:
            raise ValueError("Checksum mismatch")
        if path.startswith("media/") and Path(path).stem != sha.hexdigest():
            raise ValueError("Non-addressed media")
        files[path] = entry
    package = json.loads((root / "personal-content.json").read_text(encoding="utf-8"))
    if package["schemaVersion"] != 1 or any(package[k] != manifest[k] for k in ["packageId", "version"]):
        raise ValueError("Package identity mismatch")
    notes = package["notes"]
    if len(notes) > 30000 or len({n["id"] for n in notes}) != len(notes):
        raise ValueError("Duplicate notes")
    referenced = set()
    for note in notes:
        for item, field in [(note, "front")] + [(e, "japanese") for e in note.get("examples", [])]:
            if item.get("audio"):
                if item["audio"] not in files:
                    raise ValueError("Missing referenced audio")
                referenced.add(item["audio"])
            guide = item.get("readingGuide")
            if guide and "".join(s["text"] for s in guide["segments"]) != item[field]:
                raise ValueError("Reading guide mismatch")
        focus = note.get("grammarFocus")
        if focus and "".join(s["text"] for s in focus["segments"]) != note["front"]:
            raise ValueError("Highlight mismatch")
    return {"version": package["version"], "notes": len(notes), "audioFiles": len(referenced),
            "grammarHighlights": sum(bool(n.get("grammarFocus")) for n in notes),
            "kinds": dict(Counter(n["kind"] for n in notes))}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path)
    print(json.dumps(verify(parser.parse_args().directory), ensure_ascii=False))
