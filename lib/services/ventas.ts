"use client";

import type {
  Venta,
  DetalleVenta,
  Pago,
  Abono,
  MetodoPago,
  Cliente,
} from "@/types";
import { supabase } from "@/lib/supabase/client";
import { inicioDelDia, finDeHoy } from "@/lib/format";

export interface ItemVenta {
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
}

export interface CrearVentaInput {
  cliente_id: string | null;
  items: ItemVenta[];
  valor_pagado: number;
  metodo_pago: MetodoPago;
  fecha?: string;
  observacion?: string;
}

export interface VentaConDetalles extends Venta {
  detalle_ventas: DetalleVenta[];
  pagos: Pago[];
  cliente: Cliente | null;
}

/**
 * Crea una venta completa: venta + detalles + pago inicial.
 * Aplica la regla principal de deudas:
 *   saldo_pendiente = total - pagado
 *   estado = PENDIENTE si saldo > 0, si no PAGADA.
 */
export async function crearVenta(input: CrearVentaInput): Promise<Venta> {
  const total = input.items.reduce(
    (acc, it) => acc + it.cantidad * it.precio_unitario,
    0
  );
  const pagado = Math.min(input.valor_pagado, total);
  const saldo_pendiente = total - pagado;
  const estado = saldo_pendiente > 0 ? "PENDIENTE" : "PAGADA";

  // 1. Crear venta
  const { data: venta, error: errorVenta } = await supabase
    .from("ventas")
    .insert({
      cliente_id: input.cliente_id,
      fecha: input.fecha ?? new Date().toISOString(),
      total,
      pagado,
      saldo_pendiente,
      estado,
    })
    .select()
    .single();

  if (errorVenta) throw errorVenta;

  // 2. Crear detalles
  const detalles = input.items.map((it) => ({
    venta_id: venta.id,
    producto_id: it.producto_id,
    cantidad: it.cantidad,
    precio_unitario: it.precio_unitario,
    subtotal: it.cantidad * it.precio_unitario,
  }));

  const { error: errorDetalles } = await supabase
    .from("detalle_ventas")
    .insert(detalles);

  if (errorDetalles) throw errorDetalles;

  // 3. Registrar pago
  if (pagado > 0) {
    const { error: errorPago } = await supabase.from("pagos").insert({
      venta_id: venta.id,
      valor: pagado,
      metodo_pago: input.metodo_pago,
      fecha: input.fecha ?? new Date().toISOString(),
      observacion: input.observacion ?? null,
    });

    if (errorPago) throw errorPago;
  }

  return venta;
}

export async function getVentas(
  desde?: Date,
  hasta?: Date
): Promise<VentaConDetalles[]> {
  let query = supabase
    .from("ventas")
    .select("*, detalle_ventas(*), pagos(*), cliente:clientes(*)")
    .order("fecha", { ascending: false });

  if (desde) query = query.gte("fecha", desde.toISOString());
  if (hasta) query = query.lte("fecha", hasta.toISOString());

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as VentaConDetalles[];
}

export async function getVentasDelDia(): Promise<VentaConDetalles[]> {
  return getVentas(inicioDelDia(), finDeHoy());
}

export async function getVenta(id: string): Promise<VentaConDetalles | null> {
  const { data, error } = await supabase
    .from("ventas")
    .select("*, detalle_ventas(*), pagos(*), cliente:clientes(*)")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as unknown as VentaConDetalles;
}

export interface DeudorRow {
  cliente_id: string;
  cliente: Cliente;
  total_pendiente: number;
  ultima_venta: string | null;
}

/**
 * Devuelve el listado de clientes con saldo pendiente y el total general por cobrar.
 * Se consultan las ventas pendientes con su cliente y se agrupan en memoria.
 */
export async function getDeudores(): Promise<{
  deudores: DeudorRow[];
  totalPorCobrar: number;
}> {
  const { data, error } = await supabase
    .from("ventas")
    .select("cliente_id, saldo_pendiente, fecha, cliente:clientes(*)")
    .eq("estado", "PENDIENTE")
    .not("cliente_id", "is", null)
    .order("fecha", { ascending: false });

  if (error) throw error;

  const mapa = new Map<string, DeudorRow>();
  for (const v of data ?? []) {
    if (!v.cliente_id || !v.cliente) continue;
    const existente = mapa.get(v.cliente_id);
    if (existente) {
      existente.total_pendiente += Number(v.saldo_pendiente);
    } else {
      mapa.set(v.cliente_id, {
        cliente_id: v.cliente_id,
        cliente: v.cliente as unknown as Cliente,
        total_pendiente: Number(v.saldo_pendiente),
        ultima_venta: v.fecha,
      });
    }
  }

  const deudores = Array.from(mapa.values()).sort(
    (a, b) => b.total_pendiente - a.total_pendiente
  );
  const totalPorCobrar = deudores.reduce(
    (acc, d) => acc + d.total_pendiente,
    0
  );

  return { deudores, totalPorCobrar };
}

export async function getVentasPendientesDeCliente(
  clienteId: string
): Promise<VentaConDetalles[]> {
  const { data, error } = await supabase
    .from("ventas")
    .select("*, detalle_ventas(*), pagos(*), cliente:clientes(*)")
    .eq("cliente_id", clienteId)
    .eq("estado", "PENDIENTE")
    .order("fecha", { ascending: true });

  if (error) throw error;
  return data as unknown as VentaConDetalles[];
}

export async function getPagosPorVenta(
  ventaId: string
): Promise<Pago[]> {
  const { data, error } = await supabase
    .from("pagos")
    .select("*")
    .eq("venta_id", ventaId)
    .order("fecha", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getAbonosPorCliente(
  clienteId: string
): Promise<Abono[]> {
  const { data, error } = await supabase
    .from("abonos")
    .select("*")
    .eq("cliente_id", clienteId)
    .order("fecha", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/**
 * Registra un abono sobre una venta y actualiza el saldo pendiente de la venta,
 * marcándola como PAGADA cuando el saldo llega a 0.
 */
export async function registrarAbono(input: {
  cliente_id: string;
  venta_id: string;
  valor: number;
  metodo_pago: MetodoPago;
  observacion?: string;
}): Promise<void> {
  const { data: venta, error: errVenta } = await supabase
    .from("ventas")
    .select("*")
    .eq("id", input.venta_id)
    .single();

  if (errVenta) throw errVenta;

  // Insertar abono
  const { error: errAbono } = await supabase.from("abonos").insert({
    cliente_id: input.cliente_id,
    venta_id: input.venta_id,
    valor: input.valor,
    metodo_pago: input.metodo_pago,
    fecha: new Date().toISOString(),
    observacion: input.observacion ?? null,
  });
  if (errAbono) throw errAbono;

  // También registrar como pago de la venta
  const { error: errPago } = await supabase.from("pagos").insert({
    venta_id: input.venta_id,
    valor: input.valor,
    metodo_pago: input.metodo_pago,
    fecha: new Date().toISOString(),
    observacion: input.observacion ?? null,
  });
  if (errPago) throw errPago;

  // Actualizar saldo
  const nuevoPagado = Number(venta.pagado) + input.valor;
  const nuevoSaldo = Number(venta.total) - nuevoPagado;
  const nuevoEstado = nuevoSaldo <= 0 ? "PAGADA" : "PENDIENTE";

  const { error: errUpdate } = await supabase
    .from("ventas")
    .update({
      pagado: nuevoPagado,
      saldo_pendiente: Math.max(0, nuevoSaldo),
      estado: nuevoEstado,
    })
    .eq("id", input.venta_id);
  if (errUpdate) throw errUpdate;
}

/**
 * Elimina una venta. Los detalles y pagos se eliminan en cascada (on delete cascade).
 * Los abonos asociados quedan con venta_id null pero conservan el registro.
 */
export async function eliminarVenta(ventaId: string): Promise<void> {
  const { error: errAbonos } = await supabase
    .from("abonos")
    .update({ venta_id: null })
    .eq("venta_id", ventaId);
  if (errAbonos) throw errAbonos;

  const { error } = await supabase.from("ventas").delete().eq("id", ventaId);
  if (error) throw error;
}

export interface ActualizarVentaInput {
  cliente_id: string | null;
  items: ItemVenta[];
  valor_pagado: number;
  metodo_pago: MetodoPago;
  fecha?: string;
  observacion?: string;
}

/**
 * Edita una venta: actualiza el cliente, reemplaza el detalle (recalculando el
 * total), reemplaza los pagos y recalcula el saldo pendiente y el estado.
 * Regla de deuda: total > pagado → PENDIENTE.
 */
export async function actualizarVenta(
  ventaId: string,
  input: ActualizarVentaInput
): Promise<Venta> {
  const total = input.items.reduce(
    (acc, it) => acc + it.cantidad * it.precio_unitario,
    0
  );
  const pagado = Math.min(Math.max(0, input.valor_pagado), total);
  const saldo_pendiente = total - pagado;
  const estado = saldo_pendiente > 0 ? "PENDIENTE" : "PAGADA";

  // 1. Actualizar cabecera de la venta
  const { data: venta, error: errVenta } = await supabase
    .from("ventas")
    .update({
      cliente_id: input.cliente_id,
      fecha: input.fecha ?? new Date().toISOString(),
      total,
      pagado,
      saldo_pendiente,
      estado,
    })
    .eq("id", ventaId)
    .select()
    .single();
  if (errVenta) throw errVenta;

  // 2. Reemplazar detalles
  const { error: errBorrarDetalles } = await supabase
    .from("detalle_ventas")
    .delete()
    .eq("venta_id", ventaId);
  if (errBorrarDetalles) throw errBorrarDetalles;

  const detalles = input.items.map((it) => ({
    venta_id: ventaId,
    producto_id: it.producto_id,
    cantidad: it.cantidad,
    precio_unitario: it.precio_unitario,
    subtotal: it.cantidad * it.precio_unitario,
  }));
  const { error: errInsertDetalles } = await supabase
    .from("detalle_ventas")
    .insert(detalles);
  if (errInsertDetalles) throw errInsertDetalles;

  // 3. Reemplazar pagos
  const { error: errBorrarPagos } = await supabase
    .from("pagos")
    .delete()
    .eq("venta_id", ventaId);
  if (errBorrarPagos) throw errBorrarPagos;

  if (pagado > 0) {
    const { error: errPago } = await supabase.from("pagos").insert({
      venta_id: ventaId,
      valor: pagado,
      metodo_pago: input.metodo_pago,
      fecha: input.fecha ?? new Date().toISOString(),
      observacion: input.observacion ?? null,
    });
    if (errPago) throw errPago;
  }

  return venta;
}
