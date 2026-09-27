import { useMemo, useState } from "react";
import { searchShortcut } from "@/components/layout/Header";
import Icon from "@/components/ui/Icon";
import { searchRecords } from "@/data/mockData";
import useEscapeKey from "@/hooks/useEscapeKey";
import useFocusTrap from "@/hooks/useFocusTrap";
import useLockBodyScroll from "@/hooks/useLockBodyScroll";
import { useToast } from "@/hooks/useToast";
import type { SearchRecord } from "@/types";
import { cn } from "@/utils";

const scopes = ["All", "Customers", "Products", "Orders", "Certificates"] as const;
type Scope = (typeof scopes)[number];

export default function CommandPalette({
  open,
  onClose,
  onOpenCustomer,
  onOpenProduct,
  onOpenQuotation,
  onOpenOrder,
  records = searchRecords,
}: {
  open: boolean;
  onClose: () => void;
  onOpenCustomer?: (customerId: string) => void;
  onOpenProduct?: (productId: string) => void;
  onOpenQuotation?: (quotationId: string) => void;
  onOpenOrder?: (orderId: string) => void;
  records?: SearchRecord[];
}) {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<Scope>("All");
  const [activeIndex, setActiveIndex] = useState(0);
  const toast = useToast();

  useEscapeKey(onClose, open);
  useLockBodyScroll(open);
  const trapRef = useFocusTrap<HTMLDivElement>(open);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records.filter(record => {
      if (scope !== "All" && record.category !== scope) return false;
      if (!q) return true;
      return `${record.title} ${record.meta} ${record.category}`.toLowerCase().includes(q);
    });
  }, [records, query, scope]);

  if (!open) return null;

  const select = (record: SearchRecord) => {
    onClose();
    if (record.customerId && onOpenCustomer) {
      onOpenCustomer(record.customerId);
      return;
    }
    if (record.productId && onOpenProduct) {
      onOpenProduct(record.productId);
      return;
    }
    if (record.quotationId && onOpenQuotation) {
      onOpenQuotation(record.quotationId);
      return;
    }
    if (record.orderId && onOpenOrder) {
      onOpenOrder(record.orderId);
      return;
    }
    toast({
      tone: "info",
      title: `Opening ${record.title}`,
      message: `${record.category} detail views arrive with their module phase.`,
    });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[activeIndex]) {
      e.preventDefault();
      select(results[activeIndex]);
    }
  };

  const highlighted = Math.min(activeIndex, Math.max(results.length - 1, 0));

  return (
    <div
      className="overlay-backdrop top"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={trapRef} className="command" role="dialog" aria-modal="true" aria-label="Global search" onKeyDown={onKeyDown}>
        <div className="command-input">
          <Icon name="search" />
          <input
            data-autofocus
            placeholder="Search across Maharaja Soap..."
            aria-label="Search across Maharaja Soap"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
          />
          <kbd>ESC</kbd>
        </div>
        <div className="search-scope" role="tablist" aria-label="Search scope">
          {scopes.map(s => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={scope === s}
              className={scope === s ? "active" : ""}
              onClick={() => {
                setScope(s);
                setActiveIndex(0);
              }}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="results">
          <p>{query ? "SEARCH RESULTS" : "RECENT & SUGGESTED"}</p>
          {results.length ? (
            results.map((record, i) => (
              <button
                key={record.id}
                type="button"
                className={cn(i === highlighted && "kb-active")}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => select(record)}
              >
                <span className={`result-icon ri${i % 4}`}><Icon name={record.icon} /></span>
                <span>
                  <strong>{record.title}</strong>
                  <small>{record.category} · {record.meta}</small>
                </span>
                <kbd>↵</kbd>
              </button>
            ))
          ) : (
            <div className="no-results">
              <Icon name="search" />
              <strong>No results found</strong>
              <span>Check the spelling or try a different keyword.</span>
            </div>
          )}
        </div>
        <div className="command-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
          <span><kbd>↵</kbd> Open</span>
          <span><kbd>{searchShortcut}</kbd> toggles search · customers, leads, products, SKUs, orders, invoices, suppliers, POs and certificates</span>
        </div>
      </div>
    </div>
  );
}
