-- =====================================================
-- ChoriControl - Schema de base de datos
-- Ejecutar en el SQL Editor de Supabase
-- =====================================================

-- Helper para trigger de updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------
-- CLIENTES
-- -----------------------------------------------------
create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  telefono text,
  direccion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------
-- PRODUCTOS
-- -----------------------------------------------------
create table if not exists public.productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  precio numeric(12,2) not null default 0,
  unidad_medida text not null default 'unidad',
  stock_actual numeric(12,2) not null default 0,
  stock_minimo numeric(12,2) not null default 0,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Insertar el producto inicial del negocio
insert into public.productos (nombre, precio, unidad_medida, stock_actual, stock_minimo)
values ('Chorizo asado', 5000, 'unidad', 0, 10)
on conflict do nothing;

-- -----------------------------------------------------
-- VENTAS
-- -----------------------------------------------------
create table if not exists public.ventas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes(id) on delete set null,
  fecha timestamptz not null default now(),
  total numeric(12,2) not null default 0,
  pagado numeric(12,2) not null default 0,
  saldo_pendiente numeric(12,2) not null default 0,
  estado text not null default 'PENDIENTE' check (estado in ('PAGADA','PENDIENTE')),
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------
-- DETALLE_VENTAS
-- -----------------------------------------------------
create table if not exists public.detalle_ventas (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references public.ventas(id) on delete cascade,
  producto_id uuid references public.productos(id) on delete set null,
  cantidad numeric(12,2) not null default 1,
  precio_unitario numeric(12,2) not null default 0,
  subtotal numeric(12,2) not null default 0
);

-- -----------------------------------------------------
-- PAGOS
-- -----------------------------------------------------
create table if not exists public.pagos (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references public.ventas(id) on delete cascade,
  valor numeric(12,2) not null default 0,
  metodo_pago text not null default 'Efectivo'
    check (metodo_pago in ('Efectivo','Nequi','Daviplata','Transferencia','Otro')),
  fecha timestamptz not null default now(),
  observacion text,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------
-- ABONOS
-- -----------------------------------------------------
create table if not exists public.abonos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes(id) on delete set null,
  venta_id uuid references public.ventas(id) on delete set null,
  valor numeric(12,2) not null default 0,
  metodo_pago text not null default 'Efectivo'
    check (metodo_pago in ('Efectivo','Nequi','Daviplata','Transferencia','Otro')),
  fecha timestamptz not null default now(),
  observacion text,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------
-- CATEGORIAS_GASTOS
-- -----------------------------------------------------
create table if not exists public.categorias_gastos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  created_at timestamptz not null default now()
);

-- Categorías iniciales sugeridas en el informe
insert into public.categorias_gastos (nombre) values
  ('Carne'), ('Tripa'), ('Condimentos'), ('Bollos'), ('Carbón'),
  ('Salsas'), ('Empaques'), ('Transporte'), ('Servicios'), ('Otros')
on conflict (nombre) do nothing;

-- -----------------------------------------------------
-- GASTOS
-- -----------------------------------------------------
create table if not exists public.gastos (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid references public.categorias_gastos(id) on delete set null,
  concepto text not null,
  valor numeric(12,2) not null default 0,
  proveedor text,
  fecha timestamptz not null default now(),
  observacion text,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------
-- PEDIDOS
-- -----------------------------------------------------
create table if not exists public.pedidos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes(id) on delete set null,
  fecha timestamptz not null default now(),
  total numeric(12,2) not null default 0,
  estado text not null default 'Pendiente'
    check (estado in ('Pendiente','Preparando','Listo','Entregado','Cancelado')),
  observacion text,
  direccion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------
-- MOVIMIENTOS_INVENTARIO
-- -----------------------------------------------------
create table if not exists public.movimientos_inventario (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid references public.productos(id) on delete cascade,
  tipo text not null check (tipo in ('ENTRADA','SALIDA')),
  cantidad numeric(12,2) not null default 0,
  costo numeric(12,2),
  motivo text not null default 'Otro',
  fecha timestamptz not null default now(),
  observacion text,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------
-- TRIGGERS updated_at
-- -----------------------------------------------------
create trigger set_updated_at_clientes
  before update on public.clientes
  for each row execute function public.handle_updated_at();

create trigger set_updated_at_productos
  before update on public.productos
  for each row execute function public.handle_updated_at();

create trigger set_updated_at_pedidos
  before update on public.pedidos
  for each row execute function public.handle_updated_at();

-- -----------------------------------------------------
-- ÍNDICES
-- -----------------------------------------------------
create index if not exists idx_ventas_cliente on public.ventas(cliente_id);
create index if not exists idx_ventas_fecha on public.ventas(fecha);
create index if not exists idx_ventas_estado on public.ventas(estado);
create index if not exists idx_detalle_ventas_venta on public.detalle_ventas(venta_id);
create index if not exists idx_pagos_venta on public.pagos(venta_id);
create index if not exists idx_abonos_cliente on public.abonos(cliente_id);
create index if not exists idx_gastos_fecha on public.gastos(fecha);
create index if not exists idx_pedidos_estado on public.pedidos(estado);
create index if not exists idx_movimientos_producto on public.movimientos_inventario(producto_id);

-- -----------------------------------------------------
-- SEGURIDAD
-- -----------------------------------------------------
-- Conviene desactivar RLS (o aplicar políticas) según necesidad.
-- Para un único administrador autenticado, se recomienda activar RLS
-- con políticas que verifiquen la autenticación (auth.uid() is not null).
alter table public.clientes enable row level security;
alter table public.productos enable row level security;
alter table public.ventas enable row level security;
alter table public.detalle_ventas enable row level security;
alter table public.pagos enable row level security;
alter table public.abonos enable row level security;
alter table public.categorias_gastos enable row level security;
alter table public.gastos enable row level security;
alter table public.pedidos enable row level security;
alter table public.movimientos_inventario enable row level security;

-- Políticas: solo usuarios autenticados pueden leer/escribir
create policy "Usuarios autenticados: clientes"
  on public.clientes for all to authenticated using (true) with check (true);
create policy "Usuarios autenticados: productos"
  on public.productos for all to authenticated using (true) with check (true);
create policy "Usuarios autenticados: ventas"
  on public.ventas for all to authenticated using (true) with check (true);
create policy "Usuarios autenticados: detalle_ventas"
  on public.detalle_ventas for all to authenticated using (true) with check (true);
create policy "Usuarios autenticados: pagos"
  on public.pagos for all to authenticated using (true) with check (true);
create policy "Usuarios autenticados: abonos"
  on public.abonos for all to authenticated using (true) with check (true);
create policy "Usuarios autenticados: categorias_gastos"
  on public.categorias_gastos for all to authenticated using (true) with check (true);
create policy "Usuarios autenticados: gastos"
  on public.gastos for all to authenticated using (true) with check (true);
create policy "Usuarios autenticados: pedidos"
  on public.pedidos for all to authenticated using (true) with check (true);
create policy "Usuarios autenticados: movimientos_inventario"
  on public.movimientos_inventario for all to authenticated using (true) with check (true);
