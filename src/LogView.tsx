import { useEffect, useMemo, useRef, useState } from "react";
import type { LogEntry, Panel } from "./protocol";

const MAX = 1000; // rolling client-side buffer cap

const LVL_COLOR: Record<number, string> = {
  0: "#9ca3af", // info - muted
  1: "#f9e2af", // warning - amber
  2: "#f38ba8", // error - red
};
const lvlColor = (lvl: number) => LVL_COLOR[lvl] ?? "#9ca3af";

/**
 * Log panel fed by snapshot.logs.timeline. Snapshots only carry a bounded recent slice, so this keeps its own
 * rolling buffer keyed by seq (append + de-dupe + cap) - history survives between snapshots. A channel filter
 * (All + one chip per channel seen, plus any panel that advertises hasLog) narrows the view; lines are colored
 * by level and auto-scroll to the bottom unless the user has scrolled up to read back.
 */
export function LogView({ timeline, panels }: { timeline: LogEntry[]; panels: Panel[] }) {
  const [buffer, setBuffer] = useState<LogEntry[]>([]);
  const [channel, setChannel] = useState<string>("All");
  const seenRef = useRef<Set<number>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true); // true = pinned to bottom (auto-scroll)

  // Merge each snapshot's slice into the rolling buffer, de-duped by seq and capped.
  useEffect(() => {
    if (timeline.length === 0) return;
    setBuffer((prev) => {
      const fresh = timeline.filter((e) => !seenRef.current.has(e.seq));
      if (fresh.length === 0) return prev;
      for (const e of fresh) seenRef.current.add(e.seq);
      let next = prev.concat(fresh);
      next.sort((a, b) => a.seq - b.seq);
      if (next.length > MAX) {
        next = next.slice(next.length - MAX);
        seenRef.current = new Set(next.map((e) => e.seq));
      }
      return next;
    });
  }, [timeline]);

  // Channels: "All" + every channel seen in the buffer + any panel that advertises a log.
  const channels = useMemo(() => {
    const set = new Set<string>();
    for (const e of buffer) set.add(e.ch);
    for (const p of panels) if (p.hasLog) set.add(p.id);
    return ["All", ...[...set].sort((a, b) => a.localeCompare(b))];
  }, [buffer, panels]);

  const visible = useMemo(
    () => (channel === "All" ? buffer : buffer.filter((e) => e.ch === channel)),
    [buffer, channel],
  );

  // Auto-scroll to the bottom when pinned (new lines or filter change).
  useEffect(() => {
    if (!stickRef.current) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [visible]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
  };

  return (
    <section className="lg:col-span-3 rounded-xl bg-[#11151f] border border-[#1b1f2e] p-4">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <h2 className="text-sm font-semibold text-gray-300 cursor-help" title="Live log timeline streamed from the mods. History is buffered client-side and de-duped by seq.">
          Logs
        </h2>
        <div className="flex items-center gap-1.5 flex-wrap">
          {channels.map((ch) => {
            const sel = ch === channel;
            return (
              <button
                key={ch}
                onClick={() => setChannel(ch)}
                className="text-xs px-2 py-0.5 rounded-full border transition-colors"
                style={{
                  background: sel ? "#2a3350" : "#1b2030",
                  borderColor: sel ? "#3b4a7a" : "#2a2f42",
                  color: sel ? "#cdd6f4" : "#9ca3af",
                }}
                title={ch === "All" ? "Show every channel" : `Show only ${ch}`}
              >
                {ch}
              </button>
            );
          })}
        </div>
      </div>
      {visible.length === 0 ? (
        <div className="text-xs text-gray-500">No log entries yet.</div>
      ) : (
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="mono text-xs leading-relaxed overflow-y-auto max-h-80 rounded bg-[#0b0e14] p-2"
        >
          {visible.map((e) => (
            <div key={e.seq} className="whitespace-pre-wrap break-words" style={{ color: lvlColor(e.lvl) }}>
              <span className="text-gray-600">{e.t}</span>{" "}
              <span className="text-gray-500">[{e.ch}]</span> {e.msg}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
