import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { guestSchema, messageSchema, normalizePhone, tokenSchema } from "./validation";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

function newToken() {
  const b = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function rateLimit(action: string, max: number, windowSeconds: number) {
  const ip = getRequestHeader("cf-connecting-ip") || getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const key = `${action}:${(await sha256("rl:" + ip)).slice(0, 32)}`;
  const db = await admin();
  const { data, error } = await db.rpc("hit_rate_limit", { _key: key, _max: max, _window_seconds: windowSeconds });
  if (error) {
    console.error("rate limit error", error.code);
    return;
  }
  if (data === false) throw new Error("Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.");
}

function fail(msg: string): never {
  throw new Error(msg);
}

export const getPublicInvite = createServerFn({ method: "GET" }).handler(async () => {
  const db = await admin();
  const [{ data: s, error }, { data: msgs }] = await Promise.all([
    db.from("event_settings").select("baby_name, mom_message, event_at, address, ultrasound_path, success_message, hero_subtitle, updated_at").eq("id", 1).single(),
    db.from("guestbook_messages").select("id, sender_name, content, created_at").eq("status", "approved").order("created_at", { ascending: false }).limit(200),
  ]);
  if (error || !s) fail("Não foi possível carregar o convite.");
  let photoUrl: string | null = null;
  if (s.ultrasound_path) {
    const { data } = await db.storage.from("ultrasound").createSignedUrl(s.ultrasound_path, 60 * 60 * 24 * 7);
    photoUrl = data?.signedUrl ?? null;
  }
  const { ultrasound_path: _p, ...pub } = s;
  return { settings: pub, photoUrl, messages: msgs ?? [] };
});

const guestInput = guestSchema.omit({ website: true }).extend({ website: z.string().optional() });

export const confirmPresence = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => guestInput.parse(d))
  .handler(async ({ data }) => {
    if (data.website) fail("Não foi possível enviar.");
    const parsed = guestSchema.safeParse(data);
    if (!parsed.success) fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");
    await rateLimit("rsvp", 8, 600);
    const phone = normalizePhone(parsed.data.phone)!;
    const db = await admin();
    // Avoid accidental duplicates: same phone confirmed within the last 2 minutes.
    const { data: recent } = await db.from("guests").select("id").eq("phone", phone).eq("status", "confirmed").gte("created_at", new Date(Date.now() - 120_000).toISOString()).limit(1);
    if (recent && recent.length) fail("Recebemos sua confirmação há instantes. Use o link de edição se quiser alterar algo.");
    const token = newToken();
    const { error } = await db.from("guests").insert({ full_name: parsed.data.fullName, phone, gift: parsed.data.gift, edit_token_hash: await sha256(token) });
    if (error) {
      console.error("rsvp insert failed", error.code);
      fail("Não foi possível salvar sua confirmação. Tente novamente.");
    }
    return { token };
  });

async function findByToken(token: string) {
  const t = tokenSchema.safeParse(token);
  if (!t.success) return null;
  const db = await admin();
  const { data } = await db.from("guests").select("id, full_name, phone, gift, status, created_at, updated_at").eq("edit_token_hash", await sha256(t.data)).maybeSingle();
  return data;
}

export const getMyRsvp = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string().max(80) }).parse(d))
  .handler(async ({ data }) => {
    await rateLimit("token", 60, 600);
    const g = await findByToken(data.token);
    if (!g) return null;
    const { id: _id, ...rest } = g;
    return rest;
  });

export const updateMyRsvp = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string().max(80), fullName: z.string(), phone: z.string(), gift: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await rateLimit("token-write", 20, 600);
    const parsed = guestSchema.safeParse(data);
    if (!parsed.success) fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");
    const g = await findByToken(data.token);
    if (!g) fail("Link inválido ou expirado.");
    const db = await admin();
    const { error } = await db.from("guests").update({ full_name: parsed.data.fullName, phone: normalizePhone(parsed.data.phone)!, gift: parsed.data.gift, status: "confirmed", cancelled_at: null }).eq("id", g.id);
    if (error) fail("Não foi possível salvar. Tente novamente.");
    return { ok: true };
  });

export const cancelMyRsvp = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string().max(80) }).parse(d))
  .handler(async ({ data }) => {
    await rateLimit("token-write", 20, 600);
    const g = await findByToken(data.token);
    if (!g) fail("Link inválido ou expirado.");
    const db = await admin();
    const { error } = await db.from("guests").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", g.id);
    if (error) fail("Não foi possível cancelar. Tente novamente.");
    return { ok: true };
  });

export const postMessage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ senderName: z.string(), content: z.string(), website: z.string().optional() }).parse(d))
  .handler(async ({ data }) => {
    if (data.website) return { ok: true };
    const parsed = messageSchema.safeParse(data);
    if (!parsed.success) fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");
    await rateLimit("msg", 5, 600);
    const db = await admin();
    const { error } = await db.from("guestbook_messages").insert({ sender_name: parsed.data.senderName, content: parsed.data.content });
    if (error) fail("Não foi possível enviar sua mensagem. Tente novamente.");
    return { ok: true };
  });
