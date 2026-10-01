#!/usr/bin/env python3
"""Provision a private persistent QA account and N5 data for the local Compose app."""
import json
import os
import secrets
import subprocess
import http.cookiejar
import urllib.request
from pathlib import Path

root = Path(__file__).resolve().parents[2]
path = root / 'private-data/e2e/account.json'
path.parent.mkdir(parents=True, exist_ok=True)
os.chmod(path.parent, 0o700)
if path.exists():
    account = json.loads(path.read_text())
else:
    account = {'email': f'qa+{secrets.token_hex(4)}@kanalog.test', 'password': secrets.token_urlsafe(32)}
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, 'w') as file:
        json.dump(account, file)
os.chmod(path, 0o600)
base = ['docker', 'compose', 'run', '--rm', '-T', 'backend', '--spring.main.web-application-type=none']
subprocess.run(base + ['--app.cli=create-user', '--app.email=' + account['email']], cwd=root,
               input=account['password'] + '\n', text=True, check=True)
subprocess.run(base + ['--app.cli=import-max', '--app.email=' + account['email'], '--app.input-dir=/app/import/n5'],
               cwd=root, check=True)
# The QA account has a larger daily allowance so repeated checks do not consume the personal user's limit.
base_url = os.environ.get('E2E_BASE_URL', 'http://localhost:3200').rstrip('/')
client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
headers = {'Content-Type': 'application/json', 'Origin': base_url}
with client.open(urllib.request.Request(base_url + '/api/auth/login', data=json.dumps(account).encode(), headers=headers)) as response:
    csrf = json.load(response)['csrfToken']
headers['X-CSRF-Token'] = csrf
with client.open(urllib.request.Request(base_url + '/api/settings', data=b'{"dailyNewLimit":100}', headers=headers, method='PATCH')):
    pass
with client.open(urllib.request.Request(base_url + '/api/auth/logout', data=b'', headers=headers)):
    pass
print('QA account ready. Credentials remain in private-data/e2e/account.json (0600).')
