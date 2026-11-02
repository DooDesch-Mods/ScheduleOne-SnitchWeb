import { useRef, useState } from "react";
import { CircleCheck, CirclePause, Download, LoaderCircle, Play, RotateCcw, Smartphone, Square } from "lucide-react";
import { FrameChart } from "./FrameChart";
import { LogView } from "./LogView";
import { RemoteView } from "./RemoteView";
import { ConnectPhone } from "./ConnectPhone";
import { Standings } from "./Standings";
import { CounterList, ModPanel, StateList, ownerOf } from "./Panels";
import { WindowSeg, fmt } from "./ui";
import { WINDOWS, useClock, useHistory, useStandings, type WindowKey } from "./history";
import { useSnitch, type SnitchConn } from "./useSnitch";

export default function App() {
  const conn = useSnitch();
  if (conn.remote) return <RemoteView conn={conn} />;
  return <Dashboard conn={conn} />;
}

function Dashboard({ conn }: { conn: SnitchConn }) {
  const { snapshot, status, port, attempts, control, sendAction, sendToggle, sendSlider, caps, lan } = conn;
  const [win, setWin] = useState<WindowKey>("30s");
  const [phoneSignal, setPhoneSignal] = useState(0);
  const phoneRef = useRef<HTMLDivElement>(null);
  const connected = status === "connected" || status === "idle";
  const active = !!snapshot?.meta?.active;
  const panels = snapshot?.panels ?? [];
  const counters = snapshot?.counters ?? [];
  const states = snapshot?.states ?? [];

  const store = useHistory(snapshot);
  const now = useClock(1000);
  const st = useStandings(store, win, now, active);
  const winInfo = WINDOWS.find((w) => w.key === win)!;
  const f = st.frame;

  const panelIds = new Set(panels.map((p) => p.id.toLowerCase()));
  const looseCounters = counters.filter((c) => !panelIds.has(ownerOf(c.id).toLowerCase()));
  const looseStates = states.filter((b) => !panelIds.has(ownerOf(b.id).toLowerCase()));

  const openPhone = () => {
    setPhoneSignal((n) => n + 1);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    phoneRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };

  return (
    <div className="app">
      <TopBar
        status={status}
        port={port}
        snapshot={snapshot}
        fps={f.avgFps}
        ms={f.avgMs}
        win={win}
        onWin={setWin}
        active={active}
        control={control}
        showPhone={caps.includes("phone-remote")}
        onPhone={openPhone}
      />

      {!connected ? (
        <Searching attempts={attempts} />
      ) : (
        <>
          <main className="stage">
            <section className="card" aria-labelledby="h-stand">
              <div className="cardh">
                <h2 id="h-stand">Live standings - ms per frame</h2>
                <small>{coverage(win, f.covered, f.count)}</small>
              </div>
              {st.riders.length <= 1 && (snapshot?.sections?.length ?? 0) === 0 ? (
                <div className="empty">
                  Only the unattributed rider is running. Enable <b>snitch vanilla on</b> or register{" "}
                  <b>Snitch.Sample(...)</b> in a mod to add riders.
                </div>
              ) : null}
              <div className="stand-wrap">
                <Standings riders={st.riders} scaleMax={st.scaleMax} rowHeight={54} />
              </div>
            </section>

            <section className="card" aria-labelledby="h-chart">
              <div className="cardh">
                <h2 id="h-chart">Frame time</h2>
                <small title="Garbage collections per 1000 frames, averaged over the window. High means allocation churn, a common stutter source.">
                  GC per 1k frames: gen0 {fmt(f.gc0, 1)}, gen1 {fmt(f.gc1, 1)}
                </small>
              </div>
              <div className="chartwrap">
                <FrameChart
                  samples={st.windowSamples}
                  refAt={st.refAt}
                  winMs={winInfo.ms}
                  avgMs={f.avgMs}
                  p95={f.p95}
                  p99={f.p99}
                  worstMs={f.maxMs}
                />
              </div>
            </section>
          </main>

          {panels.length > 0 && (
            <section className="band" aria-labelledby="h-panels">
              <h2 id="h-panels" className="band-h">
                Mod panels
              </h2>
              <div className="panels">
                {panels.map((p) => (
                  <ModPanel
                    key={p.id}
                    panel={p}
                    counters={counters}
                    states={states}
                    standings={st}
                    sendAction={sendAction}
                    sendToggle={sendToggle}
                    sendSlider={sendSlider}
                  />
                ))}
              </div>
            </section>
          )}

          <div className="band lower">
            {looseStates.length > 0 && (
              <section className="card">
                <div className="cardh">
                  <h2>State distributions</h2>
                  <small>Entities per state, right now</small>
                </div>
                <div className="card-body">
                  <StateList blocks={looseStates} />
                </div>
              </section>
            )}
            {looseCounters.length > 0 && (
              <section className="card">
                <div className="cardh">
                  <h2>Counters</h2>
                  <small>Gauges mods registered</small>
                </div>
                <div className="card-body">
                  <CounterList rows={looseCounters} />
                </div>
              </section>
            )}
            <section className="card">
              <div className="cardh">
                <h2>What Snitch can measure</h2>
              </div>
              <ul className="card-body honesty">
                <li>Frame time and GC are the load-bearing truth.</li>
                <li>ProfilerRecorder engine counters are inert in this IL2CPP build.</li>
                <li>Vanilla section costs are self-measured on wrapped methods only; use ablation for total subsystem cost.</li>
                <li>The unattributed rider is the frame minus every section, so it holds whatever Snitch cannot see.</li>
              </ul>
            </section>
          </div>

          <div className="band">
            <LogView timeline={snapshot?.logs?.timeline ?? []} panels={panels} />
          </div>

          {caps.includes("phone-remote") && (
            <div className="band" ref={phoneRef}>
              <ConnectPhone lan={lan} port={port} snapshot={snapshot} openSignal={phoneSignal} />
            </div>
          )}
        </>
      )}

      <footer className="foot">
        Telemetry stays on your machine - the page talks straight to ws://127.0.0.1. Need help?{" "}
        <a href="https://support.doodesch.de">support.doodesch.de</a>
      </footer>
    </div>
  );
}

/** Says how much history the window really holds while it is still filling. */
function coverage(win: WindowKey, covered: number, count: number): string {
  const w = WINDOWS.find((x) => x.key === win)!;
  if (count < 2) return `window ${w.label} - collecting`;
  if (covered >= w.ms / 1000 - 1.5) return `last ${w.label}`;
  return `last ${w.label} - ${fmt(covered, 0)} s collected`;
}

function TopBar({
  status,
  port,
  snapshot,
  fps,
  ms,
  win,
  onWin,
  active,
  control,
  showPhone,
  onPhone,
}: {
  status: string;
  port: number | null;
  snapshot: SnitchConn["snapshot"];
  fps: number;
  ms: number;
  win: WindowKey;
  onWin: (w: WindowKey) => void;
  active: boolean;
  control: SnitchConn["control"];
  showPhone: boolean;
  onPhone: () => void;
}) {
  const text =
    status === "connected"
      ? "Connected - sampling"
      : status === "idle"
        ? "Connected - sampling off"
        : "Searching for the game";
  const tip =
    status === "connected"
      ? "Connected and sampling - live data is streaming."
      : status === "idle"
        ? "Connected, but sampling is off. Press Start (or run 'snitch start' in game)."
        : "Looking for a local Snitch instance on 127.0.0.1.";
  const Icon = status === "connected" ? CircleCheck : status === "idle" ? CirclePause : LoaderCircle;
  const meta = [port ? `port ${port}` : null, snapshot?.meta?.scene || null, snapshot?.meta?.version ? `v${snapshot.meta.version}` : null]
    .filter(Boolean)
    .join(" - ");
  const live = status === "connected" || status === "idle";
  return (
    <header className="bar">
      <h1 className="brand">Snitch</h1>
      <div className="conn" title={meta ? `${tip}\n${meta.replaceAll(" - ", "\n")}` : tip}>
        <Icon size={18} strokeWidth={2.5} className={`conn-i ${status}`} aria-hidden />
        <span>{text}</span>
        {meta && <small className="conn-meta">{meta}</small>}
      </div>
      {live && (
        <>
          <div className="stat" title="Mean frames per second over the selected window.">
            <b>{fmt(fps, 0)}</b>
            <span>FPS avg</span>
          </div>
          <div className="stat stat-ms" title="Mean frame time over the selected window.">
            <b>{fmt(ms)} ms</b>
            <span>frame</span>
          </div>
        </>
      )}
      <div className="grow" />
      <WindowSeg value={win} onChange={onWin} />
      {showPhone && (
        <button className="btn ghost icon btn-phone" onClick={onPhone} title="Connect a phone as a remote" aria-label="Connect a phone">
          <Smartphone size={18} aria-hidden />
        </button>
      )}
      <button className="btn ghost icon" onClick={() => control("reset")} title="Clear the rolling windows and restart sampling" aria-label="Reset">
        <RotateCcw size={18} aria-hidden />
      </button>
      <button className="btn ghost icon" onClick={() => control("report")} title="Write a Markdown + CSV report to Mods/Snitch/runs/ in your game folder" aria-label="Export report">
        <Download size={18} aria-hidden />
      </button>
      {active ? (
        <button className="btn fill" title="Stop sampling (the game keeps running)" onClick={() => control("stop")}>
          <Square size={16} strokeWidth={2.5} aria-hidden /> Stop<span className="long"> sampling</span>
        </button>
      ) : (
        <button className="btn fill" title="Arm the profiler and start streaming live data" onClick={() => control("start")}>
          <Play size={16} strokeWidth={2.5} aria-hidden /> Start<span className="long"> sampling</span>
        </button>
      )}
    </header>
  );
}

function Searching({ attempts }: { attempts: number }) {
  return (
    <div className="band">
      <div className="card searching">
        <div className="cardh">
          <h2>Searching for a local Snitch instance</h2>
          <small>Attempt {attempts}</small>
        </div>
        <p className="card-body">
          Make sure Schedule I is running with the Snitch mod installed; it serves a loopback endpoint on
          127.0.0.1:6140. If your browser asks to allow access to your local network, allow it.
        </p>
      </div>
    </div>
  );
}
