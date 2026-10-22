"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Flame } from "lucide-react";
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
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background text-muted-foreground">
        <span className="rounded-2xl bg-primary p-3 text-primary-foreground">
          <Flame className="h-8 w-8" />
        </span>
        <p className="text-sm">Cargando ChoriControl...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppNav />
      <main className="min-w-0 flex-1 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-14 md:pb-0 md:pt-0">
        {children}
      </main>
    </div>
  );
}
