export interface Segment {
  label: string;
  value: number;
  color: string;
}

export default function SegmentBar({ segments }: { segments: Segment[] }) {
  const sum = segments.reduce((acc, s) => acc + s.value, 0);
  return (
    <div>
      <div
        className="segment-bar"
        role="img"
        aria-label={segments.map(s => `${s.label}: ${s.value.toLocaleString("en-IN")}`).join(", ")}
      >
        {segments.map(s => (
          <i key={s.label} style={{ flex: s.value, background: s.color }} title={`${s.label} · ${s.value.toLocaleString("en-IN")}`} />
        ))}
      </div>
      <div className="segment-legend">
        {segments.map(s => (
          <div key={s.label}>
            <i style={{ background: s.color }} aria-hidden="true" />
            <span>{s.label}</span>
            <strong>{s.value.toLocaleString("en-IN")}</strong>
            <small>{Math.round((s.value / sum) * 100)}%</small>
          </div>
        ))}
      </div>
    </div>
  );
}
