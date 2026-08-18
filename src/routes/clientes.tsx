import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useClientes, useSoftDelete, useTurnos, useUpsert } from "@/lib/data";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PeriodoFiltro, presetPeriodo, type Periodo } from "@/components/PeriodoFiltro";
import { deudaCliente, facturado, turnoCuenta } from "@/lib/biz";
import { fmtFecha, money } from "@/lib/format";
import { descargarCSV, parseCSV, toCSV } from "@/lib/csv";
import { toast } from "sonner";
import { Download, Home, Trash2, Upload } from "lucide-react";
import type { Cliente } from "@/lib/types";

export const Route = createFileRoute("/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes · Soho Box" },
      { name: "description", content: "Clientas, deuda pendiente y consumo por período en Soho Box." },
      { property: "og:title", content: "Clientes · Soho Box" },
      { property: "og:description", content: "Clientas, deuda y consumo por período en Soho Box." },
    ],
  }),
  component: () => (
    <AppShell title="Clientes">
      <Clientes />
    </AppShell>
  ),
});

function Clientes() {
  const { data: clientes = [] } = useClientes();
  const { data: turnos = [] } = useTurnos();
  const upsert = useUpsert("clientes", ["clientes"]);
  const borrar = useSoftDelete("clientes", ["clientes"]);
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [editar, setEditar] = useState<Partial<Cliente> | null>(null);
  const [busca, setBusca] = useState("");
  const [p, setP] = useState<Periodo>(presetPeriodo("mes"));

  const turnosDe = (c: Partial<Cliente>) =>
    turnos.filter((t) => (c.id && t.cliente_id === c.id) || t.cliente === c.nombre);

  const lista = clientes.filter((c) => c.nombre.toLowerCase().includes(busca.toLowerCase()));

  const propietarios = clientes.filter((c) => c.es_propietario);
  const alquilerTotal = useMemo(() => {
    let total = 0;
    for (const c of propietarios) {
      total += turnosDe(c)
        .filter((t) => turnoCuenta(t) && t.es_canje && t.fecha >= p.desde && t.fecha <= p.hasta)
        .reduce((a, t) => a + facturado(t), 0);
    }
    return total;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientes, turnos, p]);

  const detalleCliente = editar
    ? turnosDe(editar)
        .filter((t) => turnoCuenta(t) && t.fecha >= p.desde && t.fecha <= p.hasta)
        .sort((a, b) => a.fecha.localeCompare(b.fecha))
    : [];

  async function importar(file: File) {
    const filas = parseCSV(await file.text());
    let creados = 0,
      actualizados = 0;
    for (const f of filas) {
      const nombre = f["nombre"] ?? "";
      if (!nombre) continue;
      const values = {
        nombre,
        telefono: f["telefono"] ?? f["teléfono"] ?? null,
        email: f["email"] ?? null,
        notas: f["notas"] ?? null,
      };
      const ex = clientes.find((c) => c.nombre.toLowerCase() === nombre.toLowerCase());
      if (ex) {
        await supabase.from("clientes").update(values).eq("id", ex.id);
        actualizados++;
      } else {
        await supabase.from("clientes").insert(values);
        creados++;
      }
    }
    qc.invalidateQueries({ queryKey: ["clientes"] });
    toast.success(`${actualizados} actualizados · ${creados} nuevos`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="h-11 w-full sm:w-64"
          placeholder="Buscar clienta"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <Button className="tap" onClick={() => setEditar({ nombre: "" })}>
          Nueva clienta
        </Button>
        <Button
          variant="outline"
          className="tap"
          onClick={() =>
            descargarCSV(
              "clientes-soho-box.csv",
              toCSV(
                clientes.map((c) => ({
                  nombre: c.nombre,
                  telefono: c.telefono ?? "",
                  email: c.email ?? "",
                  notas: c.notas ?? "",
                })),
                ["nombre", "telefono", "email", "notas"],
              ),
            )
          }
        >
          <Download className="size-4" /> Exportar
        </Button>
        <Button variant="outline" className="tap" onClick={() => fileRef.current?.click()}>
          <Upload className="size-4" /> Importar
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

      <div className="rounded-xl border bg-plum-soft/50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium">
              <Home className="size-4" /> Alquiler — consumo de propietarias
            </p>
            <p className="text-xs text-muted-foreground">
              {propietarios.map((c) => c.nombre).join(" + ") || "Sin propietarias marcadas"}
            </p>
          </div>
          <p className="num text-2xl">{money(alquilerTotal)}</p>
        </div>
        <div className="mt-3">
          <PeriodoFiltro value={p} onChange={setP} opciones={["mes", "mesPasado"]} />
        </div>
      </div>

      <div className="grid gap-2 lg:grid-cols-2">
        {lista.map((c) => {
          const deuda = deudaCliente(turnosDe(c));
          return (
            <button
              key={c.id}
              onClick={() => setEditar(c)}
              className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3 text-left"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {c.nombre}
                  {c.es_propietario && (
                    <span className="ml-2 rounded-full bg-plum-soft px-2 py-0.5 text-[11px] text-plum">
                      Propietaria
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">{c.telefono ?? "sin teléfono"}</p>
              </div>
              <span className={`num text-sm ${deuda > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                {deuda > 0 ? money(deuda) : "al día"}
              </span>
            </button>
          );
        })}
      </div>

      <Sheet open={!!editar} onOpenChange={(o) => !o && setEditar(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="font-display text-xl">
              {editar?.id ? editar.nombre : "Nueva clienta"}
            </SheetTitle>
          </SheetHeader>
          {editar && (
            <div className="space-y-4 px-4 pb-24">
              <div>
                <Label className="mb-1.5 block">Nombre</Label>
                <Input
                  className="h-11"
                  value={editar.nombre ?? ""}
                  onChange={(e) => setEditar({ ...editar, nombre: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1.5 block">Teléfono</Label>
                  <Input
                    className="h-11"
                    value={editar.telefono ?? ""}
                    onChange={(e) => setEditar({ ...editar, telefono: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="mb-1.5 block">Email</Label>
                  <Input
                    className="h-11"
                    value={editar.email ?? ""}
                    onChange={(e) => setEditar({ ...editar, email: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label className="mb-1.5 block">Notas</Label>
                <Textarea
                  rows={3}
                  value={editar.notas ?? ""}
                  onChange={(e) => setEditar({ ...editar, notas: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label>Es propietaria del local</Label>
                <Switch
                  checked={!!editar.es_propietario}
                  onCheckedChange={(v) => setEditar({ ...editar, es_propietario: v })}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  className="tap flex-1"
                  onClick={async () => {
                    if (!editar.nombre?.trim()) {
                      toast.error("Falta el nombre.");
                      return;
                    }
                    await upsert.mutateAsync({
                      id: editar.id ?? null,
                      values: {
                        nombre: editar.nombre.trim(),
                        telefono: editar.telefono ?? null,
                        email: editar.email ?? null,
                        notas: editar.notas ?? null,
                        es_propietario: !!editar.es_propietario,
                      },
                    });
                    toast.success("Guardado");
                    setEditar(null);
                  }}
                >
                  Guardar
                </Button>
                {editar.id && (
                  <Button
                    variant="outline"
                    className="tap text-destructive"
                    onClick={async () => {
                      await borrar.mutateAsync(editar.id as string);
                      setEditar(null);
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>

              {editar.id && (
                <div className="space-y-3 rounded-xl border p-3">
                  <p className="text-sm font-medium">Consumo por período</p>
                  <PeriodoFiltro value={p} onChange={setP} opciones={["mes", "mesPasado"]} />
                  <div className="space-y-1">
                    {detalleCliente.map((t) => (
                      <div key={t.id} className="flex justify-between border-b py-1 text-sm last:border-0">
                        <span className="min-w-0 truncate">
                          {fmtFecha(t.fecha)} · {t.servicio_nombre} · {t.prestador}
                        </span>
                        <span className="num">{money(facturado(t))}</span>
                      </div>
                    ))}
                    {detalleCliente.length === 0 && (
                      <p className="text-sm text-muted-foreground">Sin turnos en el período.</p>
                    )}
                  </div>
                  <div className="flex justify-between border-t pt-2 text-sm font-medium">
                    <span>Total</span>
                    <span className="num">
                      {money(detalleCliente.reduce((a, t) => a + facturado(t), 0))}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
