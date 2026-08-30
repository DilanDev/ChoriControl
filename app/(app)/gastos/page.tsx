"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getCategoriasGastos,
  getGastosDelDia,
  createGasto,
  createCategoriaGasto,
  deleteGasto,
  type GastoConCategoria,
} from "@/lib/services/finanzas";
import { formatCOP, formatFechaHora } from "@/lib/format";

export default function GastosPage() {
  const [gastos, setGastos] = useState<GastoConCategoria[]>([]);
  const [totalHoy, setTotalHoy] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const g = await getGastosDelDia();
      setGastos(g);
      setTotalHoy(g.reduce((acc, x) => acc + Number(x.valor), 0));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar gastos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este gasto?")) return;
    try {
      await deleteGasto(id);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al eliminar");
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Gastos"
        description="Gastos registrados hoy"
        action={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Registrar
          </Button>
        }
      />

      <Card className="mb-6">
        <CardContent className="p-5">
          <div className="text-sm text-muted-foreground">Total gastos de hoy</div>
          <div className="text-3xl font-bold tracking-tight text-red-600">
            {!loading && formatCOP(totalHoy)}
          </div>
        </CardContent>
      </Card>

      {error && <ErrorState message={error} />}
      {loading && <LoadingState />}

      {!loading && !error && (
        <div className="space-y-3">
          {gastos.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No hay gastos registrados hoy.
              </CardContent>
            </Card>
          )}
          {gastos.map((g) => (
            <Card key={g.id}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold truncate">{g.concepto}</span>
                    {g.categoria && (
                      <Badge variant="secondary">{g.categoria.nombre}</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatFechaHora(g.fecha)}
                    {g.proveedor && <> · {g.proveedor}</>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-bold text-red-600">
                    {formatCOP(g.valor)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(g.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <GastoForm open={dialogOpen} setOpen={setDialogOpen} onSaved={load} />
    </PageContainer>
  );
}

function GastoForm({
  open,
  setOpen,
  onSaved,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  onSaved: () => Promise<void>;
}) {
  const [categorias, setCategorias] = useState<{ id: string; nombre: string }[]>(
    []
  );
  const [categoriaId, setCategoriaId] = useState("");
  const [concepto, setConcepto] = useState("");
  const [valor, setValor] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [observacion, setObservacion] = useState("");
  const [nuevaCategoria, setNuevaCategoria] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      getCategoriasGastos()
        .then((c) => {
          setCategorias(c);
          setCategoriaId((prev) => (c.length > 0 ? prev || c[0].id : prev));
        })
        .catch(() => {});
      setConcepto("");
      setValor("");
      setProveedor("");
      setObservacion("");
      setNuevaCategoria("");
      setError(null);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      let catId = categoriaId;
      if (nuevaCategoria.trim()) {
        const created = await createCategoriaGasto(nuevaCategoria.trim());
        catId = created.id;
      }
      if (!catId) {
        setError("Selecciona o crea una categoría.");
        return;
      }
      if (!concepto.trim() || !(Number(valor) > 0)) {
        setError("Ingresa un concepto y un valor válido.");
        return;
      }
      await createGasto({
        categoria_id: catId,
        concepto: concepto.trim(),
        valor: Number(valor),
        proveedor: proveedor.trim() || undefined,
        observacion: observacion.trim() || undefined,
      });
      setOpen(false);
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar gasto");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar gasto</DialogTitle>
          <DialogDescription>
            Registra un gasto del negocio (hoy).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert variant="destructive">{error}</Alert>}

          <div className="space-y-2">
            <Label>Categoría</Label>
            <Select value={categoriaId} onValueChange={(v) => setCategoriaId(v ?? "")}>
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
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
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
