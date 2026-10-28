import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dashboard } from "@/components/admin/Dashboard";
import { GuestsPanel } from "@/components/admin/GuestsPanel";
import { MessagesPanel } from "@/components/admin/MessagesPanel";
import { SettingsPanel } from "@/components/admin/SettingsPanel";
import { adminDataQuery } from "@/components/admin/queries";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Painel · Chá de Bebê da Lucinda" },
      { name: "description", content: "Painel administrativo do chá de bebê da Lucinda." },
      { property: "og:title", content: "Painel · Chá da Lucinda" },
      { property: "og:description", content: "Área restrita." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const role = useQuery({
    queryKey: ["is-admin", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (error) throw error;
      return data === true;
    },
  });
  const data = useQuery({ ...adminDataQuery, enabled: role.data === true });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (role.isLoading) return <p className="p-10 text-center text-muted-foreground">Carregando…</p>;
  if (!role.data)
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <p>Esta conta não tem acesso administrativo.</p>
        <Button onClick={signOut}>Sair</Button>
      </main>
    );

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-script text-2xl text-primary">painel da família</p>
          <h1 className="text-4xl font-semibold text-bark">Chá da Lucinda</h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="soft" asChild><Link to="/">Ver convite</Link></Button>
          <Button variant="outline" onClick={signOut}><LogOut /> Sair</Button>
        </div>
      </header>
      <Tabs defaultValue="painel">
        <TabsList className="no-print mb-6 flex h-auto flex-wrap">
          <TabsTrigger value="painel">Painel</TabsTrigger>
          <TabsTrigger value="convidados">Convidados</TabsTrigger>
          <TabsTrigger value="mensagens">Mensagens{data.data?.messages.filter((m) => m.status === "pending").length ? ` (${data.data.messages.filter((m) => m.status === "pending").length})` : ""}</TabsTrigger>
          <TabsTrigger value="config">Configurações</TabsTrigger>
        </TabsList>
        {data.isLoading || !data.data ? (
          <p className="py-10 text-center text-muted-foreground">{data.error ? "Erro ao carregar dados." : "Carregando…"}</p>
        ) : (
          <>
            <TabsContent value="painel"><Dashboard guests={data.data.guests} messages={data.data.messages} /></TabsContent>
            <TabsContent value="convidados"><GuestsPanel guests={data.data.guests} /></TabsContent>
            <TabsContent value="mensagens"><MessagesPanel messages={data.data.messages} userId={user.id} /></TabsContent>
            <TabsContent value="config"><SettingsPanel /></TabsContent>
          </>
        )}
      </Tabs>
    </main>
  );
}
