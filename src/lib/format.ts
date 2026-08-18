export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

/** dd-mm-aaaa (Argentina) */
export function fmtFecha(iso: string | null | undefined): string {
  if (!iso) return "-";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}-${m}-${y}`;
}

export function fmtHora(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

export function money(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  return "$" + v.toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** Monday-based week start */
export function startOfWeek(d: Date): Date {
  const r = new Date(d);
  const day = (r.getDay() + 6) % 7;
  r.setDate(r.getDate() - day);
  r.setHours(0, 0, 0, 0);
  return r;
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

export const DIA_INDEX: Record<string, number> = {
  Lunes: 0,
  Martes: 1,
  Miércoles: 2,
  Jueves: 3,
  Viernes: 4,
  Sábado: 5,
  Domingo: 6,
};

export const DIA_CORTO = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];

export function diaNombre(d: Date): string {
  return ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"][
    (d.getDay() + 6) % 7
  ] as string;
}
