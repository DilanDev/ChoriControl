"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getClientes } from "@/lib/services/clientes";
import { cn } from "@/lib/utils";
import type { Cliente } from "@/types";

/**
 * Selector de cliente "al vuelo": se escribe el nombre y se muestran
 * sugerencias de clientes existentes. Al guardar, si el texto coincide
 * con un cliente existente se usa ese; si no, se crea automáticamente.
 */
export function ClientePicker({
  clienteInicial,
  clientes: clientesProp,
  onChange,
}: {
  clienteInicial?: Cliente | null;
  clientes?: Cliente[];
  onChange: (clienteId: string | null, nombre: string) => void;
}) {
  const [texto, setTexto] = useState(clienteInicial?.nombre ?? "");
  const [clientesInternos, setClientesInternos] = useState<Cliente[]>([]);
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(
    clienteInicial?.id ?? null
  );
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [resaltado, setResaltado] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const clientes = clientesProp ?? clientesInternos;

  useEffect(() => {
    if (clientesProp) return;
    let mounted = true;
    getClientes()
      .then((c) => mounted && setClientesInternos(c))
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [clientesProp]);

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
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setMostrarSugerencias(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const normalizado = texto.trim().toLowerCase();
  const sugerencias = (
    normalizado
      ? clientes.filter((c) => c.nombre.toLowerCase().includes(normalizado))
      : clientes
  ).slice(0, 8);

  const opciones: (Cliente | "sin-cliente")[] = ["sin-cliente", ...sugerencias];

  function seleccionar(c: Cliente) {
    setTexto(c.nombre);
    setSeleccionadoId(c.id);
    setMostrarSugerencias(false);
    onChange(c.id, c.nombre);
  }

  function seleccionarSinCliente() {
    setTexto("");
    setSeleccionadoId(null);
    setMostrarSugerencias(false);
    setResaltado(0);
    onChange(null, "");
  }

  function handleInput(v: string) {
    setTexto(v);
    setSeleccionadoId(null);
    setMostrarSugerencias(true);
    setResaltado(0);
    // Mientras se edita, aún no decidimos el cliente
    onChange(null, v);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!mostrarSugerencias) {
      if (e.key === "ArrowDown") {
        setMostrarSugerencias(true);
        e.preventDefault();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setResaltado((i) => (i + 1) % opciones.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setResaltado((i) => (i - 1 + opciones.length) % opciones.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opcion = opciones[resaltado];
      if (opcion === "sin-cliente") seleccionarSinCliente();
      else if (opcion) seleccionar(opcion);
    } else if (e.key === "Escape") {
      setMostrarSugerencias(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={texto}
        onChange={(e) => handleInput(e.target.value)}
        onFocus={() => setMostrarSugerencias(true)}
        onKeyDown={handleKeyDown}
        placeholder="Escribe el nombre del cliente"
        autoComplete="off"
        role="combobox"
        aria-expanded={mostrarSugerencias}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={
          mostrarSugerencias ? `${listboxId}-${resaltado}` : undefined
        }
      />
      {mostrarSugerencias && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg"
        >
          {opciones.map((c, index) => {
            const esSinCliente = c === "sin-cliente";
            const activo = index === resaltado;
            return (
              <button
                key={esSinCliente ? "sin-cliente" : c.id}
                id={`${listboxId}-${index}`}
                type="button"
                role="option"
                aria-selected={esSinCliente ? !texto : seleccionadoId === c.id}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm",
                  activo && "bg-accent"
                )}
                onMouseEnter={() => setResaltado(index)}
                onClick={() =>
                  esSinCliente ? seleccionarSinCliente() : seleccionar(c)
                }
              >
                {esSinCliente ? (
                  <span className="text-muted-foreground">
                    — Sin cliente (ocasional) —
                  </span>
                ) : (
                  <>
                    <span className="truncate">{c.nombre}</span>
                    {seleccionadoId === c.id && (
                      <Check className="h-4 w-4 shrink-0" />
                    )}
                  </>
                )}
              </button>
            );
          })}
          {sugerencias.length === 0 && normalizado && (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              No hay coincidencias. Se creará como cliente nuevo.
            </p>
          )}
        </div>
      )}
      {seleccionadoId && (
        <p className="mt-1 text-xs text-emerald-700">
          Cliente existente seleccionado.
        </p>
      )}
      {!seleccionadoId && texto.trim() !== "" && (
        <p className="mt-1 text-xs text-muted-foreground">
          Se creará el cliente «{texto.trim()}» al guardar.
        </p>
      )}
    </div>
  );
}
