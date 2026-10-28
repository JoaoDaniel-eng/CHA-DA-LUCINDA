import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Printer, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isoToSpLocal, spLocalToIso, formatEventDate, formatEventTime } from "@/lib/event-format";
import { validatePhoto } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type Form = { baby_name: string; hero_subtitle: string; mom_message: string; date: string; time: string; address: string; success_message: string };

export function SettingsPanel() {
  const qc = useQueryClient();
  const [f, setF] = useState<Form | null>(null);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data, error } = await supabase.from("event_settings").select("*").eq("id", 1).single();
    if (error || !data) { toast.error("Erro ao carregar configurações."); return; }
    const { date, time } = isoToSpLocal(data.event_at);
    setF({ baby_name: data.baby_name, hero_subtitle: data.hero_subtitle, mom_message: data.mom_message, date, time, address: data.address, success_message: data.success_message });
    setPhotoPath(data.ultrasound_path);
    if (data.ultrasound_path) {
      const { data: s } = await supabase.storage.from("ultrasound").createSignedUrl(data.ultrasound_path, 3600);
      setPreview(s?.signedUrl ?? null);
    } else setPreview(null);
  }
  useEffect(() => { void load(); }, []);

  async function save() {
    if (!f) return;
    if (!f.baby_name.trim() || !f.mom_message.trim() || !f.address.trim() || !f.success_message.trim() || !f.date || !f.time) { toast.error("Preencha todos os campos."); return; }
    setBusy(true);
    const { error } = await supabase.from("event_settings").update({
      baby_name: f.baby_name.trim().slice(0, 60), hero_subtitle: f.hero_subtitle.trim().slice(0, 200), mom_message: f.mom_message.slice(0, 5000),
      event_at: spLocalToIso(f.date, f.time), address: f.address.trim().slice(0, 300), success_message: f.success_message.slice(0, 2000),
    }).eq("id", 1);
    setBusy(false);
    if (error) { toast.error("Não foi possível salvar."); return; }
    toast.success("Configurações salvas!");
    qc.invalidateQueries({ queryKey: ["invite"] });
  }

  async function upload(file: File) {
    const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    const v = validatePhoto(file.size, head);
    if (!v.ok) { toast.error(v.error); return; }
    setBusy(true);
    const ext = v.type.split("/")[1];
    const path = `ultrassom-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("ultrasound").upload(path, file, { contentType: v.type, upsert: false });
    if (error) { setBusy(false); { toast.error("Falha no envio da foto."); return; } }
    const { error: e2 } = await supabase.from("event_settings").update({ ultrasound_path: path }).eq("id", 1);
    if (!e2 && photoPath) await supabase.storage.from("ultrasound").remove([photoPath]);
    setBusy(false);
    if (e2) { toast.error("Foto enviada, mas não foi possível salvá-la."); return; }
    toast.success("Foto do ultrassom atualizada!");
    qc.invalidateQueries({ queryKey: ["invite"] });
    void load();
  }

  if (!f) return <p className="text-muted-foreground">Carregando…</p>;
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="card-paper space-y-4 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1"><Label>Nome do bebê</Label><Input value={f.baby_name} onChange={set("baby_name")} /></div>
          <div className="space-y-1"><Label>Frase de abertura</Label><Input value={f.hero_subtitle} onChange={set("hero_subtitle")} /></div>
          <div className="space-y-1"><Label>Data</Label><Input type="date" value={f.date} onChange={set("date")} /></div>
          <div className="space-y-1"><Label>Horário (Brasília)</Label><Input type="time" value={f.time} onChange={set("time")} /></div>
        </div>
        <div className="space-y-1"><Label>Endereço</Label><Input value={f.address} onChange={set("address")} /></div>
        <div className="space-y-1"><Label>Mensagem da mamãe</Label><Textarea rows={12} value={f.mom_message} onChange={set("mom_message")} /></div>
        <div className="space-y-1"><Label>Texto da tela de confirmação</Label><Textarea rows={6} value={f.success_message} onChange={set("success_message")} /></div>
        <Button variant="hero" onClick={save} disabled={busy}>Salvar alterações</Button>
      </div>
      <div className="space-y-6">
        <div className="card-paper space-y-3 p-6">
          <h3 className="text-xl">Foto do ultrassom</h3>
          {preview ? <img src={preview} alt="Ultrassom atual" className="w-full rounded-lg" /> : <p className="text-sm text-muted-foreground">Nenhuma foto enviada — o convite mostra uma ilustração temporária.</p>}
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-full border border-dashed border-gold px-4 py-3 text-sm hover:bg-accent">
            <Upload className="size-4" /> {preview ? "Substituir foto" : "Enviar foto"}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={busy} onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void upload(file); }} />
          </label>
          <p className="text-xs text-muted-foreground">JPEG, PNG ou WebP, até 5 MB.</p>
        </div>
        <div className="card-paper space-y-2 p-6">
          <h3 className="text-xl">Resumo para impressão</h3>
          <p className="text-sm">{formatEventDate(spLocalToIso(f.date, f.time))} · {formatEventTime(spLocalToIso(f.date, f.time))}</p>
          <p className="text-sm">{f.address}</p>
          <Button variant="soft" size="sm" className="no-print" onClick={() => window.print()}><Printer /> Imprimir resumo</Button>
        </div>
      </div>
    </div>
  );
}
