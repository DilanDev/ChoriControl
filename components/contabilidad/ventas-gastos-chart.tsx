"use client";

import { useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatCOP,
  formatCOPCompacto,
  formatFecha,
  formatFechaCorta,
  parseFechaLocal,
} from "@/lib/format";
import type { DiaContabilidad } from "@/lib/services/finanzas";

const SERIE_VENTAS = "#a8201a";
const SERIE_GASTOS = "#e97d2c";
const ALTO = 220;
const MARGEN = { top: 16, right: 16, bottom: 28, left: 52 };
const MAX_DIAS_GRAFICO = 31;

function techoBonito(valor: number): number {
  if (valor <= 0) return 1000;
  const magnitud = Math.pow(10, Math.floor(Math.log10(valor)));
  const normalizado = valor / magnitud;
  const factor =
    normalizado <= 1 ? 1 : normalizado <= 2 ? 2 : normalizado <= 5 ? 5 : 10;
  return factor * magnitud;
}

function Leyenda() {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span
          className="h-0.5 w-4 rounded-full"
          style={{ backgroundColor: SERIE_VENTAS }}
        />
        Ventas
      </span>
      <span className="flex items-center gap-1.5">
        <span
          className="h-0.5 w-4 rounded-full"
          style={{ backgroundColor: SERIE_GASTOS }}
        />
        Gastos
      </span>
    </div>
  );
}

export function VentasGastosChart({ data }: { data: DiaContabilidad[] }) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(0);
  const [indice, setIndice] = useState<number | null>(null);

  useEffect(() => {
    const elemento = contenedorRef.current;
    if (!elemento) return;
    const observer = new ResizeObserver((entries) => {
      setAncho(Math.floor(entries[0].contentRect.width));
    });
    observer.observe(elemento);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setIndice(null);
  }, [data.length]);

  const hayMovimientos = data.some(
    (d) => d.facturado > 0 || d.gastos > 0
  );

  if (data.length === 0) return null;

  if (!hayMovimientos) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Sin movimientos en el período seleccionado.
        </CardContent>
      </Card>
    );
  }

  if (data.length === 1) return null;

  if (data.length > MAX_DIAS_GRAFICO) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ventas vs gastos por día</CardTitle>
          <CardDescription>
            El período supera los 31 días; consulta el detalle en la tabla.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TablaDatos data={data} abierta />
        </CardContent>
      </Card>
    );
  }

  const anchoUtil = Math.max(ancho - MARGEN.left - MARGEN.right, 10);
  const altoUtil = ALTO - MARGEN.top - MARGEN.bottom;
  const maxValor = techoBonito(
    Math.max(...data.map((d) => Math.max(d.facturado, d.gastos)))
  );
  const x = (i: number) => MARGEN.left + (i / (data.length - 1)) * anchoUtil;
  const y = (valor: number) =>
    MARGEN.top + altoUtil - (valor / maxValor) * altoUtil;
  const camino = (clave: "facturado" | "gastos") =>
    data
      .map(
        (d, i) =>
          `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(d[clave]).toFixed(1)}`
      )
      .join(" ");
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * maxValor);
  const pasoEtiqueta = Math.max(1, Math.ceil(data.length / 6));
  const indicesEtiqueta = data
    .map((_, i) => i)
    .filter((i) => i % pasoEtiqueta === 0);
  const ultimoIndice = data.length - 1;
  const ultimaEtiqueta = indicesEtiqueta[indicesEtiqueta.length - 1];
  if (ultimaEtiqueta !== ultimoIndice) {
    if (ultimoIndice - ultimaEtiqueta < Math.ceil(pasoEtiqueta / 2)) {
      indicesEtiqueta[indicesEtiqueta.length - 1] = ultimoIndice;
    } else {
      indicesEtiqueta.push(ultimoIndice);
    }
  }

  function handlePointer(e: React.PointerEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const relativo = e.clientX - rect.left;
    const idx = Math.round(
      (relativo / Math.max(rect.width, 1)) * (data.length - 1)
    );
    setIndice(Math.max(0, Math.min(data.length - 1, idx)));
  }

  function handleKeyDown(e: React.KeyboardEvent<SVGSVGElement>) {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      setIndice((actual) => {
        const base = actual ?? 0;
        const delta = e.key === "ArrowRight" ? 1 : -1;
        return Math.max(0, Math.min(data.length - 1, base + delta));
      });
    } else if (e.key === "Escape") {
      setIndice(null);
    }
  }

  const activo = indice !== null ? data[indice] : null;
  const tooltipIzquierda =
    activo !== null ? Math.min(Math.max(x(indice!), 80), Math.max(ancho - 80, 80)) : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle>Ventas vs gastos por día</CardTitle>
            <CardDescription>
              Ventas facturadas y gastos registrados en el período.
            </CardDescription>
          </div>
          <Leyenda />
        </div>
      </CardHeader>
      <CardContent>
        <div ref={contenedorRef} className="relative w-full" style={{ height: ALTO }}>
          {ancho > 0 && (
            <>
              <svg
                width={ancho}
                height={ALTO}
                role="img"
                tabIndex={0}
                aria-label={`Gráfico de ventas y gastos por día (${data.length} días). Usa las flechas izquierda y derecha para explorar; los valores también están en la tabla de datos.`}
                onKeyDown={handleKeyDown}
                className="block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {ticks.map((tick) => (
                  <g key={tick}>
                    <line
                      x1={MARGEN.left}
                      x2={ancho - MARGEN.right}
                      y1={y(tick)}
                      y2={y(tick)}
                      stroke="#e8dfd3"
                      strokeWidth={1}
                    />
                    <text
                      x={MARGEN.left - 8}
                      y={y(tick) + 4}
                      textAnchor="end"
                      fontSize={10}
                      fill="#6f645b"
                    >
                      {formatCOPCompacto(tick)}
                    </text>
                  </g>
                ))}

                {indicesEtiqueta.map((i) => (
                  <text
                    key={data[i].fecha}
                    x={x(i)}
                    y={ALTO - 8}
                    textAnchor={
                      i === 0
                        ? "start"
                        : i === data.length - 1
                          ? "end"
                          : "middle"
                    }
                    fontSize={10}
                    fill="#6f645b"
                  >
                    {formatFechaCorta(parseFechaLocal(data[i].fecha))}
                  </text>
                ))}

                <path
                  d={camino("facturado")}
                  fill="none"
                  stroke={SERIE_VENTAS}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                <path
                  d={camino("gastos")}
                  fill="none"
                  stroke={SERIE_GASTOS}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />

                {indice !== null && (
                  <>
                    <line
                      x1={x(indice)}
                      x2={x(indice)}
                      y1={MARGEN.top}
                      y2={ALTO - MARGEN.bottom}
                      stroke="#c3b8aa"
                      strokeWidth={1}
                    />
                    <circle
                      cx={x(indice)}
                      cy={y(data[indice].facturado)}
                      r={4}
                      fill={SERIE_VENTAS}
                      stroke="#ffffff"
                      strokeWidth={2}
                    />
                    <circle
                      cx={x(indice)}
                      cy={y(data[indice].gastos)}
                      r={4}
                      fill={SERIE_GASTOS}
                      stroke="#ffffff"
                      strokeWidth={2}
                    />
                  </>
                )}

                <rect
                  x={MARGEN.left}
                  y={MARGEN.top}
                  width={anchoUtil}
                  height={altoUtil}
                  fill="transparent"
                  onPointerMove={handlePointer}
                  onPointerDown={handlePointer}
                  onPointerLeave={() => setIndice(null)}
                />
              </svg>

              {activo && (
                <div
                  className="pointer-events-none absolute top-0 z-10 w-40 -translate-x-1/2 rounded-lg border bg-popover p-2 text-xs shadow-lg"
                  style={{ left: tooltipIzquierda }}
                >
                  <p className="font-medium">
                    {formatFecha(
                      parseFechaLocal(activo.fecha).toISOString()
                    )}
                  </p>
                  <div className="mt-1 space-y-0.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <span
                          className="h-0.5 w-3 rounded-full"
                          style={{ backgroundColor: SERIE_VENTAS }}
                        />
                        Ventas
                      </span>
                      <span className="font-semibold tabular-nums">
                        {formatCOP(activo.facturado)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <span
                          className="h-0.5 w-3 rounded-full"
                          style={{ backgroundColor: SERIE_GASTOS }}
                        />
                        Gastos
                      </span>
                      <span className="font-semibold tabular-nums">
                        {formatCOP(activo.gastos)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <TablaDatos data={data} />
      </CardContent>
    </Card>
  );
}

function TablaDatos({
  data,
  abierta = false,
}: {
  data: DiaContabilidad[];
  abierta?: boolean;
}) {
  return (
    <details className="mt-3" open={abierta}>
      <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
        Ver tabla de datos
      </summary>
      <div className="mt-2 max-h-72 overflow-auto rounded-lg border">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-muted/95 backdrop-blur">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Día</th>
              <th className="px-3 py-2 text-right font-medium">Ventas</th>
              <th className="px-3 py-2 text-right font-medium">Gastos</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.fecha} className="border-t">
                <td className="px-3 py-1.5">
                  {formatFechaCorta(parseFechaLocal(d.fecha))}
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums">
                  {formatCOP(d.facturado)}
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums">
                  {formatCOP(d.gastos)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
