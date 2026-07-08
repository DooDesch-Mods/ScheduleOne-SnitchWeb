# Snitch pairing relay. Tiny Node + ws service; Dokploy builds this from the relay/ context.
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY server.js ./
ENV PORT=8080
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/health >/dev/null 2>&1 || exit 1
CMD ["node", "server.js"]
