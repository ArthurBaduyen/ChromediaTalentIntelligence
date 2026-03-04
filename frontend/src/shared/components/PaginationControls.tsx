export function PaginationControls({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  align = "center"
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (nextPage: number) => void;
  align?: "center" | "right";
}) {
  const canPrev = page > 1;
  const canNext = page < totalPages;
  const safeTotalPages = Math.max(1, totalPages);

  if (safeTotalPages <= 1) {
    return null;
  }

  const allPages = Array.from({ length: safeTotalPages }, (_, index) => index + 1);
  const pageItems: Array<number | "ellipsis"> = [];

  if (safeTotalPages <= 5) {
    pageItems.push(...allPages);
  } else if (page <= 3) {
    pageItems.push(1, 2, 3, "ellipsis", safeTotalPages);
  } else if (page >= safeTotalPages - 2) {
    pageItems.push(1, "ellipsis", safeTotalPages - 2, safeTotalPages - 1, safeTotalPages);
  } else {
    pageItems.push(1, "ellipsis", page - 1, page, page + 1, "ellipsis", safeTotalPages);
  }

  const wrapperClass =
    align === "right"
      ? "mt-4 grid w-full grid-cols-[1fr_auto] items-center gap-4"
      : "mt-4 grid w-full grid-cols-[1fr_auto_1fr] items-center";

  return (
    <div className={wrapperClass}>
      <p className="justify-self-start text-xs text-[#667085]">
        {total === 0 ? "0 results" : `Showing ${Math.min((page - 1) * pageSize + 1, total)}-${Math.min(page * pageSize, total)} of ${total}`}
      </p>
      <nav className="inline-flex items-center gap-1 px-1 py-1" aria-label="Pagination">
        <button
          type="button"
          disabled={!canPrev}
          className="inline-flex h-8 items-center gap-1 rounded-[4px] px-2 text-base font-normal text-[#070a13] disabled:opacity-40"
          onClick={() => canPrev && onPageChange(page - 1)}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
            <path d="M14 7L9 12L14 17" stroke="#070A13" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Prev
        </button>
        {pageItems.map((item, index) =>
          item === "ellipsis" ? (
            <span
              key={`ellipsis-${index}`}
              className="inline-flex h-11 w-11 items-center justify-center rounded-[4px] text-[18px] leading-[1.4] tracking-[0.15px] text-[#070a13]"
            >
              ...
            </span>
          ) : (
            <button
              key={item}
              type="button"
              className={`inline-flex h-11 w-11 items-center justify-center rounded-[1000px] text-base ${
                item === page ? "bg-[#1595d4] text-white" : "text-[#070a13]"
              }`}
              onClick={() => onPageChange(item)}
            >
              {item}
            </button>
          )
        )}
        <button
          type="button"
          disabled={!canNext}
          className="inline-flex h-8 items-center gap-1 rounded-[4px] px-2 text-base font-normal text-[#070a13] disabled:opacity-40"
          onClick={() => canNext && onPageChange(page + 1)}
        >
          Next
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
            <path d="M10 7L15 12L10 17" stroke="#070A13" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </nav>
      {align === "center" ? <div /> : null}
    </div>
  );
}
