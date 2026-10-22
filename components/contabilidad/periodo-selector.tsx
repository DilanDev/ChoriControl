"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs } from "@/components/ui/tabs";
import { fechaISOLocal } from "@/lib/format";
import {
  PERIODOS,
  type Periodo,
  rangoPersonalizadoInvalido,
} from "@/lib/periodos";

export function PeriodoSelector({
  periodo,
  onPeriodoChange,
  desde,
  hasta,
  onDesdeChange,
  onHastaChange,
}: {
  periodo: Periodo;
  onPeriodoChange: (periodo: Periodo) => void;
  desde: string;
  hasta: string;
  onDesdeChange: (fecha: string) => void;
  onHastaChange: (fecha: string) => void;
}) {
  const hoy = fechaISOLocal();
  const invalido =
    periodo === "personalizado" &&
    rangoPersonalizadoInvalido(desde, hasta);

  return (
    <div className="space-y-3">
      <Tabs items={PERIODOS} value={periodo} onChange={onPeriodoChange} />

      {periodo === "personalizado" && (
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-sm sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <Label htmlFor="contabilidadDesde">Desde</Label>
            <Input
              id="contabilidadDesde"
              type="date"
              value={desde}
              max={hasta || hoy}
              onChange={(e) => onDesdeChange(e.target.value)}
            />
          </div>
          <div className="flex-1 space-y-1">
            <Label htmlFor="contabilidadHasta">Hasta</Label>
            <Input
              id="contabilidadHasta"
              type="date"
              value={hasta}
              min={desde || undefined}
              max={hoy}
              onChange={(e) => onHastaChange(e.target.value)}
            />
          </div>
        </div>
      )}

      {invalido && (
        <p className="text-sm text-destructive" role="alert">
          Selecciona un rango válido: la fecha inicial debe ser anterior o
          igual a la final.
        </p>
      )}
    </div>
  );
}
