import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function fetchRecentContext(orgId: string, userId: string, limit = 12) {
  const { data: msgs, error } = await supabaseAdmin
    .from("conversation_messages")
    .select("*")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  const { data: insights, error: memErr } = await supabaseAdmin
    .from("memory_insights")
    .select("*")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);
  if (memErr) throw memErr;

  const recent = (msgs ?? [])
    .reverse()
    .map((m) => `${m.role.toUpperCase()}: ${m.message}`)
    .join("\n");
  const mem = (insights ?? []).map((i) => `• ${i.summary}`).join("\n");
  return { recentMessages: recent, memoryBullets: mem };
}
