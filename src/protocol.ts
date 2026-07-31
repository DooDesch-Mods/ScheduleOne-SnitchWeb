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
  max: number;
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

export interface PanelAction {
  id: string;
  label: string;
}

export interface PanelToggle {
  id: string;
  label: string;
  value: boolean;
}

// A continuous value a mod exposes. step of 0 means continuous. The host clamps and snaps every write, so the
// dashboard may send anything in range without validating it first.
export interface PanelSlider {
  id: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  value: number;
}

export interface Panel {
  id: string;
  title: string;
  hasLog: boolean;
  text: string;
  actions: PanelAction[];
  toggles: PanelToggle[];
  // Optional: a game running an older Snitch sends no sliders array at all.
  sliders?: PanelSlider[];
}

// lvl: 0 = info, 1 = warning, 2 = error. ch = channel = mod id. seq = monotonic id (React key + de-dupe).
export interface LogEntry {
  seq: number;
  t: string;
  ch: string;
  lvl: number;
  msg: string;
}

export interface LogsBlock {
  timeline: LogEntry[];
}

export interface Snapshot {
  type: "snapshot";
  v: number;
  t: number;
  // caps: capability tokens the connected mod advertises, so the dashboard can feature-gate. Optional so older
  // payloads (without it) simply gate every optional feature off.
  meta: { mod: string; version: string; scene: string; active: boolean; caps?: string[] };
  frame: FrameStats;
  sections: SectionRow[];
  counters: CounterRow[];
  states: StateBlock[];
  // Both optional/defaulted so older or placeholder payloads (without panels/logs) don't crash the UI.
  panels?: Panel[];
  logs?: LogsBlock;
}

export type ConnState = "searching" | "connected" | "idle" | "error";
