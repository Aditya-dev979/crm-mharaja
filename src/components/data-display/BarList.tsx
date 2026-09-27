export interface BarItem {
  label: string;
  value: number;
  display: string;
}

export default function BarList({ items }: { items: BarItem[] }) {
  const max = Math.max(...items.map(i => i.value));
  return (
    <div className="bar-list">
      {items.map(item => (
        <div key={item.label} className="bar-row">
          <span className="bar-label">{item.label}</span>
          <span className="bar-track" role="img" aria-label={`${item.label}: ${item.display}`}>
            <i style={{ width: `${(item.value / max) * 100}%` }} />
          </span>
          <span className="bar-value">{item.display}</span>
        </div>
      ))}
    </div>
  );
}
