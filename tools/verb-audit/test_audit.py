import json
import tempfile
import unittest
from pathlib import Path

from audit import audit_file, expected_forms


def form(key, japanese, reading, group="BASIC", stem="", segments=None):
    if key == "dictionary":
        stem = japanese
    return {
        "key": key,
        "group": group,
        "japanese": japanese,
        "reading": reading,
        "stem": stem,
        "suffix": japanese[len(stem) :],
        "readingGuide": {
            "segments": segments or [{"text": japanese, "reading": reading}],
            "hangul": "가",
            "hangulStatus": "COMPLETE",
        },
    }


class AuditTest(unittest.TestCase):
    def run_rows(self, rows, notes=None):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "forms.jsonl"
            report = Path(directory) / "report.json"
            source.write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows))
            notes_path = None
            if notes is not None:
                notes_path = Path(directory) / "notes.jsonl"
                notes_path.write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in notes))
            summary = audit_file(source, report, notes_path)
            return summary, json.loads(report.read_text())

    def test_finds_independent_reference_and_metadata_errors(self):
        row = {
            "sourceGuid": "synthetic-1",
            "front": "書く",
            "reading": "かく",
            "partOfSpeech": "5단동사",
            "conjugation": {
                "verbClass": "GODAN",
                "dictionaryForm": "書く",
                "dictionaryReading": "かく",
                "forms": [
                    form("dictionary", "書く", "かく"),
                    form("te", "書って", "かいて", "CONNECT", segments=[{"text": "書って", "reading": "かって"}]),
                    form("te", "書って", "かいて", "CONNECT"),
                ],
            },
        }
        summary, report = self.run_rows([row])
        self.assertEqual(summary["notesProcessed"], 1)
        codes = {issue["code"] for issue in report["issues"]}
        self.assertIn("MISSING_KEYS", codes)
        self.assertIn("DUPLICATE_KEY", codes)
        self.assertIn("REFERENCE_MISMATCH", codes)
        self.assertIn("READING_ALIGNMENT", codes)

    def test_accepts_complete_godan_reference_matrix(self):
        examples = {
            "dictionary": ("書く", "かく"),
            "masu": ("書きます", "かきます"),
            "masen": ("書きません", "かきません"),
            "mashita": ("書きました", "かきました"),
            "masendeshita": ("書きませんでした", "かきませんでした"),
            "nai": ("書かない", "かかない"),
            "nakatta": ("書かなかった", "かかなかった"),
            "te": ("書いて", "かいて"),
            "ta": ("書いた", "かいた"),
            "teiru": ("書いている", "かいている"),
            "tai": ("書きたい", "かきたい"),
            "potential": ("書ける", "かける"),
            "passive": ("書かれる", "かかれる"),
            "causative": ("書かせる", "かかせる"),
            "causativePassive": ("書かせられる", "かかせられる"),
            "volitional": ("書こう", "かこう"),
            "imperative": ("書け", "かけ"),
            "ba": ("書けば", "かけば"),
            "tara": ("書いたら", "かいたら"),
            "request": ("書いてください", "かいてください"),
            "prohibition": ("書かないでください", "かかないでください"),
        }
        connect = {"te", "teiru", "tai", "request", "prohibition"}
        advanced = {"potential", "passive", "causative", "causativePassive", "volitional", "imperative", "ba", "tara"}
        forms = [
            form(key, japanese, reading, "CONNECT" if key in connect else "ADVANCED" if key in advanced else "BASIC")
            for key, (japanese, reading) in examples.items()
        ]
        row = {
            "sourceGuid": "synthetic-2", "front": "書く", "reading": "かく", "partOfSpeech": "5단동사",
            "conjugation": {"verbClass": "GODAN", "dictionaryForm": "書く", "dictionaryReading": "かく", "forms": forms},
        }
        summary, _ = self.run_rows([row])
        self.assertEqual(summary["issueTotal"], 0)

    def test_reports_published_lexical_exception_and_preserves_all_rows(self):
        rows = [
            {"sourceGuid": "synthetic-3", "front": "準ずる", "reading": "じゅんずる", "partOfSpeech": "1단동사",
             "conjugation": {"verbClass": "ICHIDAN", "dictionaryForm": "準ずる", "dictionaryReading": "じゅんずる", "forms": []}},
            {"sourceGuid": "synthetic-4", "front": "名詞", "reading": "めいし", "partOfSpeech": "명사", "conjugation": None},
        ]
        summary, report = self.run_rows(rows)
        self.assertEqual(summary["notesProcessed"], 2)
        self.assertEqual(summary["noConjugation"], 1)
        self.assertIn("DICTIONARY_CLASS_MISMATCH", {issue["code"] for issue in report["issues"]})

    def test_published_exceptions_never_use_generic_potential_and_stative_rules(self):
        give = expected_forms("くれる", "くれる", "ICHIDAN", "くれる", "1단동사")
        self.assertEqual(give["imperative"], ("くれ", "くれ"))
        self.assertEqual(len(give), 16)
        exist = expected_forms("気がある", "きがある", "GODAN", "気がある", "5단동사")
        self.assertEqual(exist["nai"], ("気がない", "きがない"))
        self.assertEqual(len(exist), 11)
        possible = expected_forms("できる", "できる", "ICHIDAN", "できる", "1단동사")
        self.assertEqual(len(possible), 12)
        self.assertFalse({"potential", "passive", "causative", "causativePassive", "request", "prohibition", "tai", "volitional", "imperative"} & possible.keys())
        sight = expected_forms("見える", "みえる", "ICHIDAN", "見える", "1단동사")
        self.assertEqual(len(sight), 18)
        self.assertNotIn("potential", sight)
        travel = expected_forms("行く", "ゆく", "GODAN", "行く", "5단동사")
        self.assertEqual(travel["te"], ("行って", "いって"))
        modern = expected_forms("準じる", "じゅんじる", "ICHIDAN", "準ずる", "1단동사")
        self.assertEqual(modern["masu"], ("準じます", "じゅんじます"))

    def test_compares_every_exported_note_to_original_manifest(self):
        original = [
            {"sourceGuid": "one", "kind": "vocabulary", "front": "書く", "reading": "かく", "partOfSpeech": "5단동사"},
            {"sourceGuid": "two", "kind": "vocabulary", "front": "食べる", "reading": "たべる", "partOfSpeech": "1단동사"},
        ]
        exported = [
            {"sourceGuid": "one", "front": "誤る", "reading": "かく", "partOfSpeech": "5단동사", "conjugation": None},
            {"sourceGuid": "one", "front": "誤る", "reading": "かく", "partOfSpeech": "5단동사", "conjugation": None},
        ]
        summary, report = self.run_rows(exported, original)
        self.assertEqual(summary["sourceNotes"], 2)
        codes = {issue["code"] for issue in report["issues"]}
        self.assertTrue({"NOT_EXPORTED", "DUPLICATE_SOURCE_GUID", "SOURCE_FIELD_MISMATCH", "MISSING_VERB_CONJUGATION"} <= codes)


if __name__ == "__main__":
    unittest.main()
