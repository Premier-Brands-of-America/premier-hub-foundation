// ============================================================================
// memory-search  —  verify_jwt = true  (authenticated caller)
// ----------------------------------------------------------------------------
// Semantic memory retrieval (RAG). Embeds the query with gte-small (free, 384-dim,
// no key) and cosine-searches memory_embeddings. The match RPC runs SECURITY
// INVOKER under the caller's JWT, so results are RLS-scoped to what the caller
// can view — every user gets semantic recall over their OWN accessible data.
//
// Request:  { query: string, match_count?: number }
// Response: { results: [{ entity_type, entity_id, chunk, similarity }] }
// ============================================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") || "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// deno-lint-ignore no-explicit-any
declare const Supabase: any;

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { query, match_count } = await req.json();
    if (!query || typeof query !== "string") return json({ error: "query is required" }, 400);

    const session = new Supabase.ai.Session("gte-small");
    const embedding = await session.run(query, { mean_pool: true, normalize: true });

    const { data, error } = await supabase.rpc("match_memory_embeddings", {
      query_embedding: embedding,
      match_count: Math.min(Number(match_count) || 6, 20),
    });
    if (error) return json({ error: error.message }, 500);

    return json({ results: data ?? [] });
  } catch (e) {
    console.error("memory-search error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
