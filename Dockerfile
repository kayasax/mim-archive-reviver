# MIM Archive Reviver — code image, built FROM the data image so a code
# change doesn't require re-shipping the vector index.
#
# Build data image (only when data/lancedb changes):
#   az acr build --registry mimarchivereviveracr --image mim-archive-reviver-data:latest -f Dockerfile.data .
#
# Build code image (fast, seconds):
#   az acr build --registry mimarchivereviveracr --image mim-archive-reviver:latest -f Dockerfile .
ARG REGISTRY=mimarchivereviveracr.azurecr.io
FROM ${REGISTRY}/mim-archive-reviver-data:latest AS data

FROM node:20-slim AS runtime
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY api ./api
COPY ui ./ui
COPY --from=data /app/data/lancedb ./data/lancedb

RUN addgroup --system reviver && adduser --system --ingroup reviver reviver
USER reviver

EXPOSE 3000
ENV PORT=3000
ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health').then(r=>{if(!r.ok)throw r.status;process.exit(0)}).catch(()=>process.exit(1))"

CMD ["node", "api/server.js"]
