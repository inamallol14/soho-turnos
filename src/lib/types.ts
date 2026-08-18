export type Rol = "admin" | "prestador";

export type Persona = {
  id: string;
  nombre: string;
  rol: Rol;
  activo: boolean;
};

export type Servicio = {
  id: string;
  modalidad: string;
  nombre: string;
  duracion_min: number;
  precio: number;
  activo: boolean;
};

export type Cliente = {
  id: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
  notas: string | null;
  es_propietario: boolean;
  activo: boolean;
};

export type Horario = {
  id: string;
  dia: string;
  hora_desde: number;
  hora_hasta: number;
  activo: boolean;
};

export type Turno = {
  id: string;
  fecha: string;
  hora: number;
  cliente: string;
  cliente_id: string | null;
  telefono: string | null;
  modalidad: string | null;
  servicio_id: string | null;
  servicio_nombre: string | null;
  duracion_min: number;
  prestador: string | null;
  estado: string;
  paquete_id: string | null;
  es_canje: boolean;
  pagado: boolean;
  monto_total: number;
  sena: boolean;
  monto_sena: number;
  metodo_pago_sena: string | null;
  metodo_pago_resto: string | null;
  precio_lista: number;
  descuento_tipo: string | null;
  descuento_valor: number;
  notas: string | null;
  creado_por: string | null;
  fecha_creacion: string;
  activo: boolean;
};

export type Paquete = {
  id: string;
  cliente: string;
  cliente_id: string | null;
  telefono: string | null;
  precio_lista_total: number;
  precio_final: number;
  monto_pagado: number;
  pagado: boolean;
  metodo_pago: string | null;
  fecha_compra: string;
  activo: boolean;
};

export type PaqueteDetalle = {
  id: string;
  paquete_id: string;
  servicio_id: string | null;
  servicio_nombre: string | null;
  cantidad: number;
};

export type Reparto = {
  id: string;
  prestador: string;
  modalidad: string;
  porcentaje: number;
  activo: boolean;
};

export type PagoLiquidacion = {
  id: string;
  prestador: string;
  desde: string | null;
  hasta: string | null;
  fecha: string;
  monto: number;
  metodo_pago: string | null;
  notas: string | null;
  creado_por: string | null;
  activo: boolean;
};

export type Auditoria = {
  id: string;
  entidad: string;
  entidad_id: string | null;
  accion: string;
  detalle: string | null;
  usuario: string | null;
  created_at: string;
};

export type Notificacion = {
  id: string;
  titulo: string;
  cuerpo: string | null;
  tipo: string | null;
  leida: boolean;
  created_at: string;
};

export const METODOS_PAGO = [
  "Efectivo",
  "Transferencia",
  "Débito",
  "Crédito",
  "Mercado Pago",
] as const;

export const ESTADOS = ["Confirmado", "Completado", "No-show", "Cancelado"] as const;

export const DIAS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
] as const;
