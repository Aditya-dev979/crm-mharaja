import Icon from "@/components/ui/Icon";

export default function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="stepper">
      {steps.map((step, i) => (
        <div className={i < current ? "done" : i === current ? "active" : ""} key={step}>
          <i aria-hidden="true">{i < current ? <Icon name="check" size={12} /> : i + 1}</i>
          <span>{step}</span>
        </div>
      ))}
    </div>
  );
}
