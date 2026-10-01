import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createVoiceServer } from './server.mjs';

test('internal calculator validates input, returns private WAV and reuses completed output', async () => {
  let calls = 0;
  const server = createVoiceServer(async () => { calls++; return Buffer.from('RIFFsyntheticWAVE'); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const send = body => fetch(`${base}/synthesize`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    assert.equal((await send({ text: 'ア', voice: '../secret' })).status, 400);
    assert.equal((await send({ text: 'a'.repeat(501), voice: 'F1' })).status, 400);
    for (let i = 0; i < 2; i++) {
      const response = await send({ text: 'ア', voice: 'F1' });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('content-type'), 'audio/wav');
      assert.equal(response.headers.get('cache-control'), 'private, no-store');
      assert.equal(Buffer.from(await response.arrayBuffer()).toString(), 'RIFFsyntheticWAVE');
    }
    assert.equal(calls, 1);
    assert.equal((await fetch(`${base}/health`)).status, 200);
  } finally { await new Promise(resolve => server.close(resolve)); }
});


test('concurrent inference is bounded and failed calculation releases the slot', async () => {
  let release;
  let started;
  const began = new Promise(resolve => { started = resolve; });
  const pending = new Promise(resolve => { release = resolve; });
  let attempts = 0;
  const server = createVoiceServer(async () => {
    attempts++;
    if (attempts === 1) { started(); await pending; throw new Error('synthetic failure'); }
    return Buffer.from('RIFFsyntheticWAVE');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const send = () => fetch(`${base}/synthesize`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'イ', voice: 'F1' }),
  });
  try {
    const first = send();
    await began;
    assert.equal((await send()).status, 429);
    release();
    assert.equal((await first).status, 503);
    assert.equal((await send()).status, 200);
    assert.equal(attempts, 2);
  } finally { release(); await new Promise(resolve => server.close(resolve)); }
});
