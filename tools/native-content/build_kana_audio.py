#!/usr/bin/env python3
"""Prepare private prerecorded kana using the existing local Supertonic calculator.

This is a build-time operation. The resulting apps play files without this service.
"""
import argparse
import hashlib
import io
import json
import struct
import urllib.request
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def checked_wave(data):
    if len(data) > 8 * 1024 * 1024:
        raise ValueError("Oversized generated audio")
    with wave.open(io.BytesIO(data)) as stream:
        if stream.getsampwidth() != 2 or stream.getnchannels() != 1 or stream.getnframes() == 0:
            raise ValueError("Unsupported waveform")
        samples = stream.readframes(stream.getnframes())
        if max(abs(x[0]) for x in struct.iter_unpack("<h", samples)) < 32:
            raise ValueError("Silent waveform")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8091)
    parser.add_argument("--output", type=Path, default=ROOT / "private-data/native/kana-audio")
    args = parser.parse_args()
    output = args.output.resolve()
    if (ROOT / "private-data").resolve() not in output.parents or not 1024 <= args.port <= 65535:
        parser.error("Use a private output directory and a local port")
    output.mkdir(parents=True, exist_ok=True)
    notes = json.loads((ROOT / "native/shared/builtin-content.json").read_text(encoding="utf-8"))["notes"]
    results = {}
    for note in notes:
        if note["kind"] != "hiragana":
            continue
        key = hashlib.sha256(note["front"].encode()).hexdigest()
        path = output / (key + ".wav")
        if path.exists():
            data = path.read_bytes()
        else:
            request = urllib.request.Request("http://127.0.0.1:%d/synthesize" % args.port,
                                             data=json.dumps({"text": note["front"], "voice": "F1"}).encode(),
                                             headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(request, timeout=60) as response:
                data = response.read(8 * 1024 * 1024 + 1)
            checked_wave(data)
            path.write_bytes(data)
        checked_wave(data)
        results[note["id"].split(":", 1)[1]] = {"path": path.name, "sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data)}
    (output / "index.json").write_text(json.dumps(results, ensure_ascii=False), encoding="utf-8")
    print(json.dumps({"kanaRecordings": len(results), "engine": "Supertonic 3", "voice": "F1"}))


if __name__ == "__main__":
    main()
