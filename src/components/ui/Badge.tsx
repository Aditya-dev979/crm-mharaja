export type BadgeTone = "neutral" | "emerald" | "amber" | "gold" | "royal" | "danger";

export default function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
}) {
  return (
    <span className={`badge ${tone}`}>
      <i aria-hidden="true" />
      {children}
    </span>
  );
}
