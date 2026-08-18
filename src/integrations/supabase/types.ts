export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      auditoria: {
        Row: {
          accion: string
          created_at: string
          detalle: string | null
          entidad: string
          entidad_id: string | null
          id: string
          usuario: string | null
        }
        Insert: {
          accion: string
          created_at?: string
          detalle?: string | null
          entidad: string
          entidad_id?: string | null
          id?: string
          usuario?: string | null
        }
        Update: {
          accion?: string
          created_at?: string
          detalle?: string | null
          entidad?: string
          entidad_id?: string | null
          id?: string
          usuario?: string | null
        }
        Relationships: []
      }
      clientes: {
        Row: {
          activo: boolean
          created_at: string
          email: string | null
          es_propietario: boolean
          id: string
          nombre: string
          notas: string | null
          telefono: string | null
        }
        Insert: {
          activo?: boolean
          created_at?: string
          email?: string | null
          es_propietario?: boolean
          id?: string
          nombre: string
          notas?: string | null
          telefono?: string | null
        }
        Update: {
          activo?: boolean
          created_at?: string
          email?: string | null
          es_propietario?: boolean
          id?: string
          nombre?: string
          notas?: string | null
          telefono?: string | null
        }
        Relationships: []
      }
      horarios: {
        Row: {
          activo: boolean
          dia: string
          hora_desde: number
          hora_hasta: number
          id: string
        }
        Insert: {
          activo?: boolean
          dia: string
          hora_desde?: number
          hora_hasta?: number
          id?: string
        }
        Update: {
          activo?: boolean
          dia?: string
          hora_desde?: number
          hora_hasta?: number
          id?: string
        }
        Relationships: []
      }
      notificaciones: {
        Row: {
          created_at: string
          cuerpo: string | null
          id: string
          leida: boolean
          tipo: string | null
          titulo: string
        }
        Insert: {
          created_at?: string
          cuerpo?: string | null
          id?: string
          leida?: boolean
          tipo?: string | null
          titulo: string
        }
        Update: {
          created_at?: string
          cuerpo?: string | null
          id?: string
          leida?: boolean
          tipo?: string | null
          titulo?: string
        }
        Relationships: []
      }
      pagos_liquidacion: {
        Row: {
          activo: boolean
          creado_por: string | null
          created_at: string
          desde: string | null
          fecha: string
          hasta: string | null
          id: string
          metodo_pago: string | null
          monto: number
          notas: string | null
          prestador: string
        }
        Insert: {
          activo?: boolean
          creado_por?: string | null
          created_at?: string
          desde?: string | null
          fecha?: string
          hasta?: string | null
          id?: string
          metodo_pago?: string | null
          monto?: number
          notas?: string | null
          prestador: string
        }
        Update: {
          activo?: boolean
          creado_por?: string | null
          created_at?: string
          desde?: string | null
          fecha?: string
          hasta?: string | null
          id?: string
          metodo_pago?: string | null
          monto?: number
          notas?: string | null
          prestador?: string
        }
        Relationships: []
      }
      paquetes: {
        Row: {
          activo: boolean
          cliente: string
          cliente_id: string | null
          created_at: string
          fecha_compra: string
          id: string
          metodo_pago: string | null
          monto_pagado: number
          pagado: boolean
          precio_final: number
          precio_lista_total: number
          telefono: string | null
        }
        Insert: {
          activo?: boolean
          cliente: string
          cliente_id?: string | null
          created_at?: string
          fecha_compra?: string
          id?: string
          metodo_pago?: string | null
          monto_pagado?: number
          pagado?: boolean
          precio_final?: number
          precio_lista_total?: number
          telefono?: string | null
        }
        Update: {
          activo?: boolean
          cliente?: string
          cliente_id?: string | null
          created_at?: string
          fecha_compra?: string
          id?: string
          metodo_pago?: string | null
          monto_pagado?: number
          pagado?: boolean
          precio_final?: number
          precio_lista_total?: number
          telefono?: string | null
        }
        Relationships: []
      }
      paquetes_detalle: {
        Row: {
          cantidad: number
          id: string
          paquete_id: string
          servicio_id: string | null
          servicio_nombre: string | null
        }
        Insert: {
          cantidad?: number
          id?: string
          paquete_id: string
          servicio_id?: string | null
          servicio_nombre?: string | null
        }
        Update: {
          cantidad?: number
          id?: string
          paquete_id?: string
          servicio_id?: string | null
          servicio_nombre?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "paquetes_detalle_paquete_id_fkey"
            columns: ["paquete_id"]
            isOneToOne: false
            referencedRelation: "paquetes"
            referencedColumns: ["id"]
          },
        ]
      }
      personas: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          nombre: string
          pin: string
          rol: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre: string
          pin: string
          rol?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre?: string
          pin?: string
          rol?: string
        }
        Relationships: []
      }
      reparto: {
        Row: {
          activo: boolean
          id: string
          modalidad: string
          porcentaje: number
          prestador: string
        }
        Insert: {
          activo?: boolean
          id?: string
          modalidad: string
          porcentaje?: number
          prestador: string
        }
        Update: {
          activo?: boolean
          id?: string
          modalidad?: string
          porcentaje?: number
          prestador?: string
        }
        Relationships: []
      }
      servicios: {
        Row: {
          activo: boolean
          created_at: string
          duracion_min: number
          id: string
          modalidad: string
          nombre: string
          precio: number
        }
        Insert: {
          activo?: boolean
          created_at?: string
          duracion_min?: number
          id?: string
          modalidad: string
          nombre: string
          precio?: number
        }
        Update: {
          activo?: boolean
          created_at?: string
          duracion_min?: number
          id?: string
          modalidad?: string
          nombre?: string
          precio?: number
        }
        Relationships: []
      }
      turnos: {
        Row: {
          activo: boolean
          cliente: string
          cliente_id: string | null
          creado_por: string | null
          descuento_tipo: string | null
          descuento_valor: number
          duracion_min: number
          es_canje: boolean
          estado: string
          fecha: string
          fecha_creacion: string
          hora: number
          id: string
          metodo_pago_resto: string | null
          metodo_pago_sena: string | null
          modalidad: string | null
          monto_sena: number
          monto_total: number
          notas: string | null
          pagado: boolean
          paquete_id: string | null
          precio_lista: number
          prestador: string | null
          sena: boolean
          servicio_id: string | null
          servicio_nombre: string | null
          telefono: string | null
        }
        Insert: {
          activo?: boolean
          cliente: string
          cliente_id?: string | null
          creado_por?: string | null
          descuento_tipo?: string | null
          descuento_valor?: number
          duracion_min?: number
          es_canje?: boolean
          estado?: string
          fecha: string
          fecha_creacion?: string
          hora: number
          id?: string
          metodo_pago_resto?: string | null
          metodo_pago_sena?: string | null
          modalidad?: string | null
          monto_sena?: number
          monto_total?: number
          notas?: string | null
          pagado?: boolean
          paquete_id?: string | null
          precio_lista?: number
          prestador?: string | null
          sena?: boolean
          servicio_id?: string | null
          servicio_nombre?: string | null
          telefono?: string | null
        }
        Update: {
          activo?: boolean
          cliente?: string
          cliente_id?: string | null
          creado_por?: string | null
          descuento_tipo?: string | null
          descuento_valor?: number
          duracion_min?: number
          es_canje?: boolean
          estado?: string
          fecha?: string
          fecha_creacion?: string
          hora?: number
          id?: string
          metodo_pago_resto?: string | null
          metodo_pago_sena?: string | null
          modalidad?: string | null
          monto_sena?: number
          monto_total?: number
          notas?: string | null
          pagado?: boolean
          paquete_id?: string | null
          precio_lista?: number
          prestador?: string | null
          sena?: boolean
          servicio_id?: string | null
          servicio_nombre?: string | null
          telefono?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
