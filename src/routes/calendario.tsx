import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell, useTurnoUI } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { useClientes, useHorarios, useReparto, useTurnos, useUpsert, auditar } from "@/lib/data";
import {
  DIA_CORTO,
  DIA_INDEX,
  addDays,
  diaNombre,
  fmtFecha,
  fmtHora,
  money,
  startOfWeek,
  toISO,
} from "@/lib/format";
import {
  colorModalidad,
  colorPersona,
  esPaquete,
  faltaCobrar,
  resumir,
  setPropietarios,
} from "@/lib/biz";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown, CalendarRange, Rows3 } from "lucide-react";
import { METODOS_PAGO, type Turno, DIAS } from "@/lib/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";

export const Route = createFileRoute("/calendario")({
  head: () => ({
    meta: [
      { title: "Calendario · Soho Box" },
      { name: "description", content: "Agenda semanal y diaria de turnos de Soho Box." },
      { property: "og:title", content: "Calendario · Soho Box" },
      { property: "og:description", content: "Agenda semanal y diaria de turnos de Soho Box." },
    ],
  }),
  component: () => (
    <AppShell title="Calendario">
      <Calendario />
    </AppShell>
  ),
});

function Kpi({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div
      className="flex h-14 min-w-28 flex-col justify-center rounded-xl border px-3"
      style={{ backgroundColor: tone, borderColor: "transparent" }}
    >
      <span className="text-[11px] leading-tight opacity-70">{label}</span>
      <span className="num text-lg leading-tight">{value}</span>
    </div>
  );
}

function PagoDot({ t }: { t: Turno }) {
  const color = esPaquete(t) || t.pagado ? "bg-success" : t.sena || t.es_canje ? "bg-warning" : "bg-destructive";
  return <span className={`size-2 shrink-0 rounded-full ${color}`} />;
}

function MarcarPagado({ t }: { t: Turno }) {
  const upsert = useUpsert("turnos", ["turnos"]);
  const { sesion } = useAuth();
  const [metodo, setMetodo] = useState("Efectivo");
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="tap">
          Marcar pagado
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 space-y-3">
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
        <Button
          className="tap w-full"
          onClick={async () => {
            await upsert.mutateAsync({
              id: t.id,
              values: { pagado: true, metodo_pago_resto: metodo },
            });
            await auditar("turno", t.id, "pago", `Pagado ${money(t.monto_total)} · ${metodo}`, sesion?.nombre ?? "-");
            toast.success("Turno cobrado");
            setOpen(false);
          }}
        >
          Confirmar
        </Button>
      </PopoverContent>
    </Popover>
  );
}

function ConfigHorarios() {
  const { data: horarios = [] } = useHorarios();
  const upsert = useUpsert("horarios", ["horarios"]);
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {DIAS.map((d) => {
        const h = horarios.find((x) => x.dia === d);
        if (!h) return null;
        return (
          <div key={d} className="flex items-center gap-2 rounded-lg border bg-card p-2">
            <Switch
              checked={h.activo}
              onCheckedChange={(v) => upsert.mutate({ id: h.id, values: { activo: v } })}
            />
            <span className="w-20 text-sm">{d}</span>
            <Select
              value={String(h.hora_desde)}
              onValueChange={(v) => upsert.mutate({ id: h.id, values: { hora_desde: Number(v) } })}
            >
              <SelectTrigger className="h-10 w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 17 }, (_, i) => i + 6).map((x) => (
                  <SelectItem key={x} value={String(x)}>
                    {fmtHora(x)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={String(h.hora_hasta)}
              onValueChange={(v) => upsert.mutate({ id: h.id, values: { hora_hasta: Number(v) } })}
            >
              <SelectTrigger className="h-10 w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 18 }, (_, i) => i + 7).map((x) => (
                  <SelectItem key={x} value={String(x)}>
                    {fmtHora(x)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      })}
    </div>
  );
}

function Calendario() {
  const isMobile = useIsMobile();
  const { esAdmin } = useAuth();
  const { abrir } = useTurnoUI();
  const { data: turnos = [] } = useTurnos();
  const { data: horarios = [] } = useHorarios();
  const { data: clientes = [] } = useClientes();
  const { data: reparto = [] } = useReparto();
  const [vista, setVista] = useState<"semana" | "dia" | null>(null);
  const [ancla, setAncla] = useState(new Date());

  const modo = vista ?? (isMobile ? "dia" : "semana");
  const activos = horarios.filter((h) => h.activo);
  const horaMin = Math.min(...(activos.length ? activos.map((h) => h.hora_desde) : [9]));
  const horaMax = Math.max(...(activos.length ? activos.map((h) => h.hora_hasta) : [20]));
  const horas = Array.from({ length: Math.max(1, horaMax - horaMin) }, (_, i) => horaMin + i);

  const inicioSemana = startOfWeek(ancla);
  const dias = activos
    .map((h) => addDays(inicioSemana, DIA_INDEX[h.dia] ?? 0))
    .sort((a, b) => a.getTime() - b.getTime());

  const rango =
    modo === "semana"
      ? { desde: toISO(inicioSemana), hasta: toISO(addDays(inicioSemana, 6)) }
      : { desde: toISO(ancla), hasta: toISO(ancla) };

  const delPeriodo = useMemo(
    () => turnos.filter((t) => t.fecha >= rango.desde && t.fecha <= rango.hasta),
    [turnos, rango.desde, rango.hasta],
  );

  const propietarios = setPropietarios(clientes);
  const res = resumir(delPeriodo, reparto, propietarios);
  const modalidades = Array.from(new Set(delPeriodo.map((t) => t.modalidad ?? "Sin modalidad")));
  const cargadores = Array.from(new Set(delPeriodo.map((t) => t.creado_por).filter(Boolean)));
  const hoyISO = toISO(new Date());

  const esHoySemana = toISO(startOfWeek(new Date())) === toISO(inicioSemana);

  return (
    <div className="space-y-4">
      <Collapsible>
        <div className="flex flex-wrap items-center gap-2">
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="tap">
              Configurar horarios de atención <ChevronDown className="ml-1 size-4" />
            </Button>
          </CollapsibleTrigger>
          <Kpi label="Turnos" value={String(res.turnos)} tone="var(--muted)" />
          {modalidades.map((m) => {
            const c = colorModalidad(m);
            return (
              <Kpi
                key={m}
                label={m}
                value={String(delPeriodo.filter((t) => (t.modalidad ?? "Sin modalidad") === m).length)}
                tone={c.bg}
              />
            );
          })}
          {esAdmin && (
            <Kpi label="Falta cobrar" value={money(res.faltaCobrar)} tone="var(--warning-soft)" />
          )}
          <div className="ml-auto flex gap-2">
            <Button
              variant="outline"
              className="tap"
              onClick={() => setVista(modo === "semana" ? "dia" : "semana")}
            >
              {modo === "semana" ? <Rows3 className="size-4" /> : <CalendarRange className="size-4" />}
              <span className="hidden sm:inline">{modo === "semana" ? "Vista día" : "Vista semana"}</span>
            </Button>
          </div>
        </div>
        <CollapsibleContent className="pt-3">
          <ConfigHorarios />
        </CollapsibleContent>
      </Collapsible>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          className="tap"
          onClick={() => setAncla(addDays(ancla, modo === "semana" ? -7 : -1))}
        >
          Anterior
        </Button>
        <Button
          variant={
            modo === "semana" ? (esHoySemana ? "default" : "outline") : toISO(ancla) === hoyISO ? "default" : "outline"
          }
          className="tap"
          onClick={() => setAncla(new Date())}
        >
          {modo === "semana" ? "Esta semana" : "Hoy"}
        </Button>
        <Button
          variant="outline"
          className="tap"
          onClick={() => setAncla(addDays(ancla, modo === "semana" ? 7 : 1))}
        >
          Siguiente
        </Button>
        <span className="text-sm text-muted-foreground">
          {modo === "semana"
            ? `${fmtFecha(rango.desde)} al ${fmtFecha(rango.hasta)}`
            : `${diaNombre(ancla)} ${fmtFecha(toISO(ancla))}`}
        </span>
      </div>

      {cargadores.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>Cargado por:</span>
          {cargadores.map((c) => (
            <span key={c} className="flex items-center gap-1.5">
              <span
                className="inline-block h-3 w-1.5 rounded-full"
                style={{ backgroundColor: colorPersona(c) }}
              />
              {c}
            </span>
          ))}
        </div>
      )}

      {modo === "semana" ? (
        <div className="max-h-[70vh] overflow-auto rounded-xl border bg-card">
          <div
            className="grid min-w-[640px]"
            style={{ gridTemplateColumns: `64px repeat(${dias.length}, minmax(110px, 1fr))` }}
          >
            <div className="sticky left-0 top-0 z-30 border-b border-r bg-card" />
            {dias.map((d) => {
              const iso = toISO(d);
              const hoy = iso === hoyISO;
              return (
                <div key={iso} className="sticky top-0 z-20 border-b bg-card py-2 text-center">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {DIA_CORTO[(d.getDay() + 6) % 7]}
                  </p>
                  <p
                    className={`num mx-auto mt-1 grid size-8 place-items-center rounded-full text-base ${
                      hoy ? "bg-primary text-primary-foreground" : ""
                    }`}
                  >
                    {d.getDate()}
                  </p>
                </div>
              );
            })}

            {horas.map((h) => (
              <div key={h} className="contents">
                <div className="sticky left-0 z-10 border-b border-r bg-card px-2 py-3 text-right text-[11px] text-muted-foreground">
                  {fmtHora(h)}
                </div>
                {dias.map((d) => {
                  const iso = toISO(d);
                  const conf = activos.find((x) => x.dia === diaNombre(d));
                  const abierto = !!conf && h >= conf.hora_desde && h < conf.hora_hasta;
                  const items = turnos.filter((t) => t.fecha === iso && t.hora === h);
                  return (
                    <div
                      key={iso + h}
                      onClick={() => abierto && abrir({ fecha: iso, hora: h, cliente: "" })}
                      className={`min-h-16 border-b border-l p-1 ${
                        abierto ? "cursor-pointer hover:bg-accent/40" : "bg-closed"
                      }`}
                    >
                      {items.map((t) => {
                        const c = colorModalidad(t.modalidad);
                        return (
                          <button
                            key={t.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              abrir(t as never);
                            }}
                            className="mb-1 w-full rounded-md px-1.5 py-1 text-left text-[11px] leading-tight"
                            style={{
                              backgroundColor: c.bg,
                              color: c.fg,
                              borderLeft: `4px solid ${colorPersona(t.creado_por)}`,
                            }}
                          >
                            <span className="flex items-center justify-between gap-1">
                              <span className="truncate font-medium">{t.cliente}</span>
                              <PagoDot t={t} />
                            </span>
                            <span className="block truncate opacity-80">{t.servicio_nombre}</span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {delPeriodo
            .slice()
            .sort((a, b) => a.hora - b.hora)
            .map((t) => {
              const c = colorModalidad(t.modalidad);
              return (
                <div
                  key={t.id}
                  className="rounded-xl border bg-card p-3"
                  style={{ borderLeft: `5px solid ${colorPersona(t.creado_por)}` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button className="min-w-0 flex-1 text-left" onClick={() => abrir(t as never)}>
                      <p className="num text-lg">{fmtHora(t.hora)}</p>
                      <p className="truncate font-medium">{t.cliente}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        <span
                          className="mr-1 rounded px-1.5 py-0.5 text-[11px]"
                          style={{ backgroundColor: c.bg, color: c.fg }}
                        >
                          {t.modalidad}
                        </span>
                        {t.servicio_nombre} · {t.prestador ?? "sin prestadora"}
                      </p>
                    </button>
                    <div className="flex flex-col items-end gap-2">
                      <span className="flex items-center gap-1.5 text-xs">
                        <PagoDot t={t} />
                        {esPaquete(t)
                          ? "Paquete"
                          : t.es_canje
                            ? "Canje"
                            : t.pagado
                              ? "Pagado"
                              : t.sena
                                ? `Seña ${money(t.monto_sena)}`
                                : `Debe ${money(faltaCobrar(t))}`}
                      </span>
                      {!t.pagado && !t.es_canje && !esPaquete(t) && <MarcarPagado t={t} />}
                    </div>
                  </div>
                </div>
              );
            })}
          {delPeriodo.length === 0 && (
            <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
              No hay turnos este día.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
