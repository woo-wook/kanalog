import json
import tempfile
import unittest
import zipfile
from pathlib import Path
from publish import verify_apk, publish_artifact

SHARED = Path(__file__).resolve().parents[2] / 'native/shared'

class PublishTest(unittest.TestCase):
    def make_apk(self, directory, extra=None):
        apk = Path(directory) / 'synthetic.apk'
        with zipfile.ZipFile(apk, 'w') as archive:
            for name in ('builtin-content.json', 'reading-fixtures.json', 'verb-fixtures.json'):
                archive.writestr('assets/' + name, (SHARED / name).read_bytes())
            if extra:
                archive.writestr(*extra)
        return apk

    def test_accepts_only_the_public_builtin_assets(self):
        with tempfile.TemporaryDirectory() as directory:
            apk = self.make_apk(directory)
            self.assertEqual(verify_apk(apk), 208)

    def test_rejects_personal_media_or_content_even_with_valid_builtin(self):
        with tempfile.TemporaryDirectory() as directory:
            for entry in ('assets/personal-content.json', 'assets/media/synthetic.mp3', '../private-data/notes.jsonl'):
                with self.subTest(entry=entry), self.assertRaises(ValueError):
                    verify_apk(self.make_apk(directory, (entry, '{}')))

    def test_rejects_a_modified_builtin(self):
        with tempfile.TemporaryDirectory() as directory:
            apk = Path(directory) / 'changed.apk'
            with zipfile.ZipFile(apk, 'w') as archive:
                archive.writestr('assets/builtin-content.json', json.dumps({'notes': []}))
            with self.assertRaises(ValueError):
                verify_apk(apk)

    def test_publishes_actual_size_hash_and_refuses_private_destination(self):
        with tempfile.TemporaryDirectory() as directory:
            apk = self.make_apk(directory)
            root = Path(directory) / 'public-downloads'
            manifest = publish_artifact(apk, root, '1.0.0')
            item = manifest['android']
            self.assertEqual(item['bytes'], apk.stat().st_size)
            self.assertEqual((root / item['file']).read_bytes(), apk.read_bytes())
            self.assertEqual(json.loads((root / 'manifest.json').read_text()), manifest)
            with self.assertRaises(ValueError):
                publish_artifact(apk, Path(directory) / 'private-data', '1.0.0')

if __name__ == '__main__':
    unittest.main()
