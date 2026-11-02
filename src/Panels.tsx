import { useState } from "react";
import { Check, ChevronDown, ChevronRight, CircleAlert } from "lucide-react";
import type { CounterRow, Panel, StateBlock } from "./protocol";
import type { Standings } from "./history";
import { identityOf } from "./identity";
import { Bib, SliderRow, Switch, fmt } from "./ui";

// Counters/states stay in the top-level arrays; a panel owns the ones whose id, split on the first ".", equals
// the panel id (e.g. panel "Siesta" owns counter "Siesta.Deep" and state "Siesta" / "Siesta.X").
export const ownerOf = (id: string) => {
  const i = id.indexOf(".");
  return i < 0 ? id : id.slice(0, i);
};

export function CounterList({ rows }: { rows: CounterRow[] }) {
  return (
    <>
      {rows.map((c) => (
        <div key={c.id} className="ctl" title={`${c.id} = ${c.state === "OK" ? fmt(c.value, 2) : "-"} ${c.unit} [${c.state}]`}>
          <span>{c.id}</span>
          <span className="ctl-val">
            <span className="big">{c.state === "OK" ? fmt(c.value, Number.isInteger(c.value) ? 0 : 2) : "-"}</span>
            {c.unit && c.state === "OK" ? <span className="unit">{c.unit}</span> : null}
            {c.state === "OK" ? (
              <span className="mark ok">
                <Check size={14} strokeWidth={2.5} aria-hidden /> OK
              </span>
            ) : (
              <span className="mark bad">
                <CircleAlert size={14} strokeWidth={2.5} aria-hidden /> {c.state}
              </span>
            )}
          </span>
        </div>
      ))}
    </>
  );
}

export function StateList({ blocks }: { blocks: StateBlock[] }) {
  return (
    <>
      {blocks.map((b) => {
        const buckets = b.buckets ?? [];
        const max = Math.max(1, ...buckets.map((x) => x.count));
        return (
          <div key={b.id} className="stateblk">
            <div className="stateblk-h" title={`Provider: ${b.id}`}>
              <span>{b.title}</span>
              <span className="unit">total {b.total}</span>
            </div>
            {buckets.map((x) => {
              const pct = b.total > 0 ? (x.count / b.total) * 100 : 0;
              return (
                <div key={x.name} className="staterow" title={`${x.name}: ${x.count} (${fmt(pct, 1)}% of ${b.total})`}>
                  <span className="staterow-n">{x.name}</span>
                  <span className="staterow-track">
                    <span style={{ width: `${(x.count / max) * 100}%` }} />
                  </span>
                  <span className="staterow-c">{x.count}</span>
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
}

export function ModPanel({
  panel,
  counters,
  states,
  standings,
  sendAction,
  sendToggle,
  sendSlider,
}: {
  panel: Panel;
  counters: CounterRow[];
  states: StateBlock[];
  standings: Standings;
  sendAction: (id: string) => void;
  sendToggle: (id: string, value: boolean) => void;
  sendSlider: (id: string, value: number) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const id = identityOf(panel.id, standings.bibs);
  const myCounters = counters.filter((c) => ownerOf(c.id).toLowerCase() === panel.id.toLowerCase());
  const myStates = states.filter((b) => ownerOf(b.id).toLowerCase() === panel.id.toLowerCase());
  const ms = standings.modMs.get(panel.id.toLowerCase());
  const dnf = standings.riders.some((r) => r.dnf && r.mod.toLowerCase() === panel.id.toLowerCase());
  const sliders = panel.sliders ?? [];

  return (
    <section className="pn" style={{ ["--tc" as string]: id.color }}>
      <button className="pnh" onClick={() => setCollapsed((c) => !c)} aria-expanded={!collapsed} title={`${panel.id} - ${collapsed ? "expand" : "collapse"}`}>
        <Bib n={id.bib} color={id.color} />
        <h2>{panel.title}</h2>
        <span className="pnh-r">
          {ms != null ? <span className="pnh-ms">{fmt(ms)} ms</span> : null}
          {dnf ? <span className="mark bad">DNF</span> : null}
          {collapsed ? <ChevronRight size={18} aria-hidden /> : <ChevronDown size={18} aria-hidden />}
        </span>
      </button>

      {!collapsed && (
        <div className="pnb">
          {panel.text ? <pre className="pn-text">{panel.text}</pre> : null}
          <CounterList rows={myCounters} />
          <StateList blocks={myStates} />
          {sliders.map((s) => (
            <SliderRow key={s.id} slider={s} onChange={(v) => sendSlider(s.id, v)} />
          ))}
          {panel.toggles.map((t) => (
            <div key={t.id} className="ctl" title={`${t.id} = ${t.value ? "on" : "off"}`}>
              <span>{t.label}</span>
              <span className="ctl-val">
                <span className="unit">{t.value ? "On" : "Off"}</span>
                <Switch on={t.value} label={t.label} onToggle={() => sendToggle(t.id, !t.value)} />
              </span>
            </div>
          ))}
          {panel.actions.length > 0 && (
            <div className="ctl ctl-actions">
              {panel.actions.map((a) => (
                <button key={a.id} className="btn" title={a.id} onClick={() => sendAction(a.id)}>
                  {a.label}
                </button>
              ))}
            </div>
          )}
          {!panel.text &&
            myCounters.length === 0 &&
            myStates.length === 0 &&
            sliders.length === 0 &&
            panel.toggles.length === 0 &&
            panel.actions.length === 0 && (
              <div className="ctl">
                <span>Status</span>
                {dnf ? (
                  <span className="mark bad">
                    <CircleAlert size={14} strokeWidth={2.5} aria-hidden /> No report
                  </span>
                ) : (
                  <span className="mark ok">
                    <Check size={14} strokeWidth={2.5} aria-hidden /> Reporting
                  </span>
                )}
              </div>
            )}
        </div>
      )}
    </section>
  );
}
