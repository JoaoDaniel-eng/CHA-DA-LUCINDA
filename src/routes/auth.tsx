import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FloralCorner } from "@/components/invite/Decor";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar · Área da família · Chá da Lucinda" },
      { name: "description", content: "Acesso restrito à administração do chá de bebê da Lucinda." },
      { property: "og:title", content: "Área da família · Chá da Lucinda" },
      { property: "og:description", content: "Acesso restrito." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ type: "err" | "ok"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [fails, setFails] = useState(0);
  const [lockUntil, setLockUntil] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) navigate({ to: "/admin", replace: true }); });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (Date.now() < lockUntil) return setMsg({ type: "err", text: "Muitas tentativas. Aguarde um minuto." });
    setBusy(true);
    setMsg(null);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) {
          const n = fails + 1;
          setFails(n);
          if (n >= 5) { setLockUntil(Date.now() + 60_000); setFails(0); }
          setMsg({ type: "err", text: "E-mail ou senha incorretos." });
        } else navigate({ to: "/admin", replace: true });
      } else {
        await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
        setMsg({ type: "ok", text: "Se este e-mail tiver acesso, enviaremos um link para redefinir a senha." });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative flex min-h-[100svh] items-center justify-center overflow-hidden px-5">
      <FloralCorner className="absolute -left-12 -top-6 w-56 md:w-80" />
      <form onSubmit={submit} className="card-paper relative z-10 w-full max-w-sm space-y-5 p-8">
        <div className="text-center">
          <p className="font-script text-2xl text-primary">área da família</p>
          <h1 className="text-3xl font-semibold text-bark">{mode === "login" ? "Entrar" : "Recuperar senha"}</h1>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {mode === "login" && (
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        )}
        {msg && <p role="alert" className={`text-sm ${msg.type === "err" ? "text-destructive" : "text-secondary-foreground"}`}>{msg.text}</p>}
        <Button type="submit" variant="hero" className="w-full" disabled={busy}>{busy ? "Aguarde…" : mode === "login" ? "Entrar" : "Enviar link"}</Button>
        <button type="button" className="w-full text-center text-sm text-muted-foreground hover:text-primary" onClick={() => { setMode(mode === "login" ? "forgot" : "login"); setMsg(null); }}>
          {mode === "login" ? "Esqueci minha senha" : "Voltar para o login"}
        </button>
      </form>
    </main>
  );
}
