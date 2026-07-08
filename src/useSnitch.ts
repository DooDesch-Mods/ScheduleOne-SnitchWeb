import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ConnState, Snapshot } from "./protocol";

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
}

export interface SnitchConn {
  snapshot: Snapshot | null;
  status: ConnState;
  port: number | null;
  attempts: number;
  /** "lan" when this page is served by the in-game LAN server (phone); "desktop" for loopback/hosted. */
  mode: "desktop" | "lan";
  /** Compact phone remote requested via #remote in the URL. */
  remote: boolean;
  /** Capability tokens the connected mod advertises (from /health or the snapshot meta). Feature-gate on these
   * rather than the version string - an older Snitch simply omits tokens it doesn't have. */
  caps: string[];
  /** LAN endpoint info from /health (desktop mode) so the dashboard can render a "connect a phone" QR. */
  lan: LanInfo | null;
  control: (cmd: "start" | "stop" | "reset" | "report") => void;
  sendAction: (id: string) => void;
  sendToggle: (id: string, value: boolean) => void;
}

/** Parse the QR hash, e.g. "#remote&t=abcd1234" -> { remote: true, token: "abcd1234" }. */
function parseHash(): { remote: boolean; token: string } {
  const h = (typeof location !== "undefined" ? location.hash : "").replace(/^#/, "");
  let remote = false;
  let token = "";
  for (const part of h.split(/[&/?]/)) {
    if (!part) continue;
    const [k, v] = part.split("=");
    if (k === "remote") remote = true;
    else if (k === "t" || k === "token") token = decodeURIComponent(v ?? "");
  }
  return { remote, token };
}

/**
 * "lan": the page was served over plain HTTP from a non-loopback host - i.e. the in-game LAN server delivered
 * it to a phone. In that case we talk same-origin to that very host (no mixed content, no port scan). Anything
 * else (loopback bundle, or the hosted HTTPS site) uses the classic 127.0.0.1 WebSocket scan.
 */
function detectMode(): "desktop" | "lan" {
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
  const mode = useMemo(detectMode, []);
  const { remote, token } = useMemo(parseHash, []);

  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [status, setStatus] = useState<ConnState>("searching");
  const [port, setPort] = useState<number | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [lan, setLan] = useState<LanInfo | null>(null);
  const [caps, setCaps] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

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

  // Single best-effort control POST. LAN mode goes same-origin with the pairing token; desktop mode hits the
  // known loopback port (matches the server: cmd/id/value read from the query string).
  const post = useCallback(
    (params: Record<string, string>) => {
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

  return { snapshot, status, port, attempts, mode, remote, caps, lan, control, sendAction, sendToggle };
}
