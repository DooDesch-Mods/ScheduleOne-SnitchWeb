import { useEffect, useMemo, useRef, useState } from "react";
import type { LogEntry, Panel } from "./protocol";

const MAX = 1000; // rolling client-side buffer cap

// The level is always spelled out; colour only reinforces it.
const LVL: Record<number, { name: string; cls: string }> = {
  0: { name: "INFO", cls: "lv-info" },
  1: { name: "WARN", cls: "lv-warn" },
  2: { name: "ERROR", cls: "lv-err" },
};
const lvl = (n: number) => LVL[n] ?? LVL[0];

/**
 * Log panel fed by snapshot.logs.timeline. Snapshots only carry a bounded recent slice, so this keeps its own
 * rolling buffer keyed by seq (append + de-dupe + cap) - history survives between snapshots. A channel filter
 * (All + one chip per channel seen, plus any panel that advertises hasLog) narrows the view; lines auto-scroll to
 * the bottom unless the user has scrolled up to read back.
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

  const visible = useMemo(() => (channel === "All" ? buffer : buffer.filter((e) => e.ch === channel)), [buffer, channel]);

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
    <section className="card">
      <div className="cardh">
        <h2 title="Live log timeline streamed from the mods. History is buffered client-side and de-duped by seq.">Logs</h2>
        <div className="chips" role="group" aria-label="Log channel">
          {channels.map((ch) => (
            <button
              key={ch}
              onClick={() => setChannel(ch)}
              className={`chip${ch === channel ? " on" : ""}`}
              aria-pressed={ch === channel}
              title={ch === "All" ? "Show every channel" : `Show only ${ch}`}
            >
              {ch}
            </button>
          ))}
        </div>
      </div>
      {visible.length === 0 ? (
        <div className="empty">No log entries yet.</div>
      ) : (
        <div ref={scrollRef} onScroll={onScroll} className="logbox">
          {visible.map((e) => {
            const l = lvl(e.lvl);
            return (
              <div key={e.seq} className={`logline ${l.cls}`}>
                <span className="log-t">{e.t}</span>
                <span className="log-l">{l.name}</span>
                <span className="log-c">{e.ch}</span>
                <span className="log-m">{e.msg}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
