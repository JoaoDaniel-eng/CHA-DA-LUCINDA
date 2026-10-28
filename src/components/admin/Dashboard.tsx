import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDateTime, TZ } from "@/lib/event-format";
import type { Guest, Message } from "./queries";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card-paper p-5">
      <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-4xl font-semibold text-primary">{value}</p>
    </div>
  );
}

const day = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit" }).format(new Date(iso));

const GIFT_KEYWORDS: [string, RegExp][] = [
  ["Fraldas", /fralda/i],
  ["Roupinhas", /roup|body|macac|pijama|meia|sapat/i],
  ["Higiene", /lenç|pomada|shampoo|sabonete|toalh|banho|higien/i],
  ["Brinquedos", /brinqued|pelúc|chocalh|mordedor/i],
  ["Enxoval", /manta|lençol|cobert|travesseir|enxoval|fronha/i],
];

export function Dashboard({ guests, messages }: { guests: Guest[]; messages: Message[] }) {
  const active = guests.filter((g) => g.status === "confirmed");
  const cancelled = guests.length - active.length;
  const pending = messages.filter((m) => m.status === "pending").length;
  const approved = messages.filter((m) => m.status === "approved").length;

  const byDay = new Map<string, number>();
  [...guests].reverse().forEach((g) => byDay.set(day(g.created_at), (byDay.get(day(g.created_at)) ?? 0) + 1));
  let acc = 0;
  const timeline = [...byDay.entries()].map(([d, n]) => ({ dia: d, total: (acc += n) }));

  const giftData = GIFT_KEYWORDS.map(([name, re]) => ({ tipo: name, qtd: active.filter((g) => re.test(g.gift)).length }));
  giftData.push({ tipo: "Outros", qtd: active.filter((g) => !GIFT_KEYWORDS.some(([, re]) => re.test(g.gift))).length });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="Cadastrados" value={guests.length} />
        <Stat label="Confirmados" value={active.length} />
        <Stat label="Cancelados" value={cancelled} />
        <Stat label="Presentes informados" value={active.length} />
        <Stat label="Msgs pendentes" value={pending} />
        <Stat label="Msgs aprovadas" value={approved} />
      </div>
      {guests.length === 0 ? (
        <div className="card-paper p-10 text-center">
          <p className="font-script text-3xl text-primary">Tudo prontinho</p>
          <p className="mt-2 text-muted-foreground">Ainda não há confirmações. Compartilhe o link do convite pelo WhatsApp! 🌸</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card-paper p-5">
            <h3 className="mb-4 text-xl">Confirmações ao longo do tempo</h3>
            <div className="h-64">
              <ResponsiveContainer>
                <LineChart data={timeline}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="dia" fontSize={12} /><YAxis allowDecimals={false} fontSize={12} /><Tooltip /><Line type="monotone" dataKey="total" stroke="var(--primary)" strokeWidth={2} /></LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card-paper p-5">
            <h3 className="mb-4 text-xl">Presentes por tipo (estimativa por palavras-chave)</h3>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={giftData}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="tipo" fontSize={12} /><YAxis allowDecimals={false} fontSize={12} /><Tooltip /><Bar dataKey="qtd" fill="var(--sage)" radius={[6, 6, 0, 0]} /></BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
      <div className="card-paper p-5">
        <h3 className="mb-3 text-xl">Registros recentes</h3>
        {guests.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum registro ainda.</p> : (
          <ul className="divide-y">
            {guests.slice(0, 6).map((g) => (
              <li key={g.id} className="flex flex-wrap justify-between gap-2 py-2 text-sm">
                <span className="font-semibold">{g.full_name}</span>
                <span className="flex-1 truncate text-muted-foreground">{g.gift}</span>
                <span className="text-xs text-muted-foreground">{formatDateTime(g.created_at)}{g.status === "cancelled" && " · cancelado"}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
