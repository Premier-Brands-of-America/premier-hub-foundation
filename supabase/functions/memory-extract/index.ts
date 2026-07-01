// ============================================================================
// memory-extract  —  verify_jwt = false  (secret-key authorized)
// ----------------------------------------------------------------------------
// The knowledge-graph extraction pipeline ("graphify in-app"). For a given
// entity (or a backfill batch) it:
//   1. Fetches the entity's text (pages, requests, tasks, transcripts).
//   2. Asks Claude (AI_ASSISTANT_API_KEY) to extract concepts + relationships
//      as strict JSON (concepts[] + relations[] with edge_kind/confidence/rationale).
//   3. Upserts memory_concepts (idempotent, bumps mention_count) and inserts
//      entity_relations: entity→concept ('mentions', EXTRACTED) + concept→concept
//      (EXTRACTED/INFERRED). Dedupe is enforced by the table's UNIQUE key.
//   4. Computes a gte-small embedding (free, 384-dim, no key) of the entity text
//      (chunked if long) and upserts memory_embeddings.
//
// Everything the function writes is server-side (service role, BYPASSRLS); the
// read paths that surface it (get_memory_graph / memory-search) are RLS-scoped.
//
// Secrets used: SUPABASE_URL, SUPABASE_SECRET_KEY, AI_ASSISTANT_API_KEY.
// ============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const AI_GATEWAY = Deno.env.get("AI_GATEWAY_URL") || "https://api.openai.com/v1/chat/completions";
const AI_MODEL = Deno.env.get("AI_MODEL") || "gpt-4o-mini";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") || "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_TEXT_CHARS = 8_000;   // cap fed to the extractor
const CHUNK_CHARS = 1_500;      // embedding chunk size
const MAX_CHUNKS = 6;           // safety cap per entity

// Relation types the entity_relations CHECK allows. Anything else → 'relates_to'.
const ALLOWED_RELATION_TYPES = new Set([
  "relates_to", "blocks", "duplicate_of", "parent_of", "belongs_to", "mentions",
]);

// deno-lint-ignore no-explicit-any
declare const Supabase: any;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type EntityRef = { entity_type: string; entity_id: string };

interface ExtractedRelation {
  from: string;
  to: string;
  type: string;
  edge_kind: "EXTRACTED" | "INFERRED";
  confidence: number;
  rationale: string;
}
interface ExtractionResult {
  concepts: string[];
  relations: ExtractedRelation[];
}

/** Fetch the plain text for an entity. Returns null when nothing to work with. */
async function fetchEntityText(
  // deno-lint-ignore no-explicit-any
  admin: any, type: string, id: string,
): Promise<{ title: string; text: string } | null> {
  if (type === "page") {
    const { data } = await admin.from("pages").select("title, body_text").eq("id", id).maybeSingle();
    if (!data) return null;
    return { title: data.title ?? "Untitled page", text: [data.title, data.body_text].filter(Boolean).join("\n") };
  }
  if (type === "request") {
    const { data } = await admin.from("requests").select("title, description").eq("id", id).maybeSingle();
    if (!data) return null;
    return { title: data.title ?? "Request", text: [data.title, data.description].filter(Boolean).join("\n") };
  }
  if (type === "task") {
    const { data } = await admin.from("tasks").select("title, description").eq("id", id).maybeSingle();
    if (!data) return null;
    return { title: data.title ?? "Task", text: [data.title, data.description].filter(Boolean).join("\n") };
  }
  if (type === "transcript") {
    const { data } = await admin.from("meeting_transcripts").select("subject, summary_md").eq("id", id).maybeSingle();
    if (!data) return null;
    return { title: data.subject ?? "Meeting", text: [data.subject, data.summary_md].filter(Boolean).join("\n") };
  }
  return null;
}

/** Ask the model to extract concepts + concept→concept relationships as JSON. */
async function extractConcepts(title: string, text: string): Promise<ExtractionResult> {
  const apiKey = Deno.env.get("AI_ASSISTANT_API_KEY");
  if (!apiKey) throw new Error("AI_ASSISTANT_API_KEY is not configured");

  const systemPrompt = `You are a knowledge-graph extractor. Given a document, identify the key
CONCEPTS (topics, themes, entities, products, initiatives — short noun phrases) and the
RELATIONSHIPS between those concepts.

Return ONLY minified JSON (no prose, no markdown fences) matching exactly:
{"concepts":["Concept A","Concept B"],
 "relations":[{"from":"Concept A","to":"Concept B","type":"relates_to","edge_kind":"EXTRACTED","confidence":0.0,"rationale":"one short clause"}]}

Rules:
- 3–8 concise concepts. Title Case. No duplicates, no sentences.
- "type" must be one of: relates_to, blocks, duplicate_of, parent_of, belongs_to.
- "edge_kind": "EXTRACTED" if the relation is stated in the text; "INFERRED" if you reasoned it.
- "confidence": 0..1. "rationale": <= 12 words.
- "from"/"to" MUST be exact strings from your "concepts" array.
- If nothing meaningful, return {"concepts":[],"relations":[]}.`;

  const userPrompt = `Title: ${title}\n\nDocument:\n${text.slice(0, MAX_TEXT_CHARS)}`;

  const res = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0,
      stream: false,
    }),
  });
  if (!res.ok) throw new Error(`extraction AI call failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const content: string = data?.choices?.[0]?.message?.content ?? "";
  return parseExtraction(content);
}

/** Tolerant JSON parse: strips markdown fences and grabs the first JSON object. */
export function parseExtraction(raw: string): ExtractionResult {
  const empty: ExtractionResult = { concepts: [], relations: [] };
  if (!raw) return empty;
  let s = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1) return empty;
  s = s.slice(start, end + 1);
  let obj: unknown;
  try { obj = JSON.parse(s); } catch { return empty; }
  const o = obj as Record<string, unknown>;

  const seen = new Set<string>();
  const concepts: string[] = [];
  for (const c of Array.isArray(o.concepts) ? o.concepts : []) {
    const label = String(c ?? "").trim();
    const key = label.toLowerCase();
    if (label && !seen.has(key)) { seen.add(key); concepts.push(label); }
  }
  const conceptKeys = new Set(concepts.map((c) => c.toLowerCase()));

  const relations: ExtractedRelation[] = [];
  for (const r of Array.isArray(o.relations) ? o.relations : []) {
    const rr = r as Record<string, unknown>;
    const from = String(rr.from ?? "").trim();
    const to = String(rr.to ?? "").trim();
    // both endpoints must be real concepts and distinct
    if (!from || !to || from.toLowerCase() === to.toLowerCase()) continue;
    if (!conceptKeys.has(from.toLowerCase()) || !conceptKeys.has(to.toLowerCase())) continue;
    let type = String(rr.type ?? "relates_to").trim();
    if (!ALLOWED_RELATION_TYPES.has(type)) type = "relates_to";
    const edge_kind = rr.edge_kind === "INFERRED" ? "INFERRED" : "EXTRACTED";
    let confidence = Number(rr.confidence);
    if (!Number.isFinite(confidence)) confidence = 0.5;
    confidence = Math.max(0, Math.min(1, confidence));
    relations.push({ from, to, type, edge_kind, confidence, rationale: String(rr.rationale ?? "").slice(0, 200) });
  }
  return { concepts, relations };
}

/** Split text into embedding chunks (word-boundary-ish), capped. */
export function chunkText(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  if (clean.length <= CHUNK_CHARS) return [clean];
  const chunks: string[] = [];
  for (let i = 0; i < clean.length && chunks.length < MAX_CHUNKS; i += CHUNK_CHARS) {
    chunks.push(clean.slice(i, i + CHUNK_CHARS));
  }
  return chunks;
}

/** Run the extraction + embedding for one entity. Idempotent. */
// deno-lint-ignore no-explicit-any
async function processEntity(admin: any, session: any, ref: EntityRef): Promise<{ concepts: number; relations: number; chunks: number }> {
  const src = await fetchEntityText(admin, ref.entity_type, ref.entity_id);
  if (!src || !src.text.trim()) return { concepts: 0, relations: 0, chunks: 0 };

  // ── Concept + relationship extraction ──
  const extraction = await extractConcepts(src.title, src.text);

  // Upsert concepts → label→id map.
  const conceptIdByKey = new Map<string, string>();
  for (const label of extraction.concepts) {
    const { data: cid } = await admin.rpc("upsert_concept", { p_label: label });
    if (cid) conceptIdByKey.set(label.toLowerCase(), cid as string);
  }

  // entity → concept ('mentions', EXTRACTED).
  const edges: Record<string, unknown>[] = [];
  for (const [, cid] of conceptIdByKey) {
    edges.push({
      source_type: ref.entity_type, source_id: ref.entity_id,
      target_type: "concept", target_id: cid,
      relation_type: "mentions", edge_kind: "EXTRACTED", confidence: 0.9,
      rationale: `Mentioned in ${ref.entity_type}`,
    });
  }
  // concept → concept (EXTRACTED / INFERRED).
  for (const rel of extraction.relations) {
    const s = conceptIdByKey.get(rel.from.toLowerCase());
    const t = conceptIdByKey.get(rel.to.toLowerCase());
    if (!s || !t || s === t) continue;
    edges.push({
      source_type: "concept", source_id: s,
      target_type: "concept", target_id: t,
      relation_type: rel.type, edge_kind: rel.edge_kind,
      confidence: rel.confidence, rationale: rel.rationale,
    });
  }
  // Idempotent: dedupe on the table's UNIQUE(source,target,relation_type).
  if (edges.length) {
    await admin.from("entity_relations")
      .upsert(edges, { onConflict: "source_type,source_id,target_type,target_id,relation_type", ignoreDuplicates: true });
  }

  // ── Embeddings (gte-small, free) ──
  const chunks = chunkText(src.text);
  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const embedding = await session.run(chunks[i], { mean_pool: true, normalize: true });
    rows.push({
      entity_type: ref.entity_type, entity_id: ref.entity_id,
      chunk_index: i, chunk: chunks[i], embedding,
    });
  }
  if (rows.length) {
    await admin.from("memory_embeddings")
      .upsert(rows, { onConflict: "entity_type,entity_id,chunk_index" });
  }

  return { concepts: conceptIdByKey.size, relations: extraction.relations.length, chunks: rows.length };
}

/** Collect a backfill batch across the text-bearing entity types. */
// deno-lint-ignore no-explicit-any
async function collectBackfill(admin: any, limit: number, only?: string): Promise<EntityRef[]> {
  const refs: EntityRef[] = [];
  const per = Math.max(1, Math.ceil(limit / (only ? 1 : 4)));
  const want = (t: string) => !only || only === t;
  if (want("page")) {
    const { data } = await admin.from("pages").select("id").is("archived_at", null).limit(per);
    (data ?? []).forEach((r: { id: string }) => refs.push({ entity_type: "page", entity_id: r.id }));
  }
  if (want("request")) {
    const { data } = await admin.from("requests").select("id").limit(per);
    (data ?? []).forEach((r: { id: string }) => refs.push({ entity_type: "request", entity_id: r.id }));
  }
  if (want("task")) {
    const { data } = await admin.from("tasks").select("id").limit(per);
    (data ?? []).forEach((r: { id: string }) => refs.push({ entity_type: "task", entity_id: r.id }));
  }
  if (want("transcript")) {
    const { data } = await admin.from("meeting_transcripts").select("id").eq("status", "summarized").limit(per);
    (data ?? []).forEach((r: { id: string }) => refs.push({ entity_type: "transcript", entity_id: r.id }));
  }
  return refs.slice(0, limit);
}

/** Confirm the caller can see one entity (RLS via their JWT) before extracting it. */
// deno-lint-ignore no-explicit-any
async function callerCanSee(userClient: any, type: string, id: string): Promise<boolean> {
  const table = type === "transcript" ? "meeting_transcripts"
    : type === "page" ? "pages"
    : type === "request" ? "requests"
    : type === "task" ? "tasks" : null;
  if (!table) return false;
  const { data } = await userClient.from(table).select("id").eq("id", id).maybeSingle();
  return !!data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SECRET = Deno.env.get("SUPABASE_SECRET_KEY")!;
  const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

  // ── Dual auth (mirrors sharepoint-provision) ──
  //   • Service secret → full access (backfill + any single entity).
  //   • Authenticated user JWT → single-entity extraction of a row they can see;
  //     admins may also backfill (powers the /memory "Rebuild memory" button).
  const authHeader = req.headers.get("Authorization") || "";
  const presented = req.headers.get("apikey") || authHeader.replace(/^Bearer\s+/i, "");

  const admin = createClient(SUPABASE_URL, SECRET);
  let isService = presented === SECRET;
  // deno-lint-ignore no-explicit-any
  let userClient: any = null;
  let isAdmin = false;

  if (!isService) {
    if (!authHeader) return json({ error: "Forbidden" }, 403);
    userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Forbidden" }, 403);
    const { data: prof } = await userClient.from("profiles").select("is_admin").eq("user_id", user.id).maybeSingle();
    isAdmin = !!prof?.is_admin;
  }

  const session = new Supabase.ai.Session("gte-small");

  try {
    const body = await req.json().catch(() => ({}));
    let refs: EntityRef[];

    if (body?.backfill) {
      if (!isService && !isAdmin) return json({ error: "Forbidden: backfill requires admin" }, 403);
      const limit = Math.min(Number(body.limit) || 20, 100);
      refs = await collectBackfill(admin, limit, body.entity_type);
    } else if (body?.entity_type && body?.entity_id) {
      // In user mode, only extract entities the caller is authorized to view.
      if (!isService && !(await callerCanSee(userClient, body.entity_type, body.entity_id))) {
        return json({ error: "Forbidden: entity not visible to caller" }, 403);
      }
      refs = [{ entity_type: body.entity_type, entity_id: body.entity_id }];
    } else {
      return json({ error: "provide {entity_type, entity_id} or {backfill:true, limit}" }, 400);
    }

    let concepts = 0, relations = 0, chunks = 0, processed = 0;
    for (const ref of refs) {
      try {
        const r = await processEntity(admin, session, ref);
        concepts += r.concepts; relations += r.relations; chunks += r.chunks; processed++;
      } catch (e) {
        console.error("processEntity failed", ref, e instanceof Error ? e.message : e);
      }
    }
    return json({ ok: true, processed, concepts, relations, chunks });
  } catch (e) {
    console.error("memory-extract error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
