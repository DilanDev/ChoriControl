"use client";

import type { ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function PageContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-6xl p-4 md:p-6 lg:p-8",
        className
      )}
    >
      {children}
    </div>
  );
}

export function LoadingState({
  rows = 3,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("space-y-3", className)}
      role="status"
      aria-label="Cargando"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-xl" />
      ))}
      <span className="sr-only">Cargando...</span>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <div className="rounded-full bg-destructive/10 p-3 text-destructive">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <div>
        <p className="font-medium">No se pudo cargar la información</p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{message}</p>
      </div>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          <RotateCcw className="h-4 w-4" /> Reintentar
        </Button>
      )}
    </div>
  );
}
