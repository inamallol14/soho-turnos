import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { loginConPin } from "@/lib/auth.functions";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ingresar · Soho Box" },
      {
        name: "description",
        content: "Acceso del equipo de Soho Box al sistema de turnos, pagos y liquidación.",
      },
      { property: "og:title", content: "Ingresar · Soho Box" },
      {
        property: "og:description",
        content: "Acceso del equipo de Soho Box al sistema interno.",
      },
    ],
  }),
  component: Login,
});

function Login() {
  const { sesion, entrar, cargando } = useAuth();
  const navigate = useNavigate();
  const login = useServerFn(loginConPin);
  const [nombre, setNombre] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!cargando && sesion) navigate({ to: "/calendario" });
  }, [cargando, sesion, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError("");
    const res = await login({ data: { nombre, pin } });
    setEnviando(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    entrar(res.persona);
    navigate({ to: "/calendario" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <span className="font-display text-2xl">S</span>
          </div>
          <h1 className="font-display text-3xl">Soho Box</h1>
          <p className="mt-1 text-sm text-muted-foreground">Espacio de bienestar</p>
        </div>
        <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
          <div>
            <Label className="mb-1.5 block">Nombre</Label>
            <Input
              className="h-12"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div>
            <Label className="mb-1.5 block">PIN</Label>
            <Input
              className="h-12 tracking-[0.4em]"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              autoComplete="current-password"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="tap w-full" disabled={enviando}>
            Ingresar
          </Button>
        </form>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          El Huerto 598, La Puntilla · 2617176580
        </p>
      </div>
    </div>
  );
}
