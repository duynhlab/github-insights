"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Table,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableBody,
  TableCell,
} from "@tremor/react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "./Icon";

export type SortDir = "asc" | "desc";

export type Column = {
  key: string;
  header: ReactNode;
  align?: "left" | "right";
  sortable?: boolean;
  className?: string;
};

export type SortableRow = {
  id: string;
  sortValues: Record<string, string | number | null | undefined>;
  cells: ReactNode[];
  className?: string;
};

export type SortableTableProps = {
  rows: SortableRow[];
  columns: Column[];
  initialSort?: { key: string; dir: SortDir };
  caption: string;
};

function compare(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
  dir: SortDir,
): number {
  const aN = a == null;
  const bN = b == null;
  if (aN && bN) return 0;
  if (aN) return 1;
  if (bN) return -1;
  let cmp: number;
  if (typeof a === "number" && typeof b === "number") {
    cmp = a - b;
  } else {
    cmp = String(a).localeCompare(String(b));
  }
  return dir === "asc" ? cmp : -cmp;
}

export function SortableTable({
  rows,
  columns,
  initialSort,
  caption,
}: SortableTableProps) {
  const [sort, setSort] = useState<{ key: string; dir: SortDir } | null>(
    initialSort ?? null,
  );

  const sorted = useMemo(() => {
    if (!sort) return rows;
    return [...rows].sort((a, b) =>
      compare(a.sortValues[sort.key], b.sortValues[sort.key], sort.dir),
    );
  }, [rows, sort]);

  function toggle(key: string, defaultDir: SortDir) {
    setSort((s) => {
      if (!s || s.key !== key) return { key, dir: defaultDir };
      return { key, dir: s.dir === "asc" ? "desc" : "asc" };
    });
  }

  return (
    <Table className="table-sticky">
      <caption className="sr-only">{caption}</caption>
      <TableHead>
        <TableRow>
          {columns.map((c) => {
            const isSorted = sort?.key === c.key;
            const ariaSort: "ascending" | "descending" | "none" = isSorted
              ? sort!.dir === "asc"
                ? "ascending"
                : "descending"
              : "none";
            const defaultDir: SortDir = c.align === "right" ? "desc" : "asc";
            const align = c.align === "right" ? "text-right" : "text-left";
            if (!c.sortable) {
              return (
                <TableHeaderCell key={c.key} className={`py-2 text-xs uppercase tracking-wider ${align} ${c.className ?? ""}`}>
                  {c.header}
                </TableHeaderCell>
              );
            }
            return (
              <TableHeaderCell
                key={c.key}
                aria-sort={ariaSort}
                className={`py-2 text-xs uppercase tracking-wider ${align} ${c.className ?? ""}`}
              >
                <button
                  type="button"
                  onClick={() => toggle(c.key, defaultDir)}
                  className={
                    "inline-flex items-center gap-1 rounded-sm transition-colors hover:text-fg " +
                    (isSorted ? "text-fg" : "text-muted-fg") +
                    (c.align === "right" ? " flex-row-reverse" : "")
                  }
                >
                  <span>{c.header}</span>
                  <span aria-hidden className="opacity-70">
                    {!isSorted ? (
                      <ChevronsUpDown size={12} />
                    ) : sort!.dir === "asc" ? (
                      <ChevronUp size={12} />
                    ) : (
                      <ChevronDown size={12} />
                    )}
                  </span>
                </button>
              </TableHeaderCell>
            );
          })}
        </TableRow>
      </TableHead>
      <TableBody>
        {sorted.map((r) => (
          <TableRow key={r.id} className={r.className}>
            {columns.map((c, i) => (
              <TableCell
                key={c.key}
                className={
                  "font-mono text-xs py-1.5 " +
                  (c.align === "right" ? "text-right tnum " : "") +
                  (c.className ?? "")
                }
              >
                {r.cells[i]}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
