#!/usr/bin/env python3
"""Restore original ruby metadata in existing private JSONL without extracting media."""
from __future__ import annotations
import argparse
import collections
import json
from pathlib import Path
import shutil
import sqlite3
import tempfile
from convert_max import validate_archive, fields_for, rendered_examples, grammar_ruby, clean, write_jsonl


def enrich(apkg: Path, directory: Path, verify_hash: bool = True) -> dict:
    counts = collections.Counter()
    with validate_archive(apkg, verify_hash) as archive, tempfile.TemporaryDirectory(dir=directory, prefix="ruby-") as temp:
        db_path = Path(temp) / "collection.anki21"
        with archive.open("collection.anki21") as source, db_path.open("wb") as target:
            shutil.copyfileobj(source, target, 1024 * 1024)
        with sqlite3.connect(db_path) as db:
            db.create_collation("unicase", lambda a,b: (a.casefold()>b.casefold())-(a.casefold()<b.casefold()))
            db.execute("create index if not exists ruby_guid on notes(guid)")
            field_names = collections.defaultdict(list)
            for mid, _, name in db.execute("select ntid,ord,name from fields order by ntid,ord"):
                field_names[mid].append(name)
            notes = directory / "notes.jsonl"
            replacement = Path(temp) / "notes.jsonl"
            with notes.open(encoding="utf-8") as source, replacement.open("w", encoding="utf-8") as out:
                for line in source:
                    if not line.strip(): continue
                    row = json.loads(line)
                    if row.get("sourceVersion") != "2.1.2": raise ValueError("unsupported converted version")
                    original = db.execute("select mid,flds from notes where guid=?", (row["sourceGuid"],)).fetchone()
                    if original is None: raise ValueError("original GUID unavailable")
                    fields = fields_for(original[1], field_names[original[0]])
                    if row["kind"] == "grammar":
                        if row["front"] != clean(fields["FrontHTML"]) or row["answer"] != clean(fields["BackHTML"]):
                            raise ValueError("grammar content mismatch")
                        row["furigana"] = grammar_ruby(fields, row["front"])
                        counts["grammarRuby" if row["furigana"] else "grammarRubyUnavailable"] += 1
                    else:
                        if row["front"] != clean(fields["Word"]) or row["reading"] != clean(fields["Reading"]):
                            raise ValueError("vocabulary content mismatch")
                        originals = rendered_examples(fields.get("ExamplesRendered", ""))
                        examples = row.get("examples", [])
                        if len(originals) != len(examples): raise ValueError("example count mismatch")
                        for example, original_example in zip(examples, originals):
                            if example["japanese"] != original_example["japanese"]: raise ValueError("example text mismatch")
                            example["furigana"] = original_example.get("furigana")
                            counts["exampleRuby" if example["furigana"] else "exampleRubyUnavailable"] += 1
                    write_jsonl(out, row)
                    counts["notes"] += 1
            # Atomic replacement; an interruption leaves the previous JSONL intact.
            replacement.replace(notes)
    (directory / "readings-report.json").write_text(json.dumps(dict(counts), indent=2)+"\n", encoding="utf-8")
    return dict(counts)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("apkg", type=Path)
    parser.add_argument("directory", type=Path)
    args = parser.parse_args()
    print(json.dumps(enrich(args.apkg, args.directory)))
