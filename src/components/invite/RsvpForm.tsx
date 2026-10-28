import { useState } from "react";
import { guestSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export type RsvpValues = { fullName: string; phone: string; gift: string };

function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function RsvpForm({ initial, submitLabel, onSubmit }: { initial?: RsvpValues; submitLabel: string; onSubmit: (v: RsvpValues & { website: string }) => Promise<void> }) {
  const [v, setV] = useState<RsvpValues>(initial ?? { fullName: "", phone: "", gift: "" });
  const [hp, setHp] = useState("");
  const [errors, setErrors] = useState<Partial<Record<keyof RsvpValues | "form", string>>>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const r = guestSchema.safeParse(v);
    if (!r.success) {
      const errs: typeof errors = {};
      for (const i of r.error.issues) errs[i.path[0] as keyof RsvpValues] ??= i.message;
      setErrors(errs);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await onSubmit({ ...v, website: hp });
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Algo deu errado. Tente novamente." });
    } finally {
      setBusy(false);
    }
  }

  const field = (k: keyof RsvpValues) => ({ "aria-invalid": !!errors[k], "aria-describedby": errors[k] ? `${k}-err` : undefined });

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="fullName">Nome completo</Label>
        <Input id="fullName" autoComplete="name" maxLength={120} placeholder="Maria Oliveira" value={v.fullName} onChange={(e) => setV({ ...v, fullName: e.target.value })} {...field("fullName")} />
        {errors.fullName && <p id="fullName-err" className="text-sm text-destructive">{errors.fullName}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">WhatsApp com DDD</Label>
        <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="(21) 99999-9999" value={v.phone} onChange={(e) => setV({ ...v, phone: maskPhone(e.target.value) })} {...field("phone")} />
        {errors.phone && <p id="phone-err" className="text-sm text-destructive">{errors.phone}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="gift">Presente que pretende levar</Label>
        <Textarea id="gift" rows={3} maxLength={500} placeholder="Ex.: Um pacote de fraldas tamanho M e um conjunto de roupinhas tamanho P." value={v.gift} onChange={(e) => setV({ ...v, gift: e.target.value })} {...field("gift")} />
        <div className="flex items-end justify-between gap-3 text-xs text-muted-foreground">
          <span className="min-w-0">{errors.gift ? <span id="gift-err" className="text-destructive">{errors.gift}</span> : "Escreva livremente — qualquer presente é um carinho."}</span>
          <span className="shrink-0 whitespace-nowrap tabular-nums">{v.gift.length}/500</span>
        </div>
      </div>
      <div className="hidden" aria-hidden>
        <label>Website<input tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} /></label>
      </div>
      {errors.form && <p role="alert" className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{errors.form}</p>}
      <Button type="submit" variant="hero" size="lg" className="w-full" disabled={busy}>
        {busy ? "Enviando…" : submitLabel}
      </Button>
    </form>
  );
}
