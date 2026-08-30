"use client";

import type { Cliente } from "@/types";
import { supabase } from "@/lib/supabase/client";

export async function getClientes(): Promise<Cliente[]> {
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .order("nombre", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getCliente(id: string): Promise<Cliente | null> {
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createCliente(input: {
  nombre: string;
  telefono?: string;
  direccion?: string;
}): Promise<Cliente> {
  const { data, error } = await supabase
    .from("clientes")
    .insert({ ...input })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCliente(
  id: string,
  input: { nombre?: string; telefono?: string | null; direccion?: string | null }
): Promise<Cliente> {
  const { data, error } = await supabase
    .from("clientes")
    .update({ ...input })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCliente(id: string): Promise<void> {
  const { error } = await supabase.from("clientes").delete().eq("id", id);
  if (error) throw error;
}
