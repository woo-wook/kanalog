import { readFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';
import * as ort from 'onnxruntime-node';
import { loadTextToSpeech, loadVoiceStyle, writeWavFile } from './helper.mjs';
import { createVoiceServer } from './server.mjs';

const root = resolve(process.env.MODEL_ROOT ?? '../../private-data/supertonic/models');
const manifest = JSON.parse(await readFile(resolve(root, 'manifest.json'), 'utf8'));
const paths = new Set(manifest.files.map(file => resolve(root, file.path)));
for (const file of manifest.files) {
  const path = resolve(root, file.path);
  if (!path.startsWith(root + sep)) throw new Error('Invalid model path');
  const hash = createHash('sha256'); let size = 0;
  for await (const chunk of createReadStream(path)) { hash.update(chunk); size += chunk.length; }
  if (size !== file.bytes || hash.digest('hex') !== file.sha256) throw new Error('Invalid model file');
}
const resource = async path => {
  if (!paths.has(resolve(path))) throw new Error('Unknown model resource');
  return { json: async () => JSON.parse(await readFile(path, 'utf8')) };
};
const engine = await loadTextToSpeech(resolve(root, 'onnx'), {
  executionProviders: ['cpu'], intraOpNumThreads: 2, interOpNumThreads: 1,
  graphOptimizationLevel: 'all',
}, null, (path, options) => {
  if (!paths.has(resolve(path))) throw new Error('Unknown model resource');
  return ort.InferenceSession.create(path, options);
}, resource);
const styles = new Map();
const server = createVoiceServer(async (text, voice) => {
  let style = styles.get(voice);
  if (!style) {
    style = await loadVoiceStyle([resolve(root, `voice_styles/${voice}.json`)], false, resource);
    styles.set(voice, style);
  }
  const { wav } = await engine.textToSpeech.call(text, 'ja', style, 8, 1, 0.3);
  if (!wav.length || wav.some(sample => !Number.isFinite(sample))) throw new Error('Invalid output');
  return Buffer.from(writeWavFile(wav, engine.cfgs.ae.sample_rate));
});
server.requestTimeout = 50_000;
server.listen(Number(process.env.PORT ?? 8090), process.env.HOST ?? '127.0.0.1', () => console.log('Voice calculator ready'));
