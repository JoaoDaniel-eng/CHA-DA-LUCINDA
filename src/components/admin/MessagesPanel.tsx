import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/event-format";
import { toCsv } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { downloadFile, type Message } from "./queries";

const labels = { pending: "Pendentes", approved: "Aprovadas", rejected: "Rejeitadas" } as const;

export function MessagesPanel({ messages, userId }: { messages: Message[]; userId: string }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Message["status"]>("pending");
  const list = messages.filter((m) => m.status === tab);

  async function setStatus(m: Message, status: Message["status"]) {
    const { error } = await supabase.from("guestbook_messages").update({ status, approved_at: status === "approved" ? new Date().toISOString() : null, approved_by: status === "approved" ? userId : null }).eq("id", m.id);
    if (error) { toast.error("Não foi possível atualizar."); return; }
    toast.success(status === "approved" ? "Mensagem aprovada e publicada." : "Mensagem rejeitada.");
    qc.invalidateQueries({ queryKey: ["admin-data"] });
    qc.invalidateQueries({ queryKey: ["invite"] });
  }
  async function remove(m: Message) {
    if (!confirm("Excluir esta mensagem definitivamente?")) return;
    const { error } = await supabase.from("guestbook_messages").delete().eq("id", m.id);
    if (error) { toast.error("Não foi possível excluir."); return; }
    toast.success("Mensagem excluída.");
    qc.invalidateQueries({ queryKey: ["admin-data"] });
    qc.invalidateQueries({ queryKey: ["invite"] });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(labels) as Message["status"][]).map((k) => (
          <Button key={k} variant={tab === k ? "default" : "soft"} size="sm" onClick={() => setTab(k)}>{labels[k]} ({messages.filter((m) => m.status === k).length})</Button>
        ))}
        <Button variant="soft" size="sm" className="ml-auto" onClick={() => downloadFile("mensagens-lucinda.csv", toCsv(["Nome", "Mensagem", "Status", "Data"], messages.map((m) => [m.sender_name, m.content, labels[m.status], formatDateTime(m.created_at)])), "text/csv;charset=utf-8")}><Download /> Exportar CSV</Button>
      </div>
      {list.length === 0 ? <div className="card-paper p-10 text-center text-muted-foreground">Nenhuma mensagem {labels[tab].toLowerCase()}.</div> : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((m) => (
            <div key={m.id} className="card-paper p-5">
              <p className="whitespace-pre-line break-words">{m.content}</p>
              <p className="mt-3 font-script text-lg text-primary">— {m.sender_name}</p>
              <p className="text-xs text-muted-foreground">{formatDateTime(m.created_at)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {m.status !== "approved" && <Button size="sm" onClick={() => setStatus(m, "approved")}>Aprovar</Button>}
                {m.status !== "rejected" && <Button size="sm" variant="outline" onClick={() => setStatus(m, "rejected")}>Rejeitar</Button>}
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(m)}>Excluir</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
