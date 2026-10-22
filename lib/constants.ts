import type { MetodoPago } from "@/types";

export const METODOS_PAGO: MetodoPago[] = [
  "Efectivo",
  "Nequi",
  "Daviplata",
  "Transferencia",
  "Otro",
];

export const METODOS_PAGO_VACIOS: Record<MetodoPago, number> = {
  Efectivo: 0,
  Nequi: 0,
  Daviplata: 0,
  Transferencia: 0,
  Otro: 0,
};
