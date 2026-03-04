import { ReactNode } from "react";

type Column<T> = {
  key: string;
  label: ReactNode;
  widthClassName?: string;
  render: (row: T) => ReactNode;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  allowOverflow?: boolean;
  emptyMessage?: string;
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  allowOverflow = false,
  emptyMessage = "No records found."
}: DataTableProps<T>) {
  return (
    <div className={`${allowOverflow ? "overflow-visible" : "overflow-hidden"} rounded-md border border-border-subtle bg-surface-default`}>
      <table className="w-full table-fixed border-collapse">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`h-11 border-b border-border-subtle bg-surface-muted px-6 py-3 text-left text-xs font-bold text-text-primary ${column.widthClassName ?? ""}`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="h-14 px-6 text-sm text-text-muted" colSpan={columns.length}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={onRowClick ? "cursor-pointer hover:bg-slate-50" : undefined}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`h-[52px] truncate border-b border-border-subtle px-6 py-4 text-sm leading-5 text-text-secondary last:text-center ${
                      allowOverflow ? "last:overflow-visible last:whitespace-normal" : ""
                    }`}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
