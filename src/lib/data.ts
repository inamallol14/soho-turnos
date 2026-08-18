import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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

async function selectAll<T>(table: string, order?: string): Promise<T[]> {
  let q = supabase.from(table).select("*").eq("activo", true);
  if (order) q = q.order(order);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as T[];
}

export function usePersonas() {
  return useQuery({
    queryKey: ["personas"],
    queryFn: () => selectAll<Persona>("personas", "nombre"),
  });
}
export function useServicios() {
  return useQuery({
    queryKey: ["servicios"],
    queryFn: () => selectAll<Servicio>("servicios", "nombre"),
  });
}
export function useClientes() {
  return useQuery({
    queryKey: ["clientes"],
    queryFn: () => selectAll<Cliente>("clientes", "nombre"),
  });
}
export function useHorarios() {
  return useQuery({
    queryKey: ["horarios"],
    queryFn: async () => {
      const { data, error } = await supabase.from("horarios").select("*");
      if (error) throw error;
      return (data ?? []) as Horario[];
    },
  });
}
export function useTurnos() {
  return useQuery({
    queryKey: ["turnos"],
    queryFn: () => selectAll<Turno>("turnos", "fecha"),
  });
}
export function usePaquetes() {
  return useQuery({
    queryKey: ["paquetes"],
    queryFn: () => selectAll<Paquete>("paquetes", "fecha_compra"),
  });
}
export function usePaquetesDetalle() {
  return useQuery({
    queryKey: ["paquetes_detalle"],
    queryFn: async () => {
      const { data, error } = await supabase.from("paquetes_detalle").select("*");
      if (error) throw error;
      return (data ?? []) as PaqueteDetalle[];
    },
  });
}
export function useReparto() {
  return useQuery({
    queryKey: ["reparto"],
    queryFn: () => selectAll<Reparto>("reparto", "prestador"),
  });
}
export function usePagosLiquidacion() {
  return useQuery({
    queryKey: ["pagos_liquidacion"],
    queryFn: () => selectAll<PagoLiquidacion>("pagos_liquidacion", "fecha"),
  });
}
export function useAuditoria(entidadId?: string) {
  return useQuery({
    queryKey: ["auditoria", entidadId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("auditoria")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (entidadId) q = q.eq("entidad_id", entidadId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Auditoria[];
    },
  });
}
export function useNotificaciones() {
  return useQuery({
    queryKey: ["notificaciones"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notificaciones")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Notificacion[];
    },
  });
}

export async function auditar(
  entidad: string,
  entidadId: string | null,
  accion: string,
  detalle: string,
  usuario: string,
) {
  await supabase
    .from("auditoria")
    .insert({ entidad, entidad_id: entidadId, accion, detalle, usuario });
}

export async function notificar(titulo: string, cuerpo: string, tipo: string) {
  await supabase.from("notificaciones").insert({ titulo, cuerpo, tipo });
}

type Row = Record<string, unknown>;

export function useUpsert(table: string, keys: string[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string | null; values: Row }) => {
      if (id) {
        const { error } = await supabase.from(table).update(values).eq("id", id);
        if (error) throw error;
        return id;
      }
      const { data, error } = await supabase.from(table).insert(values).select("id").single();
      if (error) throw error;
      return (data as { id: string }).id;
    },
    onSuccess: () => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] })),
  });
}

export function useSoftDelete(table: string, keys: string[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).update({ activo: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] })),
  });
}
