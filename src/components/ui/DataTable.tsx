import { memo, useCallback, useMemo, type ReactNode } from "react";
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

function DataTableInner<T extends { id?: string | number }>({
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
  const totalPages = useMemo(() => Math.ceil(totalCount / pageSize) || 1, [totalCount, pageSize]);

  const handlePageSizeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => onPageSizeChange?.(Number(e.target.value)),
    [onPageSizeChange]
  );

  const handlePrevPage = useCallback(() => onPageChange?.(page - 1), [onPageChange, page]);
  const handleNextPage = useCallback(() => onPageChange?.(page + 1), [onPageChange, page]);

  const pageWindow = useMemo(
    () =>
      Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
        const p = page <= 3 ? i + 1 : page + i - 2;
        return p >= 1 && p <= totalPages ? p : null;
      }).filter((p): p is number => p !== null),
    [totalPages, page]
  );

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
            <tr className="bg-surface-200 text-left text-gray-500 font-medium">
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
          <tbody className="divide-y divide-surface-200">
            {data.map((row, rowIdx) => (
              <DataTableRow key={row.id ?? rowIdx} row={row} columns={columns} onRowClick={onRowClick} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer — page size + pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-surface-200 text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <span>Rows:</span>
          <select
            value={pageSize}
            onChange={handlePageSizeChange}
            className="px-2 py-1.5 border-none rounded-lg text-sm bg-surface-100 shadow-neu-pressed-sm cursor-pointer"
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
            onClick={handlePrevPage}
            disabled={page <= 1}
            className="p-1.5 rounded-lg hover:shadow-neu-raised-sm transition-shadow disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {pageWindow.map((p) => (
            <PageButton key={p} page={p} active={p === page} onPageChange={onPageChange} />
          ))}
          <button
            onClick={handleNextPage}
            disabled={page >= totalPages}
            className="p-1.5 rounded-lg hover:shadow-neu-raised-sm transition-shadow disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
}

interface DataTableRowProps<T extends { id?: string | number }> {
  row: T;
  columns: DataTableColumn<T>[];
  onRowClick?: (row: T) => void;
}

function DataTableRowInner<T extends { id?: string | number }>({ row, columns, onRowClick }: DataTableRowProps<T>) {
  const handleClick = useCallback(() => onRowClick?.(row), [onRowClick, row]);

  return (
    <tr
      className={`hover:bg-surface-200/60 transition-colors ${onRowClick ? "cursor-pointer" : ""}`}
      onClick={handleClick}
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
  );
}

const DataTableRow = memo(DataTableRowInner) as typeof DataTableRowInner;

interface PageButtonProps {
  page: number;
  active: boolean;
  onPageChange?: (page: number) => void;
}

const PageButton = memo(function PageButton({ page, active, onPageChange }: PageButtonProps) {
  const handleClick = useCallback(() => onPageChange?.(page), [onPageChange, page]);
  return (
    <button
      onClick={handleClick}
      className={`px-3 py-1 rounded-lg text-sm font-medium transition-shadow ${
        active
          ? "bg-linear-to-br from-primary-500 to-primary-700 text-white shadow-neu-raised-sm"
          : "hover:shadow-neu-raised-sm"
      }`}
    >
      {page}
    </button>
  );
});

const DataTable = memo(DataTableInner) as typeof DataTableInner;

export default DataTable;
