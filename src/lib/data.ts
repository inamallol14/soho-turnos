import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dbBaja, dbGuardar, dbInsertarVarios, dbListar } from "./db.functions";
import { getToken } from "./token";
import type {
  Auditoria,
  Cliente,
  Horario,
  Notificacion,
  PagoLiquidacion,
  Paquete,
  PaqueteDetalle,
  Persona,
  Reparto,
  Servicio,
  Turno,
} from "./types";

type Row = Record<string, string | number | boolean | null>;

async function listar<T>(opts: {
  table: string;
  activo?: boolean;
  order?: string;
  ascending?: boolean;
  limit?: number;
  eq?: Record<string, string | number | boolean>;
}): Promise<T[]> {
  const rows = await dbListar({ data: { token: getToken(), ...opts } });
  return rows as T[];
}

export function usePersonas() {
  return useQuery({
    queryKey: ["personas"],
    queryFn: () => listar<Persona>({ table: "personas", activo: true, order: "nombre" }),
  });
}
export function useServicios() {
  return useQuery({
    queryKey: ["servicios"],
    queryFn: () => listar<Servicio>({ table: "servicios", activo: true, order: "nombre" }),
  });
}
export function useClientes() {
  return useQuery({
    queryKey: ["clientes"],
    queryFn: () => listar<Cliente>({ table: "clientes", activo: true, order: "nombre" }),
  });
}
export function useHorarios() {
  return useQuery({
    queryKey: ["horarios"],
    queryFn: () => listar<Horario>({ table: "horarios" }),
  });
}
export function useTurnos() {
  return useQuery({
    queryKey: ["turnos"],
    queryFn: () => listar<Turno>({ table: "turnos", activo: true, order: "fecha" }),
  });
}
export function usePaquetes() {
  return useQuery({
    queryKey: ["paquetes"],
    queryFn: () => listar<Paquete>({ table: "paquetes", activo: true, order: "fecha_compra" }),
  });
}
export function usePaquetesDetalle() {
  return useQuery({
    queryKey: ["paquetes_detalle"],
    queryFn: () => listar<PaqueteDetalle>({ table: "paquetes_detalle" }),
  });
}
export function useReparto() {
  return useQuery({
    queryKey: ["reparto"],
    queryFn: () => listar<Reparto>({ table: "reparto", activo: true, order: "prestador" }),
  });
}
export function usePagosLiquidacion() {
  return useQuery({
    queryKey: ["pagos_liquidacion"],
    queryFn: () =>
      listar<PagoLiquidacion>({ table: "pagos_liquidacion", activo: true, order: "fecha" }),
  });
}
export function useAuditoria(entidadId?: string) {
  return useQuery({
    queryKey: ["auditoria", entidadId ?? "all"],
    queryFn: () =>
      listar<Auditoria>({
        table: "auditoria",
        order: "created_at",
        ascending: false,
        limit: 200,
        ...(entidadId ? { eq: { entidad_id: entidadId } } : {}),
      }),
  });
}
export function useNotificaciones() {
  return useQuery({
    queryKey: ["notificaciones"],
    queryFn: () =>
      listar<Notificacion>({
        table: "notificaciones",
        order: "created_at",
        ascending: false,
        limit: 50,
      }),
  });
}

export async function auditar(
  entidad: string,
  entidadId: string | null,
  accion: string,
  detalle: string,
  usuario: string,
) {
  await dbInsertarVarios({
    data: {
      token: getToken(),
      table: "auditoria",
      rows: [{ entidad, entidad_id: entidadId, accion, detalle, usuario }],
    },
  });
}

export async function notificar(titulo: string, cuerpo: string, tipo: string) {
  await dbInsertarVarios({
    data: { token: getToken(), table: "notificaciones", rows: [{ titulo, cuerpo, tipo }] },
  });
}

export async function insertarFilas(table: string, rows: Row[]) {
  await dbInsertarVarios({ data: { token: getToken(), table, rows } });
}

export async function guardarFila(table: string, id: string | null, values: Row) {
  const res = await dbGuardar({ data: { token: getToken(), table, id, values } });
  return res.id;
}

export function useUpsert(table: string, keys: string[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, values }: { id?: string | null; values: Row }) =>
      guardarFila(table, id ?? null, values),
    onSuccess: () => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] })),
  });
}

export function useSoftDelete(table: string, keys: string[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await dbBaja({ data: { token: getToken(), table, id } });
    },
    onSuccess: () => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] })),
  });
}
