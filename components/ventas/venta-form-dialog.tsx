"use client";

import { useEffect, useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/ui/page";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { ClientePicker } from "@/components/clientes/cliente-picker";
import { createCliente, getClientes } from "@/lib/services/clientes";
import { getProductosActivos } from "@/lib/services/productos";
import {
  actualizarVenta,
  crearVenta,
  type ItemVenta,
  type VentaConDetalles,
} from "@/lib/services/ventas";
import { METODOS_PAGO } from "@/lib/constants";
import {
  etiquetaDia,
  fechaISOLocal,
  fechaParaGuardar,
  formatCOP,
} from "@/lib/format";
import type { Cliente, MetodoPago, Producto } from "@/types";

export function VentaFormDialog({
  open,
  onOpenChange,
  ventaInicial,
  fechaInicial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ventaInicial?: VentaConDetalles | null;
  fechaInicial: string;
  onSaved: () => Promise<void>;
}) {
  const esEdicion = !!ventaInicial;
  const { toast } = useToast();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [clienteResueltoId, setClienteResueltoId] = useState<string | null>(
    null
  );
  const [nombreCliente, setNombreCliente] = useState("");
  const [items, setItems] = useState<ItemVenta[]>([]);
  const [valorPagado, setValorPagado] = useState("");
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("Efectivo");
  const [fecha, setFecha] = useState(fechaInicial);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    setCargando(true);
    setError(null);

    Promise.all([getClientes(), getProductosActivos()])
      .then(([clientesCargados, productosCargados]) => {
        if (!mounted) return;
        setClientes(clientesCargados);
        setProductos(productosCargados);

        if (ventaInicial) {
          const detalle = (ventaInicial.detalle_ventas ?? []).filter(
            (d) => d.producto_id
          );
          const itemsPrecargados: ItemVenta[] = detalle.map((d) => ({
            producto_id: d.producto_id,
            cantidad: Number(d.cantidad),
            precio_unitario: Number(d.precio_unitario),
          }));
          if (itemsPrecargados.length === 0 && productosCargados.length > 0) {
            const p = productosCargados[0];
            itemsPrecargados.push({
              producto_id: p.id,
              cantidad: 1,
              precio_unitario: Number(p.precio),
            });
          }
          setItems(itemsPrecargados);
          setClienteResueltoId(ventaInicial.cliente_id ?? null);
          setNombreCliente(ventaInicial.cliente?.nombre ?? "");
          setValorPagado(
            Number(ventaInicial.pagado) > 0 ? String(ventaInicial.pagado) : ""
          );
          setMetodoPago(
            ventaInicial.pagos?.[0]?.metodo_pago ?? "Efectivo"
          );
          setFecha(fechaISOLocal(new Date(ventaInicial.fecha)));
        } else {
          const primero = productosCargados[0];
          setItems(
            primero
              ? [
                  {
                    producto_id: primero.id,
                    cantidad: 1,
                    precio_unitario: Number(primero.precio),
                  },
                ]
              : []
          );
          setClienteResueltoId(null);
          setNombreCliente("");
          setValorPagado("");
          setMetodoPago("Efectivo");
          setFecha(fechaInicial);
        }
      })
      .catch((e) => {
        if (mounted) {
          setError(
            e instanceof Error
              ? e.message
              : "No se pudieron cargar clientes y productos."
          );
        }
      })
      .finally(() => {
        if (mounted) setCargando(false);
      });

    return () => {
      mounted = false;
    };
  }, [open, ventaInicial, fechaInicial]);

  const total = items.reduce(
    (acc, it) =>
      acc + (Number(it.cantidad) || 0) * (Number(it.precio_unitario) || 0),
    0
  );
  const pagadoNum = Number(valorPagado) || 0;
  const saldoPendiente = Math.max(0, total - pagadoNum);
  const pagoExcede = pagadoNum > total + 0.009;
  const montoCambio =
    esEdicion && ventaInicial
      ? Math.abs(Number(ventaInicial.pagado) - pagadoNum) > 0.009
      : false;
  const hoy = fechaISOLocal();

  function actualizarItem(
    index: number,
    campo: keyof ItemVenta,
    valor: string | number
  ) {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== index) return it;
        if (campo === "producto_id") {
          const producto = productos.find((p) => p.id === String(valor));
          return {
            ...it,
            producto_id: String(valor),
            precio_unitario: producto
              ? Number(producto.precio)
              : it.precio_unitario,
          };
        }
        return { ...it, [campo]: valor };
      })
    );
  }

  function cambiarCantidad(index: number, delta: number) {
    setItems((prev) =>
      prev.map((it, i) =>
        i === index
          ? { ...it, cantidad: Math.max(1, Number(it.cantidad || 1) + delta) }
          : it
      )
    );
  }

  function agregarItem() {
    const producto = productos[0];
    if (!producto) return;
    setItems((prev) => [
      ...prev,
      {
        producto_id: producto.id,
        cantidad: 1,
        precio_unitario: Number(producto.precio),
      },
    ]);
  }

  function quitarItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function resolverClienteId(): Promise<string | null> {
    if (clienteResueltoId) return clienteResueltoId;
    const nombre = nombreCliente.replace(/\s+/g, " ").trim();
    if (!nombre) return null;
    const existente = clientes.find(
      (c) => c.nombre.toLowerCase() === nombre.toLowerCase()
    );
    if (existente) return existente.id;
    const nuevo = await createCliente({ nombre });
    return nuevo.id;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!fecha) {
      setError("Selecciona la fecha de la venta.");
      return;
    }
    if (fecha > hoy) {
      setError("La fecha de la venta no puede ser futura.");
      return;
    }

    if (items.length === 0) {
      setError("Agrega al menos un producto.");
      return;
    }
    if (
      items.some((it) => !it.producto_id || Number(it.cantidad) <= 0)
    ) {
      setError(
        "Revisa las líneas: cada producto debe tener una cantidad mayor que cero."
      );
      return;
    }
    const itemsValidos = items;
    if (total <= 0) {
      setError("El total de la venta debe ser mayor que cero.");
      return;
    }
    if (pagoExcede) {
      setError("El valor pagado no puede superar el total de la venta.");
      return;
    }

    setSaving(true);
    try {
      const clienteId = await resolverClienteId();
      const fechaGuardar = fechaParaGuardar(
        fecha,
        esEdicion && ventaInicial ? ventaInicial.fecha : null
      );
      const input = {
        cliente_id: clienteId,
        items: itemsValidos.map((it) => ({
          producto_id: it.producto_id,
          cantidad: Number(it.cantidad),
          precio_unitario: Number(it.precio_unitario),
        })),
        valor_pagado: pagadoNum,
        metodo_pago: metodoPago,
        fecha: fechaGuardar,
      };

      if (esEdicion && ventaInicial) {
        await actualizarVenta(ventaInicial.id, input);
      } else {
        await crearVenta(input);
      }

      toast({
        title: esEdicion ? "Venta actualizada" : "Venta registrada",
        description: `${formatCOP(total)} · ${etiquetaDia(fecha)}`,
        variant: "success",
      });
      onOpenChange(false);
      await onSaved();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo guardar la venta."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {esEdicion ? "Editar venta" : "Nueva venta"}
          </DialogTitle>
          <DialogDescription>
            {esEdicion
              ? "Corrige los datos de la venta sin perder su fecha original."
              : "Registra una venta y su pago inicial."}
          </DialogDescription>
        </DialogHeader>

        {cargando ? (
          <LoadingState rows={2} />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <Alert variant="destructive">{error}</Alert>}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <ClientePicker
                  clienteInicial={esEdicion ? ventaInicial?.cliente : null}
                  clientes={clientes}
                  onChange={(id, nombre) => {
                    setClienteResueltoId(id);
                    setNombreCliente(nombre);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fechaVenta">Fecha</Label>
                <Input
                  id="fechaVenta"
                  type="date"
                  value={fecha}
                  max={hoy}
                  onChange={(e) => setFecha(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {!fecha
                    ? "Selecciona una fecha."
                    : fecha === hoy
                      ? "La venta se registrará con la hora actual."
                      : `Se registrará para ${etiquetaDia(fecha)} (mediodía).`}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Productos</Label>
                <span className="text-xs text-muted-foreground">
                  {items.length} línea(s)
                </span>
              </div>

              {items.length === 0 && (
                <Alert>
                  No hay productos activos. Agrega un producto antes de
                  registrar ventas.
                </Alert>
              )}

              {items.map((it, idx) => {
                const subtotal =
                  (Number(it.cantidad) || 0) *
                  (Number(it.precio_unitario) || 0);
                return (
                  <div key={idx} className="space-y-3 rounded-xl border p-3">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-1">
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
                      {items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="mt-6 text-destructive"
                          aria-label="Quitar producto"
                          onClick={() => quitarItem(idx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div className="space-y-1">
                        <Label>Cantidad</Label>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            aria-label="Restar cantidad"
                            onClick={() => cambiarCantidad(idx, -1)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Input
                            type="number"
                            inputMode="numeric"
                            min="1"
                            value={it.cantidad}
                            onChange={(e) =>
                              actualizarItem(
                                idx,
                                "cantidad",
                                Number(e.target.value)
                              )
                            }
                            className="w-16 text-center"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            aria-label="Sumar cantidad"
                            onClick={() => cambiarCantidad(idx, 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {formatCOP(it.precio_unitario)} c/u
                        </p>
                        <p className="font-semibold">{formatCOP(subtotal)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={agregarItem}
                disabled={productos.length === 0}
              >
                <Plus className="h-4 w-4" /> Agregar producto
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Total</Label>
                <div className="rounded-lg border bg-muted px-3 py-2 text-right text-lg font-bold">
                  {formatCOP(total)}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="pagado">Valor pagado</Label>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => setValorPagado(String(total))}
                  >
                    Pago total
                  </Button>
                </div>
                <Input
                  id="pagado"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={valorPagado}
                  onChange={(e) => setValorPagado(e.target.value)}
                  placeholder="0"
                  aria-invalid={pagoExcede}
                />
                {pagoExcede && (
                  <p className="text-xs text-destructive">
                    El pago supera el total de la venta.
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                    {METODOS_PAGO.map((m) => (
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
                  className={`rounded-lg border px-3 py-2 text-right text-lg font-bold ${
                    saldoPendiente > 0
                      ? "border-amber-300 bg-amber-50 text-amber-800"
                      : "border-emerald-300 bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {formatCOP(saldoPendiente)}
                </div>
              </div>
            </div>

            {montoCambio && (
              <Alert>
                Al cambiar el valor pagado, los pagos anteriores de esta venta
                se reemplazarán por uno solo en la fecha de la venta.
              </Alert>
            )}

            {esEdicion && !montoCambio && (
              <p className="text-xs text-muted-foreground">
                Los pagos registrados se conservan porque el valor pagado no
                cambió.
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || cargando}>
                {saving
                  ? "Guardando..."
                  : esEdicion
                    ? "Guardar cambios"
                    : "Registrar venta"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
