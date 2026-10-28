import { useEffect, useState } from "react";
import { countdownParts } from "@/lib/validation";

export function Countdown({ targetIso }: { targetIso: string }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const target = new Date(targetIso);
  const parts = now ? countdownParts(target, now) : { days: 0, hours: 0, minutes: 0, seconds: 0 };

  if (!parts) {
    const sameDay = now && now.getTime() - target.getTime() < 12 * 3600_000;
    return (
      <p className="card-paper mx-auto max-w-md px-6 py-5 text-center font-display text-2xl text-bark">
        {sameDay ? "O grande dia chegou! 🌸" : "Nosso encontro na floresta já aconteceu. Obrigada por todo o carinho! 🩷"}
      </p>
    );
  }
  const items = [
    ["Dias", parts.days],
    ["Horas", parts.hours],
    ["Minutos", parts.minutes],
    ["Segundos", parts.seconds],
  ] as const;
  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-4" role="timer" aria-live="off">
      {items.map(([label, v]) => (
        <div key={label} className="card-paper flex flex-col items-center px-2 py-4 sm:px-6">
          <span className="font-display text-3xl font-semibold tabular-nums text-primary sm:text-5xl">{String(v).padStart(2, "0")}</span>
          <span className="mt-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground sm:text-xs">{label}</span>
        </div>
      ))}
    </div>
  );
}
