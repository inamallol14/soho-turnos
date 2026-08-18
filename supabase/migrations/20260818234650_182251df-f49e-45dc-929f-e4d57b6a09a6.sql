
-- STAFF
CREATE TABLE public.personas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  rol text NOT NULL DEFAULT 'prestador',
  pin text NOT NULL,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT (id, nombre, rol, activo, created_at) ON public.personas TO anon, authenticated;
GRANT ALL ON public.personas TO service_role;
ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "personas_read" ON public.personas FOR SELECT TO anon, authenticated USING (activo);

CREATE TABLE public.servicios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modalidad text NOT NULL,
  nombre text NOT NULL,
  duracion_min integer NOT NULL DEFAULT 60,
  precio numeric NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  telefono text,
  email text,
  notas text,
  es_propietario boolean NOT NULL DEFAULT false,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.horarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dia text NOT NULL,
  hora_desde integer NOT NULL DEFAULT 9,
  hora_hasta integer NOT NULL DEFAULT 20,
  activo boolean NOT NULL DEFAULT true
);
CREATE TABLE public.paquetes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente text NOT NULL,
  cliente_id uuid,
  telefono text,
  precio_lista_total numeric NOT NULL DEFAULT 0,
  precio_final numeric NOT NULL DEFAULT 0,
  monto_pagado numeric NOT NULL DEFAULT 0,
  pagado boolean NOT NULL DEFAULT false,
  metodo_pago text,
  fecha_compra date NOT NULL DEFAULT current_date,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.paquetes_detalle (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paquete_id uuid NOT NULL REFERENCES public.paquetes(id) ON DELETE CASCADE,
  servicio_id uuid,
  servicio_nombre text,
  cantidad integer NOT NULL DEFAULT 1
);
CREATE TABLE public.turnos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha date NOT NULL,
  hora integer NOT NULL,
  cliente text NOT NULL,
  cliente_id uuid,
  telefono text,
  modalidad text,
  servicio_id uuid,
  servicio_nombre text,
  duracion_min integer NOT NULL DEFAULT 60,
  prestador text,
  estado text NOT NULL DEFAULT 'Confirmado',
  paquete_id uuid,
  es_canje boolean NOT NULL DEFAULT false,
  pagado boolean NOT NULL DEFAULT false,
  monto_total numeric NOT NULL DEFAULT 0,
  sena boolean NOT NULL DEFAULT false,
  monto_sena numeric NOT NULL DEFAULT 0,
  metodo_pago_sena text,
  metodo_pago_resto text,
  precio_lista numeric NOT NULL DEFAULT 0,
  descuento_tipo text,
  descuento_valor numeric NOT NULL DEFAULT 0,
  notas text,
  creado_por text,
  fecha_creacion timestamptz NOT NULL DEFAULT now(),
  activo boolean NOT NULL DEFAULT true
);
CREATE TABLE public.reparto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prestador text NOT NULL,
  modalidad text NOT NULL,
  porcentaje numeric NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true
);
CREATE TABLE public.pagos_liquidacion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prestador text NOT NULL,
  desde date,
  hasta date,
  fecha date NOT NULL DEFAULT current_date,
  monto numeric NOT NULL DEFAULT 0,
  metodo_pago text,
  notas text,
  creado_por text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad text NOT NULL,
  entidad_id uuid,
  accion text NOT NULL,
  detalle text,
  usuario text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.notificaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  cuerpo text,
  tipo text,
  leida boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['servicios','clientes','horarios','paquetes','paquetes_detalle','turnos','reparto','pagos_liquidacion','auditoria','notificaciones'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "%s_all" ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;

INSERT INTO public.personas (nombre, rol, pin) VALUES ('Administradora','admin','1234'), ('Prestadora','prestador','1111');
INSERT INTO public.servicios (modalidad, nombre, duracion_min, precio) VALUES
 ('Cosmiatría','Facial Express',60,18000),
 ('Cosmiatría','Facial con Punta de Diamante',60,25000),
 ('Cosmiatría','Dermapen',60,35000),
 ('Cosmiatría','Masaje/Yoga Facial',60,20000),
 ('Cosmiatría','Dermaplaning',60,28000),
 ('Masajes','Relajante',60,20000),
 ('Masajes','Linfático',60,22000),
 ('Masajes','Reductor',60,22000),
 ('Masajes','Descontracturante',60,24000);
INSERT INTO public.horarios (dia, hora_desde, hora_hasta, activo) VALUES
 ('Lunes',14,20,false),('Martes',14,20,true),('Miércoles',14,20,false),
 ('Jueves',14,20,true),('Viernes',14,20,false),('Sábado',9,14,true),('Domingo',9,14,false);
INSERT INTO public.reparto (prestador, modalidad, porcentaje) VALUES
 ('Prestadora','Cosmiatría',60),('Prestadora','Masajes',40);
