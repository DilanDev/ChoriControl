"use client";

import { useCallback, useEffect, useState } from "react";
import { HandCoins } from "lucide-react";
import { PageContainer, LoadingState, ErrorState } from "@/components/ui/page";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getDeudores,
  getVentasPendientesDeCliente,
  registrarAbono,
  type DeudorRow,
  type VentaConDetalles,
} from "@/lib/services/ventas";
import type { MetodoPago } from "@/types";
import { formatCOP, formatFecha } from "@/lib/format";

const metodos: MetodoPago[] = [
  "Efectivo",
  "Nequi",
  "Daviplata",
  "Transferencia",
  "Otro",
];

export default function DeudoresPage() {
  const [deudores, setDeudores] = useState<DeudorRow[]>([]);
  const [totalPorCobrar, setTotalPorCobrar] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [abonarDeudor, setAbonarDeudor] = useState<DeudorRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { deudores, totalPorCobrar } = await getDeudores();
      setDeudores(deudores);
      setTotalPorCobrar(totalPorCobrar);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar deudores");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <PageContainer>
      <PageHeader
        title="Deudores"
        description="Clientes con saldo pendiente por cobrar"
      />

      <Card className="mb-6">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="rounded-full bg-amber-100 p-3 text-amber-700">
            <HandCoins className="h-6 w-6" />
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Total por cobrar</div>
            <div className="text-3xl font-bold tracking-tight">
              {!loading && formatCOP(totalPorCobrar)}
            </div>
          </div>
        </CardContent>
      </Card>

      {error && <ErrorState message={error} />}
      {loading && <LoadingState />}

      {!loading && !error && (
        <div className="space-y-3">
          {deudores.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-green-600">
                ¡No hay deudores! Todo está al día.
              </CardContent>
            </Card>
          )}
          {deudores.map((d) => (
            <Card key={d.cliente_id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">
                      {d.cliente.nombre}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Debe:{" "}
                      <span className="text-amber-600 font-medium">
                        {formatCOP(d.total_pendiente)}
                      </span>
                    </div>
                    {d.ultima_venta && (
                      <div className="text-xs text-muted-foreground">
                        Última compra: {formatFecha(d.ultima_venta)}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="default"
                    onClick={() => setAbonarDeudor(d)}
                    className="shrink-0"
                  >
                    Abonar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {abonarDeudor && (
        <AbonoDialog
          deudor={abonarDeudor}
          setOpen={() => setAbonarDeudor(null)}
          onDone={() => {
            setAbonarDeudor(null);
            load();
          }}
        />
      )}
    </PageContainer>
  );
}

function AbonoDialog({
  deudor,
  setOpen,
  onDone,
}: {
  deudor: DeudorRow;
  setOpen: () => void;
  onDone: () => void;
}) {
  const [ventas, setVentas] = useState<VentaConDetalles[]>([]);
  const [ventaId, setVentaId] = useState("");
  const [valor, setValor] = useState("");
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("Efectivo");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getVentasPendientesDeCliente(deudor.cliente_id)
      .then((v) => {
        if (!mounted) return;
        setVentas(v);
        if (v.length > 0) setVentaId(v[0].id);
        setError(null);
      })
      .catch((e) => {
        if (mounted)
          setError(e instanceof Error ? e.message : "Error al cargar ventas");
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [deudor.cliente_id]);

  const ventaSeleccionada = ventas.find((v) => v.id === ventaId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const valorNum = Number(valor);
    if (!ventaId) {
      setError("Debe existir una venta pendiente para abonar.");
      return;
    }
    if (!ventaSeleccionada || valorNum <= 0) {
      setError("Ingresa un valor de abono válido.");
      return;
    }
    if (valorNum > Number(ventaSeleccionada.saldo_pendiente)) {
      setError(
        `El abono no puede superar el saldo pendiente (${formatCOP(
          ventaSeleccionada.saldo_pendiente
        )}).`
      );
      return;
    }

    setSaving(true);
    try {
      await registrarAbono({
        cliente_id: deudor.cliente_id,
        venta_id: ventaId,
        valor: valorNum,
        metodo_pago: metodoPago,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar abono");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && setOpen()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar abono — {deudor.cliente.nombre}</DialogTitle>
          <DialogDescription>
            Deuda total: {formatCOP(deudor.total_pendiente)}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <LoadingState />
        ) : ventas.length === 0 ? (
          <Alert>Este cliente no tiene ventas pendientes.</Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <Alert variant="destructive">{error}</Alert>}

            <div className="space-y-2">
              <Label>Venta a abonar</Label>
              <Select value={ventaId} onValueChange={(v) => setVentaId(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {ventaSeleccionada
                      ? `${formatFecha(ventaSeleccionada.fecha)} — ${formatCOP(
                          ventaSeleccionada.saldo_pendiente
                        )}`
                      : "Selecciona venta"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ventas.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {formatFecha(v.fecha)} — Saldo {formatCOP(v.saldo_pendiente)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {ventaSeleccionada && (
                <p className="text-xs text-muted-foreground">
                  Saldo de la venta: {formatCOP(ventaSeleccionada.saldo_pendiente)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor">Valor del abono *</Label>
              <Input
                id="valor"
                type="number"
                inputMode="numeric"
                min="1"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>Método de pago</Label>
              <Select
                value={metodoPago}
                onValueChange={(v) => setMetodoPago(v as MetodoPago)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{metodoPago}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {metodos.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={setOpen}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Registrando..." : "Registrar abono"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
