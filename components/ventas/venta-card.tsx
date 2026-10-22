"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { VentaConDetalles } from "@/lib/services/ventas";
import { formatCOP, formatFechaHora, formatHora } from "@/lib/format";

export function VentaCard({
  venta,
  onEditar,
  onEliminar,
}: {
  venta: VentaConDetalles;
  onEditar: () => void;
  onEliminar: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const detalle = venta.detalle_ventas ?? [];
  const pagos = venta.pagos ?? [];
  const resumenProductos = detalle
    .map((d) => `${d.cantidad}× ${d.producto?.nombre ?? "Producto"}`)
    .join(", ");

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            className="min-w-0 flex-1 text-left"
            onClick={() => setAbierto((a) => !a)}
            aria-expanded={abierto}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-bold">{formatCOP(venta.total)}</span>
              {venta.estado === "PAGADA" ? (
                <Badge
                  variant="secondary"
                  className="bg-emerald-100 text-emerald-800"
                >
                  Pagada
                </Badge>
              ) : (
                <Badge
                  variant="secondary"
                  className="bg-amber-100 text-amber-800"
                >
                  Pendiente
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {formatHora(venta.fecha)}
              </span>
            </div>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {venta.cliente?.nombre ?? "Ocasional"}
              {resumenProductos && <> · {resumenProductos}</>}
            </p>
          </button>

          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={abierto ? "Ocultar detalle" : "Ver detalle"}
              onClick={() => setAbierto((a) => !a)}
            >
              {abierto ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Editar venta"
              onClick={onEditar}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Eliminar venta"
              onClick={onEliminar}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>

        {abierto && (
          <div className="mt-3 space-y-3 border-t pt-3 text-sm">
            <div className="space-y-1 rounded-lg bg-muted/60 p-3">
              {detalle.length === 0 && (
                <p className="text-muted-foreground">Sin detalle de productos.</p>
              )}
              {detalle.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="min-w-0 truncate">
                    {d.cantidad} × {d.producto?.nombre ?? "Producto"}{" "}
                    <span className="text-muted-foreground">
                      ({formatCOP(d.precio_unitario)})
                    </span>
                  </span>
                  <span className="shrink-0 font-medium">
                    {formatCOP(d.subtotal)}
                  </span>
                </div>
              ))}
            </div>

            {pagos.length > 0 && (
              <div className="space-y-1">
                {pagos.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="font-medium text-emerald-700">
                      Pago {formatCOP(p.valor)}
                    </span>
                    <span className="text-muted-foreground">
                      {p.metodo_pago} · {formatFechaHora(p.fecha)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {Number(venta.saldo_pendiente) > 0 && (
              <div className="flex items-center justify-between font-medium text-amber-700">
                <span>Saldo pendiente</span>
                <span>{formatCOP(venta.saldo_pendiente)}</span>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Cliente: {venta.cliente?.nombre ?? "Ocasional"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
