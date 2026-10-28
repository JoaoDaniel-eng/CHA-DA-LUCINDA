import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cancelMyRsvp, getMyRsvp, updateMyRsvp } from "@/lib/invite.functions";
import { formatPhone } from "@/lib/validation";
import { formatDateTime } from "@/lib/event-format";
import { RsvpForm } from "@/components/invite/RsvpForm";
import { Button } from "@/components/ui/button";
import { FloralCorner } from "@/components/invite/Decor";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/editar/$token")({
  head: () => ({
    meta: [
      { title: "Minha confirmação · Chá de Bebê da Lucinda" },
      { name: "description", content: "Edite o presente ou cancele sua confirmação no chá de bebê da Lucinda." },
      { property: "og:title", content: "Minha confirmação · Chá da Lucinda" },
      { property: "og:description", content: "Edite sua confirmação de presença." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  ssr: false,
  component: EditPage,
});

type Rsvp = Awaited<ReturnType<typeof getMyRsvp>>;

function EditPage() {
  const { token } = Route.useParams();
  const load = useServerFn(getMyRsvp);
  const save = useServerFn(updateMyRsvp);
  const cancel = useServerFn(cancelMyRsvp);
  const [state, setState] = useState<"loading" | "missing" | "ready">("loading");
  const [rsvp, setRsvp] = useState<Rsvp>(null);
  const [formKey, setFormKey] = useState(0);

  async function refresh() {
    try {
      const r = await load({ data: { token } });
      setRsvp(r);
      setState(r ? "ready" : "missing");
      setFormKey((k) => k + 1);
    } catch {
      setState("missing");
    }
  }
  useEffect(() => { void refresh(); }, [token]);

  return (
    <main className="relative min-h-[100svh] overflow-hidden px-5 py-16">
      <FloralCorner className="absolute -left-12 -top-6 w-48 md:w-72" />
      <div className="card-paper relative z-10 mx-auto max-w-xl p-7 md:p-10">
        <p className="text-center font-script text-2xl text-primary">sua confirmação</p>
        <h1 className="text-center text-4xl font-semibold text-bark">Chá da Lucinda</h1>
        {state === "loading" && <p className="mt-8 text-center text-muted-foreground">Carregando…</p>}
        {state === "missing" && (
          <div className="mt-8 text-center">
            <p>Não encontramos uma confirmação para este link.</p>
            <Button variant="hero" className="mt-6" asChild><Link to="/">Ir para o convite</Link></Button>
          </div>
        )}
        {state === "ready" && rsvp && (
          <div className="mt-8 space-y-6">
            <div className={`rounded-xl px-4 py-3 text-sm ${rsvp.status === "confirmed" ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"}`}>
              {rsvp.status === "confirmed" ? "✓ Presença confirmada" : "Confirmação cancelada — você pode reativá-la salvando abaixo."}
              <span className="block text-xs opacity-70">Última atualização: {formatDateTime(rsvp.updated_at)}</span>
            </div>
            <RsvpForm key={formKey} initial={{ fullName: rsvp.full_name, phone: formatPhone(rsvp.phone), gift: rsvp.gift }}
              submitLabel={rsvp.status === "confirmed" ? "Salvar alterações" : "Reativar minha presença"}
              onSubmit={async (v) => { await save({ data: { token, fullName: v.fullName, phone: v.phone, gift: v.gift } }); toast.success("Confirmação atualizada! 🩷"); await refresh(); }} />
            {rsvp.status === "confirmed" && (
              <AlertDialog>
                <AlertDialogTrigger asChild><Button variant="ghost" className="w-full text-destructive">Cancelar minha presença</Button></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancelar sua presença?</AlertDialogTitle>
                    <AlertDialogDescription>Vamos sentir sua falta! Você poderá reativar depois usando este mesmo link.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Voltar</AlertDialogCancel>
                    <AlertDialogAction onClick={async () => { try { await cancel({ data: { token } }); toast.success("Confirmação cancelada."); await refresh(); } catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); } }}>Sim, cancelar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <div className="text-center"><Link to="/" className="text-sm text-primary underline-offset-4 hover:underline">Voltar ao convite</Link></div>
          </div>
        )}
      </div>
    </main>
  );
}
