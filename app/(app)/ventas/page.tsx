"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { PageContainer, LoadingState, ErrorState } from "@/components/ui/page";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  getVentasDelDia,
  crearVenta,
  type CrearVentaInput,
} from "@/lib/services/ventas";
import { getClientes } from "@/lib/services/clientes";
import { getProductosActivos } from "@/lib/services/productos";
import type { Cliente, Producto, Venta, MetodoPago } from "@/types";
import { formatCOP, formatFechaHora } from "@/lib/format";

const metodos: MetodoPago[] = [
  "Efectivo",
  "Nequi",
  "Daviplata",
  "Transferencia",
  "Otro",
];

export default function VentasPage() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const v = await getVentasDelDia();
      setVentas(v as Venta[]);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar ventas");
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
        title="Ventas"
        description="Ventas de hoy"
        action={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Nueva venta
          </Button>
        }
      />

      {error && <ErrorState message={error} />}
      {loading && <LoadingState />}

      {!loading && !error && (
        <div className="space-y-3">
          {ventas.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No hay ventas registradas hoy.
              </CardContent>
            </Card>
          )}
          {ventas.map((v) => (
            <Card key={v.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{formatCOP(v.total)}</span>
                  <Badge variant={v.estado === "PAGADA" ? "default" : "destructive"}>
                    {v.estado}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {formatFechaHora(v.fecha)}
                  {Number(v.saldo_pendiente) > 0 && (
                    <span className="text-amber-600 ml-2 font-medium">
                      Saldo: {formatCOP(v.saldo_pendiente)}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <NuevaVentaDialog open={dialogOpen} setOpen={setDialogOpen} onSaved={load} />
    </PageContainer>
  );
}

function NuevaVentaDialog({
  open,
  setOpen,
  onSaved,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  onSaved: () => Promise<void>;
}) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [clienteId, setClienteId] = useState<string>("");
  const [productoId, setProductoId] = useState<string>("");
  const [cantidad, setCantidad] = useState("1");
  const [valorPagado, setValorPagado] = useState("");
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("Efectivo");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      let mounted = true;
      Promise.all([getClientes(), getProductosActivos()])
        .then(([c, p]) => {
          if (!mounted) return;
          setClientes(c);
          setProductos(p);
          if (p.length === 1) setProductoId(p[0].id);
          setCantidad("1");
          setValorPagado("");
        })
        .catch(() => {});
      return () => {
        mounted = false;
      };
    }
  }, [open]);

  const productoSeleccionado = productos.find((p) => p.id === productoId);
  const cantidadNum = Number(cantidad) || 0;
  const total = productoSeleccionado
    ? cantidadNum * Number(productoSeleccionado.precio)
    : 0;
  const saldoPendiente = Math.max(0, total - (Number(valorPagado) || 0));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!productoId || cantidadNum <= 0) {
      setError("Selecciona un producto e ingresa una cantidad válida.");
      return;
    }
    if (!productoSeleccionado) return;

    setSaving(true);
    try {
      const input: CrearVentaInput = {
        cliente_id: clienteId || null,
        items: [
          {
            producto_id: productoSeleccionado.id,
            cantidad: cantidadNum,
            precio_unitario: Number(productoSeleccionado.precio),
          },
        ],
        valor_pagado: Number(valorPagado) || 0,
        metodo_pago: metodoPago,
      };
      await crearVenta(input);
      setOpen(false);
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar venta");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva venta</DialogTitle>
          <DialogDescription>Registra una venta y su pago.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert variant="destructive">{error}</Alert>}

          <div className="space-y-2">
            <Label>Cliente</Label>
              <Select value={clienteId} onValueChange={(v) => setClienteId(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sin cliente (ocasional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sin cliente</SelectItem>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Producto *</Label>
            <Select value={productoId} onValueChange={(v) => setProductoId(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona producto" />
              </SelectTrigger>
              <SelectContent>
                {productos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nombre} — {formatCOP(p.precio)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cantidad">Cantidad *</Label>
              <Input
                id="cantidad"
                type="number"
                inputMode="numeric"
                min="1"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Total</Label>
              <div className="rounded-lg border bg-muted px-3 py-2 text-right font-bold text-lg">
                {formatCOP(total)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pagado">Valor pagado</Label>
              <Input
                id="pagado"
                type="number"
                inputMode="numeric"
                min="0"
                value={valorPagado}
                onChange={(e) => setValorPagado(e.target.value)}
                placeholder="0"
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="saldo">Saldo pendiente</Label>
              <div
                id="saldo"
                className={`rounded-lg border px-3 py-2 text-right font-bold text-lg ${
                  saldoPendiente > 0
                    ? "border-amber-300 bg-amber-50 text-amber-700"
                    : "border-green-300 bg-green-50 text-green-700"
                }`}
              >
                {formatCOP(saldoPendiente)}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <div className="rounded-lg border bg-muted px-3 py-2 text-center">
                <Badge
                  variant={saldoPendiente > 0 ? "destructive" : "default"}
                >
                  {saldoPendiente > 0 ? "PENDIENTE" : "PAGADA"}
                </Badge>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Registrar venta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
