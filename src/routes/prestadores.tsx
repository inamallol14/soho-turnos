import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { usePersonas, useReparto, useServicios, useSoftDelete, useUpsert } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { colorPersona } from "@/lib/biz";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/prestadores")({
  head: () => ({
    meta: [
      { title: "Prestadoras · Soho Box" },
      { name: "description", content: "Equipo, accesos y porcentajes de reparto por modalidad." },
      { property: "og:title", content: "Prestadoras · Soho Box" },
      { property: "og:description", content: "Equipo y porcentajes de reparto de Soho Box." },
    ],
  }),
  component: () => (
    <AppShell title="Prestadoras">
      <Prestadores />
    </AppShell>
  ),
});

function Prestadores() {
  const { data: personas = [] } = usePersonas();
  const { data: servicios = [] } = useServicios();
  const { data: reparto = [] } = useReparto();
  const upPersona = useUpsert("personas", ["personas"]);
  const delPersona = useSoftDelete("personas", ["personas"]);
  const upReparto = useUpsert("reparto", ["reparto"]);

  const modalidades = Array.from(new Set(servicios.map((s) => s.modalidad))).sort();
  const [nueva, setNueva] = useState({ nombre: "", rol: "prestador", pin: "" });

  function pct(prestador: string, modalidad: string) {
    return reparto.find((r) => r.prestador === prestador && r.modalidad === modalidad);
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 text-base">Nueva persona</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <Label className="mb-1.5 block text-xs">Nombre</Label>
            <Input
              className="h-11"
              value={nueva.nombre}
              onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })}
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Rol</Label>
            <Select value={nueva.rol} onValueChange={(v) => setNueva({ ...nueva, rol: v })}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administradora</SelectItem>
                <SelectItem value="prestador">Prestador/a</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">PIN (4 a 6 dígitos)</Label>
            <Input
              className="h-11"
              inputMode="numeric"
              value={nueva.pin}
              onChange={(e) => setNueva({ ...nueva, pin: e.target.value.replace(/\D/g, "") })}
            />
          </div>
        </div>
        <Button
          className="tap mt-3"
          onClick={async () => {
            if (!nueva.nombre.trim() || nueva.pin.length < 4 || nueva.pin.length > 6) {
              toast.error("Nombre y PIN de 4 a 6 dígitos.");
              return;
            }
            await upPersona.mutateAsync({ values: { ...nueva, nombre: nueva.nombre.trim() } });
            setNueva({ nombre: "", rol: "prestador", pin: "" });
            toast.success("Persona agregada");
          }}
        >
          Agregar
        </Button>
      </div>

      <div className="space-y-3">
        {personas.map((p) => (
          <div key={p.id} className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-3">
              <span
                className="size-3 rounded-full"
                style={{ backgroundColor: colorPersona(p.nombre) }}
              />
              <div className="flex-1">
                <p className="font-medium">{p.nombre}</p>
                <p className="text-xs text-muted-foreground">
                  {p.rol === "admin" ? "Administradora" : "Prestador/a"}
                </p>
              </div>
              <Input
                className="h-11 w-32"
                inputMode="numeric"
                placeholder="Nuevo PIN"
                onBlur={(e) => {
                  const pin = e.target.value.replace(/\D/g, "");
                  if (!pin) return;
                  if (pin.length < 4 || pin.length > 6) {
                    toast.error("El PIN debe tener de 4 a 6 dígitos.");
                    return;
                  }
                  upPersona.mutate({ id: p.id, values: { pin } });
                  e.target.value = "";
                  toast.success("PIN actualizado");
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="tap text-destructive"
                onClick={() => delPersona.mutate(p.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {modalidades.map((m) => {
                const r = pct(p.nombre, m);
                return (
                  <div key={m} className="flex items-center gap-2 rounded-lg bg-muted/50 p-2">
                    <span className="flex-1 text-sm">{m}</span>
                    <Input
                      className="h-10 w-20"
                      inputMode="decimal"
                      defaultValue={r ? String(r.porcentaje) : "0"}
                      onBlur={(e) => {
                        const v = Number(e.target.value || 0);
                        if (r && Number(r.porcentaje) === v) return;
                        upReparto.mutate({
                          id: r?.id ?? null,
                          values: { prestador: p.nombre, modalidad: m, porcentaje: v },
                        });
                      }}
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
