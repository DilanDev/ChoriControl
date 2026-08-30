"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getClientes } from "@/lib/services/clientes";
import type { Cliente } from "@/types";

/**
 * Selector de cliente "al vuelo": se escribe el nombre y se muestran
 * sugerencias de clientes existentes. Al guardar, si el texto coincide
 * con un cliente existente se usa ese; si no, se crea automáticamente.
 */
export function ClientePicker({
  clienteInicial,
  onChange,
}: {
  clienteInicial?: Cliente | null;
  onChange: (clienteId: string | null, nombre: string) => void;
}) {
  const [texto, setTexto] = useState(clienteInicial?.nombre ?? "");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(
    clienteInicial?.id ?? null
  );
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getClientes().then(setClientes).catch(() => {});
  }, []);

  useEffect(() => {
    if (clienteInicial) {
      setTexto(clienteInicial.nombre);
      setSeleccionadoId(clienteInicial.id);
      onChange(clienteInicial.id, clienteInicial.nombre);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteInicial?.id]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMostrarSugerencias(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const normalizado = texto.trim().toLowerCase();
  const sugerencias = normalizado
    ? clientes
        .filter((c) => c.nombre.toLowerCase().includes(normalizado))
        .slice(0, 8)
    : [];

  function seleccionar(c: Cliente) {
    setTexto(c.nombre);
    setSeleccionadoId(c.id);
    setMostrarSugerencias(false);
    onChange(c.id, c.nombre);
  }

  function handleInput(v: string) {
    setTexto(v);
    setSeleccionadoId(null);
    setMostrarSugerencias(true);
    // Mientras se edita, aún no decidimos el cliente
    onChange(null, v);
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={texto}
        onChange={(e) => handleInput(e.target.value)}
        onFocus={() => setMostrarSugerencias(true)}
        placeholder="Escribe el nombre del cliente"
        autoComplete="off"
      />
      {mostrarSugerencias && sugerencias.length > 0 && (
        <div className="absolute z-30 mt-1 w-full rounded-lg border bg-popover text-popover-foreground shadow-md">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-t-lg px-3 py-2 text-sm hover:bg-accent"
            onClick={() => {
              setTexto("");
              setSeleccionadoId(null);
              setMostrarSugerencias(false);
              onChange(null, "");
            }}
          >
            <span className="text-muted-foreground">— Sin cliente (ocasional) —</span>
          </button>
          {sugerencias.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent ${
                seleccionadoId === c.id ? "bg-accent" : ""
              }`}
              onClick={() => seleccionar(c)}
            >
              <span className="truncate">{c.nombre}</span>
              {seleccionadoId === c.id && <Check className="h-4 w-4 shrink-0" />}
            </button>
          ))}
        </div>
      )}
      {seleccionadoId && (
        <p className="text-xs text-green-600 mt-1">
          Cliente existente seleccionado.
        </p>
      )}
      {!seleccionadoId && texto.trim() !== "" && (
        <p className="text-xs text-muted-foreground mt-1">
          Se creará el cliente «{texto.trim()}» al guardar.
        </p>
      )}
    </div>
  );
}
