import { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { LanInfo } from "./useSnitch";

/**
 * "Connect a phone": renders a QR of the in-game LAN endpoint so a phone on the same Wi-Fi can open the
 * dashboard in compact remote mode and drive the profiler. The URL carries #remote (compact UI) and the
 * pairing token. Shown only when the LAN endpoint is on (from /health); otherwise a one-line hint how to
 * enable it. Collapsed by default so it never clutters the desktop dashboard.
 */
export function ConnectPhone({ lan }: { lan: LanInfo | null }) {
  const [open, setOpen] = useState(false);
  const [svg, setSvg] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const enabled = !!lan?.enabled && !!lan.url;
  const phoneUrl = enabled
    ? `${lan!.url}#remote${lan!.token ? `&t=${encodeURIComponent(lan!.token)}` : ""}`
    : "";

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
        onClick={() => setOpen((o) => !o)}
        title="Use your phone as a remote for the profiler"
      >
        <span>📱 Connect a phone</span>
        <span className="flex items-center gap-2 text-xs font-normal">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ background: enabled ? "#a6e3a1" : "#6b7280" }}
          />
          <span className="text-gray-500">{enabled ? "LAN on" : "LAN off"}</span>
          <span className="text-gray-600">{open ? "▾" : "▸"}</span>
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4">
          {!enabled ? (
            <div className="text-xs text-gray-400 leading-relaxed">
              The phone remote is off. In the game console run{" "}
              <code className="bg-[#1e2230] px-1.5 py-0.5 rounded text-gray-200">snitch lan on</code> (or enable
              "Phone remote (LAN access)" in the mod settings). Then a QR appears here - scan it with a phone on
              the same Wi-Fi and use it to trigger actions without switching windows.
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <div
                className="rounded-lg bg-white p-2 shrink-0"
                style={{ width: 168, height: 168 }}
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{ __html: svg }}
              />
              <div className="text-xs text-gray-400 leading-relaxed flex flex-col gap-2">
                <div>
                  Scan with a phone on the <b className="text-gray-200">same Wi-Fi</b>. It opens a compact remote
                  to start/stop sampling and trigger every mod's actions - no need to switch back to this window.
                </div>
                <button
                  className="text-left font-mono text-[11px] text-[#89b4fa] break-all hover:underline"
                  onClick={copy}
                  title="Copy the URL"
                >
                  {phoneUrl} {copied ? "✓ copied" : "⧉"}
                </button>
                <div className="text-gray-500">
                  Pairing token <code className="bg-[#1e2230] px-1.5 py-0.5 rounded text-gray-300">{lan!.token}</code>.
                  If the phone can't connect, allow the port through the PC's firewall (Private network). Telemetry
                  stays on your LAN - it never leaves for this.
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
