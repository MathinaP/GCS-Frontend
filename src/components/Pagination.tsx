import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  page: number;
  lastPage: number;
  total: number;
  perPage: number;
  onChange: (page: number) => void;
}

export default function Pagination({ page, lastPage, total, perPage, onChange }: Props) {
  if (lastPage <= 1 && total <= perPage) return null;

  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  const pages: (number | 'ellipsis-start' | 'ellipsis-end')[] = [];
  if (lastPage <= 7) {
    for (let i = 1; i <= lastPage; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('ellipsis-start');
    for (let i = Math.max(2, page - 1); i <= Math.min(lastPage - 1, page + 1); i++) pages.push(i);
    if (page < lastPage - 2) pages.push('ellipsis-end');
    pages.push(lastPage);
  }

  return (
    <div className="flex flex-col gap-2 px-4 py-3 border-t border-gray-200 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-gray-500">
        {total === 0 ? 'No results' : `Showing ${from}–${to} of ${total}`}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed text-gray-600"
        >
          <ChevronLeft size={15} />
        </button>

        {pages.map((p, i) =>
          typeof p === 'string' ? (
            <span key={p} className="px-1 text-gray-400 text-xs">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={`min-w-[28px] h-7 px-1 rounded text-xs font-medium transition-colors ${
                p === page
                  ? 'bg-brand text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onChange(page + 1)}
          disabled={page === lastPage || lastPage === 0}
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed text-gray-600"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
