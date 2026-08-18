import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Cliente } from "@/lib/types";
import { UserPlus } from "lucide-react";

export function ClienteInput({
  clientes,
  nombre,
  onPick,
}: {
  clientes: Cliente[];
  nombre: string;
  onPick: (v: { nombre: string; clienteId: string | null; telefono?: string | null }) => void;
}) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const sugerencias = useMemo(() => {
    const q = nombre.trim().toLowerCase();
    if (!q) return [];
    return clientes.filter((c) => c.nombre.toLowerCase().includes(q)).slice(0, 6);
  }, [clientes, nombre]);

  const existe = clientes.some((c) => c.nombre.toLowerCase() === nombre.trim().toLowerCase());

  async function crear() {
    const { data, error } = await supabase
      .from("clientes")
      .insert({ nombre: nombre.trim() })
      .select("id")
      .single();
    if (!error && data) {
      onPick({ nombre: nombre.trim(), clienteId: data.id });
      qc.invalidateQueries({ queryKey: ["clientes"] });
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <Input
        value={nombre}
        placeholder="Nombre de la clienta"
        onChange={(e) => {
          onPick({ nombre: e.target.value, clienteId: null });
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
        className="h-11"
      />
      {open && nombre.trim().length > 0 && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border bg-popover shadow-lg">
          {sugerencias.map((c) => (
            <button
              key={c.id}
              type="button"
              className="tap flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onPick({ nombre: c.nombre, clienteId: c.id, telefono: c.telefono });
                setOpen(false);
              }}
            >
              <span>{c.nombre}</span>
              <span className="text-xs text-muted-foreground">{c.telefono ?? ""}</span>
            </button>
          ))}
          {!existe && (
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-start rounded-none text-sm"
              onMouseDown={(e) => e.preventDefault()}
              onClick={crear}
            >
              <UserPlus className="mr-2 size-4" /> Crear «{nombre.trim()}»
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
