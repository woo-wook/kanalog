#!/usr/bin/env python3
"""Run real-browser checks with the private local QA account; never print its password."""
import json
import os
import subprocess
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[2]
account_file = root / 'private-data/e2e/account.json'
if not account_file.is_file():
    raise SystemExit('Create the QA account and private-data/e2e/account.json first; see docs/verification.md')
account = json.loads(account_file.read_text())
env = dict(os.environ, E2E_BASE_URL=os.environ.get('E2E_BASE_URL', 'http://localhost:3200'),
           E2E_EMAIL=account['email'], E2E_PASSWORD=account['password'])
raise SystemExit(subprocess.run(['pnpm', 'exec', 'playwright', 'test', *sys.argv[1:]],
                               cwd=root / 'frontend', env=env).returncode)
