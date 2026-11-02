import { useEffect, useMemo, useRef, useState } from "react";
import type { Snapshot } from "./protocol";
import { buildBibs, identityOf, isUnattributed, UNATTRIBUTED } from "./identity";

// The wire protocol carries one rolling aggregate per snapshot and has no window parameter. The window control
// is therefore applied here: every snapshot is kept for two minutes and every number is the mean (or max) of the
// snapshots that fall inside the selected window.

export type WindowKey = "10s" | "30s" | "2m";
export const WINDOWS: { key: WindowKey; label: string; ms: number }[] = [
  { key: "10s", label: "10 s", ms: 10_000 },
  { key: "30s", label: "30 s", ms: 30_000 },
  { key: "2m", label: "2 min", ms: 120_000 },
];
const KEEP_MS = 125_000;
/** A rider missing from the newest snapshot for this long is classified DNF. */
const DNF_AFTER_MS = 3_000;

interface SecSample {
  ms: number;
  calls: number;
  pct: number;
  max: number;
}

export interface Sample {
  at: number;
  frameMs: number;
  fps: number;
  minMs: number;
  maxMs: number;
  p95: number;
  p99: number;
  gc0: number;
  gc1: number;
  secs: Map<string, SecSample>;
}

interface Seen {
  group: string;
  label: string;
  lastAt: number;
}

export interface HistoryStore {
  last: Snapshot | null;
  samples: Sample[];
  seen: Map<string, Seen>;
  mods: Set<string>;
  newestAt: number;
}

export const riderKey = (group: string, label: string) => `${group}\u0000${label}`;

export function useHistory(snapshot: Snapshot | null): HistoryStore {
  const ref = useRef<HistoryStore>({ last: null, samples: [], seen: new Map(), mods: new Set(), newestAt: 0 });
  const s = ref.current;
  // Guarded by identity of the snapshot object, so a repeated render (StrictMode) records it once.
  if (snapshot && s.last !== snapshot) {
    s.last = snapshot;
    const active = !!snapshot.meta?.active;
    const at = performance.now();
    for (const p of snapshot.panels ?? []) s.mods.add(p.id);
    for (const r of snapshot.sections ?? []) s.mods.add(r.group);
    // Samples are only recorded while sampling runs; the first snapshot is kept so a stopped session still shows
    // the numbers the game reports.
    if (active || s.samples.length === 0) {
      const f = snapshot.frame;
      const secs = new Map<string, SecSample>();
      for (const r of snapshot.sections ?? []) {
        const k = riderKey(r.group, r.label);
        secs.set(k, { ms: r.ms, calls: r.calls, pct: r.pct, max: r.max });
        s.seen.set(k, { group: r.group, label: r.label, lastAt: at });
      }
      s.samples.push({
        at,
        frameMs: f?.meanMs ?? 0,
        fps: f?.meanFps ?? 0,
        minMs: f?.minMs ?? 0,
        maxMs: f?.maxMs ?? 0,
        p95: f?.p95Ms ?? 0,
        p99: f?.p99Ms ?? 0,
        gc0: f?.gc0 ?? 0,
        gc1: f?.gc1 ?? 0,
        secs,
      });
      s.newestAt = at;
      const cutoff = at - KEEP_MS;
      while (s.samples.length > 1 && s.samples[0].at < cutoff) s.samples.shift();
    }
  }
  return s;
}

/** A clock that re-renders once per interval, so "no report for N s" keeps counting between snapshots. */
export function useClock(intervalMs = 1000): number {
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    const id = setInterval(() => setNow(performance.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export interface Rider {
  key: string;
  mod: string;
  label: string;
  bib: number;
  color: string;
  ms: number;
  pct: number;
  calls: number;
  worst: number;
  /** ms behind the leader; 0 for the leader. */
  gap: number;
  rank: number;
  isLeader: boolean;
  dnf: boolean;
  /** Seconds since the rider last reported, for DNF riders. */
  silentFor: number;
  unattributed: boolean;
}

export interface FrameWindow {
  avgMs: number;
  avgFps: number;
  minMs: number;
  maxMs: number;
  p95: number;
  p99: number;
  /** Mean gen-0 / gen-1 collections per 1000 frames over the window. */
  gc0: number;
  gc1: number;
  /** Seconds of history actually inside the window (less than the window while history is still filling). */
  covered: number;
  count: number;
}

export interface Standings {
  riders: Rider[];
  frame: FrameWindow;
  /** Largest ms on the shared bar scale. */
  scaleMax: number;
  unattributedShare: number;
  bibs: Map<string, number>;
  /** Mean ms per mod over the window (lower-cased mod name), for the panel headers. */
  modMs: Map<string, number>;
  windowSamples: Sample[];
  /** Reference time of the window's right edge. */
  refAt: number;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

function niceCeil(v: number): number {
  if (!(v > 0)) return 1;
  const steps = [0.5, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 25, 33, 50, 100, 250, 500, 1000];
  return steps.find((x) => x >= v) ?? Math.ceil(v);
}

export function computeStandings(store: HistoryStore, winMs: number, now: number, active: boolean): Standings {
  const all = store.samples;
  // While sampling is stopped the clock stops with it, otherwise every rider would turn DNF the moment you stop.
  const refAt = active ? Math.max(now, store.newestAt) : store.newestAt;
  let inWin = all.filter((x) => x.at >= refAt - winMs);
  if (inWin.length === 0 && all.length) inWin = [all[all.length - 1]];
  const newest = all.length ? all[all.length - 1] : null;

  const bibs = buildBibs(store.mods);
  const frameMsAvg = mean(inWin.map((x) => x.frameMs));
  const frame: FrameWindow = {
    avgMs: frameMsAvg,
    avgFps: mean(inWin.map((x) => x.fps)),
    minMs: inWin.length ? Math.min(...inWin.map((x) => x.minMs)) : 0,
    maxMs: inWin.length ? Math.max(...inWin.map((x) => x.maxMs)) : 0,
    p95: mean(inWin.map((x) => x.p95)),
    p99: mean(inWin.map((x) => x.p99)),
    gc0: mean(inWin.map((x) => x.gc0)),
    gc1: mean(inWin.map((x) => x.gc1)),
    covered: inWin.length > 1 ? (inWin[inWin.length - 1].at - inWin[0].at) / 1000 : 0,
    count: inWin.length,
  };

  const riders: Rider[] = [];
  const modMs = new Map<string, number>();

  // The unattributed rider: the part of the frame that sits inside no section. Derived per snapshot as the frame
  // mean minus the summed section means, clamped at zero because overlapping sections can sum past the frame.
  const un = inWin.map((x) => {
    let sum = 0;
    for (const v of x.secs.values()) sum += v.ms;
    return Math.max(0, x.frameMs - sum);
  });
  const unMs = mean(un);
  const unId = identityOf(UNATTRIBUTED, bibs);
  riders.push({
    key: "\u0000unattributed",
    mod: UNATTRIBUTED,
    label: UNATTRIBUTED,
    bib: unId.bib,
    color: unId.color,
    ms: unMs,
    pct: frameMsAvg > 0 ? (unMs / frameMsAvg) * 100 : 0,
    calls: 0,
    worst: 0,
    gap: 0,
    rank: 0,
    isLeader: false,
    dnf: false,
    silentFor: 0,
    unattributed: true,
  });

  for (const [key, info] of store.seen) {
    const rows = inWin.map((x) => x.secs.get(key)).filter((x): x is SecSample => !!x);
    const inNewest = !!newest && newest.secs.has(key);
    const silentMs = refAt - info.lastAt;
    const dnf = !inNewest && silentMs > DNF_AFTER_MS;
    if (rows.length === 0 && !dnf) continue;
    const id = identityOf(info.group, bibs);
    const ms = dnf ? 0 : mean(rows.map((x) => x.ms));
    riders.push({
      key,
      mod: info.group,
      label: info.label,
      bib: id.bib,
      color: id.color,
      ms,
      pct: dnf ? 0 : mean(rows.map((x) => x.pct)),
      calls: dnf ? 0 : mean(rows.map((x) => x.calls)),
      worst: dnf ? 0 : Math.max(...rows.map((x) => x.max)),
      gap: 0,
      rank: 0,
      isLeader: false,
      dnf,
      silentFor: Math.max(0, silentMs / 1000),
      unattributed: isUnattributed(info.group),
    });
    if (!dnf) {
      const mk = info.group.toLowerCase();
      modMs.set(mk, (modMs.get(mk) ?? 0) + ms);
    }
  }

  const running = riders.filter((r) => !r.dnf).sort((a, b) => b.ms - a.ms || (a.key < b.key ? -1 : 1));
  const stopped = riders.filter((r) => r.dnf).sort((a, b) => a.silentFor - b.silentFor);
  const lead = running[0]?.ms ?? 0;
  running.forEach((r, i) => {
    r.rank = i + 1;
    r.isLeader = i === 0;
    r.gap = lead - r.ms;
  });
  const ordered = [...running, ...stopped];

  return {
    riders: ordered,
    frame,
    scaleMax: niceCeil(lead),
    unattributedShare: frameMsAvg > 0 ? (unMs / frameMsAvg) * 100 : 0,
    bibs,
    modMs,
    windowSamples: inWin,
    refAt,
  };
}

/** Standings for the selected window, recomputed whenever a snapshot arrives or the clock ticks. */
export function useStandings(store: HistoryStore, win: WindowKey, now: number, active: boolean): Standings {
  const winMs = WINDOWS.find((w) => w.key === win)!.ms;
  // store is a stable mutable object; its newest snapshot time is the cache key.
  return useMemo(
    () => computeStandings(store, winMs, now, active),
    [store, store.newestAt, winMs, now, active],
  );
}
