import type { Cliente, Paquete, PaqueteDetalle, Reparto, Turno } from "./types";
import { addDays, fromISO, toISO } from "./format";

/** Un turno "cuenta" para reportes si está activo y no cancelado. */
export function turnoCuenta(t: Turno): boolean {
  return t.activo && t.estado !== "Cancelado";
}

/** El monto facturado nunca puede quedar en 0 si hay precio de lista. */
export function facturado(t: Turno): number {
  const m = Number(t.monto_total ?? 0);
  if (m > 0) return m;
  return Number(t.precio_lista ?? 0);
}

/** La comisión SIEMPRE se calcula sobre el precio de lista del servicio. */
export function baseComision(t: Turno): number {
  const p = Number(t.precio_lista ?? 0);
  return p > 0 ? p : Number(t.monto_total ?? 0);
}

export function esPaquete(t: Turno): boolean {
  return !!t.paquete_id;
}

export function esAlquiler(t: Turno, propietarios: Set<string>): boolean {
  if (!t.es_canje) return false;
  return (
    (t.cliente_id != null && propietarios.has(t.cliente_id)) ||
    propietarios.has(t.cliente.trim().toLowerCase())
  );
}

/** Cobrado del turno: paquete = ya cobrado; canje = no suma. */
export function cobrado(t: Turno): number {
  if (t.es_canje) return 0;
  if (esPaquete(t)) return facturado(t);
  if (t.pagado) return facturado(t);
  if (t.sena) return Number(t.monto_sena ?? 0);
  return 0;
}

export function faltaCobrar(t: Turno): number {
  if (t.es_canje || esPaquete(t)) return 0;
  return Math.max(0, facturado(t) - cobrado(t));
}

export type Resumen = {
  turnos: number;
  facturado: number;
  cobrado: number;
  faltaCobrar: number;
  canje: number;
  alquiler: number;
  comisiones: number;
  quedaBox: number;
  cajaReal: number;
};

export function porcentajeDe(
  reparto: Reparto[],
  prestador: string | null,
  modalidad: string | null,
): number {
  const r = reparto.find(
    (x) => x.activo && x.prestador === prestador && x.modalidad === modalidad,
  );
  return r ? Number(r.porcentaje) : 0;
}

export function resumir(
  turnos: Turno[],
  reparto: Reparto[],
  propietarios: Set<string>,
): Resumen {
  const list = turnos.filter(turnoCuenta);
  let fact = 0,
    cob = 0,
    falta = 0,
    canje = 0,
    alq = 0,
    com = 0;
  for (const t of list) {
    fact += facturado(t);
    cob += cobrado(t);
    falta += faltaCobrar(t);
    if (t.es_canje) {
      if (esAlquiler(t, propietarios)) alq += facturado(t);
      else canje += facturado(t);
    }
    com += (baseComision(t) * porcentajeDe(reparto, t.prestador, t.modalidad)) / 100;
  }
  return {
    turnos: list.length,
    facturado: fact,
    cobrado: cob,
    faltaCobrar: falta,
    canje,
    alquiler: alq,
    comisiones: com,
    quedaBox: fact - com,
    cajaReal: cob - com,
  };
}

/** Deuda de un cliente: excluye paquetes y canjes. */
export function deudaCliente(turnos: Turno[]): number {
  return turnos.filter(turnoCuenta).reduce((a, t) => a + faltaCobrar(t), 0);
}

export function sesionesPaquete(detalle: PaqueteDetalle[]): number {
  return detalle.reduce((a, d) => a + Number(d.cantidad ?? 0), 0);
}

/** Vencimiento: redondeo(sesiones/4) * 30 + 15 días desde la compra. */
export function vencimientoPaquete(p: Paquete, sesiones: number): Date {
  const meses = Math.max(1, Math.round(sesiones / 4));
  return addDays(fromISO(p.fecha_compra), meses * 30 + 15);
}

export function diasParaVencer(p: Paquete, sesiones: number): number {
  const v = vencimientoPaquete(p, sesiones);
  const hoy = fromISO(toISO(new Date()));
  return Math.round((v.getTime() - hoy.getTime()) / 86400000);
}

export function setPropietarios(clientes: Cliente[]): Set<string> {
  const s = new Set<string>();
  for (const c of clientes) {
    if (c.es_propietario) {
      s.add(c.id);
      s.add(c.nombre.trim().toLowerCase());
    }
  }
  return s;
}

/* ---------- colores estables por modalidad / persona ---------- */

const MODALIDAD_HUES = [152, 342, 250, 40, 200, 300];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function colorModalidad(m: string | null | undefined) {
  const key = m ?? "sin";
  const hue = MODALIDAD_HUES[hashStr(key) % MODALIDAD_HUES.length];
  return {
    bg: `oklch(0.94 0.045 ${hue})`,
    fg: `oklch(0.36 0.06 ${hue})`,
    solid: `oklch(0.55 0.1 ${hue})`,
  };
}

export function colorPersona(p: string | null | undefined) {
  const key = p ?? "sin";
  const hue = (hashStr(key + "x") % 360);
  return `oklch(0.55 0.13 ${hue})`;
}
