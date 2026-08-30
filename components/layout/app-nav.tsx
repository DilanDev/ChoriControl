"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  HandCoins,
  Contact,
  ReceiptText,
  TrendingUp,
  LogOut,
  Landmark,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/ventas", label: "Ventas", icon: ShoppingCart },
  { href: "/deudores", label: "Deudores", icon: HandCoins },
  { href: "/clientes", label: "Clientes", icon: Contact },
  { href: "/gastos", label: "Gastos", icon: ReceiptText },
  { href: "/ingresos", label: "Ingresos", icon: TrendingUp },
];

export function AppNav() {
  const pathname = usePathname();
  const { signOut } = useAuth();

  return (
    <>
      {/* Navegación inferior móvil (mobile-first) */}
      <nav className="fixed bottom-0 inset-x-0 z-40 border-t bg-background md:hidden">
        <div className="grid grid-cols-6">
          {navItems.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-primary"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Sidebar escritorio/tablet */}
      <aside className="hidden md:flex md:w-60 lg:w-64 shrink-0 border-r bg-card flex-col sticky top-0 h-screen">
        <div className="flex items-center gap-2 px-4 h-16 border-b">
          <Landmark className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg tracking-tight">
            Chori<span className="text-primary">Control</span>
          </span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t">
          <button
            onClick={() => signOut()}
            className="flex items-center gap-3 w-full rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-5 w-5" />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
