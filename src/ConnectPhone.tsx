import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, ChevronRight, Copy, Smartphone } from "lucide-react";
import QRCode from "qrcode";
import { openRelay, newPairingCode, HOSTED_ORIGIN, type RelayHandle } from "./relay";
import type { LanInfo } from "./useSnitch";
import type { Snapshot } from "./protocol";

/**
 * "Connect a phone": renders a QR a phone scans to drive the profiler as a remote. This desktop tab is the
 * bridge - it is already connected to the local game, and here it also opens a relay connection as the "host"
 * so a phone on any network can reach it (payloads are end-to-end encrypted with the pairing token, which only
 * travels in the QR). It forwards each local snapshot to the phone and replays the phone's control back against
 * the local game. When the game's LAN endpoint is on, the QR also carries a same-Wi-Fi direct shortcut.
 *
 * Shown only when the connected mod advertises "phone-remote" (gated by App). Collapsed by default. The relay
 * bridge starts on first expand and stays up for the session, so collapsing the panel doesn't drop the phone.
 */
export function ConnectPhone({
  lan,
  port,
  snapshot,
  openSignal,
}: {
  lan: LanInfo | null;
  port: number | null;
  snapshot: Snapshot | null;
  /** Bumped by the top bar button: opens the panel and starts the pairing bridge. */
  openSignal?: number;
}) {
  const [open, setOpen] = useState(false);
  const [activated, setActivated] = useState(false);
  const [code, setCode] = useState("");
  const [token, setToken] = useState("");
  const [phones, setPhones] = useState(0);
  const [svg, setSvg] = useState("");
  const [copied, setCopied] = useState(false);
  const hostRef = useRef<RelayHandle | null>(null);
  const portRef = useRef<number | null>(port);
  portRef.current = port;

  // The QR carries the direct LAN shortcut only when the LAN endpoint is on, has a bundled dashboard to serve,
  // and its token is the one we paired with - so the shortcut's token always matches the LAN server.
  const includeLan = !!lan?.enabled && !!lan.bundled && !!lan.ip && !!lan.token && lan.token === token;
  const phoneUrl = code && token ? `${HOSTED_ORIGIN}/#join=${encodeURIComponent(code)}&t=${encodeURIComponent(token)}${includeLan ? `&lan=${lan!.ip}:${lan!.port}` : ""}` : "";

  const activate = () => {
    if (activated) return;
    setCode(newPairingCode());
    setToken(lan?.token || newPairingCode());
    setActivated(true);
  };
  const expand = () => {
    setOpen((o) => !o);
    activate();
  };

  // The top bar's phone button opens the panel from outside.
  const signalRef = useRef(openSignal ?? 0);
  useEffect(() => {
    if (openSignal == null || openSignal === signalRef.current) return;
    signalRef.current = openSignal;
    setOpen(true);
    activate();
  }, [openSignal]);

  // Host bridge: relay the local game to a phone. Runs for the session once activated.
  useEffect(() => {
    if (!activated || !code || !token) return;
    const handle = openRelay({
      role: "host",
      code,
      token,
      onData: (obj) => {
        // A control request from the phone: replay it against the local loopback server.
        const p = obj as Record<string, string>;
        if (!p || typeof p.cmd !== "string") return;
        const lp = portRef.current;
        if (lp == null) return;
        const params: Record<string, string> = { cmd: p.cmd };
        if (p.id) params.id = p.id;
        if (p.value) params.value = p.value;
        const qs = new URLSearchParams(params).toString();
        fetch(`http://127.0.0.1:${lp}/control?${qs}`, { method: "POST" }).catch((err) => {
          console.warn("[snitch] relaying a phone command to the game failed", err);
        });
      },
      onEvent: (ev, info) => {
        if (ev === "join" || ev === "leave") setPhones(info?.n ?? 0);
        else if (ev === "nohost" || ev === "close") setPhones(0);
      },
    });
    hostRef.current = handle;
    return () => {
      handle.close();
      hostRef.current = null;
    };
  }, [activated, code, token]);

  // Forward each local snapshot to the phone (encrypted by the relay layer).
  useEffect(() => {
    if (snapshot) hostRef.current?.send(snapshot);
  }, [snapshot]);

  useEffect(() => {
    if (!open || !phoneUrl) {
      setSvg("");
      return;
    }
    let cancelled = false;
    QRCode.toString(phoneUrl, { type: "svg", margin: 1, errorCorrectionLevel: "M" })
      .then((s) => {
        if (!cancelled) setSvg(s);
      })
      .catch((err) => {
        console.warn("[snitch] QR rendering failed", err);
        if (!cancelled) setSvg("");
      });
    return () => {
      cancelled = true;
    };
  }, [open, phoneUrl]);

  const copy = () => {
    if (!phoneUrl) return;
    navigator.clipboard?.writeText(phoneUrl).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      (err) => console.warn("[snitch] copying the phone URL failed", err),
    );
  };

  return (
    <section className="card phone">
      <button className="cardh cardh-btn" onClick={expand} aria-expanded={open} title="Use your phone as a remote for the profiler">
        <h2>
          <Smartphone size={18} aria-hidden /> Connect a phone
        </h2>
        <small className="phone-state">
          <span className={`phone-dot${phones > 0 ? " on" : ""}`} aria-hidden />
          {phones > 0 ? `${phones} phone${phones > 1 ? "s" : ""} connected` : activated ? "Ready to pair" : "Off"}
          {open ? <ChevronDown size={16} aria-hidden /> : <ChevronRight size={16} aria-hidden />}
        </small>
      </button>

      {open && (
        <div className="phone-body">
          <div className="phone-qr" dangerouslySetInnerHTML={{ __html: svg }} />
          <div className="phone-text">
            <p>
              Scan with your phone from <b>any network</b>. It opens a compact remote to start and stop sampling and
              trigger every mod's actions. Keep this tab open; it bridges the profiler to your phone.
            </p>
            {includeLan ? <p className="muted">On the same Wi-Fi, the phone can also connect directly, without the cloud.</p> : null}
            <button className="phone-url" onClick={copy} title="Copy the URL">
              <span>{phoneUrl}</span>
              {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
              {copied ? "Copied" : null}
            </button>
            <p className="muted">
              Data is end-to-end encrypted with a one-time key from the QR. The relay only forwards ciphertext.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
