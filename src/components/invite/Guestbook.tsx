import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { messageSchema } from "@/lib/validation";
import { postMessage } from "@/lib/invite.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SectionTitle } from "./Decor";

type Msg = { id: string; sender_name: string; content: string; created_at: string };

export function Guestbook({ messages, babyName }: { messages: Msg[]; babyName: string }) {
  const send = useServerFn(postMessage);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [hp, setHp] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const r = messageSchema.safeParse({ senderName: name, content });
    if (!r.success) return setErr(r.error.issues[0]?.message ?? "Verifique os campos.");
    setErr(null);
    setBusy(true);
    try {
      await send({ data: { senderName: name, content, website: hp } });
      setSent(true);
      setName("");
      setContent("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Não foi possível enviar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="mural" className="px-5 py-24">
      <SectionTitle eyebrow="com carinho" title="Mural de mensagens" />
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[380px_1fr]">
        <form onSubmit={submit} noValidate className="card-paper h-fit space-y-4 p-6">
          <p className="font-display text-2xl text-bark">Deixe um recadinho para a mamãe e a {babyName}</p>
          <div className="space-y-2">
            <Label htmlFor="m-name">Seu nome</Label>
            <Input id="m-name" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-content">Mensagem</Label>
            <Textarea id="m-content" rows={4} maxLength={600} value={content} onChange={(e) => setContent(e.target.value)} />
            <p className="text-right text-xs text-muted-foreground">{content.length}/600</p>
          </div>
          <input className="hidden" tabIndex={-1} aria-hidden autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} />
          {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
          {sent && <p role="status" className="rounded-lg bg-secondary px-4 py-3 text-sm text-secondary-foreground">Obrigado por deixar um carinho para a {babyName}! 🩷</p>}
          <Button type="submit" variant="hero" className="w-full" disabled={busy}>{busy ? "Enviando…" : "Enviar mensagem"}</Button>
        </form>
        <div className="columns-1 gap-5 sm:columns-2">
          {messages.length === 0 ? (
            <div className="card-paper break-inside-avoid p-8 text-center text-muted-foreground">
              <p className="font-script text-3xl text-primary">Em breve…</p>
              <p className="mt-2">As primeiras mensagens de carinho vão florescer por aqui. 🌿</p>
            </div>
          ) : (
            messages.map((m, i) => (
              <figure key={m.id} className="card-paper mb-5 break-inside-avoid p-6 animate-fade-up" style={{ animationDelay: `${Math.min(i, 8) * 80}ms` }}>
                <blockquote className="whitespace-pre-line break-words leading-relaxed text-foreground">“{m.content}”</blockquote>
                <figcaption className="mt-4 font-script text-xl text-primary">— {m.sender_name}</figcaption>
              </figure>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
