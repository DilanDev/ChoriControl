"use client";

import type { Gasto, CategoriaGasto, Pago, MetodoPago } from "@/types";
import { supabase } from "@/lib/supabase/client";
import { inicioDelDia, finDeHoy, inicioDeSemana } from "@/lib/format";

// ---- GASTOS ----

export async function getCategoriasGastos(): Promise<CategoriaGasto[]> {
  const { data, error } = await supabase
    .from("categorias_gastos")
    .select("*")
    .order("nombre", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createCategoriaGasto(
  nombre: string
): Promise<CategoriaGasto> {
  const { data, error } = await supabase
    .from("categorias_gastos")
    .insert({ nombre })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export interface GastoConCategoria extends Gasto {
  categoria: CategoriaGasto | null;
}

export async function getGastos(
  desde?: Date,
  hasta?: Date
): Promise<GastoConCategoria[]> {
  let query = supabase
    .from("gastos")
    .select("*, categoria:categorias_gastos(*)")
    .order("fecha", { ascending: false });

  if (desde) query = query.gte("fecha", desde.toISOString());
  if (hasta) query = query.lte("fecha", hasta.toISOString());

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as GastoConCategoria[];
}

export async function getGastosDelDia(): Promise<GastoConCategoria[]> {
  return getGastos(inicioDelDia(), finDeHoy());
}

export async function createGasto(input: {
  categoria_id: string;
  concepto: string;
  valor: number;
  proveedor?: string;
  fecha?: string;
  observacion?: string;
}): Promise<Gasto> {
  const { data, error } = await supabase
    .from("gastos")
    .insert({
      categoria_id: input.categoria_id,
      concepto: input.concepto,
      valor: input.valor,
      proveedor: input.proveedor ?? null,
      fecha: input.fecha ?? new Date().toISOString(),
      observacion: input.observacion ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteGasto(id: string): Promise<void> {
  const { error } = await supabase.from("gastos").delete().eq("id", id);
  if (error) throw error;
}

// ---- INGRESOS ----

export async function getPagos(
  desde?: Date,
  hasta?: Date
): Promise<Pago[]> {
  let query = supabase
    .from("pagos")
    .select("*")
    .order("fecha", { ascending: false });

  if (desde) query = query.gte("fecha", desde.toISOString());
  if (hasta) query = query.lte("fecha", hasta.toISOString());

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getIngresosDelDia(): Promise<number> {
  const { data, error } = await supabase
    .from("pagos")
    .select("valor")
    .gte("fecha", inicioDelDia().toISOString())
    .lte("fecha", finDeHoy().toISOString());

  if (error) throw error;
  return (data ?? []).reduce((acc, p) => acc + Number(p.valor), 0);
}

export async function getIngresosPorPeriodo(
  desde: Date,
  hasta: Date
): Promise<{ total: number; porMetodo: Record<MetodoPago, number> }> {
  const pagos = await getPagos(desde, hasta);
  const total = pagos.reduce((acc, p) => acc + Number(p.valor), 0);
  const porMetodo: Record<MetodoPago, number> = {
    Efectivo: 0,
    Nequi: 0,
    Daviplata: 0,
    Transferencia: 0,
    Otro: 0,
  };
  for (const p of pagos) {
    const m = p.metodo_pago as MetodoPago;
    porMetodo[m] = (porMetodo[m] ?? 0) + Number(p.valor);
  }
  return { total, porMetodo };
}

// ---- RESUMEN PARA DASHBOARD ----

export async function getResumenDashboard() {
  const hoy = inicioDelDia();
  const fin = finDeHoy();
  const semana = inicioDeSemana();

  const [ventasHoy, pagosHoy, gastosHoy, deudores, ventasSemana, productos] =
    await Promise.all([
      supabase
        .from("ventas")
        .select("total, saldo_pendiente, id")
        .gte("fecha", hoy.toISOString())
        .lte("fecha", fin.toISOString()),
      getPagos(hoy, fin),
      getGastos(hoy, fin),
      getDeudoresRaw(),
      supabase
        .from("ventas")
        .select("total")
        .gte("fecha", semana.toISOString())
        .lte("fecha", fin.toISOString()),
      supabase.from("productos").select("*"),
    ]);

  const ventasHoyRows = ventasHoy.data ?? [];
  const ventasSemanaRows = ventasSemana.data ?? [];
  const productosRows = productos.data ?? [];

  const ventasDelDia = ventasHoyRows.reduce(
    (acc, v) => acc + Number(v.total),
    0
  );
  const ingresosHoy = pagosHoy.reduce((acc, p) => acc + Number(p.valor), 0);
  const gastosHoyTotal = gastosHoy.reduce(
    (acc, g) => acc + Number(g.valor),
    0
  );
  const gananciaEstimada = ingresosHoy - gastosHoyTotal;
  const porCobrar = deudores.totalPorCobrar;
  const ventasSemanaTotal = ventasSemanaRows.reduce(
    (acc, v) => acc + Number(v.total),
    0
  );

  // Alertas de inventario (stock bajo / agotado)
  const alertasInventario = productosRows.filter(
    (p) => Number(p.stock_actual) <= Number(p.stock_minimo)
  );

  // Pedidos pendientes
  const { data: pedidosPendientes, error: errPedidos } = await supabase
    .from("pedidos")
    .select("id")
    .in("estado", ["Pendiente", "Preparando", "Listo"]);

  return {
    ventasDelDia,
    ingresosHoy,
    gastosHoy: gastosHoyTotal,
    gananciaEstimada,
    porCobrar,
    numeroVentasDia: ventasHoyRows.length,
    chorizosVendidos: await getChorizosVendidos(hoy, fin),
    pedidosPendientes: errPedidos ? 0 : (pedidosPendientes?.length ?? 0),
    alertasInventario: alertasInventario.length,
    ventasSemana: ventasSemanaTotal,
  };
}

async function getDeudoresRaw() {
  const { data, error } = await supabase
    .from("ventas")
    .select("saldo_pendiente")
    .eq("estado", "PENDIENTE");

  if (error) return { totalPorCobrar: 0 };
  return {
    totalPorCobrar: (data ?? []).reduce(
      (acc, v) => acc + Number(v.saldo_pendiente),
      0
    ),
  };
}

async function getChorizosVendidos(desde: Date, hasta: Date): Promise<number> {
  const { data, error } = await supabase
    .from("detalle_ventas")
    .select("cantidad, venta:ventas!inner(fecha)")
    .gte("venta.fecha", desde.toISOString())
    .lte("venta.fecha", hasta.toISOString());

  if (error) return 0;
  return (data ?? []).reduce((acc, d) => acc + Number(d.cantidad), 0);
}
