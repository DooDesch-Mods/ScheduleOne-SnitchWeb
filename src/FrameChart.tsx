import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import { useEffect, useRef } from "react";

const MAX = 240; // rolling window of points

/**
 * Streaming frame-time chart (uPlot canvas - 60 fps capable, tiny). Hover to read the value at any point;
 * the axes are labelled so X (recent samples, newest at the right) and Y (frame time in ms) are self-explanatory.
 */
export function FrameChart({ ms }: { ms: number }) {
  const elRef = useRef<HTMLDivElement>(null);
  const uRef = useRef<uPlot | null>(null);
  const data = useRef<[number[], number[]]>([[], []]);
  const tRef = useRef(0);

  useEffect(() => {
    if (!elRef.current) return;
    const opts: uPlot.Options = {
      width: elRef.current.clientWidth || 640,
      height: 210,
      cursor: { show: true, points: { show: true, size: 6 } },
      legend: { show: true, live: true },
      scales: { x: { time: false } },
      axes: [
        {
          stroke: "#6b7280",
          grid: { stroke: "#1b1f2e" },
          ticks: { stroke: "#1b1f2e" },
          label: "recent samples  (newest →)",
          labelGap: 2,
          labelSize: 22,
        },
        {
          stroke: "#6b7280",
          grid: { stroke: "#1b1f2e" },
          ticks: { stroke: "#1b1f2e" },
          size: 50,
          label: "frame time (ms)",
          labelGap: 2,
          labelSize: 22,
        },
      ],
      series: [
        { label: "sample" },
        {
          label: "frame",
          stroke: "#89b4fa",
          width: 2,
          fill: "rgba(137,180,250,0.10)",
          points: { show: false },
          value: (_u, v) => (v == null ? "--" : v.toFixed(2) + " ms"),
        },
      ],
    };
    const u = new uPlot(opts, [[], []] as unknown as uPlot.AlignedData, elRef.current);
    uRef.current = u;
    const onResize = () => u.setSize({ width: elRef.current!.clientWidth, height: 210 });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      u.destroy();
      uRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!(ms > 0)) return;
    const d = data.current;
    d[0].push(tRef.current++);
    d[1].push(ms);
    if (d[0].length > MAX) {
      d[0].shift();
      d[1].shift();
    }
    uRef.current?.setData([d[0], d[1]] as unknown as uPlot.AlignedData);
  }, [ms]);

  return <div ref={elRef} className="w-full" />;
}
