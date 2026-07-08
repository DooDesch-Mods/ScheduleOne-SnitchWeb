# Snitch pairing relay. Tiny Node + ws service. Built with the repo root as context (Dokploy: Docker Context
# Path ".", Dockerfile "relay/Dockerfile"), so the COPY paths are relative to the repo root.
FROM node:22-alpine
WORKDIR /app
COPY relay/package.json relay/package-lock.json* ./
RUN npm install --omit=dev
COPY relay/server.js ./
ENV PORT=8080
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/health >/dev/null 2>&1 || exit 1
CMD ["node", "server.js"]
