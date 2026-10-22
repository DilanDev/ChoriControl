"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Flame,
  HandCoins,
  PiggyBank,
  Plus,
  ReceiptText,
  ShoppingCart,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  PageContainer,
  LoadingState,
  ErrorState,
} from "@/components/ui/page";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { getResumenDashboard } from "@/lib/services/finanzas";
import {
  getDeudores,
  getVentasDelDia,
  type DeudorRow,
  type VentaConDetalles,
} from "@/lib/services/ventas";
import { formatCOP, formatHora } from "@/lib/format";

interface Resumen {
  ventasDelDia: number;
  ingresosHoy: number;
  gastosHoy: number;
  gananciaEstimada: number;
  porCobrar: number;
  numeroVentasDia: number;
  chorizosVendidos: number;
  ventasSemana: number;
}

export default function DashboardPage() {
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [ventasHoy, setVentasHoy] = useState<VentaConDetalles[]>([]);
  const [deudores, setDeudores] = useState<DeudorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [resumenDia, ventas, deudoresData] = await Promise.all([
        getResumenDashboard(),
        getVentasDelDia(),
        getDeudores(),
      ]);
      setResumen(resumenDia);
      setVentasHoy(ventas);
      setDeudores(deudoresData.deudores);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Error al cargar el resumen"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const gananciaNegativa = (resumen?.gananciaEstimada ?? 0) < 0;

  return (
    <PageContainer>
      <PageHeader
        title="Inicio"
        description="Resumen del negocio de hoy."
      />

      <div className="mb-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <Link
          href="/ventas#nueva-venta"
          className={buttonVariants({
            variant: "default",
            className: "col-span-2 sm:col-span-1",
          })}
        >
          <Plus className="h-4 w-4" /> Nueva venta
        </Link>
        <Link
          href="/contabilidad#nuevo-gasto"
          className={buttonVariants({
            variant: "outline",
            className: "bg-card",
          })}
        >
          <ReceiptText className="h-4 w-4" /> Registrar gasto
        </Link>
        <Link
          href="/deudores"
          className={buttonVariants({
            variant: "outline",
            className: "bg-card",
          })}
        >
          <HandCoins className="h-4 w-4" /> Cobrar deuda
        </Link>
      </div>

      {error && <ErrorState message={error} onRetry={load} />}
      {loading && !resumen && <LoadingState rows={4} />}

      {resumen && (
        <div className={loading ? "opacity-60" : undefined}>
          <div className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-3">
            <StatCard
              label="Ventas de hoy"
              value={formatCOP(resumen.ventasDelDia)}
              sub={`${resumen.numeroVentasDia} venta(s)`}
              icon={TrendingUp}
              accent="text-primary"
              valueClassName="text-base md:text-xl"
            />
            <StatCard
              label="Cobrado hoy"
              value={formatCOP(resumen.ingresosHoy)}
              sub="Pagos recibidos"
              icon={Wallet}
              accent="text-emerald-600"
              valueClassName="text-base md:text-xl"
            />
            <StatCard
              label="Gastos de hoy"
              value={formatCOP(resumen.gastosHoy)}
              sub="Salidas del día"
              icon={ReceiptText}
              accent="text-destructive"
              valueClassName="text-base md:text-xl"
            />
            <StatCard
              label="Ganancia de hoy"
              value={formatCOP(resumen.gananciaEstimada)}
              sub="Cobrado − gastos"
              icon={PiggyBank}
              accent={
                gananciaNegativa ? "text-destructive" : "text-emerald-600"
              }
              valueClassName={
                gananciaNegativa
                  ? "text-base md:text-xl text-destructive"
                  : "text-base md:text-xl text-emerald-700"
              }
            />
            <StatCard
              label="Por cobrar"
              value={formatCOP(resumen.porCobrar)}
              sub="Total de deudas"
              icon={HandCoins}
              accent="text-amber-600"
              valueClassName="text-base md:text-xl"
            />
            <StatCard
              label="Chorizos vendidos"
              value={String(resumen.chorizosVendidos)}
              sub="Hoy"
              icon={Flame}
              accent="text-orange-500"
              valueClassName="text-base md:text-xl"
            />
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <Card>
              <CardContent className="p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="flex items-center gap-2 font-semibold">
                    <ShoppingCart className="h-4 w-4 text-primary" />
                    Ventas de hoy
                  </h2>
                  <Link
                    href="/ventas"
                    className="inline-flex items-center text-xs font-medium text-primary hover:underline"
                  >
                    Ver todas <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
                {ventasHoy.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Aún no hay ventas registradas hoy.
                  </p>
                ) : (
                  <div className="divide-y">
                    {ventasHoy.slice(0, 5).map((venta) => (
                      <Link
                        key={venta.id}
                        href="/ventas"
                        className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-primary"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {venta.cliente?.nombre ?? "Ocasional"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatHora(venta.fecha)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="font-semibold">
                            {formatCOP(venta.total)}
                          </span>
                          <Badge
                            variant="secondary"
                            className={
                              venta.estado === "PAGADA"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }
                          >
                            {venta.estado === "PAGADA" ? "Pagada" : "Pendiente"}
                          </Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
                {ventasHoy.length === 0 && (
                  <Link
                    href="/ventas#nueva-venta"
                    className={buttonVariants({
                      variant: "outline",
                      className: "mt-2 w-full",
                    })}
                  >
                    <Plus className="h-4 w-4" /> Registrar primera venta
                  </Link>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="flex items-center gap-2 font-semibold">
                    <HandCoins className="h-4 w-4 text-amber-600" />
                    Deudores
                  </h2>
                  <Link
                    href="/deudores"
                    className="inline-flex items-center text-xs font-medium text-primary hover:underline"
                  >
                    Ver todos <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
                {deudores.length === 0 ? (
                  <p className="py-6 text-center text-sm font-medium text-emerald-700">
                    ¡Todo al día! No hay deudas pendientes.
                  </p>
                ) : (
                  <div className="divide-y">
                    {deudores.slice(0, 3).map((deudor) => (
                      <Link
                        key={deudor.cliente_id}
                        href="/deudores"
                        className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-primary"
                      >
                        <span className="min-w-0 truncate font-medium">
                          {deudor.cliente.nombre}
                        </span>
                        <span className="shrink-0 font-semibold text-amber-700">
                          {formatCOP(deudor.total_pendiente)}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="mt-4">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  Ventas de la semana
                </p>
                <p className="text-xl font-bold tracking-tight">
                  {formatCOP(resumen.ventasSemana)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Desde el lunes hasta hoy
                </p>
              </div>
              <Link
                href="/contabilidad"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Ver contabilidad <ChevronRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        </div>
      )}
    </PageContainer>
  );
}
