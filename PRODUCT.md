# Product

Snitch is a performance profiler for the game Schedule I. It is a MelonLoader mod with three surfaces that
share one design language: the in-game overlay, the web dashboard, and the phone remote.

## Platform

web

The in-game overlay renders through Sideload, a managed HTML/CSS/JS renderer that turns a page into Unity
uGUI. It reads a CSS subset (see Capabilities and Constraints), so the overlay is web code under extra limits.

## Stack

- Web dashboard and phone remote: one Vite 6 + React 19 + TypeScript + Tailwind 4 SPA (`src/`), charts with
  uPlot. `RemoteView.tsx` replaces the dashboard when the page is opened as a phone remote.
- Hosted at snitch.doodesch.de (Dockerfile, nginx, Dokploy) and bundled inside the mod as an offline copy
  served from `http://localhost:6140/`.
- In-game overlay: a Sideload bundle (`index.html`, `app.css`, `app.js`) mounted by the Snitch mod on its
  own screen canvas, talking to C# through `s1.call` / `s1.on`.

## Users

Mod authors first. A modder wires Snitch into their mod (`Snitch.Api`, `SnitchProbe`), times sections,
builds a panel with counters, states, actions, toggles, sliders and a log channel, and uses Snitch to find
what their mod costs per frame.

Players second. A player whose game stutters installs Snitch on a support person's advice, runs
`snitch start`, and reads which mod or system eats the frame.

## Product Purpose

Measure what is actually slow in a modded Schedule I session and say so honestly, including what it cannot
explain. Replace per-mod debug hotkeys and debug windows with one place where every mod's panel lives.

## Positioning

The only profiler built for this game's IL2CPP build. Engine counters are inert there, so Snitch treats
frame time and GC as the truth and its own section timing as attribution. It reports the unattributed part
of a frame as a number instead of hiding it, and it reports its own overhead (`Snitch.Self`).

## Operating Context

- In game: the player is mid-session, often in a stutter, with mouse and keyboard on the game. The overlay
  sits over the 3D scene and must stay readable over any background, day or night.
- Web dashboard: on a second monitor or alt-tabbed browser, next to the running game, for minutes to an
  hour while the modder reproduces a problem.
- Phone remote: in one hand while the other hand plays; scanned from a QR, same Wi-Fi or relayed across
  networks, end-to-end encrypted.

## Capabilities and Constraints

- Telemetry never leaves the PC. The dashboard connects to `ws://127.0.0.1:6140`; the phone path is an
  end-to-end encrypted relay.
- The in-game overlay is compact: FPS and frame time, Start/Stop/Reset, top costs, every mod's panel with
  its actions, toggles and sliders, and the phone QR. Deep analysis (charts over time, section tables,
  states, the log timeline, ablation, reports) lives in the web dashboard.
- The in-game overlay replaces Hotline. Snitch draws mod panels itself; the Hotline dependency goes away.
- Sideload limits: every element is a flex column; one-sided borders become flat quads; `await fetch`
  freezes the game (use `.then()`); text renders with TextMeshPro.
- Profiling is read-only. State-changing levers (ablation) are host-only in multiplayer.

## Brand Commitments

Snitch has its own identity, consistent across all three surfaces. DooDesch appears only as author and
support link. Not the shared DooDesch.UI look, and not Hotline's IMGUI look.

## Evidence on Hand

- Live dashboard at snitch.doodesch.de and its source in this repo.
- Old in-game look: `Workspace/docs/Snitch/Images/Ingame.png`, `Workspace/docs/Hotline/Images/Ingame.png`
  (anti-reference).
- Phone remote screenshot: `Workspace/docs/Snitch/Images/Phone.png`.
- Real data from any test slot via `snitch start` plus a mod stack with Snitch probes.

## Product Principles

- Every number self-certifies: unit, window, and source are visible or one step away.
- Silence is never read as "cheap": what Snitch cannot explain is shown as its own line.
- A modder's panel shows up with zero UI code from the modder.
- The overlay costs near nothing while hidden and little while shown; a profiler that changes what it
  measures is worse than none.

## Accessibility & Inclusion

Numbers must stay legible over a moving 3D scene and on a small phone in daylight. Status is never carried
by colour alone (good/bad frames also differ in shape or label). English UI.
