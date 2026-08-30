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

export function inicioDelDia(fecha = new Date()): Date {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function finDeHoy(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
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
