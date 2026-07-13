import { ChevronLeft, ChevronRight } from "lucide-react";

type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
};

const MAX_VISIBLE_PAGES = 5;

function visiblePageNumbers(page: number, totalPages: number) {
  if (totalPages <= MAX_VISIBLE_PAGES) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const half = Math.floor(MAX_VISIBLE_PAGES / 2);
  let start = Math.max(1, page - half);
  const end = Math.min(totalPages, start + MAX_VISIBLE_PAGES - 1);
  start = Math.max(1, end - MAX_VISIBLE_PAGES + 1);

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export function Pagination({ page, pageSize, total, onPageChange, className = "" }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(total, currentPage * pageSize);

  return (
    <nav className={`flex flex-wrap items-center justify-between gap-3 ${className}`} aria-label="Paginação">
      <p className="text-xs font-semibold text-slate-500">
        {rangeStart}–{rangeEnd} de {total} resultados
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="inline-flex min-h-8 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Página anterior"
        >
          <ChevronLeft size={14} />
          Anterior
        </button>

        {visiblePageNumbers(currentPage, totalPages).map((pageNumber) => (
          <button
            key={pageNumber}
            type="button"
            aria-current={pageNumber === currentPage ? "page" : undefined}
            className={`inline-flex size-8 items-center justify-center rounded-lg text-xs font-black transition ${
              pageNumber === currentPage ? "fl-brand-primary-action text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
            onClick={() => onPageChange(pageNumber)}
          >
            {pageNumber}
          </button>
        ))}

        <button
          type="button"
          className="inline-flex min-h-8 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Próxima página"
        >
          Próximo
          <ChevronRight size={14} />
        </button>
      </div>
    </nav>
  );
}
