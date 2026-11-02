import { Bib, fmt } from "./ui";
import type { Rider } from "./history";

/**
 * The live standings: one row per rider, ranked by ms per frame over the selected window. The rows are rendered
 * in a stable order (by key) and positioned with translateY(rank index * row height), so a rank change moves the
 * existing DOM nodes with a transform transition instead of React reordering them (which would make them jump).
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
  const stable = [...riders].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  const indexOf = new Map(riders.map((r, i) => [r.key, i]));
  return (
    <div className={`stand${compact ? " stand-compact" : ""}`} style={{ ["--rh" as string]: `${rowHeight}px` }}>
      <div className="stand-list" role="list" style={{ height: riders.length * rowHeight }}>
        {stable.map((r) => (
          <StandingRow key={r.key} r={r} index={indexOf.get(r.key) ?? 0} scaleMax={scaleMax} rowHeight={rowHeight} />
        ))}
      </div>
      <div className="stand-scale">
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
  const details = r.dnf
    ? [`${r.mod}: ${r.label}`, `No report for ${fmt(r.silentFor, 0)} s`]
    : [
        `${r.mod}: ${r.label}`,
        `${fmt(r.ms, 3)} ms/frame - ${fmt(r.pct, 1)}% of the frame`,
        r.unattributed
          ? "Time inside no section: frame mean minus the summed section means"
          : `${fmt(r.calls, 0)} calls/frame - worst frame ${fmt(r.worst, 3)} ms`,
      ];
  const msText = r.dnf
    ? `no report for ${fmt(r.silentFor, 0)} s`
    : r.unattributed
      ? `${fmt(r.ms)} ms - ${fmt(r.pct, 0)}% of frame`
      : `${fmt(r.ms)} ms`;
  return (
    <div
      role="listitem"
      tabIndex={0}
      className={`srow${r.isLeader ? " lead" : ""}${r.dnf ? " dnf" : ""}`}
      style={{ transform: `translateY(${index * rowHeight}px)`, height: rowHeight }}
      title={details.join("\n")}
      aria-label={`${r.dnf ? "DNF" : `Position ${r.rank}`}, bib ${r.bib}. ${details.join(". ")}`}
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
          <span className="srow-ms srow-ms-top">{msText}</span>
        </span>
        <span className="srow-track">
          <span className="srow-bar">
            {r.dnf ? (
              <span className="bar-dnf" />
            ) : (
              <span className="rbar" style={{ width: `${Math.min(100, (r.ms / scaleMax) * 100)}%`, background: r.color }} />
            )}
          </span>
          <span className="srow-ms srow-ms-b">{msText}</span>
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
