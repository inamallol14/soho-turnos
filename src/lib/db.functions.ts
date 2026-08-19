import { createServerFn } from "@tanstack/react-start";
import type { EscrituraInput, ListaInput } from "./db.server";

export const dbListar = createServerFn({ method: "POST" })
  .inputValidator((input: ListaInput) => input)
  .handler(async ({ data }) => {
    const { listar } = await import("./db.server");
    return listar(data);
  });

export const dbGuardar = createServerFn({ method: "POST" })
  .inputValidator((input: EscrituraInput) => input)
  .handler(async ({ data }) => {
    const { guardar } = await import("./db.server");
    return guardar(data);
  });

export const dbInsertarVarios = createServerFn({ method: "POST" })
  .inputValidator((input: { token?: string; table: string; rows: Record<string, unknown>[] }) => input)
  .handler(async ({ data }) => {
    const { insertarVarios } = await import("./db.server");
    return insertarVarios(data);
  });

export const dbBaja = createServerFn({ method: "POST" })
  .inputValidator((input: { token?: string; table: string; id: string }) => input)
  .handler(async ({ data }) => {
    const { bajaLogica } = await import("./db.server");
    return bajaLogica(data);
  });
