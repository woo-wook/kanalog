FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 && rm -rf /var/lib/apt/lists/*
WORKDIR /app/tools/voice-server
COPY tools/voice-server/package*.json ./
RUN ONNXRUNTIME_NODE_INSTALL=skip npm ci --no-audit --no-fund
COPY tools/voice-server/*.mjs ./
COPY tools/voice-server/licenses ./licenses
COPY frontend/src/vendor/supertonic /app/frontend/src/vendor/supertonic
RUN npm run build && npm prune --omit=dev
USER node
ENV MODEL_ROOT=/app/models PORT=8090 HOST=0.0.0.0
CMD ["node", "app.mjs"]
