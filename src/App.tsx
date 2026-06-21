import { FrameChart } from "./FrameChart";
import { useSnitch } from "./useSnitch";
import type { CounterRow, SectionRow, StateBlock } from "./protocol";

const GROUP_COLORS: Record<string, string> = {
  Snitch: "#f38ba8",
  Vanilla: "#fab387",
  Example: "#a6e3a1",
};
function groupColor(g: string) {
  return GROUP_COLORS[g] ?? "#89b4fa";
}
function fpsColor(fps: number) {
  return fps >= 50 ? "#a6e3a1" : fps >= 30 ? "#f9e2af" : "#f38ba8";
}
function fmt(n: number, d = 2) {
  return Number.isFinite(n) ? n.toFixed(d) : "0";
}

export default function App() {
  const { snapshot, status, port, attempts, control } = useSnitch();
  const connected = status === "connected" || status === "idle";
  const f = snapshot?.frame;

  return (
    <div className="min-h-full max-w-7xl mx-auto px-5 py-5">
      <Header status={status} port={port} snapshot={snapshot} control={control} />

      {!connected ? (
        <Searching attempts={attempts} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
          {/* frame time + chart spans full width on top */}
          <section className="lg:col-span-3 rounded-xl bg-[#11151f] border border-[#1b1f2e] p-4">
            <div className="flex items-baseline gap-6 mb-2">
              <div>
                <span className="text-4xl font-semibold mono" style={{ color: fpsColor(f?.meanFps ?? 0) }}>
                  {fmt(f?.meanFps ?? 0, 0)}
                </span>
                <span className="text-sm text-gray-400 ml-1">fps</span>
                <span className="text-xs text-gray-500 ml-2">min {fmt(f?.minFps ?? 0, 0)}</span>
              </div>
              <Stat label="frame" v={`${fmt(f?.meanMs ?? 0)} ms`} />
              <Stat label="p95" v={`${fmt(f?.p95Ms ?? 0)} ms`} />
              <Stat label="p99" v={`${fmt(f?.p99Ms ?? 0)} ms`} />
              <Stat label="min/max" v={`${fmt(f?.minMs ?? 0)} / ${fmt(f?.maxMs ?? 0)}`} />
              <Stat label="gc0/1k" v={fmt(f?.gc0 ?? 0, 1)} />
              <Stat label="gc1/1k" v={fmt(f?.gc1 ?? 0, 1)} />
            </div>
            <FrameChart ms={f?.meanMs ?? 0} />
          </section>

          <Sections rows={snapshot?.sections ?? []} frameMs={f?.meanMs ?? 0} />
          <States blocks={snapshot?.states ?? []} />
          <div className="flex flex-col gap-4">
            <Counters rows={snapshot?.counters ?? []} />
            <Caps />
          </div>
        </div>
      )}

      <footer className="text-xs text-gray-600 mt-8 pb-4">
        Telemetry stays on your machine - the page talks straight to ws://127.0.0.1. ProfilerRecorder engine
        counters are inert in this IL2CPP build; frame-time + GC are the load-bearing truth. Need help?{" "}
        <a className="text-[#89b4fa]" href="https://support.doodesch.de">
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
  return (
    <header className="flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold tracking-tight">
          Snitch<span className="text-gray-500 font-normal"> profiler</span>
        </h1>
        <span className="flex items-center gap-2 text-sm text-gray-400">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: dot }} />
          {status}
          {port ? <span className="text-gray-600">:{port}</span> : null}
          {snapshot?.meta?.scene ? <span className="text-gray-600">· {snapshot.meta.scene}</span> : null}
          {snapshot?.meta?.version ? <span className="text-gray-600">· v{snapshot.meta.version}</span> : null}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {active ? (
          <button className="btn" onClick={() => control("stop")}>
            Stop
          </button>
        ) : (
          <button className="btn" onClick={() => control("start")}>
            Start sampling
          </button>
        )}
        <button className="btn" onClick={() => control("reset")}>
          Reset
        </button>
        <button className="btn" onClick={() => control("report")}>
          Export report
        </button>
        <style>{`.btn{font-size:13px;padding:6px 12px;border-radius:8px;background:#1b2030;border:1px solid #2a2f42;color:#cdd6f4}.btn:hover{background:#232a3d}`}</style>
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

function Stat({ label, v }: { label: string; v: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mono text-sm">{v}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl bg-[#11151f] border border-[#1b1f2e] p-4">
      <h2 className="text-sm font-semibold text-gray-300 mb-3">{title}</h2>
      {children}
    </section>
  );
}

function Sections({ rows, frameMs }: { rows: SectionRow[]; frameMs: number }) {
  const max = Math.max(0.0001, ...rows.map((r) => r.ms));
  return (
    <Card title={`Sections — ms/frame (frame ${fmt(frameMs)} ms)`}>
      {rows.length === 0 ? (
        <Empty hint="No sections yet. Enable 'snitch vanilla on' or register Snitch.Sample(...) in a mod." />
      ) : (
        <div className="flex flex-col gap-1.5">
          {rows.map((r) => (
            <div key={r.label} className="text-xs">
              <div className="flex justify-between mono">
                <span style={{ color: groupColor(r.group) }}>{r.label}</span>
                <span className="text-gray-400">
                  {fmt(r.ms, 3)} ms · {fmt(r.pct, 1)}% · {fmt(r.calls, 0)} calls/f
                </span>
              </div>
              <div className="h-1.5 mt-0.5 rounded bg-[#0b0e14]">
                <div
                  className="h-1.5 rounded"
                  style={{ width: `${(r.ms / max) * 100}%`, background: groupColor(r.group) }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function States({ blocks }: { blocks: StateBlock[] }) {
  return (
    <Card title="State distributions">
      {blocks.length === 0 ? (
        <Empty hint="No state providers." />
      ) : (
        <div className="flex flex-col gap-4">
          {blocks.map((b) => {
            const max = Math.max(1, ...b.buckets.map((x) => x.count));
            return (
              <div key={b.id}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium">{b.title}</span>
                  <span className="text-gray-500 mono">total {b.total}</span>
                </div>
                <div className="flex flex-col gap-1">
                  {b.buckets.map((x) => (
                    <div key={x.name} className="flex items-center gap-2 text-xs">
                      <span className="w-24 text-gray-400 truncate">{x.name}</span>
                      <div className="flex-1 h-2 rounded bg-[#0b0e14]">
                        <div
                          className="h-2 rounded bg-[#89b4fa]"
                          style={{ width: `${(x.count / max) * 100}%` }}
                        />
                      </div>
                      <span className="w-10 text-right mono text-gray-300">{x.count}</span>
                    </div>
                  ))}
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
    <Card title="Counters">
      {rows.length === 0 ? (
        <Empty hint="No counters registered." />
      ) : (
        <div className="flex flex-col gap-1.5 text-xs mono">
          {rows.map((c) => (
            <div key={c.id} className="flex justify-between">
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

function Caps() {
  return (
    <Card title="Capability & honesty">
      <ul className="text-xs text-gray-400 leading-relaxed list-disc pl-4">
        <li>Frame-time + GC: load-bearing truth.</li>
        <li>ProfilerRecorder engine counters: unavailable in this IL2CPP build.</li>
        <li>Vanilla section costs are self-measured (only wrapped methods); use ablation for total subsystem cost.</li>
      </ul>
    </Card>
  );
}

function Empty({ hint }: { hint: string }) {
  return <div className="text-xs text-gray-500">{hint}</div>;
}
