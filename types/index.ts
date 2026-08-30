export type MetodoPago = "Efectivo" | "Nequi" | "Daviplata" | "Transferencia" | "Otro";

export type EstadoVenta = "PAGADA" | "PENDIENTE";

export type EstadoPedido =
  | "Pendiente"
  | "Preparando"
  | "Listo"
  | "Entregado"
  | "Cancelado";

export type EstadoInventario = "Disponible" | "Stock bajo" | "Agotado";

export type TipoMovimiento = "ENTRADA" | "SALIDA";

export interface Cliente {
  id: string;
  nombre: string;
  telefono: string | null;
  direccion: string | null;
  created_at: string;
  updated_at: string;
}

export interface Producto {
  id: string;
  nombre: string;
  precio: number;
  unidad_medida: string;
  stock_actual: number;
  stock_minimo: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Venta {
  id: string;
  cliente_id: string | null;
  fecha: string;
  total: number;
  pagado: number;
  saldo_pendiente: number;
  estado: EstadoVenta;
  created_at: string;
}

export interface DetalleVenta {
  id: string;
  venta_id: string;
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface Pago {
  id: string;
  venta_id: string;
  valor: number;
  metodo_pago: MetodoPago;
  fecha: string;
  observacion: string | null;
  created_at: string;
}

export interface Abono {
  id: string;
  cliente_id: string;
  venta_id: string;
  valor: number;
  metodo_pago: MetodoPago;
  fecha: string;
  observacion: string | null;
  created_at: string;
}

export interface CategoriaGasto {
  id: string;
  nombre: string;
  created_at: string;
}

export interface Gasto {
  id: string;
  categoria_id: string;
  concepto: string;
  valor: number;
  proveedor: string | null;
  fecha: string;
  observacion: string | null;
  created_at: string;
}

export interface Pedido {
  id: string;
  cliente_id: string;
  fecha: string;
  total: number;
  estado: EstadoPedido;
  observacion: string | null;
  direccion: string | null;
  created_at: string;
  updated_at: string;
}

export interface PedidoDetalle {
  id: string;
  pedido_id: string;
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface MovimientoInventario {
  id: string;
  producto_id: string;
  tipo: TipoMovimiento;
  cantidad: number;
  costo: number | null;
  motivo: string;
  fecha: string;
  observacion: string | null;
  created_at: string;
}
