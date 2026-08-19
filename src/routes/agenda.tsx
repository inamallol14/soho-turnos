import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell, useTurnoUI } from "@/components/AppShell";
import { PeriodoFiltro, presetPeriodo, type Periodo } from "@/components/PeriodoFiltro";
import { useTurnos } from "@/lib/data";
import { fmtFecha, fmtHora, money } from "@/lib/format";
import { esPaquete, faltaCobrar } from "@/lib/biz";
import type { Turno } from "@/lib/types";

export const Route = createFileRoute("/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda · Soho Box" },
      { name: "description", content: "Listado de turnos por período del estudio Soho Box." },
      { property: "og:title", content: "Agenda · Soho Box" },
      { property: "og:description", content: "Listado de turnos por período del estudio Soho Box." },
    ],
  }),
  component: () => (
    <AppShell title="Agenda">
      <Agenda />
    </AppShell>
  ),
});

function estadoPago(t: Turno) {
  if (esPaquete(t)) return "Paquete";
  if (t.es_canje) return "Canje";
  if (t.pagado) return "Pagado";
  if (t.sena) return `Seña ${money(t.monto_sena)}`;
  return `Debe ${money(faltaCobrar(t))}`;
}

function Agenda() {
  const { abrir } = useTurnoUI();
  const { data: turnos = [] } = useTurnos();
  const [p, setP] = useState<Periodo>(presetPeriodo("semana"));

  const lista = useMemo(
    () =>
      turnos
        .filter((t) => t.fecha >= p.desde && t.fecha <= p.hasta)
        .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora) || a.hora - b.hora),
    [turnos, p],
  );

  return (
    <div className="space-y-4">
      <PeriodoFiltro value={p} onChange={setP} />

      <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Hora</th>
              <th className="px-3 py-2">Clienta</th>
              <th className="px-3 py-2">Servicio</th>
              <th className="px-3 py-2">Prestadora</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Pago</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((t) => (
              <tr
                key={t.id}
                onClick={() => abrir(t)}
                className="cursor-pointer border-t hover:bg-accent/40"
              >
                <td className="px-3 py-2">{fmtFecha(t.fecha)}</td>
                <td className="px-3 py-2">{fmtHora(t.hora)}</td>
                <td className="px-3 py-2 font-medium">{t.cliente}</td>
                <td className="px-3 py-2">{t.servicio_nombre}</td>
                <td className="px-3 py-2">{t.prestador}</td>
                <td className="px-3 py-2">{t.estado}</td>
                <td className="px-3 py-2">{estadoPago(t)}</td>
              </tr>
            ))}
            {lista.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                  Sin turnos en el período.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 md:hidden">
        {lista.map((t) => (
          <button
            key={t.id}
            onClick={() => abrir(t)}
            className="block w-full rounded-xl border bg-card p-3 text-left"
          >
            <div className="flex items-center justify-between">
              <span className="num">
                {fmtFecha(t.fecha)} · {fmtHora(t.hora)}
              </span>
              <span className="text-xs text-muted-foreground">{estadoPago(t)}</span>
            </div>
            <p className="font-medium">{t.cliente}</p>
            <p className="text-sm text-muted-foreground">
              {t.servicio_nombre} · {t.prestador}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
