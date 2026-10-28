export const TZ = "America/Sao_Paulo";

export function formatEventDate(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
}
export function formatEventTime(iso: string) {
  const t = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  return t.replace(":00", "h").replace(":", "h");
}
export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
}

const pad = (n: number) => String(n).padStart(2, "0");
function utcStamp(d: Date) {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
}
const icsEsc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");

export function buildIcs(opts: { title: string; startIso: string; address: string; description: string; hours?: number }) {
  const start = new Date(opts.startIso);
  const end = new Date(start.getTime() + (opts.hours ?? 4) * 3600_000);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Cha de Bebe Lucinda//PT-BR",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:cha-lucinda-${utcStamp(start)}@convite`,
    `DTSTAMP:${utcStamp(new Date())}`,
    `DTSTART:${utcStamp(start)}`,
    `DTEND:${utcStamp(end)}`,
    `SUMMARY:${icsEsc(opts.title)}`,
    `LOCATION:${icsEsc(opts.address)}`,
    `DESCRIPTION:${icsEsc(opts.description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function googleCalendarUrl(opts: { title: string; startIso: string; address: string; description: string; hours?: number }) {
  const start = new Date(opts.startIso);
  const end = new Date(start.getTime() + (opts.hours ?? 4) * 3600_000);
  const p = new URLSearchParams({ action: "TEMPLATE", text: opts.title, dates: `${utcStamp(start)}/${utcStamp(end)}`, location: opts.address, details: opts.description, ctz: TZ });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

export const mapsUrl = (address: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

/** Converts a São Paulo local date+time ("2027-02-20", "11:00") into an ISO instant. Brazil has no DST since 2019 (UTC-3). */
export function spLocalToIso(date: string, time: string) {
  return new Date(`${date}T${time}:00-03:00`).toISOString();
}
export function isoToSpLocal(iso: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(iso));
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { date: `${g("year")}-${g("month")}-${g("day")}`, time: `${g("hour")}:${g("minute")}` };
}
