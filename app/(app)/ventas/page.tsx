"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react";
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
  getVenta,
  crearVenta,
  actualizarVenta,
  eliminarVenta,
  type VentaConDetalles,
  type ItemVenta,
} from "@/lib/services/ventas";
import { getClientes } from "@/lib/services/clientes";
import { createCliente } from "@/lib/services/clientes";
import { getProductosActivos } from "@/lib/services/productos";
import { ClientePicker } from "@/components/clientes/cliente-picker";
import type { Cliente, Producto, MetodoPago } from "@/types";
import { formatCOP, formatFechaHora } from "@/lib/format";

const metodos: MetodoPago[] = [
  "Efectivo",
  "Nequi",
  "Daviplata",
  "Transferencia",
  "Otro",
];

export default function VentasPage() {
  const [ventas, setVentas] = useState<VentaConDetalles[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nuevaOpen, setNuevaOpen] = useState(false);
  const [editando, setEditando] = useState<VentaConDetalles | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const v = await getVentasDelDia();
      setVentas(v);
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

  async function handleEliminar(v: VentaConDetalles) {
    if (
      !confirm(
        `¿Eliminar esta venta de ${formatCOP(v.total)}?\nSe borrarán sus pagos y quedará sin efecto en el saldo del cliente.`
      )
    )
      return;
    try {
      await eliminarVenta(v.id);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al eliminar venta");
    }
  }

  async function abrirEdicion(v: VentaConDetalles) {
    try {
      const completa = await getVenta(v.id);
      if (completa) setEditando(completa);
    } catch {
      setEditando(v);
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Ventas"
        description="Registro de ventas de hoy"
        action={
          <Button onClick={() => setNuevaOpen(true)}>
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
            <VentaCard
              key={v.id}
              venta={v}
              onEditar={() => abrirEdicion(v)}
              onEliminar={() => handleEliminar(v)}
            />
          ))}
        </div>
      )}

      {nuevaOpen && (
        <VentaFormDialog
          open={nuevaOpen}
          setOpen={setNuevaOpen}
          onSaved={load}
        />
      )}
      {editando && (
        <VentaFormDialog
          open={!!editando}
          setOpen={() => setEditando(null)}
          ventaInicial={editando}
          onSaved={async () => {
            setEditando(null);
            await load();
          }}
        />
      )}
    </PageContainer>
  );
}

function VentaCard({
  venta,
  onEditar,
  onEliminar,
}: {
  venta: VentaConDetalles;
  onEditar: () => void;
  onEliminar: () => void;
}) {
  const [abierto, setAbierto] = useState(false);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <button
            className="flex items-center gap-2 text-left min-w-0"
            onClick={() => setAbierto((a) => !a)}
          >
            <span className="font-bold text-lg">{formatCOP(venta.total)}</span>
            <Badge variant={venta.estado === "PAGADA" ? "default" : "secondary"}>
              {venta.estado}
            </Badge>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {venta.cliente?.nombre ?? "Ocasional"}
            </span>
          </button>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              title="Ver detalle"
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
              size="icon"
              title="Editar"
              onClick={onEditar}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="Eliminar"
              onClick={onEliminar}
            >
              <Trash2 className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        </div>

        {abierto && (
          <div className="mt-3 space-y-2 border-t pt-3 text-sm">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{formatFechaHora(venta.fecha)}</span>
              <span>Cliente: {venta.cliente?.nombre ?? "Ocasional"}</span>
            </div>
            <div className="rounded-md bg-muted/50 p-3 space-y-1">
              {venta.detalle_ventas?.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between"
                >
                  <span>
                    {d.cantidad} × {formatCOP(d.precio_unitario)}
                  </span>
                  <span className="font-medium">{formatCOP(d.subtotal)}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1">
              {venta.pagos?.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-green-600 font-medium">
                    Pago: {formatCOP(p.valor)}
                  </span>
                  <span className="text-muted-foreground">
                    {p.metodo_pago} · {formatFechaHora(p.fecha)}
                  </span>
                </div>
              ))}
            </div>
            {Number(venta.saldo_pendiente) > 0 && (
              <div className="flex items-center justify-between text-amber-600 font-medium">
                <span>Saldo pendiente</span>
                <span>{formatCOP(venta.saldo_pendiente)}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function VentaFormDialog({
  open,
  setOpen,
  ventaInicial,
  onSaved,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  ventaInicial?: VentaConDetalles;
  onSaved: () => Promise<void>;
}) {
  const esEdicion = !!ventaInicial;

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [clienteResueltoId, setClienteResueltoId] = useState<string | null>(null);
  const [nombreCliente, setNombreCliente] = useState("");
  const [items, setItems] = useState<ItemVenta[]>([]);
  const [valorPagado, setValorPagado] = useState("");
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("Efectivo");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.all([getClientes(), getProductosActivos()]).then(([c, p]) => {
      if (!mounted) return;
      setClientes(c);
      setProductos(p);

      if (ventaInicial) {
        // Modo edición: precargar desde la venta
        const det = ventaInicial.detalle_ventas ?? [];
        const itemsPre: ItemVenta[] = det.map((d) => ({
          producto_id: d.producto_id,
          cantidad: Number(d.cantidad),
          precio_unitario: Number(d.precio_unitario),
        }));
        if (itemsPre.length === 0 && p.length > 0) {
          itemsPre.push({
            producto_id: p[0].id,
            cantidad: 1,
            precio_unitario: Number(p[0].precio),
          });
        }
        setItems(itemsPre);
        setClienteResueltoId(ventaInicial.cliente_id ?? null);
        setNombreCliente(ventaInicial.cliente?.nombre ?? "");
        const ultimoPago =
          ventaInicial.pagos?.length ? ventaInicial.pagos[0] : null;
        setValorPagado(String(ventaInicial.pagado));
        setMetodoPago(ultimoPago?.metodo_pago ?? "Efectivo");
      } else {
        // Modo alta
        if (p.length === 1) {
          setItems([
            { producto_id: p[0].id, cantidad: 1, precio_unitario: Number(p[0].precio) },
          ]);
        }
        setClienteResueltoId(null);
        setNombreCliente("");
        setValorPagado("");
        setMetodoPago("Efectivo");
      }
    });
    setError(null);
    return () => {
      mounted = false;
    };
  }, [open, ventaInicial]);

  const total = items.reduce(
    (acc, it) =>
      acc + it.cantidad * (productos.find((p) => p.id === it.producto_id)?.precio ?? it.precio_unitario),
    0
  );
  const saldoPendiente = Math.max(0, total - (Number(valorPagado) || 0));

  function actualizarItem(index: number, campo: keyof ItemVenta, valor: string | number) {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== index) return it;
        const nuevo = { ...it, [campo]: valor };
        // Mantener precio unitario actualizado si se cambia producto (solo en alta)
        if (campo === "producto_id" && !esEdicion) {
          const prod = productos.find((p) => p.id === String(valor));
          nuevo.precio_unitario = prod ? Number(prod.precio) : it.precio_unitario;
        }
        return nuevo;
      })
    );
  }

  function agregarItem() {
    const prod = productos[0];
    setItems((prev) => [
      ...prev,
      {
        producto_id: prod?.id ?? "",
        cantidad: 1,
        precio_unitario: prod ? Number(prod.precio) : 0,
      },
    ]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (items.length === 0 || !items[0].producto_id) {
      setError("Agrega al menos un producto con cantidad válida.");
      return;
    }
    const itemsValidos = items.filter(
      (it) => it.producto_id && it.cantidad > 0
    );
    if (itemsValidos.length === 0) {
      setError("Debes seleccionar un producto e ingresar cantidades válidas.");
      return;
    }

    setSaving(true);
    try {
      // Resolver el cliente: si no está seleccionado, buscarlo o crearlo por nombre
      const clienteId = await resolverClienteId();
      const input = {
        cliente_id: clienteId,
        items: itemsValidos,
        valor_pagado: Number(valorPagado) || 0,
        metodo_pago: metodoPago,
      };
      if (esEdicion && ventaInicial) {
        await actualizarVenta(ventaInicial.id, input);
      } else {
        await crearVenta(input);
      }
      setOpen(false);
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar venta");
    } finally {
      setSaving(false);
    }
  }

  async function resolverClienteId(): Promise<string | null> {
    // Ya hay un cliente identificado
    if (clienteResueltoId) return clienteResueltoId;
    const nombre = nombreCliente.replace(/\s+/g, " ").trim();
    if (!nombre) return null;
    // Coincidencia exacta con un cliente existente (insensible a mayúsculas)
    const existente = clientes.find(
      (c) => c.nombre.toLowerCase() === nombre.toLowerCase()
    );
    if (existente) return existente.id;
    // Si no existe, crear el cliente automáticamente con solo el nombre
    const nuevo = await createCliente({ nombre });
    return nuevo.id;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {esEdicion ? "Editar venta" : "Nueva venta"}
          </DialogTitle>
          <DialogDescription>
            {esEdicion
              ? "Corrige los datos de la venta."
              : "Registra una venta y su pago."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert variant="destructive">{error}</Alert>}

          <div className="space-y-2">
            <Label>Cliente</Label>
            <ClientePicker
              clienteInicial={esEdicion ? ventaInicial?.cliente : null}
              onChange={(id, nombre) => {
                setClienteResueltoId(id);
                setNombreCliente(nombre);
              }}
            />
          </div>

          {/* Líneas de detalle */}
          <div className="space-y-2">
            <Label>Productos</Label>
            {items.map((it, idx) => {
              const prodSeleccionado = productos.find(
                (p) => p.id === it.producto_id
              );
              const sub =
                (it.cantidad || 0) *
                (prodSeleccionado?.precio ?? it.precio_unitario);
              return (
                <div key={idx} className="rounded-lg border p-3 space-y-2">
                  <div className="space-y-2">
                    <Label>Producto</Label>
                    <Select
                      value={it.producto_id}
                      onValueChange={(v) =>
                        actualizarItem(idx, "producto_id", v ?? "")
                      }
                    >
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
                  <div className="grid grid-cols-3 gap-2 items-end">
                    <div className="space-y-1">
                      <Label>Cantidad</Label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min="1"
                        value={it.cantidad}
                        onChange={(e) =>
                          actualizarItem(idx, "cantidad", Number(e.target.value))
                        }
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label>Subtotal</Label>
                      <div className="rounded-md bg-muted px-3 py-2 text-right font-semibold">
                        {formatCOP(sub)}
                      </div>
                    </div>
                  </div>
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-600"
                      onClick={() =>
                        setItems((prev) => prev.filter((_, i) => i !== idx))
                      }
                    >
                      Quitar
                    </Button>
                  )}
                </div>
              );
            })}
            <Button type="button" variant="outline" size="sm" onClick={agregarItem}>
              + Agregar producto
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Total</Label>
              <div className="rounded-lg border bg-muted px-3 py-2 text-right font-bold text-lg">
                {formatCOP(total)}
              </div>
            </div>
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
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            <div className="space-y-2">
              <Label>Saldo pendiente</Label>
              <div
                className={`rounded-lg border px-3 py-2 text-right font-bold text-lg ${
                  saldoPendiente > 0
                    ? "border-orange-300 bg-orange-50 text-orange-600"
                    : "border-green-300 bg-green-50 text-green-700"
                }`}
              >
                {formatCOP(saldoPendiente)}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving
                ? "Guardando..."
                : esEdicion
                ? "Guardar cambios"
                : "Registrar venta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
