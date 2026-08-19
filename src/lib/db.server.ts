import { requireAdmin, verificarToken, type Sesion } from "./session.server";

type Acceso = "staff" | "admin";
type Regla = { read: Acceso; write: Acceso; insert?: Acceso; columnas?: string };

// Todas las tablas quedan cerradas al público: sólo se accede desde el servidor
// con una sesión firmada, y las tablas sensibles requieren rol admin.
const TABLAS: Record<string, Regla> = {
  personas: { read: "staff", write: "admin", columnas: "id, nombre, rol, activo, created_at" },
  servicios: { read: "staff", write: "admin" },
  clientes: { read: "staff", write: "staff" },
  horarios: { read: "staff", write: "admin" },
  turnos: { read: "staff", write: "staff" },
  paquetes: { read: "staff", write: "staff" },
  paquetes_detalle: { read: "staff", write: "staff" },
  reparto: { read: "staff", write: "admin" },
  pagos_liquidacion: { read: "admin", write: "admin" },
  auditoria: { read: "admin", write: "admin", insert: "staff" },
  notificaciones: { read: "staff", write: "staff" },
};

function regla(table: string): Regla {
  const r = TABLAS[table];
  if (!r) throw new Error("No autorizado");
  return r;
}

function checkear(token: unknown, nivel: Acceso): Sesion {
  return nivel === "admin" ? requireAdmin(token) : verificarToken(token);
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return supabaseAdmin as any;
}

export type ListaInput = {
  token?: string;
  table: string;
  activo?: boolean;
  order?: string;
  ascending?: boolean;
  limit?: number;
  eq?: Record<string, string | number | boolean>;
};

export async function listar(input: ListaInput) {
  const r = regla(input.table);
  checkear(input.token, r.read);
  const db = await admin();
  let q = db.from(input.table).select(r.columnas ?? "*");
  if (input.activo) q = q.eq("activo", true);
  for (const [k, v] of Object.entries(input.eq ?? {})) q = q.eq(k, v);
  if (input.order) q = q.order(input.order, { ascending: input.ascending ?? true });
  if (input.limit) q = q.limit(input.limit);
  const { data, error } = await q;
  if (error) throw new Error("No pudimos leer los datos.");
  return (data ?? []) as unknown[];
}

export type EscrituraInput = {
  token?: string;
  table: string;
  id?: string | null;
  values: Record<string, unknown>;
};

function limpiar(table: string, values: Record<string, unknown>) {
  const v = { ...values };
  // El PIN nunca se escribe por esta vía: se gestiona en auth.functions.ts.
  if (table === "personas") delete v["pin"];
  return v;
}

export async function guardar(input: EscrituraInput) {
  const r = regla(input.table);
  checkear(input.token, r.write);
  const db = await admin();
  const values = limpiar(input.table, input.values ?? {});
  if (input.id) {
    const { error } = await db.from(input.table).update(values).eq("id", input.id);
    if (error) throw new Error("No pudimos guardar los cambios.");
    return { id: input.id };
  }
  const { data, error } = await db.from(input.table).insert(values).select("id").single();
  if (error) throw new Error("No pudimos guardar los cambios.");
  return { id: (data as { id: string }).id };
}

export async function insertarVarios(input: {
  token?: string;
  table: string;
  rows: Record<string, unknown>[];
}) {
  const r = regla(input.table);
  checkear(input.token, r.insert ?? r.write);
  if (!Array.isArray(input.rows) || input.rows.length === 0) return { ok: true as const };
  const db = await admin();
  const rows = input.rows.map((row) => limpiar(input.table, row));
  const { error } = await db.from(input.table).insert(rows);
  if (error) throw new Error("No pudimos guardar los datos.");
  return { ok: true as const };
}

export async function bajaLogica(input: { token?: string; table: string; id: string }) {
  const r = regla(input.table);
  checkear(input.token, r.write);
  const db = await admin();
  const { error } = await db.from(input.table).update({ activo: false }).eq("id", input.id);
  if (error) throw new Error("No pudimos eliminar el registro.");
  return { ok: true as const };
}
