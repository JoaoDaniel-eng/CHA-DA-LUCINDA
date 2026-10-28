import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarPlus, Copy, MapPin, Clock, CalendarHeart, Check } from "lucide-react";
import hero from "@/assets/hero-forest.jpg";
import babyFox from "@/assets/placeholder-baby.png";
import { inviteQuery } from "@/lib/invite-query";
import { confirmPresence } from "@/lib/invite.functions";
import { buildIcs, formatEventDate, formatEventTime, googleCalendarUrl, mapsUrl } from "@/lib/event-format";
import { Button } from "@/components/ui/button";
import { Countdown } from "@/components/invite/Countdown";
import { Celebration } from "@/components/invite/Celebration";
import { RsvpForm } from "@/components/invite/RsvpForm";
import { Guestbook } from "@/components/invite/Guestbook";
import { Butterfly, Fireflies, FloralCorner, SectionTitle } from "@/components/invite/Decor";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Chá de Bebê da Lucinda · Floresta Encantada" },
      { name: "description", content: "Você está convidado para o chá de bebê da Lucinda! Confirme sua presença e deixe uma mensagem de carinho." },
      { property: "og:title", content: "Chá de Bebê da Lucinda 🌸" },
      { property: "og:description", content: "Uma pequena flor está chegando à nossa floresta. Confirme sua presença!" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(inviteQuery),
  component: Index,
});

function Index() {
  const { data } = useSuspenseQuery(inviteQuery);
  const s = data.settings;
  const [successToken, setSuccessToken] = useState<string | null>(null);
  const confirm = useServerFn(confirmPresence);
  const calOpts = { title: `Chá de Bebê da ${s.baby_name}`, startIso: s.event_at, address: s.address, description: `Venha celebrar a chegada da ${s.baby_name}! 🌸` };

  function downloadIcs() {
    const blob = new Blob([buildIcs(calOpts)], { type: "text/calendar;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "cha-de-bebe-lucinda.ics";
    a.click();
    URL.revokeObjectURL(a.href);
  }
  async function copyAddress() {
    await navigator.clipboard.writeText(s.address);
    toast.success("Endereço copiado!");
  }

  if (successToken) return <Success token={successToken} message={s.success_message} onBack={() => { setSuccessToken(null); window.scrollTo({ top: 0 }); }} />;

  return (
    <main className="overflow-x-hidden">
      {/* Abertura */}
      <section className="relative flex min-h-[100svh] flex-col items-center justify-start overflow-hidden">
        <img src={hero} alt="Floresta encantada com raposinha, coelho e cervo entre flores e cogumelos" width={1920} height={1088} className="absolute inset-0 h-full w-full object-cover object-bottom" />
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
        <Fireflies />
        <Butterfly className="absolute left-[12%] top-[22%] w-10" />
        <Butterfly className="absolute right-[18%] top-[14%] w-8 [animation-delay:2s]" />
        <div className="relative z-10 mx-auto mt-[9vh] max-w-3xl px-6 text-center animate-fade-up">
          <p className="font-script text-3xl text-primary md:text-4xl">Chá de bebê da</p>
          <h1 className="text-gold-shine py-2 text-7xl font-semibold leading-none md:text-9xl">{s.baby_name}</h1>
          <p className="mx-auto mt-4 max-w-md font-display text-xl italic text-bark md:text-2xl">{s.hero_subtitle}</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm uppercase tracking-[0.25em] text-bark">
            <span>{formatEventDate(s.event_at)}</span><span className="text-gold">✦</span><span>{formatEventTime(s.event_at)}</span>
          </div>
          <Button variant="hero" size="lg" className="mt-8" asChild>
            <a href="#confirmar">Confirmar minha presença</a>
          </Button>
        </div>
      </section>

      {/* Mensagem da mamãe */}
      <section id="mensagem" className="relative px-5 py-24">
        <FloralCorner className="absolute -left-10 top-0 w-48 opacity-80 md:w-72" />
        <FloralCorner flip className="absolute -right-10 bottom-0 w-48 rotate-180 opacity-80 md:w-72" />
        <SectionTitle eyebrow="uma carta para você" title="Mensagem da mamãe" />
        <article className="card-paper relative mx-auto max-w-2xl px-7 py-10 md:px-14">
          <p className="whitespace-pre-line font-display text-lg leading-relaxed text-foreground md:text-xl">{s.mom_message}</p>
        </article>
      </section>

      {/* Ultrassom */}
      <section id="ultrassom" className="px-5 py-20">
        <SectionTitle eyebrow="nosso primeiro retrato" title="Olá, mundo!" />
        <figure className="mx-auto max-w-md">
          <div className="card-paper rotate-[-1.5deg] p-4 pb-12 transition-transform duration-500 hover:rotate-0">
            {data.photoUrl ? (
              <img src={data.photoUrl} alt={`Ultrassom da ${s.baby_name}`} loading="lazy" className="aspect-[4/3] w-full rounded-lg object-cover" />
            ) : (
              <div className="flex aspect-[4/3] w-full flex-col items-center justify-center rounded-lg" style={{ background: "var(--gradient-blush)" }}>
                <img src={babyFox} alt="" width={1024} height={1024} loading="lazy" className="w-3/4 animate-float-soft" />
              </div>
            )}
            <figcaption className="mt-4 text-center font-script text-2xl text-bark">
              {data.photoUrl ? `${s.baby_name}, ainda no aconchego da mamãe` : "Em breve, a primeira fotinho 🩷"}
            </figcaption>
          </div>
        </figure>
      </section>

      {/* Contagem + evento */}
      <section id="evento" className="px-5 py-24">
        <SectionTitle eyebrow="faltam só" title="Contagem regressiva" />
        <div className="mx-auto max-w-2xl"><Countdown targetIso={s.event_at} /></div>
        <div className="card-paper mx-auto mt-14 grid max-w-4xl gap-8 p-8 md:grid-cols-3">
          <Info icon={<CalendarHeart />} label="Data" value={formatEventDate(s.event_at)} />
          <Info icon={<Clock />} label="Horário" value={formatEventTime(s.event_at)} />
          <Info icon={<MapPin />} label="Endereço" value={s.address} />
          <div className="flex flex-wrap justify-center gap-3 md:col-span-3">
            <Button variant="soft" asChild><a href={mapsUrl(s.address)} target="_blank" rel="noopener noreferrer"><MapPin /> Abrir no mapa</a></Button>
            <Button variant="soft" onClick={copyAddress}><Copy /> Copiar endereço</Button>
            <Button variant="soft" onClick={downloadIcs}><CalendarPlus /> Adicionar ao calendário</Button>
            <Button variant="soft" asChild><a href={googleCalendarUrl(calOpts)} target="_blank" rel="noopener noreferrer"><CalendarPlus /> Google Agenda</a></Button>
          </div>
        </div>
      </section>

      {/* Confirmação */}
      <section id="confirmar" className="relative px-5 py-24">
        <SectionTitle eyebrow="vem com a gente?" title="Confirme sua presença" />
        <div className="card-paper mx-auto max-w-xl p-7 md:p-10">
          <p className="mb-6 text-center text-muted-foreground">Não temos lista de presentes: conte para nós, com suas palavras, o que pretende levar. 🎁</p>
          <RsvpForm submitLabel="Confirmar minha presença" onSubmit={async (v) => {
            const r = await confirm({ data: v });
            try { localStorage.setItem("lucinda-rsvp-token", r.token); } catch { /* ignore */ }
            setSuccessToken(r.token);
            window.scrollTo({ top: 0 });
          }} />
        </div>
      </section>

      <Guestbook messages={data.messages} babyName={s.baby_name} />

      <footer className="relative px-5 pb-12 pt-16 text-center">
        <div className="gold-rule mx-auto mb-8 max-w-sm" />
        <p className="font-script text-4xl text-primary">{s.baby_name}</p>
        <p className="mt-2 text-sm text-muted-foreground">feito com amor, entre flores e vagalumes 🌿</p>
        <Link to="/auth" className="mt-6 inline-block text-xs text-muted-foreground/60 hover:text-muted-foreground">Área da família</Link>
      </footer>
    </main>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-accent text-primary [&_svg]:size-5">{icon}</span>
      <p className="mt-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl first-letter:uppercase text-bark">{value}</p>
    </div>
  );
}

function Success({ token, message, onBack }: { token: string; message: string; onBack: () => void }) {
  const [copied, setCopied] = useState(false);
  const link = typeof window !== "undefined" ? `${window.location.origin}/editar/${token}` : "";
  return (
    <main className="relative flex min-h-[100svh] items-center justify-center overflow-hidden px-5 py-16">
      <Celebration />
      <Fireflies />
      <FloralCorner className="absolute -left-12 -top-6 w-56 md:w-80" />
      <FloralCorner flip className="absolute -right-12 -top-6 w-56 md:w-80" />
      <div className="card-paper relative z-10 max-w-lg p-8 text-center animate-fade-up md:p-12">
        <h1 className="text-5xl font-semibold text-primary">Presença confirmada! 🎉</h1>
        <p className="mt-6 whitespace-pre-line leading-relaxed">{message}</p>
        <div className="mt-8 rounded-xl bg-muted p-4 text-left text-sm">
          <p className="font-semibold text-bark">Guarde seu link pessoal</p>
          <p className="mt-1 text-muted-foreground">Com ele você pode editar o presente ou cancelar a confirmação depois.</p>
          <div className="mt-3 flex gap-2">
            <input readOnly value={link} className="min-w-0 flex-1 rounded-md border bg-card px-3 py-2 text-xs" onFocus={(e) => e.currentTarget.select()} />
            <Button size="sm" variant="secondary" onClick={async () => { await navigator.clipboard.writeText(link); setCopied(true); }}>{copied ? <Check /> : <Copy />}</Button>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button variant="soft" onClick={onBack}>Voltar ao convite</Button>
          <Button variant="hero" asChild><Link to="/editar/$token" params={{ token }}>Editar minha confirmação</Link></Button>
        </div>
      </div>
    </main>
  );
}
