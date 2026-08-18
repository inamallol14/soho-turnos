import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { ClienteInput } from "./ClienteInput";
import {
  auditar,
  notificar,
  useClientes,
  usePaquetes,
  usePaquetesDetalle,
  usePersonas,
  useServicios,
  useSoftDelete,
  useTurnos,
  useUpsert,
} from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { ESTADOS, METODOS_PAGO, type Turno } from "@/lib/types";
import { fmtFecha, money, toISO } from "@/lib/format";
import { sesionesPaquete } from "@/lib/biz";

export type TurnoDraft = Partial<Turno> & { fecha: string; hora: number };

export function TurnoPanel({
  draft,
  onClose,
}: {
  draft: TurnoDraft | null;
  onClose: () => void;
}) {
  const { sesion } = useAuth();
  const { data: servicios = [] } = useServicios();
  const { data: clientes = [] } = useClientes();
  const { data: personas = [] } = usePersonas();
  const { data: paquetes = [] } = usePaquetes();
  const { data: detalle = [] } = usePaquetesDetalle();
  const { data: turnos = [] } = useTurnos();
  const upsert = useUpsert("turnos", ["turnos"]);
  const borrar = useSoftDelete("turnos", ["turnos"]);

  const editando = !!draft?.id;
  const [f, setF] = useState<TurnoDraft | null>(draft);
  const [modoPago, setModoPago] = useState<"" | "canje" | "paga">("");

  useEffect(() => {
    setF(draft);
    if (draft?.id) setModoPago(draft.es_canje ? "canje" : draft.pagado || draft.sena ? "paga" : "");
    else setModoPago("");
  }, [draft]);

  const modalidades = useMemo(
    () => Array.from(new Set(servicios.map((s) => s.modalidad))),
    [servicios],
  );
  const serviciosFiltrados = servicios.filter((s) => s.modalidad === f?.modalidad);
  const servicio = servicios.find((s) => s.id === f?.servicio_id);

  const paquetesCliente = paquetes.filter(
    (p) => (f?.cliente_id && p.cliente_id === f.cliente_id) || p.cliente === f?.cliente,
  );
  const paquetesConSaldo = paquetesCliente.map((p) => {
    const total = sesionesPaquete(detalle.filter((d) => d.paquete_id === p.id));
    const usadas = turnos.filter((t) => t.paquete_id === p.id && t.activo).length;
    return { p, restantes: total - usadas, total };
  });
  const ofrecePaquete = paquetesConSaldo.find((x) => x.restantes > 0);

  if (!f) return null;

  const precioLista = Number(f.precio_lista ?? servicio?.precio ?? 0);
  const descuento =
    f.descuento_tipo === "porcentaje"
      ? (precioLista * Number(f.descuento_valor ?? 0)) / 100
      : f.descuento_tipo === "monto"
        ? Number(f.descuento_valor ?? 0)
        : 0;
  const montoCalculado = Math.max(0, precioLista - descuento);

  function set(patch: Partial<TurnoDraft>) {
    setF((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  function elegirServicio(id: string) {
    const s = servicios.find((x) => x.id === id);
    if (!s) return;
    set({
      servicio_id: s.id,
      servicio_nombre: s.nombre,
      duracion_min: s.duracion_min,
      precio_lista: s.precio,
      monto_total: s.precio,
    });
  }

  async function guardar() {
    if (!f?.cliente?.trim()) {
      toast.error("Falta el nombre de la clienta.");
      return;
    }
    if (!f.servicio_id) {
      toast.error("Elegí un servicio.");
      return;
    }
    const esCanje = modoPago === "canje" || !!f.es_canje;
    const monto =
      modoPago === "paga" ? Number(f.monto_total || montoCalculado || precioLista) : precioLista;
    const values = {
      fecha: f.fecha,
      hora: f.hora,
      cliente: f.cliente.trim(),
      cliente_id: f.cliente_id ?? null,
      telefono: f.telefono ?? null,
      modalidad: f.modalidad ?? servicio?.modalidad ?? null,
      servicio_id: f.servicio_id,
      servicio_nombre: f.servicio_nombre ?? servicio?.nombre ?? null,
      duracion_min: f.duracion_min ?? servicio?.duracion_min ?? 60,
      prestador: f.prestador ?? null,
      estado: f.estado ?? "Confirmado",
      paquete_id: f.paquete_id ?? null,
      es_canje: esCanje,
      pagado: f.paquete_id ? true : (f.pagado ?? false),
      monto_total: monto > 0 ? monto : precioLista,
      sena: f.sena ?? false,
      monto_sena: Number(f.monto_sena ?? 0),
      metodo_pago_sena: f.metodo_pago_sena ?? null,
      metodo_pago_resto: f.metodo_pago_resto ?? null,
      precio_lista: precioLista || Number(servicio?.precio ?? 0),
      descuento_tipo: f.descuento_tipo ?? null,
      descuento_valor: Number(f.descuento_valor ?? 0),
      notas: f.notas ?? null,
      creado_por: f.creado_por ?? sesion?.nombre ?? null,
    };
    const id = await upsert.mutateAsync({ id: f.id ?? null, values });
    await auditar(
      "turno",
      id,
      editando ? "editado" : "creado",
      `${values.cliente} · ${values.servicio_nombre} · ${fmtFecha(values.fecha)} ${values.hora}:00 · ${money(values.monto_total)} · ${values.pagado ? "pagado" : values.sena ? "seña" : esCanje ? "canje" : "pendiente"}`,
      sesion?.nombre ?? "-",
    );
    if (!editando) {
      await notificar(
        "Nuevo turno",
        `${values.cliente} · ${fmtFecha(values.fecha)} ${values.hora}:00 · ${values.servicio_nombre}`,
        "turno",
      );
    }
    toast.success(editando ? "Turno actualizado" : "Turno creado");
    onClose();
  }

  async function eliminar() {
    if (!f?.id) return;
    await borrar.mutateAsync(f.id);
    await auditar("turno", f.id, "eliminado", `${f.cliente}`, sesion?.nombre ?? "-");
    toast.success("Turno eliminado");
    onClose();
  }

  const cubiertoPorPaquete = !!f.paquete_id;

  return (
    <Sheet open={!!draft} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="font-display text-xl">
            {editando ? "Editar turno" : "Nuevo turno"}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-24">
          <div>
            <Label className="mb-1.5 block">Clienta</Label>
            <ClienteInput
              clientes={clientes}
              nombre={f.cliente ?? ""}
              onPick={(v) =>
                set({
                  cliente: v.nombre,
                  cliente_id: v.clienteId,
                  telefono: v.telefono ?? f.telefono ?? null,
                })
              }
            />
          </div>

          <div>
            <Label className="mb-1.5 block">Teléfono</Label>
            <Input
              className="h-11"
              value={f.telefono ?? ""}
              onChange={(e) => set({ telefono: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block">Fecha</Label>
              <Input
                type="date"
                className="h-11"
                value={f.fecha}
                onChange={(e) => set({ fecha: e.target.value })}
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Hora</Label>
              <Select value={String(f.hora)} onValueChange={(v) => set({ hora: Number(v) })}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 16 }, (_, i) => i + 7).map((h) => (
                    <SelectItem key={h} value={String(h)}>
                      {String(h).padStart(2, "0")}:00
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block">Modalidad</Label>
              <Select
                value={f.modalidad ?? ""}
                onValueChange={(v) => set({ modalidad: v, servicio_id: null, servicio_nombre: null })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Elegir" />
                </SelectTrigger>
                <SelectContent>
                  {modalidades.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block">Servicio</Label>
              <Select value={f.servicio_id ?? ""} onValueChange={elegirServicio}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Elegir" />
                </SelectTrigger>
                <SelectContent>
                  {serviciosFiltrados.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nombre} · {money(s.precio)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block">Prestador/a</Label>
            <Select value={f.prestador ?? ""} onValueChange={(v) => set({ prestador: v })}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Elegir" />
              </SelectTrigger>
              <SelectContent>
                {personas.map((p) => (
                  <SelectItem key={p.id} value={p.nombre}>
                    {p.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {editando && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block">Estado</Label>
                <Select value={f.estado ?? "Confirmado"} onValueChange={(v) => set({ estado: v })}>
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS.map((e) => (
                      <SelectItem key={e} value={e}>
                        {e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block">Paquete</Label>
                <Select
                  value={f.paquete_id ?? "ninguno"}
                  onValueChange={(v) => set({ paquete_id: v === "ninguno" ? null : v })}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ninguno">Sin paquete</SelectItem>
                    {paquetesConSaldo.map((x) => (
                      <SelectItem key={x.p.id} value={x.p.id}>
                        {fmtFecha(x.p.fecha_compra)} · {x.restantes}/{x.total} libres
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {!editando && ofrecePaquete && (
            <div className="rounded-lg border border-primary/30 bg-primary-soft/60 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm">
                  <p className="font-medium">Tiene un paquete con sesiones libres</p>
                  <p className="text-muted-foreground">
                    Quedan {ofrecePaquete.restantes} de {ofrecePaquete.total}
                  </p>
                </div>
                <Switch
                  checked={cubiertoPorPaquete}
                  onCheckedChange={(v) => set({ paquete_id: v ? ofrecePaquete.p.id : null })}
                />
              </div>
            </div>
          )}

          {!cubiertoPorPaquete && (
            <div className="space-y-3 rounded-lg border bg-card p-3">
              <Label className="block">Pago</Label>
              <div className="flex gap-2">
                {(["canje", "paga"] as const).map((op) => (
                  <button
                    key={op}
                    type="button"
                    onClick={() => {
                      const next = modoPago === op ? "" : op;
                      setModoPago(next);
                      set({
                        es_canje: next === "canje",
                        ...(next !== "paga" ? { pagado: false, sena: false } : {}),
                      });
                    }}
                    className={`tap flex-1 rounded-full border px-4 text-sm font-medium transition-colors ${
                      modoPago === op
                        ? op === "canje"
                          ? "border-plum bg-plum-soft text-plum"
                          : "border-primary bg-primary-soft text-primary"
                        : "bg-background text-muted-foreground"
                    }`}
                  >
                    {op === "canje" ? "Canje" : "Paga"}
                  </button>
                ))}
              </div>
              {modoPago === "" && (
                <p className="text-xs text-muted-foreground">
                  Sin elegir: se guarda pendiente por {money(precioLista)}.
                </p>
              )}
              {modoPago === "canje" && (
                <p className="text-xs text-muted-foreground">
                  Sin cobro. Se factura {money(precioLista)} para el reparto.
                </p>
              )}

              {modoPago === "paga" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1">
                      <Label className="mb-1.5 block text-xs">Descuento</Label>
                      <Select
                        value={f.descuento_tipo ?? "no"}
                        onValueChange={(v) => set({ descuento_tipo: v === "no" ? null : v })}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no">Sin</SelectItem>
                          <SelectItem value="porcentaje">%</SelectItem>
                          <SelectItem value="monto">$</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="mb-1.5 block text-xs">Valor</Label>
                      <Input
                        className="h-11"
                        inputMode="numeric"
                        value={f.descuento_valor ?? 0}
                        onChange={(e) => set({ descuento_valor: Number(e.target.value || 0) })}
                      />
                    </div>
                    <div>
                      <Label className="mb-1.5 block text-xs">Total</Label>
                      <Input
                        className="h-11"
                        inputMode="numeric"
                        value={f.monto_total ?? montoCalculado}
                        onChange={(e) => set({ monto_total: Number(e.target.value || 0) })}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Lista {money(precioLista)} · sugerido {money(montoCalculado)}
                  </p>

                  <div className="flex items-center justify-between">
                    <Label>Pagado por completo</Label>
                    <Switch
                      checked={!!f.pagado}
                      onCheckedChange={(v) => set({ pagado: v, sena: v ? false : !!f.sena })}
                    />
                  </div>
                  {f.pagado && (
                    <Select
                      value={f.metodo_pago_resto ?? ""}
                      onValueChange={(v) => set({ metodo_pago_resto: v })}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Método de pago" />
                      </SelectTrigger>
                      <SelectContent>
                        {METODOS_PAGO.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {!f.pagado && (
                    <>
                      <div className="flex items-center justify-between">
                        <Label>Seña</Label>
                        <Switch checked={!!f.sena} onCheckedChange={(v) => set({ sena: v })} />
                      </div>
                      {f.sena && (
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            className="h-11"
                            inputMode="numeric"
                            placeholder="Monto seña"
                            value={f.monto_sena ?? 0}
                            onChange={(e) => set({ monto_sena: Number(e.target.value || 0) })}
                          />
                          <Select
                            value={f.metodo_pago_sena ?? ""}
                            onValueChange={(v) => set({ metodo_pago_sena: v })}
                          >
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Método" />
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
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          <div>
            <Label className="mb-1.5 block">Notas</Label>
            <Textarea
              value={f.notas ?? ""}
              onChange={(e) => set({ notas: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button className="tap flex-1" onClick={guardar} disabled={upsert.isPending}>
              {editando ? "Guardar cambios" : "Crear turno"}
            </Button>
            {editando && (
              <Button variant="outline" className="tap text-destructive" onClick={eliminar}>
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function nuevoDraft(fecha?: string, hora?: number): TurnoDraft {
  return {
    fecha: fecha ?? toISO(new Date()),
    hora: hora ?? 15,
    cliente: "",
    estado: "Confirmado",
  };
}
