# Deploying SnitchWeb to Dokploy

SnitchWeb is a fully static SPA (`Dockerfile` → nginx). It needs no backend or env vars - it talks to the
user's own `ws://127.0.0.1:6140`. Your Dokploy already has a GitHub provider connected
(`Dokploy-2026-05-16`, githubId `PzmSuOOgKtRgszFHMwOkL`) and an `experiments` project
(`nYtHcOa5JmyerFDV45J-h`), so the path is short.

## One-time

1. **Push the repo.** From `SnitchWeb/`:
   ```bash
   git init && git add -A && git commit -m "SnitchWeb v1.0.0"
   gh repo create DooDesch-Mods/ScheduleOne-SnitchWeb --public --source=. --push
   ```

2. **Create the Dokploy application** (new `Snitch` project, or reuse `experiments`):
   - Application → source: GitHub (the connected provider) → repo `DooDesch-Mods/ScheduleOne-SnitchWeb`, branch `main`.
   - Build type: **Dockerfile** (path `./Dockerfile`).
   - Deploy.

3. **Domain.** Either:
   - Instant, no DNS: generate a `traefik.me` domain (Dokploy → Domains → Generate) - gives a working HTTPS URL immediately.
   - Custom: add `snitch.doodesch.de` and point a DNS A/CNAME record at the Dokploy server; Dokploy issues the cert.

   The app's container port is **80**.

## Notes

- The hosted page connects to the user's localhost - so it only shows data when THAT user runs Schedule I with
  the Snitch mod. There is nothing per-user server-side; one static deployment serves everyone.
- `base: "./"` in `vite.config.ts` makes the same build work at the hosted root AND when embedded in the mod
  (`http://localhost:6140/`). The embedded copy is verified working; the hosted copy is byte-identical.
- Redeploys: push to `main`; enable Dokploy auto-deploy on push if desired.
