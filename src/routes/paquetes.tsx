import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ClienteInput } from "@/components/ClienteInput";
import {
  useClientes,
  usePaquetes,
  usePaquetesDetalle,
  useServicios,
  useSoftDelete,
  useTurnos,
  useUpsert,
  auditar,
  notificar,
} from "@/lib/data";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { diasParaVencer, sesionesPaquete, vencimientoPaquete } from "@/lib/biz";
import { fmtFecha, money, toISO } from "@/lib/format";
import { METODOS_PAGO } from "@/lib/types";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/paquetes")({
  head: () => ({
    meta: [
      { title: "Paquetes · Soho Box" },
      { name: "description", content: "Venta y seguimiento de paquetes de sesiones de Soho Box." },
      { property: "og:title", content: "Paquetes · Soho Box" },
      { property: "og:description", content: "Venta y seguimiento de paquetes de sesiones." },
    ],
  }),
  component: () => (
    <AppShell title="Paquetes">
      <Paquetes />
    </AppShell>
  ),
});

type Linea = { servicio_id: string; servicio_nombre: string; cantidad: number; precio: number };

function Paquetes() {
  const { sesion } = useAuth();
  const { data: paquetes = [] } = usePaquetes();
  const { data: detalle = [] } = usePaquetesDetalle();
  const { data: servicios = [] } = useServicios();
  const { data: clientes = [] } = useClientes();
  const { data: turnos = [] } = useTurnos();
  const qc = useQueryClient();
  const upsert = useUpsert("paquetes", ["paquetes", "paquetes_detalle"]);
  const borrar = useSoftDelete("paquetes", ["paquetes"]);

  const [abierto, setAbierto] = useState(false);
  const [cliente, setCliente] = useState({ nombre: "", clienteId: null as string | null });
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [precioFinal, setPrecioFinal] = useState(0);
  const [pagado, setPagado] = useState(false);
  const [montoPagado, setMontoPagado] = useState(0);
  const [metodo, setMetodo] = useState<string>("Efectivo");
  const [soloVigentes, setSoloVigentes] = useState(true);

  const precioLista = lineas.reduce((a, l) => a + l.precio * l.cantidad, 0);

  const filas = useMemo(() => {
    return paquetes
      .map((p) => {
        const det = detalle.filter((d) => d.paquete_id === p.id);
        const total = sesionesPaquete(det);
        const usadas = turnos.filter((t) => t.activo && t.paquete_id === p.id).length;
        const dias = diasParaVencer(p, total);
        return { p, det, total, usadas, restantes: total - usadas, dias };
      })
      .filter((f) => (soloVigentes ? f.restantes > 0 && f.dias >= 0 : true))
      .sort((a, b) => a.dias - b.dias);
  }, [paquetes, detalle, turnos, soloVigentes]);

  function reset() {
    setCliente({ nombre: "", clienteId: null });
    setLineas([]);
    setPrecioFinal(0);
    setPagado(false);
    setMontoPagado(0);
    setMetodo("Efectivo");
  }

  async function guardar() {
    if (!cliente.nombre.trim() || lineas.length === 0) {
      toast.error("Falta la clienta o los servicios del paquete.");
      return;
    }
    const id = await upsert.mutateAsync({
      values: {
        cliente: cliente.nombre.trim(),
        cliente_id: cliente.clienteId,
        precio_lista_total: precioLista,
        precio_final: precioFinal || precioLista,
        monto_pagado: pagado ? precioFinal || precioLista : montoPagado,
        pagado,
        metodo_pago: metodo,
        fecha_compra: toISO(new Date()),
      },
    });
    await insertarFilas(
      "paquetes_detalle",
      lineas.map((l) => ({
        paquete_id: id,
        servicio_id: l.servicio_id,
        servicio_nombre: l.servicio_nombre,
        cantidad: l.cantidad,
      })),
    );
    await auditar(
      "paquetes",
      id,
      "crear",
      `Paquete de ${cliente.nombre} · ${lineas.reduce((a, l) => a + l.cantidad, 0)} sesiones`,
      sesion?.nombre ?? "",
    );
    qc.invalidateQueries({ queryKey: ["paquetes_detalle"] });
    toast.success("Paquete creado");
    setAbierto(false);
    reset();
  }

  async function avisarVencimientos() {
    const porVencer = filas.filter((f) => f.dias <= 15 && f.dias >= 0 && f.restantes > 0);
    for (const f of porVencer) {
      await notificar(
        "Paquete por vencer",
        `${f.p.cliente}: ${f.restantes} sesiones, vence en ${f.dias} días.`,
        "paquete",
      );
    }
    qc.invalidateQueries({ queryKey: ["notificaciones"] });
    toast.success(`${porVencer.length} avisos generados`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button className="tap" onClick={() => setAbierto(true)}>
          <Plus className="size-4" /> Vender paquete
        </Button>
        <Button variant="outline" className="tap" onClick={avisarVencimientos}>
          Avisar vencimientos
        </Button>
        <label className="ml-auto flex items-center gap-2 text-sm">
          <Switch checked={soloVigentes} onCheckedChange={setSoloVigentes} />
          Solo vigentes
        </label>
      </div>

      <div className="grid gap-2 lg:grid-cols-2">
        {filas.map(({ p, det, total, usadas, restantes, dias }) => (
          <div key={p.id} className="rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">{p.cliente}</p>
                <p className="text-xs text-muted-foreground">
                  {det.map((d) => `${d.cantidad}× ${d.servicio_nombre}`).join(" · ")}
                </p>
              </div>
              <div className="text-right">
                <p className="num text-sm">{money(p.precio_final)}</p>
                <p className={`text-xs ${p.pagado ? "text-success" : "text-destructive"}`}>
                  {p.pagado ? "Pagado" : `Debe ${money(Number(p.precio_final) - Number(p.monto_pagado))}`}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>
                Sesiones: <b className="text-foreground">{usadas}</b>/{total} · quedan {restantes}
              </span>
              <span>Compra {fmtFecha(p.fecha_compra)}</span>
              <span className={dias <= 15 ? "text-warning" : ""}>
                Vence {fmtFecha(toISO(vencimientoPaquete(p, total)))}
                {dias >= 0 ? ` (${dias} días)` : " (vencido)"}
              </span>
            </div>
            <div className="mt-3 flex gap-2">
              {!p.pagado && (
                <Button
                  size="sm"
                  variant="outline"
                  className="tap"
                  onClick={() =>
                    upsert.mutate({
                      id: p.id,
                      values: { pagado: true, monto_pagado: p.precio_final },
                    })
                  }
                >
                  Marcar pagado
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="tap ml-auto text-destructive"
                onClick={() => borrar.mutate(p.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
        {filas.length === 0 && (
          <p className="text-sm text-muted-foreground">No hay paquetes para mostrar.</p>
        )}
      </div>

      <Sheet open={abierto} onOpenChange={(o) => (setAbierto(o), o || reset())}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="font-display text-xl">Vender paquete</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 px-4 pb-24">
            <div>
              <Label className="mb-1.5 block">Clienta</Label>
              <ClienteInput
                clientes={clientes}
                nombre={cliente.nombre}
                onPick={(v) => setCliente({ nombre: v.nombre, clienteId: v.clienteId })}
              />
            </div>

            <div className="space-y-2">
              <Label>Servicios incluidos</Label>
              {lineas.map((l, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm">{l.servicio_nombre}</span>
                  <Input
                    className="h-11 w-20"
                    inputMode="numeric"
                    value={l.cantidad}
                    onChange={(e) => {
                      const c = Number(e.target.value || 0);
                      setLineas(lineas.map((x, j) => (j === i ? { ...x, cantidad: c } : x)));
                    }}
                  />
                  <span className="num w-24 text-right text-sm">{money(l.precio * l.cantidad)}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="tap text-destructive"
                    onClick={() => setLineas(lineas.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              <Select
                value=""
                onValueChange={(id) => {
                  const s = servicios.find((x) => x.id === id);
                  if (!s) return;
                  setLineas([
                    ...lineas,
                    {
                      servicio_id: s.id,
                      servicio_nombre: s.nombre,
                      cantidad: 1,
                      precio: Number(s.precio),
                    },
                  ]);
                }}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Agregar servicio" />
                </SelectTrigger>
                <SelectContent>
                  {servicios.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nombre} · {money(s.precio)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <div className="flex justify-between">
                <span>Precio de lista</span>
                <span className="num">{money(precioLista)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block">Precio final</Label>
                <Input
                  className="h-11"
                  inputMode="numeric"
                  value={precioFinal || precioLista}
                  onChange={(e) => setPrecioFinal(Number(e.target.value || 0))}
                />
              </div>
              <div>
                <Label className="mb-1.5 block">Método de pago</Label>
                <Select value={metodo} onValueChange={setMetodo}>
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {METODOS_PAGO.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label>Pagado en su totalidad</Label>
              <Switch checked={pagado} onCheckedChange={setPagado} />
            </div>
            {!pagado && (
              <div>
                <Label className="mb-1.5 block">Monto entregado</Label>
                <Input
                  className="h-11"
                  inputMode="numeric"
                  value={montoPagado}
                  onChange={(e) => setMontoPagado(Number(e.target.value || 0))}
                />
              </div>
            )}

            <Button className="tap w-full" onClick={guardar}>
              Guardar paquete
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
