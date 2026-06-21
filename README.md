# SnitchWeb

The live web dashboard for the **Snitch** Schedule I performance profiler. It connects, straight from your
browser, to a local Snitch instance over WebSocket and shows live frame times, section costs, entity-state
distributions, counters, and the capability/honesty panel - in real time.

> 🛟 **Need help or found a bug?** Get support at [support.doodesch.de](https://support.doodesch.de).

**Live:** [snitch-web-qtskoq-fee0b5-37-27-70-183.sslip.io](https://snitch-web-qtskoq-fee0b5-37-27-70-183.sslip.io/) (and `snitch.doodesch.de` once DNS points to the Dokploy host).

## How it works

- The **Snitch mod** (in Schedule I) runs a loopback HTTP + WebSocket server on `127.0.0.1:6140`.
- This page opens `ws://127.0.0.1:6140/stream` directly. **Your telemetry never leaves your machine** - the
  hosted site only serves the static app; the data flows browser ↔ localhost.
- It auto-discovers the local instance and reconnects if the game restarts. Chrome may show a one-time
  "allow access to your local network" prompt (the server already sends the Private-Network-Access header).
- The exact same build is also bundled inside the mod and served at `http://localhost:6140/`, so it works
  fully offline / standalone with no internet.

## Stack

React 19 · Vite 6 · Tailwind v4 · uPlot (60 fps canvas charts) · TypeScript. It is a single-view SPA, so it
ships without a router/SSR (all data arrives over one WebSocket from localhost - TanStack Start's routing and
loaders add nothing here). The wire types in `src/protocol.ts` mirror the mod's `Server/WireProtocol.cs`.

## Develop

```bash
npm install
npm run dev      # http://localhost:5273 - open it with the game running + 'snitch start'
npm run build    # static output in dist/ (embeddable + hostable)
```

## Deploy (Dokploy)

The repo ships a `Dockerfile` (build → nginx). In Dokploy: create an Application, point it at this repo, build
type **Dockerfile**, attach your domain (e.g. `snitch.doodesch.de`), deploy. The app is fully static; no env
vars or backend are required because it talks to the user's own localhost. See `DEPLOY.md` for the exact steps.
