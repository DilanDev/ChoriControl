"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Flame,
  HandCoins,
  PiggyBank,
  Plus,
  ReceiptText,
  ShoppingCart,
  Trash2,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  PageContainer,
  LoadingState,
  ErrorState,
} from "@/components/ui/page";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { PeriodoSelector } from "@/components/contabilidad/periodo-selector";
import { VentasGastosChart } from "@/components/contabilidad/ventas-gastos-chart";
import { DesgloseCard } from "@/components/contabilidad/desglose-card";
import { GastoFormDialog } from "@/components/gastos/gasto-form-dialog";
import {
  deleteGasto,
  getResumenContabilidad,
  type GastoConCategoria,
  type ResumenContabilidad,
} from "@/lib/services/finanzas";
import {
  fechaISOLocal,
  formatCOP,
  formatFechaHora,
  inicioDeMes,
} from "@/lib/format";
import {
  rangoPeriodo,
  rangoPersonalizadoInvalido,
  type Periodo,
} from "@/lib/periodos";
import { cn } from "@/lib/utils";
import type { MetodoPago } from "@/types";

type TabContabilidad = "resumen" | "ingresos" | "gastos";

const TABS: { id: TabContabilidad; label: string }[] = [
  { id: "resumen", label: "Resumen" },
  { id: "ingresos", label: "Ingresos" },
  { id: "gastos", label: "Gastos" },
];

export default function ContabilidadPage() {
  const { toast } = useToast();
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [desde, setDesde] = useState<string | null>(null);
  const [hasta, setHasta] = useState<string | null>(null);
  const [tab, setTab] = useState<TabContabilidad>("resumen");
  const [resumen, setResumen] = useState<ResumenContabilidad | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gastoOpen, setGastoOpen] = useState(false);
  const [gastoAEliminar, setGastoAEliminar] =
    useState<GastoConCategoria | null>(null);

  useEffect(() => {
    setDesde(fechaISOLocal(inicioDeMes()));
    setHasta(fechaISOLocal());
  }, []);

  const rango = useMemo(
    () => rangoPeriodo(periodo, desde ?? undefined, hasta ?? undefined),
    [periodo, desde, hasta]
  );
  const invalido =
    periodo === "personalizado" &&
    rangoPersonalizadoInvalido(desde ?? "", hasta ?? "");

  const solicitudRef = useRef(0);

  const load = useCallback(async () => {
    if (invalido) {
      solicitudRef.current += 1;
      setResumen(null);
      setError(null);
      setLoading(false);
      return;
    }
    const solicitud = ++solicitudRef.current;
    setLoading(true);
    setError(null);
    try {
      const datos = await getResumenContabilidad(rango.desde, rango.hasta);
      if (solicitud !== solicitudRef.current) return;
      setResumen(datos);
    } catch (e) {
      if (solicitud === solicitudRef.current) {
        setError(
          e instanceof Error ? e.message : "Error al cargar la contabilidad"
        );
      }
    } finally {
      if (solicitud === solicitudRef.current) setLoading(false);
    }
  }, [rango, invalido]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash === "#gastos" || hash === "#nuevo-gasto") setTab("gastos");
    if (hash === "#nuevo-gasto") setGastoOpen(true);
    if (hash) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  function cambiarPeriodo(nuevo: Periodo) {
    setPeriodo(nuevo);
    if (nuevo === "personalizado") {
      if (!desde) setDesde(fechaISOLocal(inicioDeMes()));
      if (!hasta) setHasta(fechaISOLocal());
    }
  }

  async function confirmarEliminarGasto() {
    if (!gastoAEliminar) return;
    try {
      await deleteGasto(gastoAEliminar.id);
      toast({
        title: "Gasto eliminado",
        description: gastoAEliminar.concepto,
        variant: "success",
      });
      await load();
    } catch (e) {
      toast({
        title: "No se pudo eliminar el gasto",
        description: e instanceof Error ? e.message : "Inténtalo de nuevo.",
        variant: "error",
      });
      throw e;
    }
  }

  const itemsMetodo = resumen
    ? (Object.keys(resumen.porMetodo) as MetodoPago[])
        .map((metodo) => ({
          label: metodo,
          value: resumen.porMetodo[metodo],
        }))
        .filter((item) => item.value > 0)
    : [];

  const itemsCategoria = resumen
    ? resumen.porCategoria.map((c) => ({
        label: c.nombre,
        value: c.total,
      }))
    : [];

  const gananciaNegativa = (resumen?.ganancia ?? 0) < 0;

  return (
    <PageContainer>
      <PageHeader
        title="Contabilidad"
        description="Ventas, cobros, gastos y ganancia del negocio."
        action={
          <Button onClick={() => setGastoOpen(true)}>
            <Plus className="h-4 w-4" /> Registrar gasto
          </Button>
        }
      />

      <PeriodoSelector
        periodo={periodo}
        onPeriodoChange={cambiarPeriodo}
        desde={desde ?? ""}
        hasta={hasta ?? ""}
        onDesdeChange={setDesde}
        onHastaChange={setHasta}
      />

      <div className="mt-4">
        {invalido ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Selecciona un rango de fechas válido para ver la contabilidad.
            </CardContent>
          </Card>
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : loading && !resumen ? (
          <LoadingState rows={4} />
        ) : resumen ? (
          <div className={cn("space-y-4", loading && "opacity-60")}>
            <div className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-4">
              <StatCard
                label="Ventas facturadas"
                value={formatCOP(resumen.facturado)}
                sub={`${resumen.numeroVentas} venta(s)`}
                icon={TrendingUp}
                accent="text-primary"
                valueClassName="text-base md:text-xl"
              />
              <StatCard
                label="Cobrado"
                value={formatCOP(resumen.cobrado)}
                sub="Pagos del período"
                icon={Wallet}
                accent="text-emerald-600"
                valueClassName="text-base md:text-xl"
              />
              <StatCard
                label="Gastos"
                value={formatCOP(resumen.gastos)}
                sub="Salidas del período"
                icon={ReceiptText}
                accent="text-destructive"
                valueClassName="text-base md:text-xl"
              />
              <StatCard
                label="Ganancia neta"
                value={formatCOP(resumen.ganancia)}
                sub="Cobrado − gastos"
                icon={PiggyBank}
                accent={gananciaNegativa ? "text-destructive" : "text-emerald-600"}
                valueClassName={cn(
                  "text-base md:text-xl",
                  gananciaNegativa ? "text-destructive" : "text-emerald-700"
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 md:gap-3">
              <StatCard
                label="Por cobrar"
                value={formatCOP(resumen.porCobrar)}
                sub="Total histórico"
                icon={HandCoins}
                accent="text-amber-600"
                valueClassName="text-sm md:text-lg"
              />
              <StatCard
                label="Ventas"
                value={String(resumen.numeroVentas)}
                sub="En el período"
                icon={ShoppingCart}
                accent="text-primary"
                valueClassName="text-sm md:text-lg"
              />
              <StatCard
                label="Chorizos"
                value={String(resumen.chorizosVendidos)}
                sub="Unidades vendidas"
                icon={Flame}
                accent="text-orange-500"
                valueClassName="text-sm md:text-lg"
              />
            </div>

            <Tabs items={TABS} value={tab} onChange={setTab} className="mt-2" />

            {tab === "resumen" && (
              <div className="space-y-3">
                <VentasGastosChart data={resumen.serieDiaria} />
                <div className="grid gap-3 md:grid-cols-2">
                  <DesgloseCard
                    title="Ingresos por método"
                    description="Dinero cobrado según el método de pago."
                    items={itemsMetodo}
                    color="#a8201a"
                  />
                  <DesgloseCard
                    title="Gastos por categoría"
                    description="Salidas registradas en el período."
                    items={itemsCategoria}
                    color="#e97d2c"
                    emptyText="Sin gastos registrados en el período."
                  />
                </div>
              </div>
            )}

            {tab === "ingresos" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-semibold">Pagos del período</h2>
                  <span className="text-sm font-semibold text-emerald-700">
                    {formatCOP(resumen.cobrado)}
                  </span>
                </div>
                {resumen.pagos.length === 0 ? (
                  <EmptyState
                    icon={Wallet}
                    title="Sin ingresos en este período"
                    description="Cuando registres pagos o abonos aparecerán aquí."
                  />
                ) : (
                  <Card>
                    <CardContent className="p-0">
                      <div className="divide-y">
                        {resumen.pagos.map((pago) => (
                          <div
                            key={pago.id}
                            className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                          >
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-emerald-700">
                                  {formatCOP(pago.valor)}
                                </span>
                                <Badge variant="secondary">
                                  {pago.metodo_pago}
                                </Badge>
                              </div>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {formatFechaHora(pago.fecha)}
                                {pago.observacion && ` · ${pago.observacion}`}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {tab === "gastos" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-semibold">Gastos del período</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setGastoOpen(true)}
                  >
                    <Plus className="h-4 w-4" /> Registrar
                  </Button>
                </div>
                {resumen.gastosList.length === 0 ? (
                  <EmptyState
                    icon={ReceiptText}
                    title="Sin gastos en este período"
                    description="Registra una salida para mantener la ganancia al día."
                    action={
                      <Button onClick={() => setGastoOpen(true)}>
                        <Plus className="h-4 w-4" /> Registrar gasto
                      </Button>
                    }
                  />
                ) : (
                  <Card>
                    <CardContent className="p-0">
                      <div className="divide-y">
                        {resumen.gastosList.map((gasto) => (
                          <div
                            key={gasto.id}
                            className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                          >
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="truncate font-medium">
                                  {gasto.concepto}
                                </span>
                                <Badge variant="secondary">
                                  {gasto.categoria?.nombre ?? "Sin categoría"}
                                </Badge>
                              </div>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {formatFechaHora(gasto.fecha)}
                                {gasto.proveedor && ` · ${gasto.proveedor}`}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <span className="font-semibold text-destructive">
                                {formatCOP(gasto.valor)}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Eliminar gasto"
                                onClick={() => setGastoAEliminar(gasto)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>

      <GastoFormDialog
        open={gastoOpen}
        onOpenChange={setGastoOpen}
        fechaInicial={fechaISOLocal(rango.hasta)}
        onSaved={load}
      />

      <ConfirmDialog
        open={!!gastoAEliminar}
        onOpenChange={(abierto) => {
          if (!abierto) setGastoAEliminar(null);
        }}
        title="Eliminar gasto"
        description={
          gastoAEliminar
            ? `Se eliminará “${gastoAEliminar.concepto}” por ${formatCOP(
                gastoAEliminar.valor
              )}.`
            : undefined
        }
        confirmLabel="Eliminar gasto"
        onConfirm={confirmarEliminarGasto}
      />
    </PageContainer>
  );
}
