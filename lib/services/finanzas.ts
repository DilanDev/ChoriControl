"use client";

import type { Gasto, CategoriaGasto, Pago, MetodoPago } from "@/types";
import { supabase } from "@/lib/supabase/client";
import {
  finDeHoy,
  fechaISOLocal,
  inicioDelDia,
  inicioDeSemana,
} from "@/lib/format";
import { METODOS_PAGO_VACIOS } from "@/lib/constants";

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

  const [
    ventasHoy,
    pagosHoy,
    gastosHoy,
    porCobrar,
    ventasSemana,
    chorizosVendidos,
  ] = await Promise.all([
    supabase
      .from("ventas")
      .select("total, saldo_pendiente, id")
      .gte("fecha", hoy.toISOString())
      .lte("fecha", fin.toISOString()),
    getPagos(hoy, fin),
    getGastos(hoy, fin),
    getTotalPorCobrar(),
    supabase
      .from("ventas")
      .select("total")
      .gte("fecha", semana.toISOString())
      .lte("fecha", fin.toISOString()),
    getChorizosVendidos(hoy, fin),
  ]);

  if (ventasHoy.error) throw ventasHoy.error;
  if (ventasSemana.error) throw ventasSemana.error;

  const ventasHoyRows = ventasHoy.data ?? [];
  const ventasSemanaRows = ventasSemana.data ?? [];

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
  const ventasSemanaTotal = ventasSemanaRows.reduce(
    (acc, v) => acc + Number(v.total),
    0
  );

  return {
    ventasDelDia,
    ingresosHoy,
    gastosHoy: gastosHoyTotal,
    gananciaEstimada,
    porCobrar,
    numeroVentasDia: ventasHoyRows.length,
    chorizosVendidos,
    ventasSemana: ventasSemanaTotal,
  };
}

async function getTotalPorCobrar(): Promise<number> {
  const { data, error } = await supabase
    .from("ventas")
    .select("saldo_pendiente")
    .eq("estado", "PENDIENTE");

  if (error) throw error;
  return (data ?? []).reduce(
    (acc, v) => acc + Number(v.saldo_pendiente),
    0
  );
}

// ---- CONTABILIDAD ----

export interface DiaContabilidad {
  fecha: string;
  facturado: number;
  cobrado: number;
  gastos: number;
}

export interface ResumenContabilidad {
  facturado: number;
  cobrado: number;
  gastos: number;
  ganancia: number;
  porCobrar: number;
  numeroVentas: number;
  chorizosVendidos: number;
  porMetodo: Record<MetodoPago, number>;
  porCategoria: { nombre: string; total: number }[];
  serieDiaria: DiaContabilidad[];
  pagos: Pago[];
  gastosList: GastoConCategoria[];
}

/**
 * Agrega ventas, pagos y gastos de un período en memoria (volumen pequeño de
 * un solo negocio). "Cobrado" usa la tabla pagos, que ya incluye los abonos.
 */
export async function getResumenContabilidad(
  desde: Date,
  hasta: Date
): Promise<ResumenContabilidad> {
  const [ventasRes, pagos, gastosList, porCobrar, chorizosVendidos] =
    await Promise.all([
      supabase
        .from("ventas")
        .select("id, total, fecha")
        .gte("fecha", desde.toISOString())
        .lte("fecha", hasta.toISOString()),
      getPagos(desde, hasta),
      getGastos(desde, hasta),
      getTotalPorCobrar(),
      getChorizosVendidos(desde, hasta),
    ]);

  if (ventasRes.error) throw ventasRes.error;

  const ventas = ventasRes.data ?? [];
  const facturado = ventas.reduce((acc, v) => acc + Number(v.total), 0);
  const cobrado = pagos.reduce((acc, p) => acc + Number(p.valor), 0);
  const gastos = gastosList.reduce((acc, g) => acc + Number(g.valor), 0);

  const porMetodo: Record<MetodoPago, number> = { ...METODOS_PAGO_VACIOS };
  for (const p of pagos) {
    const metodo = p.metodo_pago as MetodoPago;
    porMetodo[metodo] = (porMetodo[metodo] ?? 0) + Number(p.valor);
  }

  const categorias = new Map<string, number>();
  for (const g of gastosList) {
    const nombre = g.categoria?.nombre ?? "Sin categoría";
    categorias.set(nombre, (categorias.get(nombre) ?? 0) + Number(g.valor));
  }
  const porCategoria = Array.from(categorias.entries())
    .map(([nombre, total]) => ({ nombre, total }))
    .sort((a, b) => b.total - a.total);

  const serie = new Map<string, DiaContabilidad>();
  const cursor = inicioDelDia(desde);
  const fin = hasta;
  let dias = 0;
  while (cursor <= fin && dias < 400) {
    const clave = fechaISOLocal(cursor);
    serie.set(clave, { fecha: clave, facturado: 0, cobrado: 0, gastos: 0 });
    cursor.setDate(cursor.getDate() + 1);
    dias += 1;
  }

  for (const v of ventas) {
    const dia = serie.get(fechaISOLocal(new Date(v.fecha)));
    if (dia) dia.facturado += Number(v.total);
  }
  for (const p of pagos) {
    const dia = serie.get(fechaISOLocal(new Date(p.fecha)));
    if (dia) dia.cobrado += Number(p.valor);
  }
  for (const g of gastosList) {
    const dia = serie.get(fechaISOLocal(new Date(g.fecha)));
    if (dia) dia.gastos += Number(g.valor);
  }

  return {
    facturado,
    cobrado,
    gastos,
    ganancia: cobrado - gastos,
    porCobrar,
    numeroVentas: ventas.length,
    chorizosVendidos,
    porMetodo,
    porCategoria,
    serieDiaria: Array.from(serie.values()),
    pagos,
    gastosList,
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
