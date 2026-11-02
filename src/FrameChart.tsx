import { useEffect, useMemo, useRef, useState } from "react";
import type { Sample } from "./history";
import { fmt } from "./ui";

const H = 300;
const PAD = { l: 46, r: 12, t: 14, b: 26 };

interface Spike {
  i: number;
  /** Peak of the per-snapshot mean frame time, not a single frame. */
  ms: number;
  /** Seconds relative to the right edge at which the excursion began (negative = in the past). */
  onset: number;
}

/** The highest sample, if it clearly stands out from the window average, and where its excursion began. */
function findSpike(pts: { t: number; ms: number }[], avg: number): Spike | null {
  if (pts.length < 3 || !(avg > 0)) return null;
  let top = 0;
  for (let i = 1; i < pts.length; i++) if (pts[i].ms > pts[top].ms) top = i;
  const peak = pts[top].ms;
  if (peak < avg * 1.5 || peak - avg < 1.5) return null;
  let start = top;
  while (start > 0 && pts[start - 1].ms > avg * 1.25) start--;
  return { i: top, ms: peak, onset: pts[start].t };
}

/**
 * Frame-time chart for the selected window: one line, the window average as a dashed line and the biggest spike
 * marked with its onset. Drawn as SVG at the measured width so the type stays at its real size. Each point is the
 * rolling mean frame time of one snapshot, so a spike here is shallower than the worst single frame.
 */
export function FrameChart({
  samples,
  refAt,
  winMs,
  avgMs,
  p95,
  p99,
  worstMs,
}: {
  samples: Sample[];
  refAt: number;
  winMs: number;
  avgMs: number;
  p95: number;
  p99: number;
  /** Slowest single frame in the window. */
  worstMs: number;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(640);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    setW(el.clientWidth || 640);
    const ro = new ResizeObserver(() => setW(el.clientWidth || 640));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // t = seconds relative to the right edge (0 = newest, negative = older).
  const pts = useMemo(() => samples.map((s) => ({ t: (s.at - refAt) / 1000, ms: s.frameMs })), [samples, refAt]);
  const spike = useMemo(() => findSpike(pts, avgMs), [pts, avgMs]);

  const winS = winMs / 1000;
  const peak = Math.max(avgMs * 1.2, p99 * 1.05, ...pts.map((p) => p.ms), 1);
  const yMax = niceMax(peak);
  const iw = Math.max(10, w - PAD.l - PAD.r);
  const ih = H - PAD.t - PAD.b;
  const x = (t: number) => PAD.l + ((t + winS) / winS) * iw;
  const y = (ms: number) => PAD.t + ih - (Math.min(ms, yMax) / yMax) * ih;

  const line = pts.map((p) => `${x(Math.max(-winS, p.t)).toFixed(1)},${y(p.ms).toFixed(1)}`).join(" ");
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * yMax);
  const xTicks = [-winS, -winS / 2, 0];
  const xLabel = (t: number) => (t === 0 ? "now" : winS >= 60 ? `-${fmt(-t / 60, t % 60 === 0 ? 0 : 1)} min` : `-${fmt(-t, 0)} s`);

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    if (pts.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const t = ((e.clientX - rect.left) / rect.width) * winS - winS;
    let best = 0;
    for (let i = 1; i < pts.length; i++) if (Math.abs(pts[i].t - t) < Math.abs(pts[best].t - t)) best = i;
    setHover(best);
  };

  const hp = hover != null && hover < pts.length ? pts[hover] : null;
  const labelRight = spike ? x(pts[spike.i].t) > PAD.l + iw * 0.6 : false;

  return (
    <div ref={wrap} className="chart">
      <svg width={w} height={H} role="img" aria-label={`Frame time over the last ${winS} seconds, average ${fmt(avgMs)} ms${spike ? `, spike ${fmt(spike.ms, 1)} ms` : ""}`}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={PAD.l + iw} y1={y(v)} y2={y(v)} stroke="#E6E9ED" />
            <text x={PAD.l - 8} y={y(v) + 4} textAnchor="end" className="ax">
              {fmt(v, v % 1 ? 1 : 0)}
              {v === yMax ? " ms" : ""}
            </text>
          </g>
        ))}
        {xTicks.map((t, i) => (
          <text key={t} x={x(t)} y={H - 6} className="ax" textAnchor={i === 0 ? "start" : i === 2 ? "end" : "middle"}>
            {xLabel(t)}
          </text>
        ))}

        {[
          { v: p99, name: "p99", below: false },
          { v: p95, name: "p95", below: Math.abs(y(p99) - y(p95)) < 16 },
        ].map(
          (r) =>
            r.v > 0 && (
              <g key={r.name}>
                <line x1={PAD.l} x2={PAD.l + iw} y1={y(r.v)} y2={y(r.v)} stroke="#4A5568" strokeWidth={1} strokeDasharray="2 4" />
                <text x={PAD.l + 4} y={y(r.v) + (r.below ? 14 : -5)} className="ax-ref">
                  {r.name} {fmt(r.v)} ms
                </text>
              </g>
            ),
        )}

        {avgMs > 0 && (
          <g>
            <line x1={PAD.l} x2={PAD.l + iw} y1={y(avgMs)} y2={y(avgMs)} stroke="#14213D" strokeWidth={2} strokeDasharray="7 5" />
            <text x={PAD.l + iw - 2} y={y(avgMs) - 7} textAnchor="end" className="ax-avg">
              AVG {fmt(avgMs)} ms
            </text>
          </g>
        )}

        {pts.length > 1 && <polyline points={line} fill="none" stroke="#14213D" strokeWidth={2} strokeLinejoin="round" />}

        {spike && (
          <g>
            <line x1={x(pts[spike.i].t)} x2={x(pts[spike.i].t)} y1={PAD.t} y2={PAD.t + ih} stroke="#D7262E" strokeWidth={2} />
            <circle cx={x(pts[spike.i].t)} cy={y(spike.ms)} r={6} fill="#fff" stroke="#D7262E" strokeWidth={3} />
            <line x1={x(spike.onset)} x2={x(spike.onset)} y1={PAD.t + ih} y2={PAD.t + ih + 7} stroke="#D7262E" strokeWidth={3} />
            <g transform={`translate(${labelRight ? x(pts[spike.i].t) - 188 : x(pts[spike.i].t) + 10},${PAD.t + 2})`}>
              <rect width={178} height={62} rx={3} fill="#D7262E" />
              <text x={10} y={21} className="spike-t">
                SPIKE {fmt(spike.ms, 1)} ms avg
              </text>
              <text x={10} y={38} className="spike-s">
                onset {spike.onset < 0 ? "-" : ""}
                {fmt(Math.abs(spike.onset), 1)} s
              </text>
              <text x={10} y={54} className="spike-s">
                worst frame {fmt(worstMs, 1)} ms
              </text>
            </g>
          </g>
        )}

        {hp && (
          <g pointerEvents="none">
            <line x1={x(hp.t)} x2={x(hp.t)} y1={PAD.t} y2={PAD.t + ih} stroke="#4A5568" strokeWidth={1} />
            <circle cx={x(hp.t)} cy={y(hp.ms)} r={4} fill="#14213D" />
            <g transform={`translate(${x(hp.t) > PAD.l + iw * 0.7 ? x(hp.t) - 96 : x(hp.t) + 8},${y(hp.ms) < PAD.t + 60 ? y(hp.ms) + 12 : y(hp.ms) - 44})`}>
              <rect width={88} height={36} rx={3} fill="#14213D" />
              <text x={8} y={16} className="hov-t">
                {fmt(hp.ms)} ms
              </text>
              <text x={8} y={30} className="hov-s">
                {fmt(hp.t, 1)} s
              </text>
            </g>
          </g>
        )}

        <rect
          x={PAD.l}
          y={PAD.t}
          width={iw}
          height={ih}
          fill="transparent"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        />
      </svg>
      {pts.length < 2 && <div className="chart-empty">Waiting for samples</div>}
    </div>
  );
}

function niceMax(v: number): number {
  const steps = [2, 4, 8, 12, 16, 24, 32, 48, 64, 100, 200, 500, 1000];
  return steps.find((s) => s >= v) ?? Math.ceil(v);
}
