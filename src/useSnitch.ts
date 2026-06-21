import { useCallback, useEffect, useRef, useState } from "react";
import type { ConnState, Snapshot } from "./protocol";

// The in-mod server's default port + a small range to scan (matches Snitch's ServerPort preference).
const PORTS = [6140, 6141, 6142];

export interface SnitchConn {
  snapshot: Snapshot | null;
  status: ConnState;
  port: number | null;
  attempts: number;
  control: (cmd: "start" | "stop" | "reset" | "report") => void;
}

/**
 * Connects the dashboard to a local Snitch instance. On mount it scans the known loopback ports, opens a
 * WebSocket to /stream, and streams live snapshots. Auto-reconnects so it survives the game restarting. The
 * data never leaves the machine - the hosted page talks straight to ws://127.0.0.1. (Chrome may show a
 * one-time "allow local network access" prompt; the server already sends the Private-Network-Access header.)
 */
export function useSnitch(): SnitchConn {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [status, setStatus] = useState<ConnState>("searching");
  const [port, setPort] = useState<number | null>(null);
  const [attempts, setAttempts] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
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
  }, []);

  const control = useCallback(
    (cmd: "start" | "stop" | "reset" | "report") => {
      if (port == null) return;
      fetch(`http://127.0.0.1:${port}/control?cmd=${cmd}`, { method: "POST" }).catch(() => {
        /* control is best-effort */
      });
    },
    [port],
  );

  return { snapshot, status, port, attempts, control };
}
