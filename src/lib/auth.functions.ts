import { createServerFn } from "@tanstack/react-start";

export const loginConPin = createServerFn({ method: "POST" })
  .inputValidator((input: { nombre: string; pin: string }) => input)
  .handler(async ({ data }) => {
    const nombre = String(data.nombre ?? "").trim();
    const pin = String(data.pin ?? "").trim();
    if (!nombre || !/^\d{4,6}$/.test(pin)) {
      return { ok: false as const, error: "Ingresá tu nombre y un PIN de 4 a 6 dígitos." };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { crearToken } = await import("./session.server");
    const { data: rows, error } = await supabaseAdmin
      .from("personas")
      .select("id, nombre, rol, activo, pin")
      .eq("activo", true)
      .ilike("nombre", nombre);
    if (error) return { ok: false as const, error: "No pudimos validar el acceso." };
    const found = (rows ?? []).find((r) => String(r.pin) === pin);
    if (!found) return { ok: false as const, error: "Nombre o PIN incorrecto." };
    const persona = {
      id: found.id as string,
      nombre: found.nombre as string,
      rol: (found.rol as string) === "admin" ? ("admin" as const) : ("prestador" as const),
      activo: true,
    };
    return { ok: true as const, persona, token: crearToken(persona) };
  });

export const guardarPin = createServerFn({ method: "POST" })
  .inputValidator((input: { token?: string; id?: string; nombre: string; rol: string; pin: string }) => input)
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./session.server");
    requireAdmin(data.token);
    const pin = String(data.pin ?? "").trim();
    if (data.pin && !/^\d{4,6}$/.test(pin)) {
      return { ok: false as const, error: "El PIN debe tener entre 4 y 6 dígitos." };
    }
    const nombre = String(data.nombre ?? "").trim();
    if (!nombre) return { ok: false as const, error: "El nombre es obligatorio." };
    const rol = data.rol === "admin" ? "admin" : "prestador";
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.id) {
      const patch = pin ? { nombre, rol, pin } : { nombre, rol };
      const { error } = await supabaseAdmin.from("personas").update(patch).eq("id", data.id);
      if (error) return { ok: false as const, error: "No pudimos guardar los cambios." };
    } else {
      const { error } = await supabaseAdmin
        .from("personas")
        .insert({ nombre, rol, pin: pin || "1234" });
      if (error) return { ok: false as const, error: "No pudimos guardar los cambios." };
    }
    return { ok: true as const };
  });

export const bajaPersona = createServerFn({ method: "POST" })
  .inputValidator((input: { token?: string; id: string }) => input)
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./session.server");
    requireAdmin(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("personas").update({ activo: false }).eq("id", data.id);
    return { ok: true as const };
  });
