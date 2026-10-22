"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Contact,
  Plus,
  Phone,
  Pencil,
  Search,
  Trash2,
  History,
} from "lucide-react";
import { PageContainer, LoadingState, ErrorState } from "@/components/ui/page";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import {
  getClientes,
  createCliente,
  updateCliente,
  deleteCliente,
} from "@/lib/services/clientes";
import { getVentas, getAbonosPorCliente } from "@/lib/services/ventas";
import type { Cliente, Venta, Abono } from "@/types";
import { formatCOP, formatFechaHora } from "@/lib/format";

interface ClienteConResumen extends Cliente {
  totalPendiente: number;
  totalComprado: number;
  esDeudor: boolean;
}

export default function ClientesPage() {
  const { toast } = useToast();
  const [clientes, setClientes] = useState<ClienteConResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [historialCliente, setHistorialCliente] = useState<Cliente | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [clienteAEliminar, setClienteAEliminar] = useState<Cliente | null>(
    null
  );
  const [historialError, setHistorialError] = useState<string | null>(null);
  const [historial, setHistorial] = useState<{
    ventas: Venta[];
    abonos: Abono[];
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const clientes = await getClientes();
      const ventas = await getVentas();

      const resumen = clientes.map((c) => {
        const misVentas = ventas.filter((v) => v.cliente_id === c.id);
        const totalComprado = misVentas.reduce(
          (acc, v) => acc + Number(v.total),
          0
        );
        const totalPendiente = misVentas.reduce(
          (acc, v) => acc + Number(v.saldo_pendiente),
          0
        );
        return {
          ...c,
          totalComprado,
          totalPendiente,
          esDeudor: totalPendiente > 0,
        };
      });
      setClientes(resumen);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar clientes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function openHistorial(c: Cliente) {
    setHistorialCliente(c);
    setHistorial(null);
    setHistorialError(null);
    try {
      const [ventas, abonos] = await Promise.all([
        getVentas(),
        getAbonosPorCliente(c.id),
      ]);
      setHistorial({
        ventas: ventas.filter((v) => v.cliente_id === c.id),
        abonos,
      });
    } catch (e) {
      setHistorialError(
        e instanceof Error ? e.message : "Error al cargar el historial"
      );
      setHistorial({ ventas: [], abonos: [] });
    }
  }

  async function confirmarEliminar() {
    if (!clienteAEliminar) return;
    try {
      await deleteCliente(clienteAEliminar.id);
      toast({
        title: "Cliente eliminado",
        description: clienteAEliminar.nombre,
        variant: "success",
      });
      await load();
    } catch (e) {
      toast({
        title: "No se pudo eliminar el cliente",
        description: e instanceof Error ? e.message : "Inténtalo de nuevo.",
        variant: "error",
      });
      throw e;
    }
  }

  const normalizado = busqueda.trim().toLowerCase();
  const clientesFiltrados = normalizado
    ? clientes.filter(
        (c) =>
          c.nombre.toLowerCase().includes(normalizado) ||
          (c.telefono ?? "").toLowerCase().includes(normalizado)
      )
    : clientes;

  return (
    <PageContainer>
      <PageHeader
        title="Clientes"
        description="Registro y seguimiento de clientes"
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Nuevo cliente
          </Button>
        }
      />

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o teléfono"
          className="pl-9"
          aria-label="Buscar clientes"
        />
      </div>

      {error && <ErrorState message={error} onRetry={load} />}
      {loading && <LoadingState />}

      {!loading && !error && (
        <div className="space-y-3">
          {clientes.length === 0 && (
            <EmptyState
              icon={Contact}
              title="No hay clientes registrados"
              description="Agrega tu primer cliente para llevar su historial y sus deudas."
              action={
                <Button
                  onClick={() => {
                    setEditing(null);
                    setDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" /> Nuevo cliente
                </Button>
              }
            />
          )}
          {clientes.length > 0 && clientesFiltrados.length === 0 && (
            <EmptyState
              icon={Search}
              title="Sin resultados"
              description={`No encontramos clientes que coincidan con “${busqueda.trim()}”.`}
            />
          )}
          {clientesFiltrados.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold truncate">{c.nombre}</span>
                    {c.esDeudor && <Badge variant="destructive">Deudor</Badge>}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:gap-4 text-xs text-muted-foreground mt-1">
                    {c.telefono && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {c.telefono}
                      </span>
                    )}
                    <span>Comprado: {formatCOP(c.totalComprado)}</span>
                    {c.esDeudor && (
                      <span className="text-amber-600 font-medium">
                        Debe: {formatCOP(c.totalPendiente)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Ver historial de ${c.nombre}`}
                    title="Historial"
                    onClick={() => openHistorial(c)}
                  >
                    <History className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Editar ${c.nombre}`}
                    title="Editar"
                    onClick={() => {
                      setEditing(c);
                      setDialogOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Eliminar ${c.nombre}`}
                    title="Eliminar"
                    onClick={() => setClienteAEliminar(c)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog crear/editar */}
      <ClienteForm
        open={dialogOpen}
        setOpen={setDialogOpen}
        cliente={editing}
        onSaved={load}
      />

      {/* Dialog historial */}
      <Dialog
        open={!!historialCliente}
        onOpenChange={(o) => !o && setHistorialCliente(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{historialCliente?.nombre}</DialogTitle>
            <DialogDescription>Historial de ventas y abonos</DialogDescription>
          </DialogHeader>
          {historial ? (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {historialError && (
                <Alert variant="destructive">{historialError}</Alert>
              )}
              <div>
                <h4 className="font-semibold text-sm mb-2">Ventas</h4>
                {historial.ventas.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Sin ventas registradas.
                  </p>
                )}
                <div className="space-y-2">
                  {historial.ventas.map((v) => (
                    <div
                      key={v.id}
                      className="rounded-md border p-3 text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {formatCOP(v.total)}
                        </span>
                        <Badge
                          variant={v.estado === "PAGADA" ? "default" : "destructive"}
                        >
                          {v.estado}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatFechaHora(v.fecha)} · Pagado {formatCOP(v.pagado)}
                        {Number(v.saldo_pendiente) > 0 && (
                          <> · Saldo {formatCOP(v.saldo_pendiente)}</>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-2">Abonos</h4>
                {historial.abonos.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Sin abonos registrados.
                  </p>
                )}
                <div className="space-y-2">
                  {historial.abonos.map((a) => (
                    <div
                      key={a.id}
                      className="rounded-md border p-3 text-sm"
                    >
                      <span className="font-medium text-green-600">
                        {formatCOP(a.valor)}
                      </span>
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatFechaHora(a.fecha)} · {a.metodo_pago}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <LoadingState />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!clienteAEliminar}
        onOpenChange={(abierto) => {
          if (!abierto) setClienteAEliminar(null);
        }}
        title="Eliminar cliente"
        description={
          clienteAEliminar
            ? `Se eliminará a ${clienteAEliminar.nombre}. Sus ventas quedarán sin cliente asociado.`
            : undefined
        }
        confirmLabel="Eliminar cliente"
        onConfirm={confirmarEliminar}
      />
    </PageContainer>
  );
}

function ClienteForm({
  open,
  setOpen,
  cliente,
  onSaved,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  cliente: Cliente | null;
  onSaved: () => Promise<void>;
}) {
  const { toast } = useToast();
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setNombre(cliente?.nombre ?? "");
      setTelefono(cliente?.telefono ?? "");
      setDireccion(cliente?.direccion ?? "");
      setError(null);
    }
  }, [open, cliente]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (cliente) {
        await updateCliente(cliente.id, {
          nombre: nombre.trim(),
          telefono: telefono.trim() || null,
          direccion: direccion.trim() || null,
        });
      } else {
        await createCliente({
          nombre: nombre.trim(),
          telefono: telefono.trim() || undefined,
          direccion: direccion.trim() || undefined,
        });
      }
      toast({
        title: cliente ? "Cliente actualizado" : "Cliente creado",
        description: nombre.trim(),
        variant: "success",
      });
      setOpen(false);
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {cliente ? "Editar cliente" : "Nuevo cliente"}
          </DialogTitle>
          <DialogDescription>
            Los campos con * son obligatorios.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert variant="destructive">{error}</Alert>}
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre *</Label>
            <Input
              id="nombre"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefono">Teléfono</Label>
            <Input
              id="telefono"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="Opcional"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="direccion">Dirección</Label>
            <Input
              id="direccion"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Opcional"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando..." : cliente ? "Guardar cambios" : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
