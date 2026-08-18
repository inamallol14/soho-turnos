import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  CalendarDays,
  ClipboardList,
  Layers,
  Users,
  Sparkles,
  UserCog,
  Wallet,
  LogOut,
  Plus,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { TurnoPanel, nuevoDraft, type TurnoDraft } from "./TurnoPanel";
import { useNotificaciones } from "@/lib/data";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fmtFecha } from "@/lib/format";

const NAV = [
  { to: "/calendario", label: "Calendario", icon: CalendarDays, admin: false },
  { to: "/agenda", label: "Agenda", icon: ClipboardList, admin: false },
  { to: "/paquetes", label: "Paquetes", icon: Layers, admin: false },
  { to: "/clientes", label: "Clientes", icon: Users, admin: true },
  { to: "/servicios", label: "Servicios", icon: Sparkles, admin: true },
  { to: "/prestadores", label: "Prestadores", icon: UserCog, admin: true },
  { to: "/liquidacion", label: "Liquidación", icon: Wallet, admin: true },
];

const TurnoUI = createContext<{ abrir: (d?: TurnoDraft) => void }>({ abrir: () => {} });
export function useTurnoUI() {
  return useContext(TurnoUI);
}

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  const { sesion, cargando, salir, esAdmin } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [draft, setDraft] = useState<TurnoDraft | null>(null);
  const { data: notis = [] } = useNotificaciones();

  useEffect(() => {
    if (!cargando && !sesion) navigate({ to: "/" });
  }, [cargando, sesion, navigate]);

  if (!sesion) return null;

  const items = NAV.filter((n) => !n.admin || esAdmin);

  return (
    <TurnoUI.Provider value={{ abrir: (d) => setDraft(d ?? nuevoDraft()) }}>
      <div className="flex min-h-screen w-full bg-background">
        <aside className="sticky top-0 flex h-screen w-16 shrink-0 flex-col border-r bg-sidebar py-4 lg:w-56">
          <div className="mb-6 px-3">
            <div className="flex items-center gap-2">
              <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
                <span className="font-display text-base">S</span>
              </div>
              <div className="hidden leading-tight lg:block">
                <p className="font-display text-sm font-semibold">Soho Box</p>
                <p className="text-[11px] text-muted-foreground">Espacio de bienestar</p>
              </div>
            </div>
          </div>
          <nav className="flex-1 space-y-1 px-2">
            {items.map((n) => {
              const active = path.startsWith(n.to);
              const Icon = n.icon;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`tap flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                  }`}
                >
                  <Icon className="size-5 shrink-0" />
                  <span className="hidden lg:inline">{n.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="px-2">
            <button
              onClick={() => {
                salir();
                navigate({ to: "/" });
              }}
              className="tap flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent/50"
            >
              <LogOut className="size-5 shrink-0" />
              <span className="hidden lg:inline">Salir</span>
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b bg-background/90 px-4 py-3 backdrop-blur">
            <div className="min-w-0">
              <h1 className="truncate font-display text-xl">{title}</h1>
              <p className="truncate text-xs text-muted-foreground">
                {sesion.nombre} · {esAdmin ? "Administradora" : "Prestadora"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" className="tap relative">
                    <Bell className="size-4" />
                    {notis.some((n) => !n.leida) && (
                      <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-warning" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 p-0">
                  <div className="max-h-80 overflow-y-auto">
                    {notis.length === 0 && (
                      <p className="p-4 text-sm text-muted-foreground">Sin novedades.</p>
                    )}
                    {notis.map((n) => (
                      <div key={n.id} className="border-b p-3 last:border-0">
                        <p className="text-sm font-medium">{n.titulo}</p>
                        <p className="text-xs text-muted-foreground">{n.cuerpo}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {fmtFecha(n.created_at.slice(0, 10))}
                        </p>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <Button className="tap" onClick={() => setDraft(nuevoDraft())}>
                <Plus className="size-4" />
                <span className="hidden sm:inline">Nuevo turno</span>
              </Button>
            </div>
          </header>
          <main className="min-w-0 flex-1 p-3 sm:p-5">{children}</main>
        </div>
      </div>
      <TurnoPanel draft={draft} onClose={() => setDraft(null)} />
    </TurnoUI.Provider>
  );
}
