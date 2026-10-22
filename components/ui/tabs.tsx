"use client";

import { cn } from "@/lib/utils";

export interface TabItem<T extends string> {
  id: T;
  label: string;
}

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  className,
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex gap-1 rounded-xl border bg-muted/60 p-1",
        className
      )}
    >
      {items.map((item) => {
        const activo = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={activo}
            onClick={() => onChange(item.id)}
            className={cn(
              "flex-1 rounded-lg px-2 py-2 text-xs font-medium transition-colors sm:px-3 sm:text-sm",
              activo
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
