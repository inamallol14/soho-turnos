import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useServicios, useSoftDelete, useUpsert } from "@/lib/data";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { money } from "@/lib/format";
import { descargarCSV, num, parseCSV, toCSV } from "@/lib/csv";
import { toast } from "sonner";
import { Download, Trash2, Upload } from "lucide-react";
import type { Servicio } from "@/lib/types";

export const Route = createFileRoute("/servicios")({
  head: () => ({
    meta: [
      { title: "Servicios · Soho Box" },
      { name: "description", content: "Catálogo de servicios, duraciones y precios de Soho Box." },
      { property: "og:title", content: "Servicios · Soho Box" },
      { property: "og:description", content: "Catálogo de servicios y precios de Soho Box." },
    ],
  }),
  component: () => (
    <AppShell title="Servicios">
      <Servicios />
    </AppShell>
  ),
});

function Servicios() {
  const { data: servicios = [] } = useServicios();
  const upsert = useUpsert("servicios", ["servicios"]);
  const borrar = useSoftDelete("servicios", ["servicios"]);
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [nuevo, setNuevo] = useState({ modalidad: "", nombre: "", duracion_min: 60, precio: 0 });

  function exportar() {
    descargarCSV(
      "servicios-soho-box.csv",
      toCSV(
        servicios.map((s) => ({
          id: s.id,
          modalidad: s.modalidad,
          nombre: s.nombre,
          duracion: s.duracion_min,
          precio: s.precio,
        })),
        ["id", "modalidad", "nombre", "duracion", "precio"],
      ),
    );
  }

  async function importar(file: File) {
    const filas = parseCSV(await file.text());
    let creados = 0;
    let actualizados = 0;
    for (const f of filas) {
      const nombre = f["nombre"] ?? "";
      const modalidad = f["modalidad"] ?? "";
      if (!nombre) continue;
      const existente: Servicio | undefined =
        (f["id"] && servicios.find((s) => s.id === f["id"])) ||
        servicios.find(
          (s) =>
            s.nombre.toLowerCase() === nombre.toLowerCase() &&
            s.modalidad.toLowerCase() === modalidad.toLowerCase(),
        ) ||
        undefined;
      const values = {
        modalidad,
        nombre,
        duracion_min: num(f["duracion"]) || 60,
        precio: num(f["precio"]),
      };
      if (existente) {
        await supabase.from("servicios").update(values).eq("id", existente.id);
        actualizados++;
      } else {
        await supabase.from("servicios").insert(values);
        creados++;
      }
    }
    qc.invalidateQueries({ queryKey: ["servicios"] });
    toast.success(`${actualizados} actualizados · ${creados} nuevos`);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" className="tap" onClick={exportar}>
          <Download className="size-4" /> Exportar planilla
        </Button>
        <Button variant="outline" className="tap" onClick={() => fileRef.current?.click()}>
          <Upload className="size-4" /> Importar / actualizar precios
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importar(f);
            e.target.value = "";
          }}
        />
      </div>

      <div className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 text-base">Nuevo servicio</h2>
        <div className="grid gap-3 sm:grid-cols-5">
          <div>
            <Label className="mb-1.5 block text-xs">Modalidad</Label>
            <Input
              className="h-11"
              value={nuevo.modalidad}
              onChange={(e) => setNuevo({ ...nuevo, modalidad: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="mb-1.5 block text-xs">Nombre</Label>
            <Input
              className="h-11"
              value={nuevo.nombre}
              onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Duración (min)</Label>
            <Input
              className="h-11"
              inputMode="numeric"
              value={nuevo.duracion_min}
              onChange={(e) => setNuevo({ ...nuevo, duracion_min: Number(e.target.value || 0) })}
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Precio</Label>
            <Input
              className="h-11"
              inputMode="numeric"
              value={nuevo.precio}
              onChange={(e) => setNuevo({ ...nuevo, precio: Number(e.target.value || 0) })}
            />
          </div>
        </div>
        <Button
          className="tap mt-3"
          onClick={async () => {
            if (!nuevo.nombre || !nuevo.modalidad) {
              toast.error("Falta modalidad o nombre.");
              return;
            }
            await upsert.mutateAsync({ values: { ...nuevo } });
            setNuevo({ modalidad: "", nombre: "", duracion_min: 60, precio: 0 });
            toast.success("Servicio agregado");
          }}
        >
          Agregar
        </Button>
      </div>

      <div className="grid gap-2 lg:grid-cols-2">
        {servicios.map((s) => (
          <div key={s.id} className="flex items-center gap-2 rounded-xl border bg-card p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{s.nombre}</p>
              <p className="text-xs text-muted-foreground">
                {s.modalidad} · {s.duracion_min} min
              </p>
            </div>
            <Input
              className="h-11 w-28"
              inputMode="numeric"
              defaultValue={s.precio}
              onBlur={(e) => {
                const v = Number(e.target.value || 0);
                if (v !== Number(s.precio)) upsert.mutate({ id: s.id, values: { precio: v } });
              }}
            />
            <span className="hidden w-24 text-right text-sm text-muted-foreground sm:inline">
              {money(s.precio)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="tap text-destructive"
              onClick={() => borrar.mutate(s.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
