import { build } from 'esbuild';
await build({
  entryPoints: ['../../frontend/src/vendor/supertonic/helper.js'],
  outfile: 'helper.mjs', bundle: true, platform: 'node', format: 'esm',
  alias: { 'onnxruntime-web/webgpu': 'onnxruntime-node' },
  external: ['onnxruntime-node'], legalComments: 'eof',
});
