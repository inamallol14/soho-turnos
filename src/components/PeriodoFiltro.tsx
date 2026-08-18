import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addDays, endOfMonth, startOfMonth, startOfWeek, toISO } from "@/lib/format";

export type Periodo = { desde: string; hasta: string; preset: string };

export function presetPeriodo(preset: string): Periodo {
  const hoy = new Date();
  switch (preset) {
    case "hoy":
      return { desde: toISO(hoy), hasta: toISO(hoy), preset };
    case "semana": {
      const i = startOfWeek(hoy);
      return { desde: toISO(i), hasta: toISO(addDays(i, 6)), preset };
    }
    case "semanaPasada": {
      const i = addDays(startOfWeek(hoy), -7);
      return { desde: toISO(i), hasta: toISO(addDays(i, 6)), preset };
    }
    case "mesPasado": {
      const m = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
      return { desde: toISO(startOfMonth(m)), hasta: toISO(endOfMonth(m)), preset };
    }
    case "mes":
    default:
      return { desde: toISO(startOfMonth(hoy)), hasta: toISO(endOfMonth(hoy)), preset: "mes" };
  }
}

const OPCIONES = [
  { k: "hoy", l: "Hoy" },
  { k: "semana", l: "Esta semana" },
  { k: "semanaPasada", l: "Semana pasada" },
  { k: "mes", l: "Este mes" },
  { k: "mesPasado", l: "Mes pasado" },
];

export function PeriodoFiltro({
  value,
  onChange,
  opciones = OPCIONES.map((o) => o.k),
}: {
  value: Periodo;
  onChange: (p: Periodo) => void;
  opciones?: string[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {OPCIONES.filter((o) => opciones.includes(o.k)).map((o) => (
        <Button
          key={o.k}
          size="sm"
          variant={value.preset === o.k ? "default" : "outline"}
          className="tap"
          onClick={() => onChange(presetPeriodo(o.k))}
        >
          {o.l}
        </Button>
      ))}
      <Input
        type="date"
        className="h-10 w-40"
        value={value.desde}
        onChange={(e) => onChange({ ...value, desde: e.target.value, preset: "manual" })}
      />
      <Input
        type="date"
        className="h-10 w-40"
        value={value.hasta}
        onChange={(e) => onChange({ ...value, hasta: e.target.value, preset: "manual" })}
      />
    </div>
  );
}
