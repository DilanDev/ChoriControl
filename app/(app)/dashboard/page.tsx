"use client";

import { useEffect, useState } from "react";
import { TrendingUp, HandCoins, PiggyBank, Wallet, Flame } from "lucide-react";
import {
  PageContainer,
  LoadingState,
  ErrorState,
} from "@/components/ui/page";
import { PageHeader } from "@/components/ui/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { getResumenDashboard } from "@/lib/services/finanzas";
import { formatCOP } from "@/lib/format";

interface Resumen {
  ventasDelDia: number;
  ingresosHoy: number;
  gastosHoy: number;
  gananciaEstimada: number;
  porCobrar: number;
  numeroVentasDia: number;
  chorizosVendidos: number;
  pedidosPendientes: number;
  alertasInventario: number;
  ventasSemana: number;
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent = "text-foreground",
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">{label}</span>
          <Icon className={`h-5 w-5 ${accent}`} />
        </div>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<Resumen | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getResumenDashboard()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Error al cargar"));
  }, []);

  return (
    <PageContainer>
      <PageHeader
        title="Dashboard"
        description="Resumen del negocio de hoy"
      />

      {error && <ErrorState message={error} />}
      {!data && !error && <LoadingState />}

      {data && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          <StatCard
            label="Ventas de hoy"
            value={formatCOP(data.ventasDelDia)}
            sub={`${data.numeroVentasDia} venta(s)`}
            icon={TrendingUp}
            accent="text-primary"
          />
          <StatCard
            label="Ingresos (cobrado)"
            value={formatCOP(data.ingresosHoy)}
            sub="Hoy"
            icon={Wallet}
            accent="text-green-600"
          />
          <StatCard
            label="Gastos de hoy"
            value={formatCOP(data.gastosHoy)}
            sub="Hoy"
            icon={PiggyBank}
            accent="text-red-600"
          />
          <StatCard
            label="Ganancia estimada"
            value={formatCOP(data.gananciaEstimada)}
            sub="Ingresos - Gastos"
            icon={TrendingUp}
            accent={
              data.gananciaEstimada >= 0 ? "text-green-600" : "text-red-600"
            }
          />
          <StatCard
            label="Por cobrar (deudas)"
            value={formatCOP(data.porCobrar)}
            sub="Total clientes"
            icon={HandCoins}
            accent="text-orange-500"
          />
          <StatCard
            label="Chorizos vendidos"
            value={String(data.chorizosVendidos)}
            sub="Hoy"
            icon={Flame}
            accent="text-orange-500"
          />
          <StatCard
            label="Pedidos pendientes"
            value={String(data.pedidosPendientes)}
            sub="Activos"
            icon={Wallet}
            accent="text-violet-600"
          />
          <StatCard
            label="Alertas inventario"
            value={String(data.alertasInventario)}
            sub="Stock bajo"
            icon={PiggyBank}
            accent="text-red-600"
          />
        </div>
      )}

      {data && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Ventas de la semana</CardTitle>
            <CardDescription>
              Total vendido desde el lunes hasta hoy
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">
              {formatCOP(data.ventasSemana)}
            </div>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
