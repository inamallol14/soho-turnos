import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PeriodoFiltro, presetPeriodo, type Periodo } from "@/components/PeriodoFiltro";
import {
  auditar,
  useClientes,
  usePagosLiquidacion,
  useReparto,
  useSoftDelete,
  useTurnos,
  useUpsert,
} from "@/lib/data";
import { useAuth } from "@/lib/auth";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  baseComision,
  cobrado,
  esAlquiler,
  facturado,
  faltaCobrar,
  porcentajeDe,
  resumir,
  setPropietarios,
  turnoCuenta,
} from "@/lib/biz";
import { fmtFecha, money } from "@/lib/format";
import { METODOS_PAGO } from "@/lib/types";
import { descargarCSV, toCSV } from "@/lib/csv";
import { toast } from "sonner";
import { Download, Trash2 } from "lucide-react";

export const Route = createFileRoute("/liquidacion")({
  head: () => ({
    meta: [
      { title: "Liquidación · Soho Box" },
      { name: "description", content: "Facturado, caja real, reparto por prestadora y pagos." },
      { property: "og:title", content: "Liquidación · Soho Box" },
      { property: "og:description", content: "Reportes financieros y reparto de Soho Box." },
    ],
  }),
  component: () => (
    <AppShell title="Liquidación">
      <Liquidacion />
    </AppShell>
  ),
});

function KPI({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="num mt-1 text-2xl">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Liquidacion() {
  const { sesion } = useAuth();
  const { data: turnos = [] } = useTurnos();
  const { data: clientes = [] } = useClientes();
  const { data: reparto = [] } = useReparto();
  const { data: pagos = [] } = usePagosLiquidacion();
  const upPago = useUpsert("pagos_liquidacion", ["pagos_liquidacion"]);
  const delPago = useSoftDelete("pagos_liquidacion", ["pagos_liquidacion"]);

  const [p, setP] = useState<Periodo>(presetPeriodo("mes"));
  const [nuevo, setNuevo] = useState({ prestador: "", monto: 0, metodo: "Efectivo", notas: "" });

  const propietarios = useMemo(() => setPropietarios(clientes), [clientes]);
  const delPeriodo = useMemo(
    () => turnos.filter((t) => turnoCuenta(t) && t.fecha >= p.desde && t.fecha <= p.hasta),
    [turnos, p],
  );
  const resumen = useMemo(
    () => resumir(delPeriodo, reparto, propietarios),
    [delPeriodo, reparto, propietarios],
  );

  const prestadoras = useMemo(
    () => Array.from(new Set([...reparto.map((r) => r.prestador), ...delPeriodo.map((t) => t.prestador ?? "")].filter(Boolean))).sort(),
    [reparto, delPeriodo],
  );

  const porPrestadora = useMemo(
    () =>
      prestadoras.map((nombre) => {
        const suyos = delPeriodo.filter((t) => t.prestador === nombre);
        const comision = suyos.reduce(
          (a, t) => a + (baseComision(t) * porcentajeDe(reparto, nombre, t.modalidad)) / 100,
          0,
        );
        const pagado = pagos
          .filter((x) => x.prestador === nombre && x.fecha >= p.desde && x.fecha <= p.hasta)
          .reduce((a, x) => a + Number(x.monto), 0);
        return {
          nombre,
          turnos: suyos.length,
          facturado: suyos.reduce((a, t) => a + facturado(t), 0),
          cobrado: suyos.reduce((a, t) => a + cobrado(t), 0),
          comision,
          pagado,
          saldo: comision - pagado,
        };
      }),
    [prestadoras, delPeriodo, reparto, pagos, p],
  );

  const pendientes = delPeriodo.filter((t) => faltaCobrar(t) > 0);
  const alquiler = delPeriodo.filter((t) => esAlquiler(t, propietarios));
  const canjes = delPeriodo.filter((t) => t.es_canje && !esAlquiler(t, propietarios));

  return (
    <div className="space-y-5">
      <PeriodoFiltro value={p} onChange={setP} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KPI label="Facturado" value={money(resumen.facturado)} hint={`${resumen.turnos} turnos`} />
        <KPI label="Cobrado (caja)" value={money(resumen.cobrado)} hint={`Falta cobrar ${money(resumen.faltaCobrar)}`} />
        <KPI label="Comisiones" value={money(resumen.comisiones)} hint="Sobre precio de lista" />
        <KPI
          label="Le queda al box"
          value={money(resumen.quedaBox)}
          hint={`Caja real ${money(resumen.cajaReal)}`}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <KPI label="Canjes (influencers)" value={money(resumen.canje)} hint={`${canjes.length} turnos`} />
        <KPI label="Alquiler (propietarias)" value={money(resumen.alquiler)} hint={`${alquiler.length} turnos`} />
      </div>

      <Tabs defaultValue="reparto">
        <TabsList>
          <TabsTrigger value="reparto">Reparto</TabsTrigger>
          <TabsTrigger value="pagos">Pagos</TabsTrigger>
          <TabsTrigger value="pendientes">Por cobrar</TabsTrigger>
        </TabsList>

        <TabsContent value="reparto" className="space-y-3">
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Prestadora</th>
                  <th className="px-3 py-2">Turnos</th>
                  <th className="px-3 py-2">Facturado</th>
                  <th className="px-3 py-2">Cobrado</th>
                  <th className="px-3 py-2">Comisión</th>
                  <th className="px-3 py-2">Pagado</th>
                  <th className="px-3 py-2">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {porPrestadora.map((r) => (
                  <tr key={r.nombre} className="border-t">
                    <td className="px-3 py-2 font-medium">{r.nombre}</td>
                    <td className="px-3 py-2">{r.turnos}</td>
                    <td className="num px-3 py-2">{money(r.facturado)}</td>
                    <td className="num px-3 py-2">{money(r.cobrado)}</td>
                    <td className="num px-3 py-2">{money(r.comision)}</td>
                    <td className="num px-3 py-2">{money(r.pagado)}</td>
                    <td className={`num px-3 py-2 ${r.saldo > 0 ? "text-destructive" : "text-success"}`}>
                      {money(r.saldo)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button
            variant="outline"
            className="tap"
            onClick={() =>
              descargarCSV(
                `liquidacion-${p.desde}-${p.hasta}.csv`,
                toCSV(
                  porPrestadora.map((r) => ({
                    prestadora: r.nombre,
                    turnos: r.turnos,
                    facturado: r.facturado,
                    cobrado: r.cobrado,
                    comision: Math.round(r.comision),
                    pagado: r.pagado,
                    saldo: Math.round(r.saldo),
                  })),
                  ["prestadora", "turnos", "facturado", "cobrado", "comision", "pagado", "saldo"],
                ),
              )
            }
          >
            <Download className="size-4" /> Exportar reparto
          </Button>
        </TabsContent>

        <TabsContent value="pagos" className="space-y-3">
          <div className="rounded-xl border bg-card p-4">
            <h2 className="mb-3 text-base">Registrar pago a prestadora</h2>
            <div className="grid gap-3 sm:grid-cols-4">
              <div>
                <Label className="mb-1.5 block text-xs">Prestadora</Label>
                <Select
                  value={nuevo.prestador}
                  onValueChange={(v) => setNuevo({ ...nuevo, prestador: v })}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Elegir" />
                  </SelectTrigger>
                  <SelectContent>
                    {prestadoras.map((n) => (
                      <SelectItem key={n} value={n}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block text-xs">Monto</Label>
                <Input
                  className="h-11"
                  inputMode="numeric"
                  value={nuevo.monto}
                  onChange={(e) => setNuevo({ ...nuevo, monto: Number(e.target.value || 0) })}
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs">Método</Label>
                <Select value={nuevo.metodo} onValueChange={(v) => setNuevo({ ...nuevo, metodo: v })}>
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
              <div>
                <Label className="mb-1.5 block text-xs">Notas</Label>
                <Input
                  className="h-11"
                  value={nuevo.notas}
                  onChange={(e) => setNuevo({ ...nuevo, notas: e.target.value })}
                />
              </div>
            </div>
            <Button
              className="tap mt-3"
              onClick={async () => {
                if (!nuevo.prestador || !nuevo.monto) {
                  toast.error("Falta prestadora o monto.");
                  return;
                }
                const id = await upPago.mutateAsync({
                  values: {
                    prestador: nuevo.prestador,
                    monto: nuevo.monto,
                    metodo_pago: nuevo.metodo,
                    notas: nuevo.notas || null,
                    desde: p.desde,
                    hasta: p.hasta,
                    creado_por: sesion?.nombre ?? null,
                  },
                });
                await auditar(
                  "pagos_liquidacion",
                  id,
                  "crear",
                  `Pago de ${money(nuevo.monto)} a ${nuevo.prestador}`,
                  sesion?.nombre ?? "",
                );
                setNuevo({ prestador: "", monto: 0, metodo: "Efectivo", notas: "" });
                toast.success("Pago registrado");
              }}
            >
              Registrar
            </Button>
          </div>

          <div className="space-y-2">
            {pagos
              .filter((x) => x.fecha >= p.desde && x.fecha <= p.hasta)
              .map((x) => (
                <div key={x.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{x.prestador}</p>
                    <p className="text-xs text-muted-foreground">
                      {fmtFecha(x.fecha)} · {x.metodo_pago} {x.notas ? `· ${x.notas}` : ""}
                    </p>
                  </div>
                  <span className="num">{money(x.monto)}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="tap text-destructive"
                    onClick={() => delPago.mutate(x.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="pendientes" className="space-y-2">
          {pendientes.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-xl border bg-card p-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{t.cliente}</p>
                <p className="text-xs text-muted-foreground">
                  {fmtFecha(t.fecha)} · {t.servicio_nombre} · {t.prestador}
                </p>
              </div>
              <span className="num text-destructive">{money(faltaCobrar(t))}</span>
            </div>
          ))}
          {pendientes.length === 0 && (
            <p className="text-sm text-muted-foreground">Todo cobrado en el período. 🎉</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
