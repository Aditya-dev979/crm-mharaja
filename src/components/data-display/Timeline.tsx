import Icon from "@/components/ui/Icon";

export interface TimelineItem {
  title: string;
  meta: string;
  state: "done" | "current" | "pending";
}

export default function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <div className="timeline">
      {items.map(item => (
        <div className={item.state} key={item.title}>
          <i aria-hidden="true">{item.state === "done" ? <Icon name="check" size={12} /> : null}</i>
          <strong>{item.title}</strong>
          <span>{item.meta}</span>
        </div>
      ))}
    </div>
  );
}
