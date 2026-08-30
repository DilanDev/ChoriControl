import type { ReactNode } from "react";

export function PageContainer({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-6xl p-4 md:p-6 lg:p-8 ${className}`}>
      {children}
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="flex items-center justify-center h-64 text-muted-foreground">
      Cargando...
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-4 text-sm text-destructive">
        {message}
      </div>
    </div>
  );
}
