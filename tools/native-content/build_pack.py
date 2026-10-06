#!/usr/bin/env python3
"""Offline MAX -> private Android/iOS package. Never connects to an app server."""
import argparse
import hashlib
import json
import os
import shutil
import subprocess
import tempfile
from collections import Counter
from pathlib import Path

REPOSITORY = Path(__file__).resolve().parents[2]


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def link_or_copy(source, target):
    target.parent.mkdir(parents=True, exist_ok=True)
    try:
        os.link(source, target)
    except OSError:
        shutil.copy2(source, target)


def prepare_media(source, output):
    mapping = {}
    root = source.resolve()
    with (source / "media.jsonl").open(encoding="utf-8") as stream:
        for line in stream:
            entry = json.loads(line)
            relative = Path(entry["path"])
            if relative.is_absolute() or ".." in relative.parts or not relative.parts or relative.parts[0] != "media":
                raise ValueError("Unsafe media path")
            origin = (source / relative).resolve()
            if root not in origin.parents or not origin.is_file() or origin.stat().st_size > 64 * 1024 * 1024:
                raise ValueError("Missing or oversized media")
            digest = sha256(origin)
            if digest != entry["sha256"]:
                raise ValueError("Media checksum mismatch")
            suffix = relative.suffix.lower()
            if suffix not in {".mp3", ".wav", ".ogg", ".m4a", ".aac"}:
                continue  # Images are outside native audio package scope.
            audio = "media/" + digest + suffix
            target = output / audio
            if not target.exists():
                link_or_copy(origin, target)
            previous = mapping.setdefault(entry["name"], audio)
            if previous != audio:
                raise ValueError("Conflicting original media names")
    return mapping


def write_manifest(output, package):
    references = set()
    for note in package["notes"]:
        if note.get("audio"):
            references.add(note["audio"])
        references.update(e["audio"] for e in note.get("examples", []) if e.get("audio"))
    for unused in (output / "media").glob("*"):
        if unused.relative_to(output).as_posix() not in references:
            unused.unlink()
    paths = ["personal-content.json"] + sorted(references)
    files = [{"path": p, "sha256": sha256(output / p), "bytes": (output / p).stat().st_size} for p in paths]
    manifest = {"schemaVersion": 1, "packageId": package["packageId"], "version": package["version"], "files": files}
    (output / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False), encoding="utf-8")
    return files


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=REPOSITORY / "private-data/converted/all")
    parser.add_argument("--output", type=Path, default=REPOSITORY / "private-data/native")
    parser.add_argument("--kana-audio-dir", type=Path, help="Optional private generated kana recordings")
    args = parser.parse_args()
    source, target = args.source.resolve(), args.output.resolve()
    private = (REPOSITORY / "private-data").resolve()
    if private not in target.parents:
        parser.error("Output must stay under private-data")
    target.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="native-stage-", dir=target) as temp:
        stage = Path(temp)
        mapping = prepare_media(source, stage)
        map_file = stage / "media-map.json"
        map_file.write_text(json.dumps(mapping), encoding="utf-8")
        subprocess.run([
            str(REPOSITORY / "backend/gradlew"), "nativeExport", "--console=plain",
            "-PnativeOutput=" + str(stage / "personal-content.json"),
            "-PnativeInput=" + str(source / "notes.jsonl"),
            "-PnativeMediaMap=" + str(map_file),
        ], cwd=REPOSITORY / "backend", check=True)
        package = json.loads((stage / "personal-content.json").read_text(encoding="utf-8"))
        source_report = json.loads((source / "report.json").read_text(encoding="utf-8"))
        package["version"] = source_report["version"]
        if args.kana_audio_dir:
            kana_root = args.kana_audio_dir.resolve()
            if private not in kana_root.parents:
                parser.error("Kana audio must stay under private-data")
            index = json.loads((kana_root / "index.json").read_text(encoding="utf-8"))
            kana = json.loads((REPOSITORY / "native/shared/builtin-content.json").read_text(encoding="utf-8"))
            for note in kana["notes"]:
                clip = index[note["id"].split(":", 1)[1]]
                origin = (kana_root / clip["path"]).resolve()
                if kana_root not in origin.parents or sha256(origin) != clip["sha256"]:
                    raise ValueError("Invalid private kana recording")
                note["audio"] = "media/" + clip["sha256"] + ".wav"
                if not (stage / note["audio"]).exists():
                    link_or_copy(origin, stage / note["audio"])
            package["notes"].extend(kana["notes"])
            package["version"] += "+kana-audio1"
        (stage / "personal-content.json").write_text(json.dumps(package, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        map_file.unlink()
        files = write_manifest(stage, package)
        counts = Counter((n["kind"], n.get("level")) for n in package["notes"])
        report = {"sourceVersion": source_report["version"], "sourceSha256": source_report["sha256"],
                  "notes": len(package["notes"]), "audioFiles": len(files) - 1,
                  "bytes": sum(f["bytes"] for f in files),
                  "counts": {str(k): v for k, v in sorted(counts.items(), key=lambda x: str(x[0]))}}
        for platform in ("android", "ios"):
            destination = target / platform
            candidate = target / (platform + ".next")
            if candidate.exists():
                shutil.rmtree(candidate)
            shutil.copytree(stage, candidate, copy_function=lambda a, b: link_or_copy(Path(a), Path(b)))
            old = target / (platform + ".previous")
            if old.exists():
                shutil.rmtree(old)
            if destination.exists():
                destination.rename(old)
            candidate.rename(destination)
            if old.exists():
                shutil.rmtree(old)
        (target / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(json.dumps(report, ensure_ascii=False))


if __name__ == "__main__":
    main()
