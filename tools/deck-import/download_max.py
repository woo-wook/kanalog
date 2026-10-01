#!/usr/bin/env python3
"""Download the official personal-study JLPT MAX v2.1.2 asset to private storage."""

from __future__ import annotations

import argparse
import hashlib
import os
from pathlib import Path
import shutil
import sys
import urllib.request

URL = "https://github.com/truthyblue/jlpt-max-deck/releases/download/v2.1.2/JLPT-MAX-Deck-2.1.2.apkg"
NAME = "JLPT-MAX-Deck-2.1.2.apkg"
SIZE = 1_170_026_932
SHA256 = "c0898a086a7d440e4081c8a68fcd0c63e678bb345012888d1fc8e5270d762532"


def digest(path: Path) -> str:
    value = hashlib.sha256()
    with path.open("rb") as file:
        for block in iter(lambda: file.read(1024 * 1024), b""):
            value.update(block)
    return value.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path, help="private directory outside Git and Docker build context")
    args = parser.parse_args()
    args.directory.mkdir(parents=True, exist_ok=True)
    destination = args.directory / NAME
    if destination.exists():
        if destination.stat().st_size == SIZE and digest(destination) == SHA256:
            print(f"Already verified: {destination}")
            return 0
        raise ValueError("existing APKG differs from the official release; move it manually before retrying")
    free = shutil.disk_usage(args.directory).free
    if free < SIZE * 2:
        raise ValueError("at least twice the APKG size of free disk space is required")
    partial = destination.with_suffix(".apkg.part")
    if partial.exists():
        raise ValueError("partial download exists; remove it after inspecting the failed attempt")
    count = 0
    checksum = hashlib.sha256()
    try:
        with urllib.request.urlopen(URL, timeout=60) as response, partial.open("xb") as output:
            if response.status != 200:
                raise ValueError(f"unexpected HTTP status {response.status}")
            advertised = response.headers.get("Content-Length")
            if advertised and int(advertised) != SIZE:
                raise ValueError("release size differs from pinned v2.1.2")
            while block := response.read(1024 * 1024):
                count += len(block)
                if count > SIZE:
                    raise ValueError("download exceeds pinned size")
                checksum.update(block)
                output.write(block)
            output.flush()
            os.fsync(output.fileno())
        if count != SIZE or checksum.hexdigest() != SHA256:
            raise ValueError("downloaded file size or SHA-256 differs from official release")
        partial.replace(destination)
    except Exception:
        partial.unlink(missing_ok=True)
        raise
    print(f"Verified: {destination} ({count} bytes, SHA-256 {SHA256})")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError) as error:
        print(f"MAX download failed: {error}", file=sys.stderr)
        raise SystemExit(1)
