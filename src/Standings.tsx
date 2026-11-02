import { Bib, fmt } from "./ui";
import type { Rider } from "./history";

/**
 * The live standings: one row per rider, ranked by ms per frame over the selected window. Rows are positioned
 * absolutely by rank, so a rank change is a transform transition - the only motion on the page.
 */
export function Standings({
  riders,
  scaleMax,
  rowHeight,
  compact,
}: {
  riders: Rider[];
  scaleMax: number;
  rowHeight: number;
  compact?: boolean;
}) {
  return (
    <div className={`stand${compact ? " stand-compact" : ""}`} style={{ ["--rh" as string]: `${rowHeight}px` }}>
      <div className="stand-list" style={{ height: riders.length * rowHeight }}>
        {riders.map((r, i) => (
          <StandingRow key={r.key} r={r} index={i} scaleMax={scaleMax} rowHeight={rowHeight} />
        ))}
      </div>
      <div className="stand-scale" aria-hidden={false}>
        <span />
        <span />
        <span className="stand-scale-track">
          <i style={{ width: `${100 / scaleMax}%` }} />
          <span>1 ms</span>
        </span>
        <span className="stand-scale-note">Same scale on every row, 0-{scaleMax} ms</span>
      </div>
    </div>
  );
}

function StandingRow({ r, index, scaleMax, rowHeight }: { r: Rider; index: number; scaleMax: number; rowHeight: number }) {
  const showMod = !r.unattributed && !r.label.toLowerCase().includes(r.mod.toLowerCase());
  const tip = r.dnf
    ? `${r.mod}: ${r.label}\nNo report for ${fmt(r.silentFor, 0)} s`
    : `${r.mod}: ${r.label}\n${fmt(r.ms, 3)} ms/frame - ${fmt(r.pct, 1)}% of the frame${
        r.unattributed ? "\nTime inside no section: frame mean minus the summed section means" : `\n${fmt(r.calls, 0)} calls/frame - worst frame ${fmt(r.worst, 3)} ms`
      }`;
  return (
    <div
      className={`srow${r.isLeader ? " lead" : ""}${r.dnf ? " dnf" : ""}`}
      style={{ transform: `translateY(${index * rowHeight}px)`, height: rowHeight }}
      title={tip}
    >
      {r.isLeader && <span className="lead-mark" aria-hidden />}
      <span className="pos">{r.dnf ? "-" : r.rank}</span>
      <Bib n={r.bib} color={r.color} />
      <span className="srow-main">
        <span className="srow-name">
          <span className="srow-label">
            {r.label}
            {showMod && <em>{r.mod}</em>}
          </span>
          <span className="srow-ms">{r.dnf ? `no report for ${fmt(r.silentFor, 0)} s` : `${fmt(r.ms)} ms`}</span>
        </span>
        <span className="srow-track">
          {r.dnf ? (
            <span className="bar-dnf" />
          ) : (
            <span className="rbar" style={{ width: `${Math.min(100, (r.ms / scaleMax) * 100)}%`, background: r.color }} />
          )}
        </span>
      </span>
      {r.dnf ? (
        <span className="gap dnf-tag">DNF</span>
      ) : r.isLeader ? (
        <span className="gap lead-tag">Leader</span>
      ) : (
        <span className="gap">+{fmt(r.gap)} ms</span>
      )}
    </div>
  );
}
