"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Contact,
  Flame,
  HandCoins,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  ShoppingCart,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { href: "/ventas", label: "Ventas", icon: ShoppingCart },
  { href: "/deudores", label: "Deudores", icon: HandCoins },
  { href: "/clientes", label: "Clientes", icon: Contact },
  { href: "/contabilidad", label: "Contabilidad", icon: ReceiptText },
];

function useSignOut() {
  const { signOut } = useAuth();
  const { toast } = useToast();

  return async function handleSignOut() {
    try {
      await signOut();
    } catch (error) {
      toast({
        title: "No se pudo cerrar sesión",
        description:
          error instanceof Error ? error.message : "Inténtalo de nuevo.",
        variant: "error",
      });
    }
  };
}

export function AppNav() {
  const pathname = usePathname();
  const handleSignOut = useSignOut();

  const esActivo = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      {/* Barra superior móvil */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="rounded-xl bg-primary p-1.5 text-primary-foreground">
            <Flame className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold tracking-tight">
            Chori<span className="text-primary">Control</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          aria-label="Cerrar sesión"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      {/* Navegación inferior móvil */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="grid grid-cols-5">
          {navItems.map((item) => {
            const active = esActivo(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-medium transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex h-7 items-center justify-center rounded-full px-3 transition-colors",
                    active && "bg-primary/10"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Sidebar escritorio/tablet */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex lg:w-64">
        <div className="flex h-16 items-center gap-2 border-b px-4">
          <span className="rounded-xl bg-primary p-1.5 text-primary-foreground">
            <Flame className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold tracking-tight">
            Chori<span className="text-primary">Control</span>
          </span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const active = esActivo(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-3">
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="h-5 w-5" />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
