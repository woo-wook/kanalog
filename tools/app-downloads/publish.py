#!/usr/bin/env python3
"""Publish an inspected public kana APK, never a personal content build."""
import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import tempfile
import zipfile
from datetime import datetime, timezone
from pathlib import Path

SHARED = Path(__file__).resolve().parents[2] / 'native/shared'
MAX_BYTES = 250 * 1024 * 1024

def verify_apk(apk):
    apk = Path(apk)
    if not 0 < apk.stat().st_size <= MAX_BYTES:
        raise ValueError('Public APK size exceeds limit; rebuild with :app:clean and no private assets')
    expected = {'assets/' + name: SHARED / name for name in
                ('builtin-content.json', 'reading-fixtures.json', 'verb-fixtures.json')}
    with zipfile.ZipFile(apk) as archive:
        entries = archive.infolist()
        names = [i.filename for i in entries]
        if len(set(names)) != len(names) or any('..' in Path(n).parts or n.startswith('/') for n in names):
            raise ValueError('Duplicate or unsafe APK entries')
        assets = [i for i in entries if i.filename.startswith('assets/')]
        if not assets or any(i.filename not in expected or i.file_size > 2 * 1024 * 1024 for i in assets):
            raise ValueError('Private or unsupported APK assets')
        for entry in assets:
            if archive.read(entry) != expected[entry.filename].read_bytes():
                raise ValueError('APK assets differ from public repository fixtures')
        if 'assets/builtin-content.json' not in names:
            raise ValueError('Missing public kana content')
        notes = json.loads(archive.read('assets/builtin-content.json'))['notes']
        if len(notes) != 208 or any(n['kind'] not in ('hiragana', 'katakana') for n in notes):
            raise ValueError('Only 208 builtin kana notes can be published')
    return len(notes)

def publish_artifact(apk, output, version):
    verify_apk(apk)
    output = Path(output).resolve()
    if 'private-data' in output.parts or not re.fullmatch(r'\d+\.\d+\.\d+(?:[-+][a-zA-Z0-9.-]+)?', version):
        raise ValueError('Invalid public destination or version')
    output.mkdir(parents=True, exist_ok=True)
    digest = hashlib.sha256()
    with Path(apk).open('rb') as source:
        for block in iter(lambda: source.read(1024 * 1024), b''):
            digest.update(block)
    sha = digest.hexdigest()
    filename = f'kanalog-android-{sha[:12]}.apk'
    item = {'file': filename, 'version': version, 'bytes': Path(apk).stat().st_size,
            'sha256': sha, 'builtAt': datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z')}
    manifest = {'schemaVersion': 1, 'android': item}
    # Copy into a new file: Android's incremental ZIP can retain removed private bytes.
    with tempfile.NamedTemporaryFile(dir=output, delete=False) as temporary:
        staged = Path(temporary.name)
    try:
        shutil.copyfile(apk, staged)
        staged.chmod(0o644)
        os.replace(staged, output / filename)
    finally:
        staged.unlink(missing_ok=True)
    with tempfile.NamedTemporaryFile(mode='w', dir=output, delete=False) as temporary:
        json.dump(manifest, temporary, indent=2)
        temporary.write('\n')
        staged = Path(temporary.name)
    staged.chmod(0o644)
    os.replace(staged, output / 'manifest.json')
    return manifest

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--apk', type=Path, required=True)
    parser.add_argument('--build-tools', type=Path, required=True)
    parser.add_argument('--output', type=Path, default=Path('public-downloads'))
    args = parser.parse_args()
    verify_apk(args.apk)
    subprocess.run([str(args.build_tools / 'apksigner'), 'verify', str(args.apk)], check=True, capture_output=True)
    badging = subprocess.check_output([str(args.build_tools / 'aapt'), 'dump', 'badging', str(args.apk)], text=True)
    package = re.search(r"package: name='([^']+)' .*versionName='([^']+)'", badging)
    if not package or package[1] != 'com.kanalog.android' or "sdkVersion:'26'" not in badging or 'application-debuggable' not in badging:
        raise ValueError('Unexpected Android package, minimum SDK, or build type')
    manifest = publish_artifact(args.apk, args.output, package[2])
    print(json.dumps(manifest))

if __name__ == '__main__':
    main()
