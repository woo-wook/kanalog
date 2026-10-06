import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("build_pack", Path(__file__).with_name("build_pack.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

verify_spec = importlib.util.spec_from_file_location("verify_pack", Path(__file__).with_name("verify_pack.py"))
verifier = importlib.util.module_from_spec(verify_spec)
verify_spec.loader.exec_module(verifier)


class BuildPackTest(unittest.TestCase):
    def test_deduplicates_only_verified_media_and_rejects_path_escape(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source = root / "source"
            (source / "media").mkdir(parents=True)
            audio = b"synthetic-not-real-audio"
            (source / "media" / "a.mp3").write_bytes(audio)
            digest = hashlib.sha256(audio).hexdigest()
            entries = [{"name": "a.mp3", "path": "media/a.mp3", "sha256": digest, "contentType": "audio/mpeg"},
                       {"name": "b.mp3", "path": "media/a.mp3", "sha256": digest, "contentType": "audio/mpeg"}]
            (source / "media.jsonl").write_text("\n".join(json.dumps(e) for e in entries))
            mapping = module.prepare_media(source, root / "output")
            self.assertEqual(mapping["a.mp3"], mapping["b.mp3"])
            self.assertEqual(len(list((root / "output/media").iterdir())), 1)
            entries[0]["path"] = "../escape.mp3"
            (source / "media.jsonl").write_text(json.dumps(entries[0]))
            with self.assertRaises(ValueError):
                module.prepare_media(source, root / "bad")

    def test_verified_manifest_detects_content_tampering(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / "media").mkdir()
            package = {"schemaVersion": 1, "packageId": "synthetic", "version": "1", "notes": [
                {"id": "synthetic:word", "kind": "vocabulary", "front": "水", "meaning": "물", "examples": []}]}
            path = root / "personal-content.json"
            path.write_text(json.dumps(package), encoding="utf-8")
            module.write_manifest(root, package)
            self.assertEqual(verifier.verify(root)["notes"], 1)
            path.write_text("{}", encoding="utf-8")
            with self.assertRaises(ValueError):
                verifier.verify(root)


if __name__ == "__main__":
    unittest.main()
