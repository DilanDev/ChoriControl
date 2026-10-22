import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCOP } from "@/lib/format";

export function DesgloseCard({
  title,
  description,
  items,
  color = "#a8201a",
  emptyText = "Sin movimientos en el período.",
}: {
  title: string;
  description?: string;
  items: { label: string; value: number }[];
  color?: string;
  emptyText?: string;
}) {
  const visibles = items.filter((item) => item.value > 0);
  const maximo = Math.max(...visibles.map((item) => item.value), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {visibles.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <div className="space-y-3">
            {visibles.map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">{item.label}</span>
                  <span className="shrink-0 font-medium tabular-nums">
                    {formatCOP(item.value)}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-2 rounded-r-[4px]"
                    style={{
                      width: `${Math.max(
                        (item.value / maximo) * 100,
                        item.value > 0 ? 2 : 0
                      )}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
