// ============================================================================
// memory-wiki  —  verify_jwt = true  (authenticated caller)
// ----------------------------------------------------------------------------
// On-demand "wiki summary" for a topic/cluster in the memory graph. The client
// passes a topic label + the labels of its connected nodes (already RLS-scoped
// on the client from get_memory_graph); Claude (AI_ASSISTANT_API_KEY) writes a
// short encyclopedic summary. Gated by can_view_memory (admin or grant).
//
// Request:  { topic: string, related?: string[] }
// Response: { summary_md: string }
// ============================================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") || "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const AI_GATEWAY = Deno.env.get("AI_GATEWAY_URL") || "https://api.openai.com/v1/chat/completions";
const AI_MODEL = Deno.env.get("AI_MODEL") || "gpt-4o-mini";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const apiKey = Deno.env.get("AI_ASSISTANT_API_KEY");
    if (!apiKey) return json({ error: "AI_ASSISTANT_API_KEY is not configured" }, 500);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    // Gate: admin or an active memory-access grant.
    const { data: canView } = await supabase.rpc("can_view_memory", { _uid: user.id });
    if (!canView) return json({ error: "Forbidden" }, 403);

    const { topic, related } = await req.json();
    if (!topic || typeof topic !== "string") return json({ error: "topic is required" }, 400);

    const relatedList = Array.isArray(related)
      ? related.map((r) => String(r)).filter(Boolean).slice(0, 40)
      : [];

    const systemPrompt = `You are a knowledge-base editor. Write a concise, encyclopedic summary of a
topic based ONLY on the topic name and the list of related items it connects to in a
knowledge graph. Do not invent facts beyond what the connections imply.

Return GitHub-flavored Markdown, no title heading, with:
- A 1–2 sentence overview of what this topic is and why it matters here.
- A short "## Connected to" bulleted list grouping the related items thematically.
- If the connections are sparse, keep it brief. Never exceed ~150 words.`;

    const userPrompt =
      `Topic: ${topic}\n\nConnected items (${relatedList.length}):\n` +
      (relatedList.length ? relatedList.map((r) => `- ${r}`).join("\n") : "(none provided)");

    const res = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        stream: false,
      }),
    });
    if (!res.ok) return json({ error: `AI call failed: ${res.status}` }, 500);
    const data = await res.json();
    const summary_md = data?.choices?.[0]?.message?.content ?? "";
    return json({ summary_md });
  } catch (e) {
    console.error("memory-wiki error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
