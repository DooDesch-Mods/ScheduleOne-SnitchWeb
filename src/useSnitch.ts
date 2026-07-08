import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ConnState, Snapshot } from "./protocol";
import { openRelay, type RelayHandle } from "./relay";

// The loopback server's default port + a small range to scan (matches Snitch's ServerPort preference).
const PORTS = [6140, 6141, 6142];
const LOOPBACK = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/** The in-game LAN server exposes this under /health so the desktop can build the phone URL + QR. */
export interface LanInfo {
  enabled: boolean;
  ip?: string;
  port?: number;
  url?: string;
  token?: string;
  /** True when the game has a bundled dashboard to serve on the LAN (else only the relay path is offered). */
  bundled?: boolean;
}

export interface SnitchConn {
  snapshot: Snapshot | null;
  status: ConnState;
  port: number | null;
  attempts: number;
  /** "lan" = served by the in-game LAN server (same-Wi-Fi phone); "relay" = phone reaching the desktop through
   * the cloud relay; "desktop" = loopback/hosted dashboard. */
  mode: "desktop" | "lan" | "relay";
  /** Compact phone remote (via #remote, or implied by relay mode). */
  remote: boolean;
  /** relay mode only: whether a desktop host is currently bridging (false = ask the user to open the dashboard). */
  hostPresent: boolean;
  /** relay mode only: a same-Wi-Fi shortcut URL to the in-game LAN server, if the QR carried one. */
  directUrl: string | null;
  /** Capability tokens the connected mod advertises (from /health or the snapshot meta). Feature-gate on these
   * rather than the version string - an older Snitch simply omits tokens it doesn't have. */
  caps: string[];
  /** LAN endpoint info from /health (desktop mode) so the dashboard can render a "connect a phone" QR. */
  lan: LanInfo | null;
  control: (cmd: "start" | "stop" | "reset" | "report") => void;
  sendAction: (id: string) => void;
  sendToggle: (id: string, value: boolean) => void;
}

/** Parse the QR hash. Phase 1: "#remote&t=abcd". Phase 2 (relay): "#join=<code>&t=<token>&lan=<ip:port>". */
function parseHash(): { remote: boolean; token: string; join: string; lan: string } {
  const h = (typeof location !== "undefined" ? location.hash : "").replace(/^#/, "");
  let remote = false;
  let token = "";
  let join = "";
  let lan = "";
  for (const part of h.split(/[&/?]/)) {
    if (!part) continue;
    const [k, v] = part.split("=");
    if (k === "remote") remote = true;
    else if (k === "t" || k === "token") token = decodeURIComponent(v ?? "");
    else if (k === "join") join = decodeURIComponent(v ?? "");
    else if (k === "lan") lan = decodeURIComponent(v ?? "");
  }
  return { remote, token, join, lan };
}

/**
 * "relay": the QR carried a pairing code (#join=...) - the phone reaches the desktop through the cloud relay.
 * "lan": the page was served over plain HTTP from a non-loopback host - the in-game LAN server delivered it to
 * a same-Wi-Fi phone, so we talk same-origin to that host. Otherwise (loopback bundle or hosted HTTPS site) we
 * use the classic 127.0.0.1 WebSocket scan.
 */
function detectMode(join: string): "desktop" | "lan" | "relay" {
  if (join) return "relay";
  if (typeof location === "undefined") return "desktop";
  if (LOOPBACK.has(location.hostname)) return "desktop";
  if (location.protocol === "http:") return "lan";
  return "desktop";
}

/**
 * Connects the dashboard to a Snitch instance. Two transports, one interface:
 *  - desktop/hosted: scans loopback ports and streams live snapshots over WebSocket (the original path).
 *  - phone/LAN: polls same-origin /snapshot from the in-game LAN server (which has no WebSocket) and sends
 *    control with the pairing token carried in the QR hash.
 * Both auto-recover; the data never transits a third party.
 */
export function useSnitch(): SnitchConn {
  const { remote: remoteFlag, token, join, lan: lanParam } = useMemo(parseHash, []);
  const mode = useMemo(() => detectMode(join), [join]);
  const remote = remoteFlag || mode === "relay";
  const directUrl = lanParam ? `http://${lanParam}/#remote${token ? `&t=${encodeURIComponent(token)}` : ""}` : null;

  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [status, setStatus] = useState<ConnState>("searching");
  const [port, setPort] = useState<number | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [lan, setLan] = useState<LanInfo | null>(null);
  const [caps, setCaps] = useState<string[]>([]);
  const [hostPresent, setHostPresent] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);
  const relayRef = useRef<RelayHandle | null>(null);

  // ----- desktop/hosted: loopback WebSocket scan (unchanged behaviour) -----
  useEffect(() => {
    if (mode !== "desktop") return;
    let cancelled = false;
    let idx = 0;
    let retry: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      if (cancelled) return;
      const p = PORTS[idx % PORTS.length];
      let opened = false; // only advance the port scan if THIS socket never connected
      let ws: WebSocket;
      try {
        ws = new WebSocket(`ws://127.0.0.1:${p}/stream`);
      } catch {
        idx++;
        setAttempts((a) => a + 1);
        retry = setTimeout(connect, 1500);
        return;
      }
      wsRef.current = ws;

      ws.onopen = () => {
        if (cancelled) {
          ws.close();
          return;
        }
        opened = true;
        setPort(p);
        setStatus("connected");
      };
      ws.onmessage = (e) => {
        try {
          const s = JSON.parse(e.data as string) as Snapshot;
          setSnapshot(s);
          setStatus(s.meta?.active ? "connected" : "idle");
          if (Array.isArray(s.meta?.caps)) setCaps(s.meta.caps);
        } catch {
          /* ignore malformed frame */
        }
      };
      ws.onclose = () => {
        if (cancelled) return;
        wsRef.current = null;
        if (!opened) idx++; // a working port that dropped (game restart) is retried first, not skipped
        setAttempts((a) => a + 1);
        setStatus("searching");
        retry = setTimeout(connect, 1500);
      };
      ws.onerror = () => {
        try {
          ws.close();
        } catch {
          /* onclose handles retry */
        }
      };
    };

    connect();
    return () => {
      cancelled = true;
      if (retry) clearTimeout(retry);
      try {
        wsRef.current?.close();
      } catch {
        /* noop */
      }
    };
  }, [mode]);

  // ----- desktop/hosted: poll /health for the LAN endpoint (so the "connect a phone" QR appears/updates when
  // the user runs 'snitch lan on' at runtime). Only meaningful once a loopback port is known. -----
  useEffect(() => {
    if (mode !== "desktop" || port == null) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      try {
        const r = await fetch(`http://127.0.0.1:${port}/health`, { cache: "no-store" });
        if (r.ok) {
          const h = await r.json();
          if (!cancelled) {
            // Preserve "no lan field" (older mod) as null, distinct from an explicit {enabled:false} (LAN off).
            setLan((h?.lan as LanInfo) ?? null);
            if (Array.isArray(h?.caps)) setCaps(h.caps);
          }
        }
      } catch {
        /* health is best-effort */
      } finally {
        if (!cancelled) timer = setTimeout(tick, 3000);
      }
    };
    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [mode, port]);

  // ----- phone/LAN: same-origin snapshot polling (the LAN server has no WebSocket) -----
  useEffect(() => {
    if (mode !== "lan") return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const q = token ? `?token=${encodeURIComponent(token)}` : "";
    setPort(Number(location.port) || null);

    const poll = async () => {
      if (cancelled) return;
      try {
        const r = await fetch(`/snapshot${q}`, { cache: "no-store" });
        if (r.ok) {
          const s = (await r.json()) as Snapshot;
          if (!cancelled) {
            setSnapshot(s);
            setStatus(s.meta?.active ? "connected" : "idle");
            if (Array.isArray(s.meta?.caps)) setCaps(s.meta.caps);
          }
        } else {
          if (!cancelled) {
            setStatus("searching");
            setAttempts((a) => a + 1);
          }
        }
      } catch {
        if (!cancelled) {
          setStatus("searching");
          setAttempts((a) => a + 1);
        }
      } finally {
        if (!cancelled) timer = setTimeout(poll, 400);
      }
    };
    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [mode, token]);

  // ----- phone/relay: reach the desktop host through the cloud relay (payloads are E2E-encrypted) -----
  useEffect(() => {
    if (mode !== "relay" || !join) return;
    const handle = openRelay({
      role: "client",
      code: join,
      token,
      onData: (obj) => {
        const s = obj as Snapshot;
        if (s && s.type === "snapshot") {
          setSnapshot(s);
          setStatus(s.meta?.active ? "connected" : "idle");
          if (Array.isArray(s.meta?.caps)) setCaps(s.meta.caps);
          setHostPresent(true);
        }
      },
      onEvent: (ev, info) => {
        if (ev === "nohost") {
          setHostPresent(false);
          setStatus("searching");
        } else if (ev === "ready" || ev === "join" || ev === "open") {
          setHostPresent(true);
          // Same LAN as the game (shared public IP): connect directly and skip the cloud. The relay was only the
          // rendezvous. Once-guard so that if the direct page can't load, going back keeps you on the relay.
          if (ev === "ready" && info?.sameNet && directUrl && !sessionStorage.getItem("snitch-tried-direct")) {
            try {
              sessionStorage.setItem("snitch-tried-direct", "1");
              window.location.href = directUrl;
            } catch {
              /* stay on the relay */
            }
          }
        } else if (ev === "close") {
          setStatus("searching");
        }
      },
    });
    relayRef.current = handle;
    return () => {
      handle.close();
      relayRef.current = null;
    };
  }, [mode, join, token]);

  // Single best-effort control POST. LAN mode goes same-origin with the pairing token; desktop mode hits the
  // known loopback port (matches the server: cmd/id/value read from the query string).
  const post = useCallback(
    (params: Record<string, string>) => {
      if (mode === "relay") {
        // Sent to the desktop host over the relay; the host replays it against the local game.
        relayRef.current?.send({ ...params });
        return;
      }
      const qp = { ...params };
      let base: string;
      if (mode === "lan") {
        if (token) qp.token = token;
        base = "";
      } else {
        if (port == null) return;
        base = `http://127.0.0.1:${port}`;
      }
      const qs = new URLSearchParams(qp).toString();
      fetch(`${base}/control?${qs}`, { method: "POST" }).catch(() => {
        /* control is best-effort */
      });
    },
    [mode, port, token],
  );

  const control = useCallback((cmd: "start" | "stop" | "reset" | "report") => post({ cmd }), [post]);
  const sendAction = useCallback((id: string) => post({ cmd: "action", id }), [post]);
  const sendToggle = useCallback(
    (id: string, value: boolean) => post({ cmd: "toggle", id, value: value ? "true" : "false" }),
    [post],
  );

  return { snapshot, status, port, attempts, mode, remote, hostPresent, directUrl, caps, lan, control, sendAction, sendToggle };
}
