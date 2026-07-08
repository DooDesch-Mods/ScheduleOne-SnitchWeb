import { useMemo, useState } from "react";
import { FrameChart } from "./FrameChart";
import { LogView } from "./LogView";
import { RemoteView } from "./RemoteView";
import { ConnectPhone } from "./ConnectPhone";
import { useSnitch } from "./useSnitch";
import type { CounterRow, Panel, SectionRow, StateBlock } from "./protocol";

const GROUP_COLORS: Record<string, string> = {
  Snitch: "#f38ba8",
  Vanilla: "#fab387",
  Example: "#a6e3a1",
};
const groupColor = (g: string) => GROUP_COLORS[g] ?? "#89b4fa";
const fpsColor = (fps: number) => (fps >= 50 ? "#a6e3a1" : fps >= 30 ? "#f9e2af" : "#f38ba8");
const fmt = (n: number, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : "0");

export default function App() {
  const conn = useSnitch();
  if (conn.remote) return <RemoteView conn={conn} />;

  const { snapshot, status, port, attempts, control, sendAction, sendToggle, lan } = conn;
  const connected = status === "connected" || status === "idle";
  const f = snapshot?.frame;
  const panels = snapshot?.panels ?? [];

  return (
    <div className="min-h-full max-w-7xl mx-auto px-5 py-5">
      <Header status={status} port={port} snapshot={snapshot} control={control} />

      <ConnectPhone lan={lan} />

      {!connected ? (
        <Searching attempts={attempts} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
          <section className="lg:col-span-3 rounded-xl bg-[#11151f] border border-[#1b1f2e] p-4">
            <div className="flex items-baseline gap-6 mb-2 flex-wrap">
              <div title="Mean frames per second over the rolling window. Green >=50, yellow >=30, red below.">
                <span className="text-4xl font-semibold mono" style={{ color: fpsColor(f?.meanFps ?? 0) }}>
                  {fmt(f?.meanFps ?? 0, 0)}
                </span>
                <span className="text-sm text-gray-400 ml-1">fps</span>
                <span className="text-xs text-gray-500 ml-2">min {fmt(f?.minFps ?? 0, 0)}</span>
              </div>
              <Stat label="frame" v={`${fmt(f?.meanMs ?? 0)} ms`} tip="Mean frame time. This is the load-bearing truth - lower is better." />
              <Stat label="p95" v={`${fmt(f?.p95Ms ?? 0)} ms`} tip="95th-percentile frame time - the slow frames you actually feel as stutter." />
              <Stat label="p99" v={`${fmt(f?.p99Ms ?? 0)} ms`} tip="99th-percentile frame time - the worst 1% of frames." />
              <Stat label="min/max" v={`${fmt(f?.minMs ?? 0)} / ${fmt(f?.maxMs ?? 0)}`} tip="Best and worst single frame in the window." />
              <Stat label="gc0/1k" v={fmt(f?.gc0 ?? 0, 1)} tip="Gen-0 garbage collections per 1000 frames. High = allocation churn (a common stutter source)." />
              <Stat label="gc1/1k" v={fmt(f?.gc1 ?? 0, 1)} tip="Gen-1 garbage collections per 1000 frames." />
            </div>
            <FrameChart ms={f?.meanMs ?? 0} />
            <p className="text-[11px] text-gray-500 mt-1">
              Hover the chart to read any point. X = recent samples (newest at the right), Y = mean frame time
              in ms (lower is better).
            </p>
          </section>

          <Sections rows={snapshot?.sections ?? []} frameMs={f?.meanMs ?? 0} />
          <States blocks={snapshot?.states ?? []} />
          <div className="flex flex-col gap-4">
            <Counters rows={snapshot?.counters ?? []} />
            <Caps />
          </div>

          {panels.length > 0 && (
            <div className="lg:col-span-3">
              <h2 className="text-sm font-semibold text-gray-300 mb-3">Mod panels</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {panels.map((p) => (
                  <PanelCard
                    key={p.id}
                    panel={p}
                    counters={snapshot?.counters ?? []}
                    states={snapshot?.states ?? []}
                    sendAction={sendAction}
                    sendToggle={sendToggle}
                  />
                ))}
              </div>
            </div>
          )}

          <LogView timeline={snapshot?.logs?.timeline ?? []} panels={panels} />
        </div>
      )}

      <footer className="text-xs text-gray-600 mt-8 pb-4">
        Telemetry stays on your machine - the page talks straight to ws://127.0.0.1. ProfilerRecorder engine
        counters are inert in this IL2CPP build; frame-time + GC are the load-bearing truth. Need help?{" "}
        <a className="text-[#89b4fa] hover:underline" href="https://support.doodesch.de">
          support.doodesch.de
        </a>
      </footer>
    </div>
  );
}

function Header({
  status,
  port,
  snapshot,
  control,
}: {
  status: string;
  port: number | null;
  snapshot: ReturnType<typeof useSnitch>["snapshot"];
  control: ReturnType<typeof useSnitch>["control"];
}) {
  const dot = status === "connected" ? "#a6e3a1" : status === "idle" ? "#f9e2af" : "#f38ba8";
  const active = snapshot?.meta?.active;
  const statusTip =
    status === "connected"
      ? "Connected and sampling - live data is streaming."
      : status === "idle"
        ? "Connected, but sampling is off. Press Start (or run 'snitch start' in game)."
        : "Looking for a local Snitch instance on 127.0.0.1.";
  return (
    <header className="flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold tracking-tight">
          Snitch<span className="text-gray-500 font-normal"> profiler</span>
        </h1>
        <span className="flex items-center gap-2 text-sm text-gray-400 cursor-help" title={statusTip}>
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: dot }} />
          {status}
          {port ? <span className="text-gray-600">:{port}</span> : null}
          {snapshot?.meta?.scene ? <span className="text-gray-600">· {snapshot.meta.scene}</span> : null}
          {snapshot?.meta?.version ? <span className="text-gray-600">· v{snapshot.meta.version}</span> : null}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {active ? (
          <button className="btn" title="Stop sampling (the game keeps running)" onClick={() => control("stop")}>
            Stop
          </button>
        ) : (
          <button className="btn" title="Arm the profiler and start streaming live data" onClick={() => control("start")}>
            Start sampling
          </button>
        )}
        <button className="btn" title="Clear the rolling windows and restart sampling" onClick={() => control("reset")}>
          Reset
        </button>
        <button className="btn" title="Write a Markdown + CSV report to Mods/Snitch/runs/ in your game folder" onClick={() => control("report")}>
          Export report
        </button>
        <style>{`.btn{font-size:13px;padding:6px 12px;border-radius:8px;background:#1b2030;border:1px solid #2a2f42;color:#cdd6f4;cursor:pointer;transition:background .12s}.btn:hover{background:#2a3350}`}</style>
      </div>
    </header>
  );
}

function Searching({ attempts }: { attempts: number }) {
  return (
    <div className="mt-10 rounded-xl bg-[#11151f] border border-[#1b1f2e] p-8 text-center">
      <div className="text-lg mb-2">Searching for a local Snitch instance…</div>
      <div className="text-sm text-gray-400 max-w-xl mx-auto">
        Make sure Schedule I is running with the Snitch mod installed (it serves a loopback endpoint on
        127.0.0.1:6140). If your browser asks to allow access to your local network, allow it. Attempts:{" "}
        {attempts}.
      </div>
    </div>
  );
}

function Stat({ label, v, tip }: { label: string; v: string; tip?: string }) {
  return (
    <div className={tip ? "cursor-help" : undefined} title={tip}>
      <div className="text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mono text-sm">{v}</div>
    </div>
  );
}

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl bg-[#11151f] border border-[#1b1f2e] p-4">
      <h2 className="text-sm font-semibold text-gray-300 mb-3 cursor-help" title={hint}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Sections({ rows, frameMs }: { rows: SectionRow[]; frameMs: number }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const groups = useMemo(() => {
    const m = new Map<string, SectionRow[]>();
    for (const r of rows) {
      const arr = m.get(r.group) ?? [];
      arr.push(r);
      m.set(r.group, arr);
    }
    return [...m.entries()]
      .map(([group, rs]) => ({ group, rows: rs.sort((a, b) => b.ms - a.ms), ms: rs.reduce((a, b) => a + b.ms, 0) }))
      .sort((a, b) => b.ms - a.ms);
  }, [rows]);
  const max = Math.max(0.0001, ...rows.map((r) => r.ms));
  const toggle = (g: string) =>
    setCollapsed((prev) => {
      const n = new Set(prev);
      n.has(g) ? n.delete(g) : n.add(g);
      return n;
    });

  return (
    <Card
      title={`Sections - ms/frame (frame ${fmt(frameMs)} ms)`}
      hint="Per-section CPU cost, grouped by mod. Click a group to collapse it. Hover a row for details. Vanilla.* costs come from Harmony probes; your own come via the Snitch API."
    >
      {rows.length === 0 ? (
        <Empty hint="No sections yet. Enable 'snitch vanilla on' or register Snitch.Sample(...) in a mod." />
      ) : (
        <div className="flex flex-col gap-2">
          {groups.map((grp) => {
            const isCollapsed = collapsed.has(grp.group);
            return (
              <div key={grp.group}>
                <button
                  className="w-full flex justify-between items-center text-xs font-medium py-0.5 hover:opacity-80"
                  style={{ color: groupColor(grp.group) }}
                  onClick={() => toggle(grp.group)}
                  title={`${grp.group}: ${fmt(grp.ms, 3)} ms/frame total. Click to ${isCollapsed ? "expand" : "collapse"}.`}
                >
                  <span>
                    {isCollapsed ? "▸" : "▾"} {grp.group}
                  </span>
                  <span className="mono text-gray-400">{fmt(grp.ms, 3)} ms</span>
                </button>
                {!isCollapsed &&
                  grp.rows.map((r) => (
                    <div
                      key={r.label}
                      className="text-xs px-1 py-0.5 rounded hover:bg-[#0d1018] cursor-help"
                      title={`${r.label}\n${fmt(r.ms, 3)} ms/frame · ${fmt(r.pct, 2)}% of the frame · ${fmt(
                        r.calls,
                        0,
                      )} calls/frame · worst frame ${fmt(r.max, 3)} ms`}
                    >
                      <div className="flex justify-between mono">
                        <span className="text-gray-300">{r.label}</span>
                        <span className="text-gray-400">
                          {fmt(r.ms, 3)} ms · {fmt(r.pct, 1)}%
                        </span>
                      </div>
                      <div className="h-1.5 mt-0.5 rounded bg-[#0b0e14]">
                        <div className="h-1.5 rounded" style={{ width: `${(r.ms / max) * 100}%`, background: groupColor(r.group) }} />
                      </div>
                    </div>
                  ))}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function States({ blocks }: { blocks: StateBlock[] }) {
  return (
    <Card
      title="State distributions"
      hint="How many entities are in each state right now. Hover a bar for the exact count and share of the total."
    >
      {blocks.length === 0 ? (
        <Empty hint="No state providers." />
      ) : (
        <div className="flex flex-col gap-4">
          {blocks.map((b) => {
            const buckets = b.buckets ?? [];
            const max = Math.max(1, ...buckets.map((x) => x.count));
            return (
              <div key={b.id}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium cursor-help" title={`Provider: ${b.id}`}>
                    {b.title}
                  </span>
                  <span className="text-gray-500 mono">total {b.total}</span>
                </div>
                <div className="flex flex-col gap-1">
                  {buckets.map((x) => {
                    const pct = b.total > 0 ? (x.count / b.total) * 100 : 0;
                    return (
                      <div
                        key={x.name}
                        className="flex items-center gap-2 text-xs cursor-help hover:bg-[#0d1018] rounded px-1"
                        title={`${x.name}: ${x.count} (${fmt(pct, 1)}% of ${b.total})`}
                      >
                        <span className="w-24 text-gray-400 truncate">{x.name}</span>
                        <div className="flex-1 h-2 rounded bg-[#0b0e14]">
                          <div className="h-2 rounded bg-[#89b4fa]" style={{ width: `${(x.count / max) * 100}%` }} />
                        </div>
                        <span className="w-10 text-right mono text-gray-300">{x.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function Counters({ rows }: { rows: CounterRow[] }) {
  return (
    <Card title="Counters" hint="Numeric gauges a mod registered via Snitch.RegisterCounter. [OK] = read fine; [UNAVAILABLE] = the read threw.">
      {rows.length === 0 ? (
        <Empty hint="No counters registered." />
      ) : (
        <div className="flex flex-col gap-1.5 text-xs mono">
          {rows.map((c) => (
            <div key={c.id} className="flex justify-between cursor-help hover:bg-[#0d1018] rounded px-1" title={`${c.id} = ${fmt(c.value, 2)} ${c.unit} [${c.state}]`}>
              <span className="text-gray-300">{c.id}</span>
              <span>
                {fmt(c.value, 2)} <span className="text-gray-500">{c.unit}</span>{" "}
                <span className={c.state === "OK" ? "text-[#a6e3a1]" : "text-[#f38ba8]"}>[{c.state}]</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// Counters/states stay in the top-level arrays; a panel owns the ones whose id, split on the first ".", equals
// the panel id (e.g. panel "Siesta" owns counter "Siesta.Deep" and state "Siesta" / "Siesta.X").
const ownerOf = (id: string) => {
  const i = id.indexOf(".");
  return i < 0 ? id : id.slice(0, i);
};

function PanelCard({
  panel,
  counters,
  states,
  sendAction,
  sendToggle,
}: {
  panel: Panel;
  counters: CounterRow[];
  states: StateBlock[];
  sendAction: (id: string) => void;
  sendToggle: (id: string, value: boolean) => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const isCollapsed = collapsed.has(panel.id);
  const toggleCollapse = () =>
    setCollapsed((prev) => {
      const n = new Set(prev);
      n.has(panel.id) ? n.delete(panel.id) : n.add(panel.id);
      return n;
    });

  const myCounters = counters.filter((c) => ownerOf(c.id) === panel.id);
  const myStates = states.filter((b) => ownerOf(b.id) === panel.id);

  return (
    <section className="rounded-xl bg-[#11151f] border border-[#1b1f2e] p-4">
      <button
        className="w-full flex justify-between items-center text-sm font-semibold text-gray-300 hover:opacity-80"
        onClick={toggleCollapse}
        title={`${panel.id} - click to ${isCollapsed ? "expand" : "collapse"}`}
      >
        <span>
          {isCollapsed ? "▸" : "▾"} {panel.title}
        </span>
      </button>

      {!isCollapsed && (
        <div className="mt-3 flex flex-col gap-3">
          {panel.text ? (
            <pre className="text-xs text-gray-400 whitespace-pre-wrap mono leading-relaxed m-0">{panel.text}</pre>
          ) : null}

          {myCounters.length > 0 && (
            <div className="flex flex-col gap-1 text-xs mono">
              {myCounters.map((c) => (
                <div
                  key={c.id}
                  className="flex justify-between cursor-help hover:bg-[#0d1018] rounded px-1"
                  title={`${c.id} = ${fmt(c.value, 2)} ${c.unit} [${c.state}]`}
                >
                  <span className="text-gray-300">{c.id}</span>
                  <span>
                    {fmt(c.value, 2)} <span className="text-gray-500">{c.unit}</span>{" "}
                    <span className={c.state === "OK" ? "text-[#a6e3a1]" : "text-[#f38ba8]"}>[{c.state}]</span>
                  </span>
                </div>
              ))}
            </div>
          )}

          {myStates.map((b) => {
            const buckets = b.buckets ?? [];
            const max = Math.max(1, ...buckets.map((x) => x.count));
            return (
              <div key={b.id}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium cursor-help" title={`Provider: ${b.id}`}>
                    {b.title}
                  </span>
                  <span className="text-gray-500 mono">total {b.total}</span>
                </div>
                <div className="flex flex-col gap-1">
                  {buckets.map((x) => {
                    const pct = b.total > 0 ? (x.count / b.total) * 100 : 0;
                    return (
                      <div
                        key={x.name}
                        className="flex items-center gap-2 text-xs cursor-help hover:bg-[#0d1018] rounded px-1"
                        title={`${x.name}: ${x.count} (${fmt(pct, 1)}% of ${b.total})`}
                      >
                        <span className="w-24 text-gray-400 truncate">{x.name}</span>
                        <div className="flex-1 h-2 rounded bg-[#0b0e14]">
                          <div className="h-2 rounded bg-[#89b4fa]" style={{ width: `${(x.count / max) * 100}%` }} />
                        </div>
                        <span className="w-10 text-right mono text-gray-300">{x.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {panel.toggles.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {panel.toggles.map((t) => (
                <label
                  key={t.id}
                  className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none"
                  title={`${t.id} = ${t.value ? "on" : "off"}`}
                >
                  <input
                    type="checkbox"
                    className="accent-[#89b4fa]"
                    checked={t.value}
                    onChange={() => sendToggle(t.id, !t.value)}
                  />
                  {t.label}
                </label>
              ))}
            </div>
          )}

          {panel.actions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {panel.actions.map((a) => (
                <button key={a.id} className="btn" title={a.id} onClick={() => sendAction(a.id)}>
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Caps() {
  return (
    <Card title="Capability & honesty" hint="What this build can and cannot measure, stated plainly.">
      <ul className="text-xs text-gray-400 leading-relaxed list-disc pl-4">
        <li title="Always reliable, build-independent.">Frame-time + GC: load-bearing truth.</li>
        <li title="Unity's ProfilerRecorder counters return nothing in Schedule I's IL2CPP build.">
          ProfilerRecorder engine counters: unavailable in this IL2CPP build.
        </li>
        <li title="Section timing only sees methods Snitch explicitly wraps; use ablation for native cost.">
          Vanilla section costs are self-measured (only wrapped methods); use ablation for total subsystem cost.
        </li>
      </ul>
    </Card>
  );
}

function Empty({ hint }: { hint: string }) {
  return <div className="text-xs text-gray-500">{hint}</div>;
}
