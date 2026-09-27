import { useState } from "react";
import type { TrendPoint } from "@/data/dashboardData";

const W = 720;
const H = 250;
const PL = 48;
const PR = 14;
const PT = 14;
const PB = 30;

function niceStep(raw: number) {
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const unit = raw / pow;
  const mult = unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 2.5 ? 2.5 : unit <= 5 ? 5 : 10;
  return mult * pow;
}

export default function TrendChart({
  points,
  formatValue,
  currentLabel = "This period",
  previousLabel = "Previous period",
}: {
  points: TrendPoint[];
  formatValue: (value: number) => string;
  currentLabel?: string;
  previousLabel?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);

  const innerW = W - PL - PR;
  const innerH = H - PT - PB;
  const n = points.length;
  const maxVal = Math.max(...points.map(p => Math.max(p.current, p.previous)));
  const step = niceStep(maxVal / 4);
  let top = step * 4;
  while (top < maxVal) top += step;
  const ticks = Array.from({ length: 5 }, (_, i) => i * (top / 4));

  const x = (i: number) => PL + (i * innerW) / (n - 1);
  const y = (v: number) => PT + innerH * (1 - v / top);
  const linePath = (key: "current" | "previous") =>
    points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join(" ");
  const areaPath = `${linePath("current")} L${x(n - 1).toFixed(1)},${PT + innerH} L${PL},${PT + innerH} Z`;

  const labelEvery = Math.max(1, Math.ceil(n / 6));

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - PL) / innerW) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };

  const hp = hover !== null ? points[hover] : null;

  return (
    <div className="chart-wrap">
      <div className="chart-legend">
        <span><i className="sw" aria-hidden="true" />{currentLabel}</span>
        <span><i className="sw gold" aria-hidden="true" />{previousLabel}</span>
      </div>
      <div className="chart-canvas">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Sales trend, ${currentLabel} versus ${previousLabel}, ${n} points. Latest ${points[n - 1].label}: ${formatValue(points[n - 1].current)}. Full values in the table below.`}
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3155d9" stopOpacity=".16" />
              <stop offset="100%" stopColor="#3155d9" stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map(t => (
            <g key={t}>
              <line x1={PL} x2={W - PR} y1={y(t)} y2={y(t)} stroke="#dfe4ec" strokeWidth="1" />
              <text x={PL - 8} y={y(t) + 4} textAnchor="end" className="tick">{formatValue(t)}</text>
            </g>
          ))}
          {points.map((p, i) =>
            i % labelEvery === 0 || i === n - 1 ? (
              <text
                key={p.label}
                x={i === n - 1 ? W - PR : x(i)}
                y={H - 8}
                textAnchor={i === n - 1 ? "end" : i === 0 ? "start" : "middle"}
                className="tick"
              >
                {p.label}
              </text>
            ) : null,
          )}
          <path d={areaPath} fill="url(#trendFill)" />
          <path d={linePath("previous")} fill="none" stroke="#cf9b2f" strokeWidth="2" strokeDasharray="5 5" strokeLinecap="round" />
          <path d={linePath("current")} fill="none" stroke="#3155d9" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={PT} y2={PT + innerH} stroke="#a9b3c6" strokeDasharray="3 3" />
              <circle cx={x(hover)} cy={y(points[hover].previous)} r="4" fill="#cf9b2f" stroke="#fff" strokeWidth="2" />
              <circle cx={x(hover)} cy={y(points[hover].current)} r="4.5" fill="#3155d9" stroke="#fff" strokeWidth="2" />
            </g>
          )}
        </svg>
        {hp && hover !== null && (
          <div className="chart-tooltip" style={{ left: `clamp(70px, ${(x(hover) / W) * 100}%, calc(100% - 80px))` }}>
            <strong>{hp.label}</strong>
            <span><i className="dot" aria-hidden="true" />{currentLabel} · {formatValue(hp.current)}</span>
            <span><i className="dot gold" aria-hidden="true" />{previousLabel} · {formatValue(hp.previous)}</span>
          </div>
        )}
      </div>
      <details className="chart-table">
        <summary>View as table</summary>
        <table>
          <thead>
            <tr><th>Period</th><th>{currentLabel}</th><th>{previousLabel}</th></tr>
          </thead>
          <tbody>
            {points.map(p => (
              <tr key={p.label}><td>{p.label}</td><td>{formatValue(p.current)}</td><td>{formatValue(p.previous)}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
