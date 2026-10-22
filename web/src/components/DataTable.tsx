import {
  createColumnHelper,
  createSortedRowModel,
  flexRender,
  rowSortingFeature,
  sortFns,
  tableFeatures,
  useTable,
  type ColumnDef,
  type RowData,
  type SortingState,
} from "@tanstack/react-table";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type ColumnMeta = { align?: "left" | "right"; className?: string };

// TanStack Table v9: features are opted in explicitly and shared across tables.
const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns,
  columnMeta: {} as ColumnMeta,
});

export type Features = typeof features;
export type Columns<T extends RowData> = ColumnDef<Features, T, any>[];

export function columnHelper<T extends RowData>() {
  return createColumnHelper<Features, T>();
}

export function DataTable<T extends RowData>({
  columns,
  data,
  initialSort,
  caption,
  rowKey,
}: {
  columns: Columns<T>;
  data: T[];
  initialSort?: SortingState;
  caption: string;
  rowKey?: (row: T) => string;
}) {
  const table = useTable({
    features,
    columns,
    data,
    initialState: initialSort ? { sorting: initialSort } : undefined,
    getRowId: rowKey ? (row) => rowKey(row) : undefined,
    sortDescFirst: true,
  });

  return (
    <Table className="table-sticky">
      <caption className="sr-only">{caption}</caption>
      <TableHeader>
        {table.getHeaderGroups().map((hg) => (
          <TableRow key={hg.id}>
            {hg.headers.map((header) => {
              const col = header.column;
              const meta = (col.columnDef.meta ?? {}) as ColumnMeta;
              const right = meta.align === "right";
              const sorted = col.getIsSorted();
              const content = header.isPlaceholder
                ? null
                : flexRender(col.columnDef.header, header.getContext());
              return (
                <TableHead
                  key={header.id}
                  aria-sort={
                    col.getCanSort()
                      ? sorted === "asc"
                        ? "ascending"
                        : sorted === "desc"
                          ? "descending"
                          : "none"
                      : undefined
                  }
                  className={cn(
                    "py-2 text-xs uppercase tracking-wider",
                    right && "text-right",
                    meta.className,
                  )}
                >
                  {col.getCanSort() ? (
                    <button
                      type="button"
                      onClick={col.getToggleSortingHandler()}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-sm transition-colors hover:text-foreground",
                        sorted ? "text-foreground" : "text-muted-foreground",
                        right && "flex-row-reverse",
                      )}
                    >
                      <span>{content}</span>
                      <span aria-hidden className="opacity-70">
                        {sorted === "asc" ? (
                          <ChevronUp className="size-3" />
                        ) : sorted === "desc" ? (
                          <ChevronDown className="size-3" />
                        ) : (
                          <ChevronsUpDown className="size-3" />
                        )}
                      </span>
                    </button>
                  ) : (
                    content
                  )}
                </TableHead>
              );
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id} className="hover:bg-muted/40">
            {row.getAllCells().map((cell) => {
              const meta = (cell.column.columnDef.meta ?? {}) as ColumnMeta;
              return (
                <TableCell
                  key={cell.id}
                  className={cn(
                    "py-1.5 font-mono text-xs",
                    meta.align === "right" && "tnum text-right",
                    meta.className,
                  )}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              );
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
