// TypeScript mirror of Snitch's wire protocol (Snitch/Server/WireProtocol.cs). Keep in sync with the C# side.

export interface FrameStats {
  meanMs: number;
  medianMs: number;
  p95Ms: number;
  p99Ms: number;
  minMs: number;
  maxMs: number;
  meanFps: number;
  minFps: number;
  gc0: number;
  gc1: number;
  samples: number;
}

export interface SectionRow {
  group: string;
  label: string;
  ms: number;
  p95: number;
  calls: number;
  pct: number;
}

export interface CounterRow {
  id: string;
  value: number;
  unit: string;
  state: string;
}

export interface StateBucket {
  name: string;
  count: number;
}

export interface StateBlock {
  id: string;
  title: string;
  total: number;
  buckets: StateBucket[];
}

export interface Snapshot {
  type: "snapshot";
  v: number;
  t: number;
  meta: { mod: string; version: string; scene: string; active: boolean };
  frame: FrameStats;
  sections: SectionRow[];
  counters: CounterRow[];
  states: StateBlock[];
}

export type ConnState = "searching" | "connected" | "idle" | "error";
