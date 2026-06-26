// ============================================================================
// mail-search — Notion-parity Outlook email search via Graph (INTEG-OUTLOOK)
// ----------------------------------------------------------------------------
// verify_jwt = true   ← consolidate into supabase/config.toml at P4 (lead)
//   Reads the caller's mail live through Graph (/me/messages?$search=…). Tokens
//   never reach the browser — the search runs server-side on the caller's
//   behalf. Mail is NOT persisted (search-only, matching Notion's connector).
//
// Body: { query: string, top?: number }
//
// Secrets: (via _shared/ms-graph.ts) MS_GRAPH_*, TOKEN_ENCRYPTION_KEY,
//          SUPABASE_SECRET_KEY, SUPABASE_PUBLISHABLE_KEY.
// ============================================================================

import { handleOptions, json, getAuthedUserId, graphFetch } from "../_shared/ms-graph.ts";

interface GraphMessage {
  id: string;
  subject?: string;
  bodyPreview?: string;
  webLink?: string;
  receivedDateTime?: string;
  from?: { emailAddress?: { name?: string; address?: string } };
}

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;

  try {
    const userId = await getAuthedUserId(req);
    if (!userId) return json({ error: "Unauthorized" }, 401);

    let query = "";
    let top = 25;
    try {
      const body = await req.json();
      query = typeof body?.query === "string" ? body.query.trim() : "";
      if (Number.isFinite(body?.top)) top = Math.min(Math.max(1, Number(body.top)), 50);
    } catch {
      // ignore
    }
    if (!query) return json({ messages: [] });

    // $search requires the eventual-consistency header.
    const path =
      `/me/messages?$search="${encodeURIComponent(query)}"&$top=${top}` +
      `&$select=id,subject,bodyPreview,webLink,receivedDateTime,from`;
    const res = await graphFetch(userId, path, { headers: { ConsistencyLevel: "eventual" } });

    if (res.status === 401 || res.status === 403) {
      return json({ error: "Microsoft Graph authorization failed. Reconnect Outlook." }, 401);
    }
    if (!res.ok) {
      console.error("[mail-search] graph:", res.status, await res.text());
      return json({ error: "Mail search failed" }, 502);
    }

    const data = await res.json();
    const messages = ((data.value ?? []) as GraphMessage[]).map((m) => ({
      id: m.id,
      subject: m.subject ?? "(no subject)",
      preview: m.bodyPreview ?? "",
      web_link: m.webLink ?? null,
      received_at: m.receivedDateTime ?? null,
      from_name: m.from?.emailAddress?.name ?? m.from?.emailAddress?.address ?? null,
    }));

    return json({ messages });
  } catch (e) {
    if (e instanceof Error && e.message === "NO_CONNECTION") {
      return json({ error: "No Outlook connection. Connect Outlook first." }, 409);
    }
    console.error("[mail-search]", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
