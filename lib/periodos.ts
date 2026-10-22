import {
  finDelDia,
  inicioDeMes,
  inicioDeSemana,
  inicioDelDia,
  parseFechaLocal,
} from "@/lib/format";

export type Periodo = "hoy" | "semana" | "mes" | "personalizado";

export const PERIODOS: { id: Periodo; label: string }[] = [
  { id: "hoy", label: "Hoy" },
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mes" },
  { id: "personalizado", label: "Personalizado" },
];

export interface RangoFechas {
  desde: Date;
  hasta: Date;
}

export function rangoPeriodo(
  periodo: Periodo,
  desde?: string,
  hasta?: string
): RangoFechas {
  const ahora = new Date();

  if (periodo === "personalizado") {
    const inicio = desde ? parseFechaLocal(desde) : inicioDeMes(ahora);
    const fin = hasta ? parseFechaLocal(hasta) : ahora;
    return { desde: inicioDelDia(inicio), hasta: finDelDia(fin) };
  }

  if (periodo === "semana") {
    return { desde: inicioDeSemana(ahora), hasta: finDelDia(ahora) };
  }

  if (periodo === "mes") {
    return { desde: inicioDeMes(ahora), hasta: finDelDia(ahora) };
  }

  return { desde: inicioDelDia(ahora), hasta: finDelDia(ahora) };
}

export function rangoPersonalizadoInvalido(
  desde: string,
  hasta: string
): boolean {
  return !desde || !hasta || desde > hasta;
}
