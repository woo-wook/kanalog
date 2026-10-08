"""Private, exhaustive QA for exported conjugations; not a naturalness certificate.

Reference rules are transcribed from the Japan Foundation conjugation tables and
specific published dictionary entries, independently of the Kotlin implementation.
Only source identifiers and findings enter the JSON report. Raw MAX content is
never printed to stdout.
"""

import argparse
import collections
import json
import sys
import unicodedata
from pathlib import Path


REFERENCE_URLS = {
    "regular": "https://www.kyozai.jpf.go.jp/kyozai/material/BTS00012/ja/render.do",
    "causative_passive": "https://www.irodori.jpf.go.jp/assets/data/pre-intermediate/pdf/ZZ_L16.pdf",
    "honorific": "https://www.kyozai.jpf.go.jp/kyozai/material/BMA00088/ja/render.do",
    "nonvolitional": "https://www.kyozai.jpf.go.jp/kyozai/material/BTS00003/ja/render.do",
    "potential_exceptions": "https://www.kyozai.jpf.go.jp/kyozai/material/BTS00063/ja/render.do",
    "dekiru": "https://repository.ninjal.ac.jp/record/1862/files/kk_nkss_022.pdf",
    "wakaru": "https://www2.ninjal.ac.jp/verbhandbook/headwords/%E5%88%86%E3%81%8B%E3%82%8B.html",
    "kureru": "https://www2.ninjal.ac.jp/verbhandbook/headwords/%E3%81%8F%E3%82%8C%E3%82%8B.html",
    "zuru": "https://kotobank.jp/word/%E6%BA%96%E3%81%98%E3%82%8B-529969",
    "kakeru": "https://www2.ninjal.ac.jp/dictionaries/IPALBV/pdf_dir/%E3%81%8B%E3%81%91%E3%82%8B4.pdf",
    "yuku": "https://kotobank.jp/word/%E8%A1%8C%E3%81%8F-431393",
    "uonbin": "https://www.bunka.go.jp/kokugo_nihongo/sisaku/joho/joho/sisaku/enkaku/pdf/05_big_01.pdf",
}

KEY_GROUPS = {
    "dictionary": "BASIC",
    "masu": "BASIC",
    "masen": "BASIC",
    "mashita": "BASIC",
    "masendeshita": "BASIC",
    "nai": "BASIC",
    "nakatta": "BASIC",
    "te": "CONNECT",
    "ta": "BASIC",
    "teiru": "CONNECT",
    "tai": "CONNECT",
    "potential": "ADVANCED",
    "passive": "ADVANCED",
    "causative": "ADVANCED",
    "causativePassive": "ADVANCED",
    "volitional": "ADVANCED",
    "imperative": "ADVANCED",
    "ba": "ADVANCED",
    "tara": "ADVANCED",
    "request": "CONNECT",
    "prohibition": "CONNECT",
}

GODAN_COLUMNS = {
    "う": ("わ", "い", "え", "お", "って"),
    "く": ("か", "き", "け", "こ", "いて"),
    "ぐ": ("が", "ぎ", "げ", "ご", "いで"),
    "す": ("さ", "し", "せ", "そ", "して"),
    "つ": ("た", "ち", "て", "と", "って"),
    "ぬ": ("な", "に", "ね", "の", "んで"),
    "ぶ": ("ば", "び", "べ", "ぼ", "んで"),
    "む": ("ま", "み", "め", "も", "んで"),
    "る": ("ら", "り", "れ", "ろ", "って"),
}
HONORIFIC_READINGS = {"いらっしゃる", "おっしゃる", "くださる", "なさる", "ござる"}
U_ONBIN = {"問う", "請う", "乞う"}
def is_aru(dictionary, reading):
    return dictionary.endswith(("ある", "有る", "在る")) and reading.endswith("ある")


MODERN_JUN = {"準ずる": "準じる", "准ずる": "准じる"}
MORPHOLOGY_CLASS_OVERRIDES = {"駆ける": "ICHIDAN", "準じる": "ICHIDAN", "准じる": "ICHIDAN", "準ずる": "SURU", "准ずる": "SURU"}
NONVOLITIONAL = {
    ("合う", "あう"), ("開く", "あく"), ("空く", "あく"), ("要る", "いる"),
    ("折れる", "おれる"), ("掛かる", "かかる"), ("かかる", "かかる"), ("乾く", "かわく"),
    ("決まる", "きまる"), ("暮れる", "くれる"), ("故障する", "こしょうする"), ("混む", "こむ"),
    ("壊れる", "こわれる"), ("咲く", "さく"), ("閉まる", "しまる"), ("空く", "すく"), ("すく", "すく"),
    ("済む", "すむ"), ("足りる", "たりる"), ("違う", "ちがう"), ("点く", "つく"),
    ("続く", "つづく"), ("止まる", "とまる"), ("治る", "なおる"), ("直る", "なおる"),
    ("無くなる", "なくなる"), ("なくなる", "なくなる"), ("鳴る", "なる"), ("似る", "にる"),
    ("始まる", "はじまる"), ("晴れる", "はれる"), ("冷える", "ひえる"), ("増える", "ふえる"),
    ("焼ける", "やける"), ("揺れる", "ゆれる"), ("汚れる", "よごれる"), ("沸く", "わく"),
    ("割れる", "われる"), ("気がする", "きがする"),
    ("見える", "みえる"), ("聞こえる", "きこえる"), ("見つかる", "みつかる"),
    ("できる", "できる"), ("出来る", "できる"),
}


def hiragana(value):
    value = unicodedata.normalize("NFKC", value)
    return "".join(chr(ord(char) - 96) if "ァ" <= char <= "ヶ" else char for char in value)


def is_kana(value):
    return bool(value) and all("ぁ" <= char <= "ゖ" or char == "ー" for char in hiragana(value))


def add_issue(issues, row, code, **details):
    issues.append({"sourceGuid": row.get("sourceGuid"), "code": code, **details})


def expected_forms(dictionary, reading, verb_class, front, part_of_speech):
    """Return a reference table built from published suffix classes, or None."""
    if not isinstance(dictionary, str) or not isinstance(reading, str):
        return None
    if verb_class == "GODAN":
        last = dictionary[-1:]
        if last not in GODAN_COLUMNS or not reading.endswith(last):
            return None
        base, sound_base = dictionary[:-1], reading[:-1]
        a, i, e, o, te_end = GODAN_COLUMNS[last]
        if dictionary.endswith(("行く", "往く", "逝く")) and reading.endswith("いく"):
            te_end = "って"
        if dictionary in U_ONBIN:
            te_end = "うて"
        honorific = reading in HONORIFIC_READINGS
        polite = "い" if honorific else i
        stem, rstem = base, sound_base
        forms = {
            "masu": (base + polite + "ます", sound_base + polite + "ます"),
            "masen": (base + polite + "ません", sound_base + polite + "ません"),
            "mashita": (base + polite + "ました", sound_base + polite + "ました"),
            "masendeshita": (base + polite + "ませんでした", sound_base + polite + "ませんでした"),
            "nai": (base + a + "ない", sound_base + a + "ない"),
            "tai": (base + i + "たい", sound_base + i + "たい"),
            "potential": (base + e + "る", sound_base + e + "る"),
            "passive": (base + a + "れる", sound_base + a + "れる"),
            "causative": (base + a + "せる", sound_base + a + "せる"),
            "causativePassive": (base + a + "せられる", sound_base + a + "せられる"),
            "volitional": (base + o + "う", sound_base + o + "う"),
            "imperative": (base + ("い" if honorific else e), sound_base + ("い" if honorific else e)),
            "ba": (base + e + "ば", sound_base + e + "ば"),
        }
        te = (base + te_end, sound_base + te_end)
        iku = dictionary.endswith(("行く", "往く", "逝く")) or dictionary in {"いく", "ゆく"}
        if iku:
            te = (dictionary[:-2] + "いって" if dictionary.endswith("ゆく") else base + "って",
                  reading[:-2] + "いって" if reading.endswith("ゆく") else sound_base + "って")
    elif verb_class == "ICHIDAN" and dictionary.endswith("る") and reading.endswith("る"):
        stem, rstem = dictionary[:-1], reading[:-1]
        forms = {
            "masu": (stem + "ます", rstem + "ます"),
            "masen": (stem + "ません", rstem + "ません"),
            "mashita": (stem + "ました", rstem + "ました"),
            "masendeshita": (stem + "ませんでした", rstem + "ませんでした"),
            "nai": (stem + "ない", rstem + "ない"),
            "tai": (stem + "たい", rstem + "たい"),
            "potential": (stem + "られる", rstem + "られる"),
            "passive": (stem + "られる", rstem + "られる"),
            "causative": (stem + "させる", rstem + "させる"),
            "causativePassive": (stem + "させられる", rstem + "させられる"),
            "volitional": (stem + "よう", rstem + "よう"),
            "imperative": (stem + "ろ", rstem + "ろ"),
            "ba": (stem + "れば", rstem + "れば"),
        }
        te = (stem + "て", rstem + "て")
    elif verb_class == "SURU" and dictionary.endswith("する") and reading.endswith("する"):
        stem, rstem = dictionary[:-2], reading[:-2]
        forms = {
            "masu": (stem + "します", rstem + "します"),
            "masen": (stem + "しません", rstem + "しません"),
            "mashita": (stem + "しました", rstem + "しました"),
            "masendeshita": (stem + "しませんでした", rstem + "しませんでした"),
            "nai": (stem + "しない", rstem + "しない"),
            "tai": (stem + "したい", rstem + "したい"),
            "passive": (stem + "される", rstem + "される"),
            "causative": (stem + "させる", rstem + "させる"),
            "causativePassive": (stem + "させられる", rstem + "させられる"),
            "volitional": (stem + "しよう", rstem + "しよう"),
            "imperative": (stem + "しろ", rstem + "しろ"),
            "ba": (stem + "すれば", rstem + "すれば"),
        }
        nominal = not front.endswith("する") and ("명사" in part_of_speech or "名詞" in part_of_speech)
        if dictionary == "する" or nominal:
            forms["potential"] = (stem + "できる", rstem + "できる")
        te = (stem + "して", rstem + "して")
    elif verb_class == "KURU" and reading.endswith("くる") and (dictionary.endswith("来る") or dictionary.endswith("くる")):
        kanji = dictionary.endswith("来る")
        stem, rstem = dictionary[:-1] if kanji else dictionary[:-2], reading[:-2]

        def kuru(suffix):
            return (stem + (suffix[1:] if kanji else suffix), rstem + suffix)

        forms = {
            "masu": tuple(left + "ます" for left in kuru("き")),
            "masen": tuple(left + "ません" for left in kuru("き")),
            "mashita": tuple(left + "ました" for left in kuru("き")),
            "masendeshita": tuple(left + "ませんでした" for left in kuru("き")),
            "nai": kuru("こない"),
            "tai": kuru("きたい"),
            "potential": kuru("こられる"),
            "passive": kuru("こられる"),
            "causative": kuru("こさせる"),
            "causativePassive": kuru("こさせられる"),
            "volitional": kuru("こよう"),
            "imperative": kuru("こい"),
            "ba": kuru("くれば"),
        }
        te = kuru("きて")
    else:
        return None

    forms["dictionary"] = (dictionary, reading)
    forms["te"] = te
    past_end = "だ" if te[0].endswith("で") else "た"
    past = (te[0][:-1] + past_end, te[1][:-1] + past_end)
    forms["ta"] = past
    forms["teiru"] = (te[0] + "いる", te[1] + "いる")
    forms["nakatta"] = (forms["nai"][0][:-1] + "かった", forms["nai"][1][:-1] + "かった")
    forms["tara"] = (past[0] + "ら", past[1] + "ら")
    forms["request"] = (te[0] + "ください", te[1] + "ください")
    forms["prohibition"] = (forms["nai"][0] + "でください", forms["nai"][1] + "でください")
    if verb_class == "GODAN" and is_aru(dictionary, reading):
        forms["nai"] = (dictionary[:-2] + "ない", reading[:-2] + "ない")
        forms["nakatta"] = (dictionary[:-2] + "なかった", reading[:-2] + "なかった")
        for key in ("potential", "passive", "causative", "causativePassive", "imperative", "request", "prohibition", "teiru", "tai", "volitional"):
            forms.pop(key, None)
    if verb_class == "ICHIDAN" and dictionary in {"いる", "居る"} and reading == "いる":
        forms.pop("teiru", None)
    if dictionary in {"くれる", "呉れる"} and reading == "くれる":
        forms["imperative"] = (dictionary[:-1], "くれ")
        for key in ("potential", "passive", "tai", "volitional", "request"):
            forms.pop(key, None)
    if (dictionary, reading) in NONVOLITIONAL:
        for key in ("volitional", "imperative", "potential"):
            forms.pop(key, None)
    if (dictionary, reading) in {("分かる", "わかる"), ("わかる", "わかる"), ("知る", "しる")}:
        forms.pop("potential", None)
    if (dictionary, reading) in {("分かる", "わかる"), ("わかる", "わかる"), ("できる", "できる"), ("出来る", "できる")}:
        forms.pop("passive", None)
    if dictionary in {"できる", "出来る"} and reading == "できる":
        for key in ("potential", "passive", "tai", "volitional", "imperative", "causative", "causativePassive", "request", "prohibition"):
            forms.pop(key, None)
    return forms


def audit_row(row, issues, counters):
    counters["notesProcessed"] += 1
    source_guid = row.get("sourceGuid")
    if not isinstance(source_guid, str) or not source_guid:
        add_issue(issues, row, "MISSING_SOURCE_GUID")
    conjugation = row.get("conjugation")
    if conjugation is None:
        counters["noConjugation"] += 1
        return
    if not isinstance(conjugation, dict) or not isinstance(conjugation.get("forms"), list):
        add_issue(issues, row, "INVALID_CONJUGATION")
        return
    counters["conjugations"] += 1
    verb_class = conjugation.get("verbClass")
    dictionary = conjugation.get("dictionaryForm")
    reading = conjugation.get("dictionaryReading")
    front = row.get("front", "")
    pos = row.get("partOfSpeech", "")
    if not isinstance(front, str) or not isinstance(pos, str):
        add_issue(issues, row, "INVALID_SOURCE")
        return
    if not is_kana(reading) or not isinstance(dictionary, str):
        add_issue(issues, row, "INVALID_DICTIONARY")
        return
    modern_jun = MODERN_JUN.get(front) if row.get("reading") == "じゅんずる" else None
    if dictionary != front and dictionary != front + "する" and dictionary != modern_jun:
        add_issue(issues, row, "DICTIONARY_SOURCE_MISMATCH")
    if dictionary == front and reading != hiragana(row.get("reading", "")):
        add_issue(issues, row, "DICTIONARY_READING_MISMATCH")
    if dictionary == front + "する" and reading != hiragana(row.get("reading", "")) + "する":
        add_issue(issues, row, "DICTIONARY_READING_MISMATCH")
    reference_class = MORPHOLOGY_CLASS_OVERRIDES.get(dictionary)
    if reference_class and reference_class != verb_class:
        add_issue(issues, row, "DICTIONARY_CLASS_MISMATCH", expectedClass=reference_class, actualClass=verb_class)
    expected_class = "ICHIDAN" if modern_jun or (front == "駆ける" and row.get("reading") == "かける") else None
    if expected_class is None:
        tags = (("GODAN", ("5단동사", "五段")), ("ICHIDAN", ("1단동사", "一段")),
                ("SURU", ("サ변", "サ変")), ("KURU", ("カ변", "カ変")))
        matches = [name for name, aliases in tags if any(alias in pos for alias in aliases)]
        expected_class = matches[0] if len(matches) == 1 else None
    if expected_class and verb_class != expected_class:
        add_issue(issues, row, "SOURCE_CLASS_MISMATCH", expectedClass=expected_class, actualClass=verb_class)
    tokens = row.get("dictionary", [])
    aligned_tokens = [token for token in tokens if isinstance(token, dict) and token.get("known")
                      and token.get("surface") == front and token.get("baseForm") == front
                      and token.get("partOfSpeech", [None])[0] == "動詞"
                      and hiragana(token.get("reading", "")) == hiragana(row.get("reading", ""))]
    if len(aligned_tokens) == 1:
        counters["dictionaryAlignedNotes"] += 1
        type_name = aligned_tokens[0].get("conjugationType", "")
        dictionary_class = next((name for prefix, name in (("五段", "GODAN"), ("一段", "ICHIDAN"), ("サ変", "SURU"), ("カ変", "KURU")) if type_name.startswith(prefix)), None)
        confirmed_class = {("する", "する"): "SURU", ("いる", "いる"): "ICHIDAN", ("駆ける", "かける"): "ICHIDAN"}.get((front, row.get("reading")))
        if modern_jun or confirmed_class == verb_class:
            counters["dictionaryOverriddenNotes"] += 1
        elif dictionary_class != verb_class and dictionary_class is not None:
            add_issue(issues, row, "IPADIC_CLASS_MISMATCH", expectedClass=dictionary_class, actualClass=verb_class)
    else:
        counters["dictionaryUnalignedNotes"] += 1
    if (dictionary, reading) in NONVOLITIONAL:
        counters["semanticReviewNotes"] += 1
    if modern_jun and (dictionary != modern_jun or reading != "じゅんじる"):
        add_issue(issues, row, "MODERN_VARIANT_MISMATCH")
    expected = expected_forms(dictionary, reading, verb_class, front, pos)
    if expected is None:
        counters["unverifiedReferenceNotes"] += 1
        add_issue(issues, row, "UNVERIFIED_REFERENCE")
    forms = conjugation["forms"]
    seen = set()
    for index, item in enumerate(forms):
        counters["formsProcessed"] += 1
        if not isinstance(item, dict):
            add_issue(issues, row, "INVALID_FORM", index=index)
            continue
        key = item.get("key")
        if key in seen:
            add_issue(issues, row, "DUPLICATE_KEY", key=key)
        seen.add(key)
        if key not in KEY_GROUPS:
            add_issue(issues, row, "UNKNOWN_KEY", key=key)
        elif item.get("group") != KEY_GROUPS[key]:
            add_issue(issues, row, "WRONG_GROUP", key=key)
        value, kana = item.get("japanese"), item.get("reading")
        stem, suffix = item.get("stem"), item.get("suffix")
        if not all(isinstance(part, str) for part in (value, kana, stem, suffix)):
            add_issue(issues, row, "INVALID_FORM_FIELDS", key=key)
            continue
        if stem + suffix != value:
            add_issue(issues, row, "STEM_SUFFIX_MISMATCH", key=key)
        if key == "dictionary" and suffix:
            add_issue(issues, row, "DICTIONARY_HIGHLIGHT", key=key)
        if not is_kana(kana):
            add_issue(issues, row, "NON_KANA_READING", key=key)
        guide = item.get("readingGuide")
        if not isinstance(guide, dict) or not isinstance(guide.get("segments"), list):
            add_issue(issues, row, "MISSING_READING_GUIDE", key=key)
        else:
            pieces = guide["segments"]
            text = "".join(piece.get("text", "") for piece in pieces if isinstance(piece, dict))
            reconstructed = "".join(
                piece.get("reading") if piece.get("reading") is not None else hiragana(piece.get("text", ""))
                for piece in pieces if isinstance(piece, dict)
            )
            if text != value or hiragana(reconstructed) != hiragana(kana):
                add_issue(issues, row, "READING_ALIGNMENT", key=key)
            if guide.get("hangulStatus") != "COMPLETE" or not isinstance(guide.get("hangul"), str) or not guide["hangul"].strip():
                add_issue(issues, row, "HANGUL_INCOMPLETE", key=key)
        if expected is not None and key in expected and (value, hiragana(kana)) != expected[key]:
            add_issue(issues, row, "REFERENCE_MISMATCH", key=key)
    if expected is not None:
        missing = sorted(set(expected) - seen)
        extra = sorted(seen - set(expected))
        if missing:
            add_issue(issues, row, "MISSING_KEYS", keys=missing)
        if extra:
            add_issue(issues, row, "EXTRA_KEYS", keys=extra)
    if not 1 <= len(forms) <= len(KEY_GROUPS):
        add_issue(issues, row, "FORM_COUNT_OUT_OF_RANGE", count=len(forms))


def source_verb(pos):
    return isinstance(pos, str) and any(tag in pos for tag in ("5단동사", "1단동사", "サ변", "カ변", "五段", "一段", "サ変", "カ変"))


def audit_file(source, report, notes=None):
    counters = collections.Counter()
    issues = []
    expected_sources = {}
    if notes is not None:
        with Path(notes).open(encoding="utf-8") as stream:
            for line in stream:
                if not line.strip():
                    continue
                row = json.loads(line)
                if row.get("kind") != "vocabulary" or not source_verb(row.get("partOfSpeech")):
                    continue
                guid = row.get("sourceGuid")
                if guid in expected_sources:
                    add_issue(issues, row, "DUPLICATE_MANIFEST_GUID")
                expected_sources[guid] = row
    seen_sources = set()
    with Path(source).open(encoding="utf-8") as stream:
        for line_number, line in enumerate(stream, 1):
            if not line.strip():
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError as error:
                issues.append({"line": line_number, "code": "INVALID_JSON", "detail": error.msg})
                counters["invalidJsonLines"] += 1
                continue
            if not isinstance(row, dict):
                issues.append({"line": line_number, "code": "INVALID_ROW"})
                continue
            guid = row.get("sourceGuid")
            if guid in seen_sources:
                add_issue(issues, row, "DUPLICATE_SOURCE_GUID")
            seen_sources.add(guid)
            if notes is not None:
                original = expected_sources.get(guid)
                if original is None:
                    add_issue(issues, row, "UNEXPECTED_SOURCE_GUID")
                else:
                    for field in ("front", "reading", "partOfSpeech"):
                        if row.get(field) != original.get(field):
                            add_issue(issues, row, "SOURCE_FIELD_MISMATCH", field=field)
            if row.get("conjugation") is None and source_verb(row.get("partOfSpeech")):
                add_issue(issues, row, "MISSING_VERB_CONJUGATION")
            audit_row(row, issues, counters)
    for guid in expected_sources.keys() - seen_sources:
        issues.append({"sourceGuid": guid, "code": "NOT_EXPORTED"})
    code_counts = dict(sorted(collections.Counter(issue["code"] for issue in issues).items()))
    summary = {
        "sourceNotes": len(expected_sources) if notes is not None else None,
        "notesProcessed": counters["notesProcessed"],
        "conjugations": counters["conjugations"],
        "noConjugation": counters["noConjugation"],
        "formsProcessed": counters["formsProcessed"],
        "semanticReviewNotes": counters["semanticReviewNotes"],
        "dictionaryAlignedNotes": counters["dictionaryAlignedNotes"],
        "dictionaryOverriddenNotes": counters["dictionaryOverriddenNotes"],
        "dictionaryUnalignedNotes": counters["dictionaryUnalignedNotes"],
        "unverifiedReferenceNotes": counters["unverifiedReferenceNotes"],
        "invalidJsonLines": counters["invalidJsonLines"],
        "issueCounts": code_counts,
        "issueTotal": len(issues),
    }
    destination = Path(report)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps({"summary": summary, "referenceUrls": REFERENCE_URLS, "issues": issues}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return summary


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True, help="private exported forms JSONL")
    parser.add_argument("--report", type=Path, required=True, help="private JSON findings path")
    parser.add_argument("--notes", type=Path, help="original private converted notes.jsonl; checks exhaustive coverage")
    args = parser.parse_args(argv)
    if "private-data" not in args.report.resolve().parts:
        parser.error("--report must be inside private-data")
    summary = audit_file(args.input, args.report, args.notes)
    print(json.dumps(summary, ensure_ascii=False, sort_keys=True))
    return 1 if summary["issueTotal"] else 0


if __name__ == "__main__":
    sys.exit(main())
