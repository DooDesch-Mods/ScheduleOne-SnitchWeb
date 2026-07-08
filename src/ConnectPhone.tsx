import { useEffect, useRef, useState } from "react";
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
}: {
  lan: LanInfo | null;
  port: number | null;
  snapshot: Snapshot | null;
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

  // The QR carries the direct LAN shortcut only when the LAN endpoint is on AND its token is the one we paired
  // with (i.e. it was available when we activated), so the shortcut's token always matches the LAN server.
  const includeLan = !!lan?.enabled && !!lan.ip && !!lan.token && lan.token === token;
  const phoneUrl = code && token ? `${HOSTED_ORIGIN}/#join=${encodeURIComponent(code)}&t=${encodeURIComponent(token)}${includeLan ? `&lan=${lan!.ip}:${lan!.port}` : ""}` : "";

  const expand = () => {
    setOpen((o) => !o);
    if (!activated) {
      setCode(newPairingCode());
      setToken(lan?.token || newPairingCode());
      setActivated(true);
    }
  };

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
        fetch(`http://127.0.0.1:${lp}/control?${qs}`, { method: "POST" }).catch(() => {
          /* best-effort */
        });
      },
      onEvent: (ev, n) => {
        if (ev === "join" || ev === "leave") setPhones(n ?? 0);
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
      .catch(() => {
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
      () => {},
    );
  };

  return (
    <div className="mt-4 rounded-xl bg-[#11151f] border border-[#1b1f2e]">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-300 hover:opacity-80"
        onClick={expand}
        title="Use your phone as a remote for the profiler"
      >
        <span>📱 Connect a phone</span>
        <span className="flex items-center gap-2 text-xs font-normal">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ background: phones > 0 ? "#a6e3a1" : activated ? "#f9e2af" : "#6b7280" }}
          />
          <span className="text-gray-500">
            {phones > 0 ? `${phones} phone${phones > 1 ? "s" : ""} connected` : activated ? "ready to pair" : "off"}
          </span>
          <span className="text-gray-600">{open ? "▾" : "▸"}</span>
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <div
              className="rounded-lg bg-white p-2 shrink-0"
              style={{ width: 168, height: 168 }}
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: svg }}
            />
            <div className="text-xs text-gray-400 leading-relaxed flex flex-col gap-2">
              <div>
                Scan with your phone from <b className="text-gray-200">any network</b>. It opens a compact remote
                to start/stop sampling and trigger every mod's actions - no need to switch back to this window.
                Keep this tab open; it bridges the profiler to your phone.
              </div>
              {includeLan ? (
                <div className="text-gray-500">
                  On the same Wi-Fi, the phone can also connect directly (faster, no cloud) with one tap.
                </div>
              ) : null}
              <button
                className="text-left font-mono text-[11px] text-[#89b4fa] break-all hover:underline"
                onClick={copy}
                title="Copy the URL"
              >
                {phoneUrl} {copied ? "✓ copied" : "⧉"}
              </button>
              <div className="text-gray-500">
                Data is end-to-end encrypted with a one-time key from the QR - the relay only forwards ciphertext,
                so your telemetry stays private even over the internet.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
