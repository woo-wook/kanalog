#!/usr/bin/env python3
"""Exercise a dedicated Android emulator. Never uses the web account or server DB."""
import argparse
import json
import os
import re
import subprocess
import time
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--serial", default="emulator-5554")
    parser.add_argument("--adb", default=str(Path(os.environ.get("ANDROID_HOME", str(Path.home() / "Library/Android/sdk"))) / "platform-tools/adb"))
    args = parser.parse_args()
    output = ROOT / "private-data/native-qa"
    output.mkdir(parents=True, exist_ok=True)

    def adb(*command):
        return subprocess.run([args.adb, "-s", args.serial, *command], check=True, capture_output=True, timeout=30).stdout

    def nodes():
        result = adb("shell", "uiautomator", "dump", "/sdcard/kanalog-window.xml")
        if b"dumped to" not in result:
            return []  # Animated initial loading can briefly prevent an idle hierarchy.
        adb("pull", "/sdcard/kanalog-window.xml", str(output / "window.xml"))
        return list(ET.parse(output / "window.xml").getroot().iter("node"))

    def tap(text, timeout=20):
        until = time.monotonic() + timeout
        while time.monotonic() < until:
            found = next((n for n in nodes() if n.get("text") == text or n.get("content-desc") == text), None)
            if found is not None:
                x1, y1, x2, y2 = map(int, re.findall(r"\d+", found.get("bounds")))
                adb("shell", "input", "tap", str((x1 + x2) // 2), str((y1 + y2) // 2))
                return
            time.sleep(0.4)
        raise AssertionError("Control unavailable: " + text)

    def wait_text(prefix):
        until = time.monotonic() + 60
        while time.monotonic() < until:
            if any(n.get("text", "").startswith(prefix) for n in nodes()):
                return
        raise AssertionError("Expected state: " + prefix)

    def snapshot():
        return json.loads(adb("shell", "run-as", "com.kanalog.android", "cat", "files/profile.json"))

    def wait_reviews(expected):
        until = time.monotonic() + 30
        while time.monotonic() < until:
            current = snapshot()
            if len(current["reviews"]) == expected:
                return current
            time.sleep(0.2)
        raise AssertionError("Saved review count did not reach " + str(expected))

    def wait_counter(position):
        until = time.monotonic() + 60
        while time.monotonic() < until:
            for node in nodes():
                match = re.fullmatch(rf"{position} / (\d+)", node.get("text", ""))
                if match:
                    return int(match.group(1))
        raise AssertionError("Session position did not advance")

    def screenshot(name):
        (output / (name + ".png")).write_bytes(adb("exec-out", "screencap", "-p"))

    def play():
        tap("발음 듣기")
        dump = adb("shell", "dumpsys", "audio").decode()
        app_uid = adb("shell", "run-as", "com.kanalog.android", "id", "-u").decode().strip()
        (output / "audio.txt").write_text(dump)
        # AudioService retains start/release events even after short kana playback finishes.
        assert re.search(r"(?:started|start).*", dump, re.I), "No playback event"
        assert app_uid in dump, "No audio event from the study app"

    adb("shell", "svc", "wifi", "disable")
    adb("shell", "svc", "data", "disable")
    adb("shell", "am", "force-stop", "com.kanalog.android")
    adb("shell", "am", "start", "-n", "com.kanalog.android/.MainActivity")
    wait_text("오늘도 한 걸음")
    wait_text("모든 레벨 단어·문법 복습")
    baseline = len(snapshot()["reviews"])
    screenshot("home")
    for text in ["가타카나", "탁음 20", "반탁음 5", "요음 33"]:
        tap(text)
    wait_text("선택한 문자 전체 208 장")
    tap("가나 연습 시작")
    wait_text("1 / 208")
    play()
    tap("정답 보기")
    tap("다시")
    wait_text("2 / 209")
    tap("정답 보기")
    tap("보통")
    wait_text("3 / 209")
    wait_reviews(baseline + 2)
    screenshot("kana")
    print("PASS offline kana 208 + bounded reinforcement + recorded playback", flush=True)

    tap("뒤로")
    tap("설정")
    settings = snapshot()["settings"]
    if not settings["hangul"]:
        # The setting label is inside the same Material switch row.
        tap("한글 발음 보조")
        until = time.monotonic() + 10
        while time.monotonic() < until and not snapshot()["settings"]["hangul"]:
            time.sleep(0.2)
    assert snapshot()["settings"]["hangul"]
    adb("shell", "am", "force-stop", "com.kanalog.android")
    adb("shell", "am", "start", "-n", "com.kanalog.android/.MainActivity")
    wait_text("오늘도 한 걸음")
    assert snapshot()["settings"]["hangul"] and len(snapshot()["reviews"]) == baseline + 2
    print("PASS offline restart retains ratings and display setting", flush=True)

    adb("shell", "input", "swipe", "540", "1750", "540", "720", "400")
    tap("단어 779")
    word_scope = wait_counter(1)
    assert word_scope > 0
    play()
    tap("정답 보기")
    wait_text("한글 보조")
    screenshot("vocabulary")
    tap("보통")
    assert wait_counter(2) == word_scope
    tap("뒤로")
    adb("shell", "input", "swipe", "540", "1750", "540", "720", "400")
    tap("문법 99")
    texts = [n.get("text", "") for n in nodes()]
    assert "뉘앙스" not in texts and "핵심 표현" not in texts
    tap("정답 보기")
    texts = [n.get("text", "") for n in nodes()]
    assert "뉘앙스" in texts or "예문 해석" in texts
    screenshot("grammar")
    tap("다시")
    current = wait_reviews(baseline + 4)
    reviewed = {r["noteId"] for r in current["reviews"][baseline:]}
    assert all(current["progress"][note]["fsrsJson"] for note in reviewed)
    assert current["progress"][current["reviews"][-1]["noteId"]]["nextDayReminder"] is not None
    summary = {"offline": True, "notes": len(current["notes"]), "answersAdded": 4,
               "kanaScope": 208, "storedFsrsCards": len(reviewed), "displaySettingPersisted": True}
    (output / "report.json").write_text(json.dumps(summary, indent=2))
    tap("뒤로")
    tap("기록")
    wait_text("나의 학습 기록")
    wait_text("최근 7일 답변")
    screenshot("statistics")
    print("PASS offline actual MAX vocabulary/grammar, hidden answer, FSRS, next-day reminder and statistics", flush=True)
    print(json.dumps(summary), flush=True)


if __name__ == "__main__":
    main()
