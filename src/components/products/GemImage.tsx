import Icon from "@/components/ui/Icon";
import type { GemTone } from "@/types";
import { cn } from "@/utils";

const iconSize: Record<string, number> = { thumb: 22, card: 30, hero: 72, zoom: 110 };

/**
 * CSS-art pack tile for finished goods — a wrapped soap pack rendered from
 * tone-matched gradients, so the prototype needs no stock photography.
 */
export default function GemImage({
  tone,
  label,
  size = "card",
  className,
}: {
  tone: GemTone;
  label?: string;
  size?: "thumb" | "card" | "hero" | "zoom";
  className?: string;
}) {
  return (
    <div className={cn("gem-img", `tone-${tone}`, `size-${size}`, className)} role="img" aria-label={label ?? "Product image"}>
      <i className="gem-sheen" aria-hidden="true" />
      <Icon name="gem" size={iconSize[size]} />
      {label && (size === "hero" || size === "zoom") && <span className="gem-img-label">{label}</span>}
    </div>
  );
}
