import { z } from "zod";

/** Normalizes a Brazilian phone to 55 + DDD + number (10 or 11 digits after 55). Returns null if invalid. */
export function normalizePhone(input: string): string | null {
  let d = (input || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 12 || d.length === 13) {
    if (!d.startsWith("55")) return null;
    d = d.slice(2);
  }
  if (d.length !== 10 && d.length !== 11) return null;
  const ddd = Number(d.slice(0, 2));
  if (ddd < 11 || ddd > 99 || d[0] === "0" || d[1] === "0") return null;
  if (d.length === 11 && d[2] !== "9") return null;
  return "55" + d;
}

export function formatPhone(normalized: string): string {
  const d = normalized.startsWith("55") ? normalized.slice(2) : normalized;
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return normalized;
}

const clean = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();

export const guestSchema = z.object({
  fullName: z
    .string()
    .transform(clean)
    .pipe(
      z
        .string()
        .min(3, "Informe seu nome completo.")
        .max(120, "O nome pode ter no máximo 120 caracteres.")
        .refine((v) => v.split(/\s+/).filter((p) => p.length >= 2).length >= 2, "Informe nome e sobrenome.")
        .refine((v) => /^[\p{L}\s'.-]+$/u.test(v), "O nome contém caracteres inválidos."),
    ),
  phone: z
    .string()
    .refine((v) => normalizePhone(v) !== null, "Informe um WhatsApp válido com DDD, ex.: (21) 99999-9999."),
  gift: z
    .string()
    .transform(clean)
    .pipe(z.string().min(2, "Conte para nós qual presente você pretende levar.").max(500, "O presente pode ter no máximo 500 caracteres.")),
  website: z.string().max(0).optional(), // honeypot
});
export type GuestInput = z.input<typeof guestSchema>;

export const messageSchema = z.object({
  senderName: z.string().transform(clean).pipe(z.string().min(2, "Informe seu nome.").max(80, "Máximo de 80 caracteres.")),
  content: z.string().transform(clean).pipe(z.string().min(2, "Escreva sua mensagem.").max(600, "Máximo de 600 caracteres.")),
  website: z.string().max(0).optional(),
});

export const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{40,64}$/, "Link inválido.");

const ALLOWED = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

/** Detects the real image type from the file's first bytes. */
export function sniffImageType(bytes: Uint8Array): (typeof ALLOWED)[number] | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b)) return "image/png";
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  )
    return "image/webp";
  return null;
}

export function validatePhoto(size: number, head: Uint8Array): { ok: true; type: string } | { ok: false; error: string } {
  if (size > MAX_PHOTO_BYTES) return { ok: false, error: "A foto deve ter no máximo 5 MB." };
  if (size === 0) return { ok: false, error: "Arquivo vazio." };
  const type = sniffImageType(head);
  if (!type) return { ok: false, error: "Envie uma imagem JPEG, PNG ou WebP." };
  return { ok: true, type };
}

/** Countdown parts; null once the event time has passed. */
export function countdownParts(target: Date, now: Date) {
  const ms = target.getTime() - now.getTime();
  if (ms <= 0) return null;
  const s = Math.floor(ms / 1000);
  return { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60 };
}

export function csvEscape(v: unknown): string {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // avoid formula injection in Excel
  return `"${s.replace(/"/g, '""')}"`;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return "\uFEFF" + [headers, ...rows].map((r) => r.map(csvEscape).join(";")).join("\r\n");
}
