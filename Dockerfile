FROM node:20-slim
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY api ./api
COPY ui ./ui
COPY data ./data
EXPOSE 3000
CMD ["node", "api/server.js"]
