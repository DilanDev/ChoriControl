export function formatCOP(valor: number | null | undefined): string {
  const num = Number(valor ?? 0);
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatFecha(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatFechaCorta(fecha: Date | string): string {
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  return d.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "2-digit",
  });
}

export function formatCOPCompacto(valor: number | null | undefined): string {
  const num = Number(valor ?? 0);
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(num);
}

export function formatFechaHora(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatHora(iso: string | null | undefined): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatFechaLarga(fecha: Date | string): string {
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  return d.toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function inicioDelDia(fecha = new Date()): Date {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function finDelDia(fecha = new Date()): Date {
  const d = new Date(fecha);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function finDeHoy(): Date {
  return finDelDia();
}

/** Convierte "YYYY-MM-DD" en una fecha local (evita el desfase UTC). */
export function parseFechaLocal(fechaIso: string): Date {
  const [anio, mes, dia] = fechaIso.split("-").map(Number);
  if (!anio || !mes || !dia) return new Date();
  return new Date(anio, mes - 1, dia);
}

/** Devuelve la fecha local en formato "YYYY-MM-DD". */
export function fechaISOLocal(fecha = new Date()): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

export function sumarDias(fechaIso: string, dias: number): string {
  const d = parseFechaLocal(fechaIso);
  d.setDate(d.getDate() + dias);
  return fechaISOLocal(d);
}

/** Etiqueta amigable: "Hoy", "Ayer" o la fecha completa. */
export function etiquetaDia(fechaIso: string): string {
  const hoy = fechaISOLocal();
  const ayer = sumarDias(hoy, -1);
  if (fechaIso === hoy) return "Hoy";
  if (fechaIso === ayer) return "Ayer";
  return formatFecha(parseFechaLocal(fechaIso).toISOString());
}

/**
 * Construye el ISO que se guardará para una fecha de día:
 * - Si la fecha no cambió, conserva la hora original.
 * - Si es hoy, usa la hora actual.
 * - Si es un día pasado, usa mediodía local.
 */
export function fechaParaGuardar(
  fechaIso: string,
  horaBaseIso?: string | null
): string {
  if (horaBaseIso) {
    const original = new Date(horaBaseIso);
    if (fechaISOLocal(original) === fechaIso) return original.toISOString();
  }
  if (fechaIso === fechaISOLocal()) return new Date().toISOString();
  const d = parseFechaLocal(fechaIso);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

export function inicioDeSemana(fecha = new Date()): Date {
  const d = new Date(fecha);
  const dia = d.getDay(); // 0 = domingo
  const diff = dia === 0 ? 6 : dia - 1; // lunes como inicio
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function inicioDeMes(fecha = new Date()): Date {
  const d = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
  d.setHours(0, 0, 0, 0);
  return d;
}
