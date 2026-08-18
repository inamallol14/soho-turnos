export function toCSV(rows: Record<string, string | number>[], headers: string[]): string {
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
}

export function descargarCSV(nombre: string, contenido: string) {
  const blob = new Blob(["\uFEFF" + contenido], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

/** Parser CSV simple con soporte de comillas y separador , o ; */
export function parseCSV(text: string): Record<string, string>[] {
  const clean = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const sep = (clean.split("\n")[0] ?? "").includes(";") ? ";" : ",";
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"' && clean[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) {
      cur.push(field);
      field = "";
    } else if (ch === "\n") {
      cur.push(field);
      rows.push(cur);
      cur = [];
      field = "";
    } else field += ch;
  }
  if (field || cur.length) {
    cur.push(field);
    rows.push(cur);
  }
  const head = (rows.shift() ?? []).map((h) => h.trim().toLowerCase());
  return rows
    .filter((r) => r.some((c) => c.trim() !== ""))
    .map((r) => {
      const o: Record<string, string> = {};
      head.forEach((h, i) => (o[h] = (r[i] ?? "").trim()));
      return o;
    });
}

export function num(v: string | undefined): number {
  if (!v) return 0;
  return Number(v.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".")) || 0;
}
