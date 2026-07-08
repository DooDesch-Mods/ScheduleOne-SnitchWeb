import type { SnitchConn } from "./useSnitch";

const fpsColor = (fps: number) => (fps >= 50 ? "#a6e3a1" : fps >= 30 ? "#f9e2af" : "#f38ba8");
const fmt = (n: number, d = 0) => (Number.isFinite(n) ? n.toFixed(d) : "0");

/**
 * The phone remote: a thumb-friendly control surface rather than the full analytics dashboard. Big FPS
 * headline, sampling controls, and every mod panel's actions/toggles as large tap targets - so you can trigger
 * things from your phone without reaching for the desktop. Rendered when the URL carries #remote.
 */
export function RemoteView({ conn }: { conn: SnitchConn }) {
  const { snapshot, status, control, sendAction, sendToggle } = conn;
  const connected = status === "connected" || status === "idle";
  const f = snapshot?.frame;
  const panels = snapshot?.panels ?? [];
  const active = snapshot?.meta?.active;
  const dot = status === "connected" ? "#a6e3a1" : status === "idle" ? "#f9e2af" : "#f38ba8";

  return (
    <div className="min-h-full max-w-md mx-auto px-4 py-4 flex flex-col gap-4">
      <style>{`
        .rbtn{font-size:16px;font-weight:600;padding:14px 16px;border-radius:12px;background:#1b2030;border:1px solid #2a2f42;color:#cdd6f4;cursor:pointer;transition:background .12s;min-height:52px;-webkit-tap-highlight-color:transparent}
        .rbtn:active{background:#2a3350}
        .rbtn.primary{background:#2a3350;border-color:#3a4570}
        .rrow{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border-radius:12px;background:#0d1018;border:1px solid #1b1f2e;min-height:52px}
        .rswitch{width:52px;height:30px;border-radius:999px;background:#2a2f42;position:relative;transition:background .15s;flex:none}
        .rswitch.on{background:#89b4fa}
        .rknob{position:absolute;top:3px;left:3px;width:24px;height:24px;border-radius:999px;background:#cdd6f4;transition:transform .15s}
        .rswitch.on .rknob{transform:translateX(22px)}
      `}</style>

      <header className="flex items-center justify-between">
        <h1 className="text-lg font-bold tracking-tight">
          Snitch<span className="text-gray-500 font-normal"> remote</span>
        </h1>
        <span className="flex items-center gap-2 text-sm text-gray-400">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: dot }} />
          {status}
        </span>
      </header>

      {!connected ? (
        <div className="rounded-xl bg-[#11151f] border border-[#1b1f2e] p-6 text-center text-sm text-gray-400">
          Connecting to Snitch on this network… Make sure the game is running and the phone is on the same Wi-Fi.
          If it stays here, allow the port through the PC's firewall (Private network).
        </div>
      ) : (
        <>
          <div className="rounded-xl bg-[#11151f] border border-[#1b1f2e] p-4 text-center">
            <div className="text-5xl font-semibold mono leading-none" style={{ color: fpsColor(f?.meanFps ?? 0) }}>
              {fmt(f?.meanFps ?? 0)}
              <span className="text-lg text-gray-400 font-normal ml-1">fps</span>
            </div>
            <div className="text-xs text-gray-500 mt-2 mono">
              {fmt(f?.meanMs ?? 0, 2)} ms · p95 {fmt(f?.p95Ms ?? 0, 2)} ms · min {fmt(f?.minFps ?? 0)} fps
            </div>
            {snapshot?.meta?.scene ? (
              <div className="text-[11px] text-gray-600 mt-1">{snapshot.meta.scene}</div>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {active ? (
              <button className="rbtn" onClick={() => control("stop")}>
                ⏸ Stop
              </button>
            ) : (
              <button className="rbtn primary" onClick={() => control("start")}>
                ▶ Start
              </button>
            )}
            <button className="rbtn" onClick={() => control("reset")}>
              ↺ Reset
            </button>
            <button className="rbtn col-span-2" onClick={() => control("report")}>
              ⤓ Export report
            </button>
          </div>

          {panels.map((p) => {
            if (p.actions.length === 0 && p.toggles.length === 0 && !p.text) return null;
            return (
              <div key={p.id} className="rounded-xl bg-[#11151f] border border-[#1b1f2e] p-4 flex flex-col gap-3">
                <h2 className="text-sm font-semibold text-gray-300">{p.title}</h2>

                {p.text ? (
                  <pre className="text-xs text-gray-400 whitespace-pre-wrap mono leading-relaxed m-0">{p.text}</pre>
                ) : null}

                {p.toggles.map((t) => (
                  <button
                    key={t.id}
                    className="rrow text-left"
                    onClick={() => sendToggle(t.id, !t.value)}
                    aria-pressed={t.value}
                  >
                    <span className="text-sm text-gray-200">{t.label}</span>
                    <span className={`rswitch ${t.value ? "on" : ""}`}>
                      <span className="rknob" />
                    </span>
                  </button>
                ))}

                {p.actions.length > 0 && (
                  <div className="grid grid-cols-1 gap-2">
                    {p.actions.map((a) => (
                      <button key={a.id} className="rbtn" onClick={() => sendAction(a.id)}>
                        {a.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {panels.length === 0 && (
            <div className="text-xs text-gray-500 text-center">
              No mod panels yet. Enter the world so mods register their panels, then start sampling.
            </div>
          )}
        </>
      )}

      <footer className="text-[11px] text-gray-600 text-center mt-2 pb-2">
        Talking straight to your PC on the LAN. Need help?{" "}
        <a className="text-[#89b4fa]" href="https://support.doodesch.de">
          support.doodesch.de
        </a>
      </footer>
    </div>
  );
}
