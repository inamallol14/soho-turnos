import { createHmac, timingSafeEqual } from "crypto";

export type Sesion = { id: string; nombre: string; rol: "admin" | "prestador"; exp: number };

const DIAS = 30;

function secret(): string {
  const s = process.env["SUPABASE_SERVICE_ROLE_KEY"] || process.env["SUPABASE_DB_URL"];
  if (!s) throw new Error("Falta la clave de firma del servidor.");
  return s;
}

function b64url(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function firmar(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function crearToken(s: Omit<Sesion, "exp">): string {
  const payload = b64url(
    JSON.stringify({ ...s, exp: Date.now() + DIAS * 24 * 60 * 60 * 1000 } satisfies Sesion),
  );
  return `${payload}.${firmar(payload)}`;
}

export function verificarToken(token: unknown): Sesion {
  if (typeof token !== "string" || !token.includes(".")) throw new Error("No autorizado");
  const [payload, sig] = token.split(".");
  if (!payload || !sig) throw new Error("No autorizado");
  const esperado = firmar(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(esperado);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("No autorizado");
  let sesion: Sesion;
  try {
    sesion = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Sesion;
  } catch {
    throw new Error("No autorizado");
  }
  if (!sesion?.id || !sesion.exp || sesion.exp < Date.now()) throw new Error("No autorizado");
  if (sesion.rol !== "admin" && sesion.rol !== "prestador") throw new Error("No autorizado");
  return sesion;
}

export function requireAdmin(token: unknown): Sesion {
  const s = verificarToken(token);
  if (s.rol !== "admin") throw new Error("No autorizado");
  return s;
}
