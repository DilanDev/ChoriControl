# ChoriControl

Sistema web privado de gestión administrativa y financiera para un negocio de chorizos asados.

Aplicación responsive / PWA orientada al administrador, diseñada **mobile-first** para uso principalmente desde el teléfono.

## Stack

| Componente           | Tecnología                      |
| -------------------- | ------------------------------- |
| Frontend             | Next.js (App Router) + React    |
| Estilos              | Tailwind CSS + shadcn/ui        |
| Backend / Servicios  | Supabase                        |
| Base de datos        | PostgreSQL (Supabase)           |
| Autenticación        | Supabase Auth                   |
| Seguridad            | Row Level Security (RLS)        |
| Control de versiones | Git + GitHub                    |
| Hosting              | Vercel                          |

## Módulos (MVP)

- **Login** — acceso privado con Supabase Auth.
- **Dashboard** — ventas del día, ingresos, gastos, ganancia estimada, por cobrar, pedidos pendientes y alertas de inventario.
- **Ventas** — registrar venta con cálculo automático (cantidad × precio), pago, saldo pendiente y estado. Regla de deuda: `total > pagado → PENDIENTE`.
- **Clientes** — CRUD, historial de ventas y abonos.
- **Deudores** — clientes con saldo pendiente y total general por cobrar.
- **Abonos** — registrar abonos que reducen el saldo automáticamente; al llegar a 0 la venta pasa a PAGADA.
- **Gastos** — registrar y categorizar gastos.
- **Ingresos** — consultar por periodos (hoy, semana, mes, personalizado) y por método de pago.

## Requisitos previos

- Node.js 20+
- Cuenta en Supabase con proyecto creado
- Cuenta en Vercel (para el despliegue)

## Configuración local

1. Clona el repositorio e instala dependencias:

   ```bash
   npm install
   ```

2. Copia `.env.example` a `.env.local` y completa tus credenciales (las encontrarás en Supabase → Settings → API):

   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
   ```

3. En el SQL Editor de Supabase, ejecuta el contenido de `supabase/schema.sql` para crear las tablas, los movimientos y activar RLS.

4. Crea el usuario administrador en Supabase → Authentication → Add user (correo + contraseña).

5. Inicia el servidor de desarrollo:

   ```bash
   npm run dev
   ```

6. Abre [http://localhost:3000](http://localhost:3000) e inicia sesión con el usuario creado.

> **Importante:** nunca subas al repositorio tu `.env.local`. El archivo `.gitignore` ya está configurado para ignorarlo.

## Despliegue en Vercel

1. Sube el repositorio a GitHub.
2. En Vercel, importa el repositorio.
3. Añade las variables de entorno (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) en el panel de Vercel.
4. Despliega.

## Funciones futuras (no incluidas en el MVP)

Pedidos, inventario, movimientos de inventario, reportes y gráficas, PWA completa, exportación a Excel/PDF, control por producto, múltiples administradores y permisos.

## Scripts

```bash
npm run dev      # servidor de desarrollo
npm run build    # build de producción
npm run start    # servidor de producción
npm run lint     # eslint
```
