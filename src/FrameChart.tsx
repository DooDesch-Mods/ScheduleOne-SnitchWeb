import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import { useEffect, useRef } from "react";

const MAX = 240; // rolling window of points (~1 min at 4 Hz, or ~4 s at 60 Hz)

/** Streaming frame-time chart (uPlot canvas - 60 fps capable, tiny). Pushes one point per snapshot. */
export function FrameChart({ ms }: { ms: number }) {
  const elRef = useRef<HTMLDivElement>(null);
  const uRef = useRef<uPlot | null>(null);
  const data = useRef<[number[], number[]]>([[], []]);
  const tRef = useRef(0);

  useEffect(() => {
    if (!elRef.current) return;
    const opts: uPlot.Options = {
      width: elRef.current.clientWidth || 640,
      height: 200,
      cursor: { show: false },
      legend: { show: false },
      scales: { x: { time: false } },
      axes: [
        { stroke: "#6b7280", grid: { stroke: "#1b1f2e" }, ticks: { stroke: "#1b1f2e" } },
        { stroke: "#6b7280", grid: { stroke: "#1b1f2e" }, ticks: { stroke: "#1b1f2e" }, size: 46 },
      ],
      series: [
        {},
        { label: "ms", stroke: "#89b4fa", width: 2, fill: "rgba(137,180,250,0.10)", points: { show: false } },
      ],
    };
    const u = new uPlot(opts, [[], []] as unknown as uPlot.AlignedData, elRef.current);
    uRef.current = u;
    const onResize = () => u.setSize({ width: elRef.current!.clientWidth, height: 200 });
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
