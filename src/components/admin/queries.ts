import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Guest = { id: string; full_name: string; phone: string; gift: string; status: "confirmed" | "cancelled"; created_at: string; updated_at: string; cancelled_at: string | null };
export type Message = { id: string; sender_name: string; content: string; status: "pending" | "approved" | "rejected"; created_at: string; approved_at: string | null };

export const adminDataQuery = queryOptions({
  queryKey: ["admin-data"],
  queryFn: async () => {
    const [g, m] = await Promise.all([
      supabase.from("guests").select("id, full_name, phone, gift, status, created_at, updated_at, cancelled_at").order("created_at", { ascending: false }).limit(1000),
      supabase.from("guestbook_messages").select("id, sender_name, content, status, created_at, approved_at").order("created_at", { ascending: false }).limit(1000),
    ]);
    if (g.error) throw g.error;
    if (m.error) throw m.error;
    return { guests: g.data as Guest[], messages: m.data as Message[] };
  },
});

export function downloadFile(name: string, content: string, type: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
