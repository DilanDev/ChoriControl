"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  HandCoins,
  Plus,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import {
  PageContainer,
  LoadingState,
  ErrorState,
} from "@/components/ui/page";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { VentaCard } from "@/components/ventas/venta-card";
import { VentaFormDialog } from "@/components/ventas/venta-form-dialog";
import {
  eliminarVenta,
  getVenta,
  getVentasDelDia,
  type VentaConDetalles,
} from "@/lib/services/ventas";
import { getPagos } from "@/lib/services/finanzas";
import {
  etiquetaDia,
  fechaISOLocal,
  finDelDia,
  formatCOP,
  formatFechaLarga,
  inicioDelDia,
  parseFechaLocal,
  sumarDias,
} from "@/lib/format";
import type { Pago } from "@/types";

export default function VentasPage() {
  const { toast } = useToast();
  const [fecha, setFecha] = useState<string | null>(null);
  const [ventas, setVentas] = useState<VentaConDetalles[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nuevaOpen, setNuevaOpen] = useState(false);
  const [editando, setEditando] = useState<VentaConDetalles | null>(null);
  const [ventaAEliminar, setVentaAEliminar] =
    useState<VentaConDetalles | null>(null);

  useEffect(() => {
    setFecha(fechaISOLocal());
  }, []);

  const solicitudRef = useRef(0);

  const load = useCallback(async () => {
    if (!fecha) return;
    const solicitud = ++solicitudRef.current;
    setLoading(true);
    setError(null);
    try {
      const dia = parseFechaLocal(fecha);
      const [ventasDia, pagosDia] = await Promise.all([
        getVentasDelDia(dia),
        getPagos(inicioDelDia(dia), finDelDia(dia)),
      ]);
      if (solicitud !== solicitudRef.current) return;
      setVentas(ventasDia);
      setPagos(pagosDia);
    } catch (e) {
      if (solicitud === solicitudRef.current) {
        setError(e instanceof Error ? e.message : "Error al cargar ventas");
      }
    } finally {
      if (solicitud === solicitudRef.current) setLoading(false);
    }
  }, [fecha]);

  useEffect(() => {
    if (fecha) load();
  }, [fecha, load]);

  useEffect(() => {
    if (fecha && window.location.hash === "#nueva-venta") {
      setNuevaOpen(true);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [fecha]);

  const hoy = fechaISOLocal();
  const esHoy = fecha === hoy;
  const totalDia = ventas.reduce((acc, v) => acc + Number(v.total), 0);
  const saldoDia = ventas.reduce(
    (acc, v) => acc + Number(v.saldo_pendiente),
    0
  );
  const cobradoDia = pagos.reduce((acc, p) => acc + Number(p.valor), 0);
  const nombreDia = fecha ? etiquetaDia(fecha) : "Hoy";
  const tituloVacio =
    nombreDia === "Hoy" || nombreDia === "Ayer"
      ? `No hay ventas ${nombreDia.toLowerCase()}`
      : `No hay ventas el ${nombreDia}`;

  function irAlDia(delta: number) {
    if (!fecha) return;
    setFecha(sumarDias(fecha, delta));
  }

  async function abrirEdicion(venta: VentaConDetalles) {
    try {
      const completa = await getVenta(venta.id);
      setEditando(completa ?? venta);
    } catch {
      setEditando(venta);
    }
  }

  async function confirmarEliminar() {
    if (!ventaAEliminar) return;
    try {
      await eliminarVenta(ventaAEliminar.id);
      toast({
        title: "Venta eliminada",
        description: formatCOP(ventaAEliminar.total),
        variant: "success",
      });
      await load();
    } catch (e) {
      toast({
        title: "No se pudo eliminar la venta",
        description: e instanceof Error ? e.message : "Inténtalo de nuevo.",
        variant: "error",
      });
      throw e;
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Ventas"
        description="Consulta y edita las ventas del día que elijas."
        action={
          <Button onClick={() => setNuevaOpen(true)}>
            <Plus className="h-4 w-4" /> Nueva venta
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Día anterior"
            onClick={() => irAlDia(-1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="relative min-w-0 flex-1 sm:flex-none">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="date"
              value={fecha ?? ""}
              max={hoy}
              onChange={(e) => {
                const valor = e.target.value;
                if (valor && valor <= hoy) setFecha(valor);
              }}
              className="pl-9 sm:w-44"
              aria-label="Fecha de las ventas"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            aria-label="Día siguiente"
            disabled={!fecha || esHoy}
            onClick={() => irAlDia(1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {fecha && !esHoy && (
            <Button variant="ghost" size="sm" onClick={() => setFecha(hoy)}>
              Hoy
            </Button>
          )}
        </div>
        <p className="text-sm font-medium">
          {fecha ? (
            <>
              {nombreDia}{" "}
              <span className="font-normal text-muted-foreground">
                · {formatFechaLarga(parseFechaLocal(fecha))}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">Cargando fecha...</span>
          )}
        </p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:gap-3">
        <StatCard
          label="Vendido"
          value={loading ? "—" : formatCOP(totalDia)}
          sub={loading ? undefined : `${ventas.length} venta(s)`}
          icon={ShoppingCart}
          accent="text-primary"
          valueClassName="text-base md:text-2xl"
        />
        <StatCard
          label="Cobrado"
          value={loading ? "—" : formatCOP(cobradoDia)}
          sub="Pagos del día"
          icon={Wallet}
          accent="text-emerald-600"
          valueClassName="text-base md:text-2xl"
        />
        <StatCard
          className="col-span-2 sm:col-span-1"
          label="Por cobrar"
          value={loading ? "—" : formatCOP(saldoDia)}
          sub="Saldo de estas ventas"
          icon={HandCoins}
          accent="text-amber-600"
          valueClassName="text-base md:text-2xl"
        />
      </div>

      {error && <ErrorState message={error} onRetry={load} />}
      {loading && <LoadingState rows={3} />}

      {!loading && !error && (
        <div className="space-y-3">
          {ventas.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title={tituloVacio}
              description="Registra la primera venta de este día para empezar a ver sus totales."
              action={
                <Button onClick={() => setNuevaOpen(true)}>
                  <Plus className="h-4 w-4" /> Registrar venta
                </Button>
              }
            />
          ) : (
            ventas.map((venta) => (
              <VentaCard
                key={venta.id}
                venta={venta}
                onEditar={() => abrirEdicion(venta)}
                onEliminar={() => setVentaAEliminar(venta)}
              />
            ))
          )}
        </div>
      )}

      {nuevaOpen && (
        <VentaFormDialog
          open={nuevaOpen}
          onOpenChange={setNuevaOpen}
          fechaInicial={fecha ?? hoy}
          onSaved={load}
        />
      )}

      {editando && (
        <VentaFormDialog
          open={!!editando}
          onOpenChange={(abierto) => {
            if (!abierto) setEditando(null);
          }}
          ventaInicial={editando}
          fechaInicial={fecha ?? hoy}
          onSaved={async () => {
            setEditando(null);
            await load();
          }}
        />
      )}

      <ConfirmDialog
        open={!!ventaAEliminar}
        onOpenChange={(abierto) => {
          if (!abierto) setVentaAEliminar(null);
        }}
        title="Eliminar venta"
        description={
          ventaAEliminar
            ? `Se eliminará la venta de ${formatCOP(
                ventaAEliminar.total
              )} y sus pagos. El saldo del cliente se actualizará.`
            : undefined
        }
        confirmLabel="Eliminar venta"
        onConfirm={confirmarEliminar}
      />
    </PageContainer>
  );
}
