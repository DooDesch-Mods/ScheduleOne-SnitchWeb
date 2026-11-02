import { useState } from "react";
import { CircleCheck, CirclePause, Download, LoaderCircle, Play, RotateCcw, Square, Zap } from "lucide-react";
import type { SnitchConn } from "./useSnitch";
import { Standings } from "./Standings";
import { Bib, Switch, WindowSeg, fmt } from "./ui";
import { WINDOWS, useClock, useHistory, useStandings, type WindowKey } from "./history";
import { identityOf } from "./identity";

const PREVIEW_ROWS = 5;

/**
 * The phone remote: the same race language as the dashboard in one portrait column. The standings list shows
 * the leader and the gaps, the bottom bar holds Start/Stop, and every mod panel keeps its toggles, sliders and
 * actions as large tap targets. Rendered when the URL carries #remote or the phone joins through the relay.
 */
export function RemoteView({ conn }: { conn: SnitchConn }) {
  const { snapshot, status, control, sendAction, sendToggle, sendSlider, mode, hostPresent, directUrl } = conn;
  const [win, setWin] = useState<WindowKey>("30s");
  const [showAll, setShowAll] = useState(false);
  const connected = status === "connected" || status === "idle";
  const panels = snapshot?.panels ?? [];
  const active = !!snapshot?.meta?.active;
  const viaRelay = mode === "relay";

  const store = useHistory(snapshot);
  const now = useClock(1000);
  const st = useStandings(store, win, now, active);
  const winInfo = WINDOWS.find((w) => w.key === win)!;
  const f = st.frame;

  const text = status === "connected" ? "Connected - sampling" : status === "idle" ? "Connected - sampling off" : "Searching";
  const Icon = status === "connected" ? CircleCheck : status === "idle" ? CirclePause : LoaderCircle;

  const preview = showAll ? st.riders : st.riders.slice(0, PREVIEW_ROWS);

  return (
    <div className="remote">
      <header className="bar bar-remote">
        <h1 className="brand">Snitch</h1>
        <div className="conn">
          <Icon size={16} strokeWidth={2.5} className={`conn-i ${status}`} aria-hidden />
          <span>{text}</span>
        </div>
        <div className="grow" />
        {connected && (
          <div className="stat" title="Mean frame time over the selected window.">
            <b>{fmt(f.avgFps, 0)}</b>
            <span>FPS</span>
          </div>
        )}
      </header>

      <div className="remote-body">
        {directUrl && (
          <a className="btn fill-navy block" href={directUrl} title="Connect directly over your Wi-Fi">
            <Zap size={16} aria-hidden /> Same Wi-Fi? Connect directly
          </a>
        )}

        {!connected ? (
          <div className="card">
            <p className="card-body">
              {viaRelay && !hostPresent ? (
                <>
                  Waiting for your PC. Open <b>snitch.doodesch.de</b> on the computer running the game and expand
                  "Connect a phone"; that tab bridges the profiler to your phone.
                </>
              ) : viaRelay ? (
                <>Connecting through the relay. Keep the desktop dashboard tab open on your PC.</>
              ) : (
                <>
                  Connecting to Snitch on this network. Make sure the game is running and the phone is on the same
                  Wi-Fi. If it stays here, allow the port through the PC's firewall (Private network).
                </>
              )}
            </p>
          </div>
        ) : (
          <>
            <div className="remote-frame">
              <div className="stat big-stat" title="Mean frame time over the selected window.">
                <b>{fmt(f.avgMs)} ms</b>
                <span>frame - p95 {fmt(f.p95)} ms</span>
              </div>
              <WindowSeg value={win} onChange={setWin} />
            </div>

            <section className="card" aria-labelledby="r-stand">
              <div className="cardh">
                <h2 id="r-stand">Standings</h2>
                <small>{f.count < 2 ? `window ${winInfo.label}` : `last ${winInfo.label}`}</small>
              </div>
              <Standings riders={preview} scaleMax={st.scaleMax} rowHeight={52} compact />
              {st.riders.length > PREVIEW_ROWS && (
                <button className="more" onClick={() => setShowAll((s) => !s)}>
                  {showAll ? "Show fewer" : `Show all ${st.riders.length} riders`}
                </button>
              )}
            </section>

            {panels.map((p) => {
              const sliders = p.sliders ?? [];
              if (p.actions.length === 0 && p.toggles.length === 0 && sliders.length === 0 && !p.text) return null;
              const id = identityOf(p.id, st.bibs);
              const ms = st.modMs.get(p.id.toLowerCase());
              return (
                <section key={p.id} className="pn" style={{ ["--tc" as string]: id.color }}>
                  <div className="pnh static">
                    <Bib n={id.bib} color={id.color} />
                    <h2>{p.title}</h2>
                    <span className="pnh-r">{ms != null ? <span className="pnh-ms">{fmt(ms)} ms</span> : null}</span>
                  </div>
                  <div className="pnb">
                    {p.text ? <pre className="pn-text">{p.text}</pre> : null}

                    {p.toggles.map((t) => (
                      <div key={t.id} className="ctl ctl-tap">
                        <span>{t.label}</span>
                        <span className="ctl-val">
                          <span className="unit">{t.value ? "On" : "Off"}</span>
                          <Switch on={t.value} label={t.label} onToggle={() => sendToggle(t.id, !t.value)} />
                        </span>
                      </div>
                    ))}

                    {sliders.map((s) => (
                      <label key={s.id} className="ctl ctl-col">
                        <span className="ctl-top">
                          <span>{s.label}</span>
                          <span className="big">
                            {s.value.toFixed(s.step >= 1 || s.step <= 0 ? 2 : s.step >= 0.01 ? 2 : 3)}
                            {s.unit ? ` ${s.unit}` : ""}
                          </span>
                        </span>
                        {/* No local drag state here, unlike the desktop card: on a touch screen the finger is on the
                            knob, not tracking a cursor, and the snapshot's value is what the game really has. */}
                        <input
                          type="range"
                          className="range"
                          min={s.min}
                          max={s.max}
                          step={s.step > 0 ? s.step : "any"}
                          value={s.value}
                          onChange={(e) => sendSlider(s.id, Number(e.target.value))}
                        />
                      </label>
                    ))}

                    {p.actions.length > 0 && (
                      <div className="ctl ctl-actions">
                        {p.actions.map((a) => (
                          <button key={a.id} className="btn tap" onClick={() => sendAction(a.id)}>
                            {a.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              );
            })}

            {panels.length === 0 && (
              <p className="empty">No mod panels yet. Enter the world so mods register their panels, then start sampling.</p>
            )}
          </>
        )}

        <footer className="foot">
          Talking straight to your PC. Need help? <a href="https://support.doodesch.de">support.doodesch.de</a>
        </footer>
      </div>

      {connected && (
        <div className="remote-actions">
          {active ? (
            <button className="btn fill grow" onClick={() => control("stop")}>
              <Square size={18} strokeWidth={2.5} aria-hidden /> Stop sampling
            </button>
          ) : (
            <button className="btn fill grow" onClick={() => control("start")}>
              <Play size={18} strokeWidth={2.5} aria-hidden /> Start sampling
            </button>
          )}
          <button className="btn ghost icon" onClick={() => control("reset")} aria-label="Reset" title="Reset">
            <RotateCcw size={20} aria-hidden />
          </button>
          <button className="btn ghost icon" onClick={() => control("report")} aria-label="Export report" title="Export report">
            <Download size={20} aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
