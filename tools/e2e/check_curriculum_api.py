#!/usr/bin/env python3
"""Verify the deployed curriculum contract using the private QA account, without a browser."""
import http.cookiejar
import json
import os
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE = os.environ.get("E2E_BASE_URL", "http://localhost:3200").rstrip("/")
KEYS = ["starter", "n5", "n4", "n3", "n2", "n1"]


def request(client, path, method="GET", body=None, csrf=None):
    headers = {"Origin": BASE, "Content-Type": "application/json"}
    if csrf:
        headers["X-CSRF-Token"] = csrf
    payload = json.dumps(body).encode() if body is not None else None
    with client.open(urllib.request.Request(BASE + "/api" + path, data=payload,
                                          method=method, headers=headers), timeout=30) as response:
        data = response.read()
        return json.loads(data) if data else None


def main():
    anonymous = urllib.request.build_opener()
    try:
        request(anonymous, "/curriculum")
    except urllib.error.HTTPError as error:
        assert error.code == 401, "Anonymous curriculum must require authentication"
    else:
        raise AssertionError("Anonymous curriculum was exposed")
    account = json.loads((ROOT / "private-data/e2e/account.json").read_text())
    client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    csrf = request(client, "/auth/login", "POST", account)["csrfToken"]
    try:
        curriculum = request(client, "/curriculum")
        levels = curriculum["levels"]
        assert [level["key"] for level in levels] == KEYS
        courses = request(client, "/courses")
        existing = {lesson["id"] for course in courses for lesson in course["lessons"]}
        mapped = [lesson["id"] for level in levels for unit in level["units"] for lesson in unit["lessons"]]
        assert len(mapped) == len(set(mapped)), "A source lesson appears twice in the path"
        assert set(mapped) == existing, "The path must preserve every source lesson ID"
        for level in levels:
            fetched = request(client, "/curriculum/levels/" + level["key"])
            assert fetched == level
            core = [lesson for unit in level["units"] if not unit["optional"]
                    for lesson in unit["lessons"] if lesson["totalCards"] > 0]
            assert level["totalCards"] == sum(lesson["totalCards"] for lesson in core)
            assert level["completedCards"] == sum(lesson["completedCards"] for lesson in core)
            assert level["totalLessons"] == len(core)
            assert level["completedLessons"] == sum(lesson["completed"] for lesson in core)
        assert levels[0]["totalCards"] == 92, "The starter path must contain 92 basic characters"
        assert levels[0]["totalLessons"] == 20
        recommended = curriculum["recommendedLessonId"]
        assert recommended is None or recommended in existing
        try:
            request(client, "/curriculum/levels/unknown-level")
        except urllib.error.HTTPError as error:
            assert error.code == 404
        else:
            raise AssertionError("Unknown level must return 404")
        print(json.dumps({"curriculumApi": "passed", "levels": [
            {"key": level["key"], "available": level["available"], "cards": level["totalCards"],
             "lessons": level["totalLessons"], "units": len(level["units"])} for level in levels]}, ensure_ascii=False))
    finally:
        request(client, "/auth/logout", "POST", csrf=csrf)


if __name__ == "__main__":
    main()
