import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Inbox, Loader2 } from "lucide-react";

const PAGE_SIZE_OPTIONS = [2, 10, 50];

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  render?: (row: T) => ReactNode;
  hideOnMobile?: boolean;
  hideOnTablet?: boolean;
  className?: string;
  cellClass?: string;
}

interface DataTableProps<T extends { id?: string | number }> {
  columns: DataTableColumn<T>[];
  data?: T[];
  loading?: boolean;
  emptyMessage?: string;
  page?: number;
  pageSize?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onRowClick?: (row: T) => void;
  pageSizeOptions?: number[];
}

export default function DataTable<T extends { id?: string | number }>({
  columns,
  data = [],
  loading = false,
  emptyMessage = "No data found",
  page = 1,
  pageSize = 10,
  totalCount = 0,
  onPageChange,
  onPageSizeChange,
  onRowClick,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
}: DataTableProps<T>) {
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        <p className="text-sm">Loading...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
        <Inbox className="w-12 h-12 stroke-1" />
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-gray-500 font-medium">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 ${col.hideOnMobile ? "hidden md:table-cell" : ""} ${col.hideOnTablet ? "hidden lg:table-cell" : ""} ${col.className || ""}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((row, rowIdx) => (
              <tr
                key={row.id ?? rowIdx}
                className={`hover:bg-gray-50/50 transition-colors ${onRowClick ? "cursor-pointer" : ""}`}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 ${col.hideOnMobile ? "hidden md:table-cell" : ""} ${col.hideOnTablet ? "hidden lg:table-cell" : ""} ${col.cellClass || ""}`}
                  >
                    {col.render ? col.render(row) : ((row as Record<string, ReactNode>)[col.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer — page size + pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <span>Rows:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
            className="px-2 py-1 border border-gray-300 rounded-md text-sm bg-white"
          >
            {pageSizeOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <span className="ml-2">
            {Math.min((page - 1) * pageSize + 1, totalCount)}–{Math.min(page * pageSize, totalCount)} of {totalCount}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange?.(page - 1)}
            disabled={page <= 1}
            className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            const p = page <= 3 ? i + 1 : page + i - 2;
            if (p < 1 || p > totalPages) return null;
            return (
              <button
                key={p}
                onClick={() => onPageChange?.(p)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                  p === page ? "bg-primary-500 text-white" : "hover:bg-gray-100"
                }`}
              >
                {p}
              </button>
            );
          })}
          <button
            onClick={() => onPageChange?.(page + 1)}
            disabled={page >= totalPages}
            className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
}
