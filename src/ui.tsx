import { useState } from "react";
import type { PanelSlider } from "./protocol";
import { WINDOWS, type WindowKey } from "./history";
import { inkOn } from "./identity";

export const fmt = (n: number, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : "0");

/** Race number in the mod's team colour. */
export function Bib({ n, color, small }: { n: number; color: string; small?: boolean }) {
  return (
    <span className={`bib${small ? " bib-s" : ""}`} style={{ ["--tc" as string]: color, ["--bib-ink" as string]: inkOn(color) }}>
      {n}
    </span>
  );
}

/** The one window control; it remaps every number on the page. */
export function WindowSeg({ value, onChange }: { value: WindowKey; onChange: (w: WindowKey) => void }) {
  // Roving tabindex: only the selected radio is a tab stop, the arrow keys move the selection (and focus) inside.
  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (dir === 0) return;
    e.preventDefault();
    const i = WINDOWS.findIndex((w) => w.key === value);
    const next = WINDOWS[(i + dir + WINDOWS.length) % WINDOWS.length];
    onChange(next.key);
    const btns = e.currentTarget.querySelectorAll<HTMLButtonElement>("button");
    btns[WINDOWS.indexOf(next)]?.focus();
  };
  return (
    <div className="seg" role="radiogroup" aria-label="Time window for every number" onKeyDown={onKey}>
      {WINDOWS.map((w) => (
        <button
          key={w.key}
          role="radio"
          aria-checked={value === w.key}
          tabIndex={value === w.key ? 0 : -1}
          className={value === w.key ? "on" : undefined}
          onClick={() => onChange(w.key)}
        >
          {w.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({ on, label, onToggle }: { on: boolean; label: string; onToggle: () => void }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} className="tog" onClick={onToggle}>
      <span className="tog-knob" />
    </button>
  );
}

const decimalsFor = (step: number) => (step >= 1 || step <= 0 ? 2 : step >= 0.1 ? 1 : step >= 0.01 ? 2 : 3);

/**
 * One mod value as a real range input.
 *
 * While you are dragging, the knob follows the pointer and NOT the snapshot. The game streams a fresh snapshot a few
 * times a second, and letting that drive the input mid-drag makes the knob stutter backwards between frames - the
 * value is in flight, so the incoming number is always slightly stale. On release the local value is dropped and the
 * game's own reading takes over again, which is also what shows a clamp or a snap that the host applied.
 */
export function SliderRow({ slider, onChange }: { slider: PanelSlider; onChange: (v: number) => void }) {
  const [dragging, setDragging] = useState(false);
  const [local, setLocal] = useState(slider.value);
  const shown = dragging ? local : slider.value;
  const decimals = decimalsFor(slider.step);
  return (
    <label
      className="ctl ctl-col"
      title={`${slider.id}  (${fmt(slider.min, decimals)} .. ${fmt(slider.max, decimals)}, step ${slider.step || "continuous"})`}
    >
      <span className="ctl-top">
        <span>{slider.label}</span>
        <span className="big">
          {fmt(shown, decimals)}
          {slider.unit ? ` ${slider.unit}` : ""}
        </span>
      </span>
      <input
        type="range"
        className="range"
        min={slider.min}
        max={slider.max}
        step={slider.step > 0 ? slider.step : "any"}
        value={shown}
        onPointerDown={() => setDragging(true)}
        onPointerUp={() => setDragging(false)}
        onBlur={() => setDragging(false)}
        onChange={(e) => {
          const v = Number(e.target.value);
          setLocal(v);
          onChange(v);
        }}
      />
    </label>
  );
}
