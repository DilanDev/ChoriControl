import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent = "text-muted-foreground",
  className,
  valueClassName,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  accent?: string;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <Card className={className}>
      <CardContent className="p-4 md:p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">{label}</span>
          {Icon && <Icon className={cn("h-5 w-5 shrink-0", accent)} />}
        </div>
        <div
          className={cn(
            "mt-1.5 text-xl font-bold tracking-tight md:text-2xl",
            valueClassName
          )}
        >
          {value}
        </div>
        {sub && (
          <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>
        )}
      </CardContent>
    </Card>
  );
}
