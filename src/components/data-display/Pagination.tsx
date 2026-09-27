export default function Pagination({
  page,
  pageCount,
  onChange,
  summary,
}: {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
  summary?: string;
}) {
  return (
    <div className="pagination">
      <span>{summary}</span>
      <nav aria-label="Pagination">
        <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
          ‹
        </button>
        {Array.from({ length: pageCount }, (_, i) => i + 1).map(n => (
          <button
            key={n}
            type="button"
            className={page === n ? "active" : ""}
            aria-current={page === n ? "page" : undefined}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        ))}
        <button type="button" disabled={page >= pageCount} onClick={() => onChange(page + 1)} aria-label="Next page">
          ›
        </button>
      </nav>
    </div>
  );
}
