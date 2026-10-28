import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Printer, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatPhone, guestSchema, normalizePhone, toCsv } from "@/lib/validation";
import { formatDateTime } from "@/lib/event-format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { downloadFile, type Guest } from "./queries";

export function guestsCsv(guests: Guest[]) {
  return toCsv(
    ["Nome", "WhatsApp", "Presente informado", "Status", "Data de registro", "Última atualização"],
    guests.map((g) => [g.full_name, formatPhone(g.phone), g.gift, g.status === "confirmed" ? "Confirmado" : "Cancelado", formatDateTime(g.created_at), formatDateTime(g.updated_at)]),
  );
}

export function GuestsPanel({ guests }: { guests: Guest[] }) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "confirmed" | "cancelled">("all");
  const [editing, setEditing] = useState<Guest | null>(null);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    const digits = t.replace(/\D/g, "");
    return guests.filter((g) => (status === "all" || g.status === status) && (!t || g.full_name.toLowerCase().includes(t) || g.gift.toLowerCase().includes(t) || (digits.length >= 3 && g.phone.includes(digits))));
  }, [guests, q, status]);

  async function setGuestStatus(g: Guest, s: Guest["status"]) {
    const { error } = await supabase.from("guests").update({ status: s, cancelled_at: s === "cancelled" ? new Date().toISOString() : null }).eq("id", g.id);
    if (error) { toast.error("Não foi possível atualizar."); return; }
    toast.success(s === "cancelled" ? "Confirmação cancelada." : "Confirmação reativada.");
    qc.invalidateQueries({ queryKey: ["admin-data"] });
  }

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap gap-3">
        <Input placeholder="Buscar por nome, telefone ou presente…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm bg-card" />
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="rounded-md border bg-card px-3 text-sm" aria-label="Filtrar por status">
          <option value="all">Todos</option><option value="confirmed">Confirmados</option><option value="cancelled">Cancelados</option>
        </select>
        <div className="ml-auto flex gap-2">
          <Button variant="soft" onClick={() => downloadFile("convidados-lucinda.csv", guestsCsv(list), "text/csv;charset=utf-8")}><Download /> CSV</Button>
          <Button variant="soft" onClick={() => window.print()}><Printer /> Imprimir</Button>
        </div>
      </div>
      <h2 className="hidden text-2xl print:block">Lista de convidados — Chá da Lucinda ({list.length})</h2>
      {list.length === 0 ? (
        <div className="card-paper p-10 text-center text-muted-foreground">{guests.length === 0 ? "Nenhuma confirmação recebida ainda." : "Nenhum resultado para esta busca."}</div>
      ) : (
        <div className="card-paper overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="p-3">Nome</th><th className="p-3">WhatsApp</th><th className="p-3">Presente</th><th className="p-3">Status</th><th className="p-3">Registro</th><th className="p-3">Atualização</th><th className="no-print p-3" /></tr>
            </thead>
            <tbody className="divide-y">
              {list.map((g) => (
                <tr key={g.id} className="align-top">
                  <td className="p-3 font-semibold">{g.full_name}</td>
                  <td className="whitespace-nowrap p-3"><a className="text-primary hover:underline" href={`https://wa.me/${g.phone}`} target="_blank" rel="noopener noreferrer">{formatPhone(g.phone)}</a></td>
                  <td className="max-w-xs whitespace-pre-line break-words p-3">{g.gift}</td>
                  <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs ${g.status === "confirmed" ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"}`}>{g.status === "confirmed" ? "Confirmado" : "Cancelado"}</span></td>
                  <td className="whitespace-nowrap p-3 text-xs">{formatDateTime(g.created_at)}</td>
                  <td className="whitespace-nowrap p-3 text-xs">{formatDateTime(g.updated_at)}</td>
                  <td className="no-print whitespace-nowrap p-3">
                    <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => setEditing(g)}><Pencil /></Button>
                    {g.status === "confirmed"
                      ? <Button size="sm" variant="ghost" className="text-destructive" onClick={() => confirm(`Cancelar a confirmação de ${g.full_name}?`) && setGuestStatus(g, "cancelled")}>Cancelar</Button>
                      : <Button size="sm" variant="ghost" onClick={() => setGuestStatus(g, "confirmed")}>Reativar</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <EditGuest guest={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function EditGuest({ guest, onClose }: { guest: Guest | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [v, setV] = useState({ fullName: "", phone: "", gift: "" });
  const [err, setErr] = useState<string | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);
  if (guest && guest.id !== lastId) {
    setLastId(guest.id);
    setV({ fullName: guest.full_name, phone: formatPhone(guest.phone), gift: guest.gift });
    setErr(null);
  }
  async function save() {
    const r = guestSchema.safeParse(v);
    if (!r.success) return setErr(r.error.issues[0]?.message ?? "Dados inválidos");
    const { error } = await supabase.from("guests").update({ full_name: r.data.fullName, phone: normalizePhone(r.data.phone)!, gift: r.data.gift }).eq("id", guest!.id);
    if (error) return setErr("Não foi possível salvar.");
    toast.success("Registro atualizado.");
    qc.invalidateQueries({ queryKey: ["admin-data"] });
    onClose();
  }
  return (
    <Dialog open={!!guest} onOpenChange={(o) => { if (!o) { setLastId(null); onClose(); } }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Editar convidado</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label>Nome completo</Label><Input value={v.fullName} onChange={(e) => setV({ ...v, fullName: e.target.value })} /></div>
          <div className="space-y-1"><Label>WhatsApp</Label><Input value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} /></div>
          <div className="space-y-1"><Label>Presente</Label><Textarea rows={3} maxLength={500} value={v.gift} onChange={(e) => setV({ ...v, gift: e.target.value })} /></div>
          {guest && <p className="text-xs text-muted-foreground">Criado em {formatDateTime(guest.created_at)} · atualizado em {formatDateTime(guest.updated_at)}</p>}
          {err && <p className="text-sm text-destructive">{err}</p>}
          <Button variant="hero" className="w-full" onClick={save}>Salvar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
