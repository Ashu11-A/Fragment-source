import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type DashboardTableColumn = {
  key: string;
  label: ReactNode;
  className?: string;
};

type DashboardDataTableProps = {
  columns: DashboardTableColumn[];
  children: ReactNode;
  className?: string;
  headClassName?: string;
  bodyClassName?: string;
};

export function DashboardDataTable({
  columns,
  children,
  className,
  headClassName,
  bodyClassName,
}: DashboardDataTableProps) {
  return (
    <table className={cn("w-full text-sm", className)}>
      <thead className={cn("border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground", headClassName)}>
        <tr>
          {columns.map((column) => (
            <th key={column.key} className={cn("px-5 py-2.5 font-semibold", column.className)}>
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className={cn("divide-y divide-border/60", bodyClassName)}>
        {children}
      </tbody>
    </table>
  );
}
