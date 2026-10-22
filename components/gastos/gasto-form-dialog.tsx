"use client";

import { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import {
  createCategoriaGasto,
  createGasto,
  getCategoriasGastos,
} from "@/lib/services/finanzas";
import {
  etiquetaDia,
  fechaISOLocal,
  fechaParaGuardar,
  formatCOP,
} from "@/lib/format";
import type { CategoriaGasto } from "@/types";

export function GastoFormDialog({
  open,
  onOpenChange,
  fechaInicial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fechaInicial?: string;
  onSaved: () => Promise<void>;
}) {
  const { toast } = useToast();
  const [categorias, setCategorias] = useState<CategoriaGasto[]>([]);
  const [categoriaId, setCategoriaId] = useState("");
  const [concepto, setConcepto] = useState("");
  const [valor, setValor] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [observacion, setObservacion] = useState("");
  const [nuevaCategoria, setNuevaCategoria] = useState("");
  const [fecha, setFecha] = useState(fechaInicial ?? fechaISOLocal());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCategoriaId("");
    setConcepto("");
    setValor("");
    setProveedor("");
    setObservacion("");
    setNuevaCategoria("");
    setFecha(fechaInicial ?? fechaISOLocal());
    setError(null);

    let mounted = true;
    getCategoriasGastos()
      .then((c) => {
        if (!mounted) return;
        setCategorias(c);
        setCategoriaId(c[0]?.id ?? "");
      })
      .catch((e) => {
        if (mounted) {
          setError(
            e instanceof Error
              ? e.message
              : "No se pudieron cargar las categorías."
          );
        }
      });

    return () => {
      mounted = false;
    };
  }, [open, fechaInicial]);

  const hoy = fechaISOLocal();
  const valorNum = Number(valor) || 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!fecha) {
      setError("Selecciona la fecha del gasto.");
      return;
    }
    if (fecha > hoy) {
      setError("La fecha del gasto no puede ser futura.");
      return;
    }
    if (!concepto.trim() || valorNum <= 0) {
      setError("Ingresa un concepto y un valor mayor que cero.");
      return;
    }

    setSaving(true);
    try {
      let catId = categoriaId;
      const nombreNueva = nuevaCategoria.replace(/\s+/g, " ").trim();
      if (nombreNueva) {
        const existente = categorias.find(
          (c) => c.nombre.toLowerCase() === nombreNueva.toLowerCase()
        );
        if (existente) {
          catId = existente.id;
        } else {
          const creada = await createCategoriaGasto(nombreNueva);
          catId = creada.id;
          setCategorias((prev) => [...prev, creada]);
        }
      }
      if (!catId) {
        setError("Selecciona o crea una categoría.");
        return;
      }

      await createGasto({
        categoria_id: catId,
        concepto: concepto.trim(),
        valor: valorNum,
        proveedor: proveedor.trim() || undefined,
        fecha: fechaParaGuardar(fecha),
        observacion: observacion.trim() || undefined,
      });

      toast({
        title: "Gasto registrado",
        description: `${concepto.trim()} · ${formatCOP(valorNum)} · ${etiquetaDia(
          fecha
        )}`,
        variant: "success",
      });
      onOpenChange(false);
      await onSaved();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo guardar el gasto."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar gasto</DialogTitle>
          <DialogDescription>
            Registra una salida de dinero del negocio.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert variant="destructive">{error}</Alert>}

          <div className="space-y-2">
            <Label htmlFor="fechaGasto">Fecha</Label>
            <Input
              id="fechaGasto"
              type="date"
              value={fecha}
              max={hoy}
              onChange={(e) => setFecha(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Categoría</Label>
            <Select
              value={categoriaId}
              onValueChange={(v) => setCategoriaId(v ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona categoría" />
              </SelectTrigger>
              <SelectContent>
                {categorias.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nuevaCat">O crear nueva categoría</Label>
            <Input
              id="nuevaCat"
              value={nuevaCategoria}
              onChange={(e) => setNuevaCategoria(e.target.value)}
              placeholder="Ej: Servicios"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="concepto">Concepto *</Label>
            <Input
              id="concepto"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder="Ej: Compra de carne"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="valor">Valor *</Label>
              <Input
                id="valor"
                type="number"
                inputMode="numeric"
                min="1"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proveedor">Proveedor</Label>
              <Input
                id="proveedor"
                value={proveedor}
                onChange={(e) => setProveedor(e.target.value)}
                placeholder="Opcional"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacion">Observación</Label>
            <Textarea
              id="observacion"
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              rows={2}
              placeholder="Opcional"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Guardar gasto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
