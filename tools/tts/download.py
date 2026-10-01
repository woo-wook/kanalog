#!/usr/bin/env python3
"""Fetch the fixed official Supertonic 3 assets, without adding models to Git/images."""
import argparse
import hashlib
import json
import shutil
import urllib.request
from pathlib import Path

REPOSITORY = "supertone-oss-archive/supertonic-3"
REVISION = "aafc6e32416a594460b32413efc49d7fe4ce6d46"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path("private-data/supertonic/models"))
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    if shutil.disk_usage(args.output).free < 600 * 1024 * 1024:
        raise SystemExit("At least 600 MiB of free space is required")
    files = []
    for folder in ("onnx", "voice_styles"):
        with urllib.request.urlopen(f"https://huggingface.co/api/models/{REPOSITORY}/tree/{REVISION}/{folder}", timeout=60) as response:
            files.extend(json.load(response))
    report = []
    for item in files:
        name, size = item["path"], item["size"]
        expected = item.get("lfs", {}).get("oid")
        target = args.output / name
        target.parent.mkdir(parents=True, exist_ok=True)
        if not target.exists() or target.stat().st_size != size:
            temporary = target.with_suffix(target.suffix + ".part")
            with urllib.request.urlopen(f"https://huggingface.co/{REPOSITORY}/resolve/{REVISION}/{name}", timeout=120) as response, temporary.open("wb") as output:
                shutil.copyfileobj(response, output, length=1024 * 1024)
            if temporary.stat().st_size != size:
                temporary.unlink()
                raise SystemExit(f"Size mismatch: {name}")
            temporary.replace(target)
        digest = hashlib.sha256()
        with target.open("rb") as source:
            for chunk in iter(lambda: source.read(1024 * 1024), b""):
                digest.update(chunk)
        checksum = digest.hexdigest()
        if expected and checksum != expected:
            target.unlink()
            raise SystemExit(f"Checksum mismatch: {name}")
        report.append({"path": name, "bytes": size, "sha256": checksum})
        print(f"Verified {name}: {size:,} bytes", flush=True)
    (args.output / "manifest.json").write_text(json.dumps({"repository": REPOSITORY, "revision": REVISION, "files": report}, indent=2) + "\n")
    print(f"Ready: {sum(f['bytes'] for f in report):,} bytes")


if __name__ == "__main__":
    main()
