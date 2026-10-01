#!/usr/bin/env python3
"""Check effective and running Compose settings without printing secrets."""
import json
import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
EXPECTED = os.environ.get("E2E_BASE_URL", "https://kanalog.hanwook.me").rstrip("/")


def main():
    config = json.loads(subprocess.check_output(
        ["docker", "compose", "config", "--format", "json"], cwd=ROOT, text=True))
    configured = config["services"]["backend"]["environment"]
    container = subprocess.check_output(
        ["docker", "compose", "ps", "-q", "backend"], cwd=ROOT, text=True).strip()
    assert container, "Backend must be running"
    runtime = json.loads(subprocess.check_output(["docker", "inspect", container], text=True))[0]
    running = dict(entry.split("=", 1) for entry in runtime["Config"]["Env"] if "=" in entry)
    for label, environment in [("Compose", configured), ("running backend", running)]:
        assert environment["PUBLIC_APP_URL"].rstrip("/") == EXPECTED, (
            f"{label}: PUBLIC_APP_URL={environment['PUBLIC_APP_URL']} does not match {EXPECTED}")
        expected_secure = "true" if EXPECTED.startswith("https://") else "false"
        assert environment["COOKIE_SECURE"].lower() == expected_secure, (
            f"{label}: COOKIE_SECURE must be {expected_secure}")
    assert runtime["State"]["Health"]["Status"] == "healthy"
    print(json.dumps({"deployment": "passed", "publicUrl": EXPECTED,
                      "secureCookie": EXPECTED.startswith("https://"), "backend": "healthy"}))


if __name__ == "__main__":
    main()
