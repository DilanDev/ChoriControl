"use client";

import type { Producto } from "@/types";
import { supabase } from "@/lib/supabase/client";

export async function getProductos(): Promise<Producto[]> {
  const { data, error } = await supabase
    .from("productos")
    .select("*")
    .order("nombre", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getProductosActivos(): Promise<Producto[]> {
  const { data, error } = await supabase
    .from("productos")
    .select("*")
    .eq("activo", true)
    .order("nombre", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createProducto(input: {
  nombre: string;
  precio: number;
  unidad_medida?: string;
  stock_actual?: number;
  stock_minimo?: number;
}): Promise<Producto> {
  const { data, error } = await supabase
    .from("productos")
    .insert({
      ...input,
      unidad_medida: input.unidad_medida ?? "unidad",
      stock_actual: input.stock_actual ?? 0,
      stock_minimo: input.stock_minimo ?? 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateProducto(
  id: string,
  input: Partial<Producto>
): Promise<Producto> {
  const { data, error } = await supabase
    .from("productos")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
