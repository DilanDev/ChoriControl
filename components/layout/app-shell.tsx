"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { AppNav } from "@/components/layout/app-nav";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-muted-foreground">
        Cargando...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen">
      <AppNav />
      <main className="flex-1 md:pl-0 pb-16 md:pb-0 bg-muted/30 min-w-0">
        {children}
      </main>
    </div>
  );
}
