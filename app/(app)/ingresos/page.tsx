"use client";

import { useCallback, useEffect, useState } from "react";
import { PageContainer, LoadingState, ErrorState } from "@/components/ui/page";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getIngresosPorPeriodo,
  getPagos,
} from "@/lib/services/finanzas";
import type { Pago, MetodoPago } from "@/types";
import { formatCOP, formatFechaHora } from "@/lib/format";

type Periodo = "hoy" | "semana" | "mes" | "personalizado";

function rangoPeriodo(p: Periodo, desde?: string, hasta?: string): { desde: Date; hasta: Date } {
  const hastaDate = hasta ? new Date(hasta + "T23:59:59") : new Date();
  if (p === "personalizado" && desde) {
    return { desde: new Date(desde + "T00:00:00"), hasta: hastaDate };
  }
  if (p === "semana") {
    const d = new Date();
    const dia = d.getDay();
    const diff = dia === 0 ? 6 : dia - 1;
    const inicio = new Date(d);
    inicio.setDate(d.getDate() - diff);
    inicio.setHours(0, 0, 0, 0);
    return { desde: inicio, hasta: hastaDate };
  }
  if (p === "mes") {
    const d = new Date();
    return { desde: new Date(d.getFullYear(), d.getMonth(), 1), hasta: hastaDate };
  }
  // hoy
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return { desde: d, hasta: hastaDate };
}

export default function IngresosPage() {
  const [periodo, setPeriodo] = useState<Periodo>("hoy");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [total, setTotal] = useState(0);
  const [porMetodo, setPorMetodo] = useState<Record<MetodoPago, number>>({
    Efectivo: 0,
    Nequi: 0,
    Daviplata: 0,
    Transferencia: 0,
    Otro: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (p: Periodo, d?: string, h?: string) => {
      setLoading(true);
      setError(null);
      try {
        const rango = rangoPeriodo(p, d, h);
        const [resumen, pagoList] = await Promise.all([
          getIngresosPorPeriodo(rango.desde, rango.hasta),
          getPagos(rango.desde, rango.hasta),
        ]);
        setTotal(resumen.total);
        setPorMetodo(resumen.porMetodo);
        setPagos(pagoList);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al cargar ingresos");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    load(periodo, desde || undefined, hasta || undefined);
  }, [periodo, desde, hasta, load]);

  const periodos: { id: Periodo; label: string }[] = [
    { id: "hoy", label: "Hoy" },
    { id: "semana", label: "Semana" },
    { id: "mes", label: "Mes" },
    { id: "personalizado", label: "Personalizado" },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Ingresos"
        description="Dinero cobrado en el periodo seleccionado"
      />

      <div className="flex flex-wrap gap-2 mb-4">
        {periodos.map((p) => (
          <Button
            key={p.id}
            variant={periodo === p.id ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriodo(p.id)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {periodo === "personalizado" && (
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="space-y-1">
            <Label htmlFor="desde">Desde</Label>
            <Input
              id="desde"
              type="date"
              value={desde}
              onChange={(e) => {
                setDesde(e.target.value);
              }}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="hasta">Hasta</Label>
            <Input
              id="hasta"
              type="date"
              value={hasta}
              onChange={(e) => {
                setHasta(e.target.value);
              }}
            />
          </div>
        </div>
      )}

      {error && <ErrorState message={error} />}
      {loading && <LoadingState />}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            <Card>
              <CardContent className="p-5">
                <div className="text-sm text-muted-foreground">Total ingresos</div>
                <div className="text-2xl font-bold tracking-tight text-green-600 mt-1">
                  {formatCOP(total)}
                </div>
              </CardContent>
            </Card>
            {(Object.keys(porMetodo) as MetodoPago[]).map((m) => (
              <Card key={m}>
                <CardContent className="p-5">
                  <div className="text-sm text-muted-foreground">{m}</div>
                  <div className="text-lg font-bold tracking-tight mt-1">
                    {formatCOP(porMetodo[m])}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-sm mb-2">Detalle de pagos</h3>
            {pagos.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No hay pagos en este periodo.
                </CardContent>
              </Card>
            )}
            {pagos.map((p) => (
              <Card key={p.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <span className="font-medium text-green-600">
                      {formatCOP(p.valor)}
                    </span>
                    <BadgeMetodo metodo={p.metodo_pago} />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatFechaHora(p.fecha)}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </PageContainer>
  );
}

function BadgeMetodo({ metodo }: { metodo: string }) {
  return (
    <span className="inline-flex items-center ml-2 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
      {metodo}
    </span>
  );
}
