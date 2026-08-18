import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Persona } from "./types";

type Sesion = Pick<Persona, "id" | "nombre" | "rol">;

type Ctx = {
  sesion: Sesion | null;
  cargando: boolean;
  entrar: (s: Sesion) => void;
  salir: () => void;
  esAdmin: boolean;
};

const AuthCtx = createContext<Ctx>({
  sesion: null,
  cargando: true,
  entrar: () => {},
  salir: () => {},
  esAdmin: false,
});

const KEY = "sohobox.sesion";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setSesion(JSON.parse(raw) as Sesion);
    } catch {
      /* ignore */
    }
    setCargando(false);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      sesion,
      cargando,
      esAdmin: sesion?.rol === "admin",
      entrar: (s) => {
        localStorage.setItem(KEY, JSON.stringify(s));
        setSesion(s);
      },
      salir: () => {
        localStorage.removeItem(KEY);
        setSesion(null);
      },
    }),
    [sesion, cargando],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}
