import { createServer } from 'node:http';
import { createHash } from 'node:crypto';

export function createVoiceServer(synthesize) {
  let busy = false;
  let cacheBytes = 0;
  const cache = new Map();
  return createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'private, no-store');
    const error = (status, code) => {
      response.writeHead(status, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ code }));
    };
    if (request.method === 'GET' && request.url === '/health') {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end('{"status":"UP"}'); return;
    }
    if (request.method !== 'POST' || request.url !== '/synthesize') { error(404, 'NOT_FOUND'); return; }
    try {
      const chunks = []; let size = 0;
      for await (const chunk of request) {
        size += chunk.length;
        if (size > 8192) { error(413, 'TOO_LARGE'); return; }
        chunks.push(chunk);
      }
      const input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!input || typeof input.text !== 'string' || !input.text.trim() || input.text.length > 500 ||
          typeof input.voice !== 'string' || !/^[FM][1-5]$/.test(input.voice)) {
        error(400, 'INVALID_INPUT'); return;
      }
      const key = createHash('sha256').update(JSON.stringify([input.text, input.voice])).digest('hex');
      let wav = cache.get(key);
      if (!wav) {
        if (busy) { error(429, 'VOICE_BUSY'); return; }
        busy = true;
        try { wav = await synthesize(input.text, input.voice); }
        finally { busy = false; }
        if (!Buffer.isBuffer(wav) || wav.length > 8 * 1024 * 1024) { error(502, 'BAD_AUDIO'); return; }
        while (cache.size && (cacheBytes + wav.length > 32 * 1024 * 1024 || cache.size >= 256)) {
          const oldest = cache.keys().next().value;
          cacheBytes -= cache.get(oldest).length; cache.delete(oldest);
        }
        cache.set(key, wav); cacheBytes += wav.length;
      } else {
        cache.delete(key); cache.set(key, wav);
      }
      response.writeHead(200, { 'Content-Type': 'audio/wav', 'Content-Length': wav.length });
      response.end(wav);
    } catch (cause) {
      error(cause instanceof SyntaxError ? 400 : 503, 'VOICE_UNAVAILABLE');
    }
  });
}
