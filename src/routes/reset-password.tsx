import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nova senha · Chá da Lucinda" },
      { name: "description", content: "Defina uma nova senha para a área da família." },
      { property: "og:title", content: "Nova senha · Chá da Lucinda" },
      { property: "og:description", content: "Redefinição de senha." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  ssr: false,
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 10) return setErr("Use pelo menos 10 caracteres.");
    if (pw !== pw2) return setErr("As senhas não coincidem.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setErr("Não foi possível alterar a senha. Abra novamente o link recebido por e-mail.");
    navigate({ to: "/admin", replace: true });
  }

  return (
    <main className="flex min-h-[100svh] items-center justify-center px-5">
      <form onSubmit={submit} className="card-paper w-full max-w-sm space-y-5 p-8">
        <h1 className="text-center text-3xl font-semibold text-bark">Nova senha</h1>
        <div className="space-y-2"><Label htmlFor="pw">Nova senha</Label><Input id="pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="pw2">Repita a senha</Label><Input id="pw2" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></div>
        {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
        <Button type="submit" variant="hero" className="w-full" disabled={busy}>Salvar senha</Button>
      </form>
    </main>
  );
}
