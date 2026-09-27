import { useMemo, useState } from "react";
import Pagination from "@/components/data-display/Pagination";
import Checkbox from "@/components/forms/Checkbox";
import { IconButton } from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import useEscapeKey from "@/hooks/useEscapeKey";
import { cn } from "@/utils";

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  hideable?: boolean;
  defaultHidden?: boolean;
  sortValue?: (row: T) => string | number;
  /** Numeric/currency columns read better right-aligned in dense ERP tables. */
  align?: "right" | "center";
  render?: (row: T) => React.ReactNode;
}

type SortState = { key: string; dir: "asc" | "desc" } | null;

export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  rowLabel,
  pageSize = 5,
  selected,
  onSelectedChange,
  emptyState,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  rowLabel?: (row: T) => string;
  pageSize?: number;
  selected?: string[];
  onSelectedChange?: (ids: string[]) => void;
  emptyState?: React.ReactNode;
}) {
  const [sort, setSort] = useState<SortState>(null);
  const [page, setPage] = useState(1);
  const [hidden, setHidden] = useState<string[]>(() =>
    columns.filter(c => c.defaultHidden).map(c => c.key),
  );
  const [columnsOpen, setColumnsOpen] = useState(false);
  useEscapeKey(() => setColumnsOpen(false), columnsOpen);

  const visibleColumns = columns.filter(c => !hidden.includes(c.key));
  const selectable = !!onSelectedChange;

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find(c => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const factor = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = col.sortValue!(a);
      const vb = col.sortValue!(b);
      if (va < vb) return -factor;
      if (va > vb) return factor;
      return 0;
    });
  }, [rows, sort, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageRows = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const allIds = sorted.map(rowKey);
  const allSelected = allIds.length > 0 && allIds.every(id => selected?.includes(id));
  const someSelected = !allSelected && allIds.some(id => selected?.includes(id));

  const toggleSort = (key: string) => {
    setSort(s => (s?.key === key ? (s.dir === "asc" ? { key, dir: "desc" } : null) : { key, dir: "asc" }));
  };

  const toggleRow = (id: string) => {
    if (!selected || !onSelectedChange) return;
    onSelectedChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  };

  const summaryFrom = sorted.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const summaryTo = Math.min(safePage * pageSize, sorted.length);

  return (
    <>
      <div className="table-toolbar-row">
        <IconButton label="Choose visible columns" onClick={() => setColumnsOpen(o => !o)} aria-expanded={columnsOpen}>
          <Icon name="columns" />
        </IconButton>
        {columnsOpen && (
          <>
            <div className="popover-backdrop" onClick={() => setColumnsOpen(false)} aria-hidden="true" />
            <div className="col-pop" role="group" aria-label="Visible columns">
              <p>VISIBLE COLUMNS</p>
              {columns.filter(c => c.hideable !== false).map(c => (
                <Checkbox
                  key={c.key}
                  label={c.label}
                  checked={!hidden.includes(c.key)}
                  onChange={show =>
                    setHidden(h => (show ? h.filter(k => k !== c.key) : [...h, c.key]))
                  }
                />
              ))}
            </div>
          </>
        )}
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {selectable && (
                <th className="th-check">
                  <Checkbox
                    label="Select all rows"
                    hideLabel
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={checked => onSelectedChange?.(checked ? allIds : [])}
                  />
                </th>
              )}
              {visibleColumns.map(c => (
                <th
                  key={c.key}
                  className={c.align ? `align-${c.align}` : undefined}
                  aria-sort={sort?.key === c.key ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
                >
                  {c.sortable ? (
                    <button type="button" className="th-btn" onClick={() => toggleSort(c.key)}>
                      {c.label}
                      <span className="sort-ind" aria-hidden="true">
                        {sort?.key === c.key ? (sort.dir === "asc" ? "↑" : "↓") : "↕"}
                      </span>
                    </button>
                  ) : (
                    c.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map(row => {
              const id = rowKey(row);
              const isSelected = !!selected?.includes(id);
              return (
                <tr key={id} className={cn(isSelected && "selected")}>
                  {selectable && (
                    <td className="th-check">
                      <Checkbox
                        label={`Select ${rowLabel ? rowLabel(row) : id}`}
                        hideLabel
                        checked={isSelected}
                        onChange={() => toggleRow(id)}
                      />
                    </td>
                  )}
                  {visibleColumns.map(c => (
                    <td key={c.key} className={c.align ? `align-${c.align}` : undefined}>
                      {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? "")}
                    </td>
                  ))}
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={visibleColumns.length + (selectable ? 1 : 0)} className="empty-cell">
                  {emptyState ?? "No records found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        page={safePage}
        pageCount={pageCount}
        onChange={setPage}
        summary={`Showing ${summaryFrom}–${summaryTo} of ${sorted.length}`}
      />
    </>
  );
}
