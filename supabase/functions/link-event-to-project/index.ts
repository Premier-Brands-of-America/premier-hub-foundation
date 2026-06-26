// ============================================================================
// link-event-to-project — associate a calendar event with a project (OUTLOOK)
// ----------------------------------------------------------------------------
// verify_jwt = true   ← consolidate into supabase/config.toml at P4 (lead)
//   Sets calendar_events.project_id. INTEG-TEAMS reads this link (via the
//   event's join_web_url) to attach transcripts to the right project.
//
// Body: { project_id: string | null,  and ONE selector of:
//         event_id?: string  (calendar_events.id)
//         ms_event_id?: string
//         join_web_url?: string }
//   project_id = null  → unlink.
//
// AuthZ: caller must own the event AND (when linking) be able to view the
//   target project — checked with the RLS-scoped user client against the real
//   can_view_project policy. The write is performed with the secret key but is
//   always constrained to the caller's own user_id.
// ============================================================================

import {
  handleOptions,
  json,
  getAuthedUserId,
  getUserClient,
  getAdminClient,
} from "../_shared/ms-graph.ts";

interface Body {
  project_id?: string | null;
  event_id?: string;
  ms_event_id?: string;
  join_web_url?: string;
}

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userId = await getAuthedUserId(req);
    if (!userId) return json({ error: "Unauthorized" }, 401);

    let body: Body;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    const projectId = body.project_id ?? null;
    if (!body.event_id && !body.ms_event_id && !body.join_web_url) {
      return json({ error: "Provide event_id, ms_event_id, or join_web_url" }, 400);
    }

    // When linking, confirm the caller can actually see the project (RLS).
    if (projectId) {
      const userClient = getUserClient(authHeader);
      const { data: visible, error: visErr } = await userClient
        .from("projects")
        .select("id")
        .eq("id", projectId)
        .maybeSingle();
      if (visErr) return json({ error: visErr.message }, 500);
      if (!visible) return json({ error: "Project not found or not visible" }, 403);
    }

    const admin = getAdminClient();
    let q = admin
      .from("calendar_events")
      .update({ project_id: projectId })
      .eq("user_id", userId);

    if (body.event_id) q = q.eq("id", body.event_id);
    else if (body.ms_event_id) q = q.eq("ms_event_id", body.ms_event_id);
    else q = q.eq("join_web_url", body.join_web_url!);

    const { data, error } = await q.select("id");
    if (error) return json({ error: error.message }, 500);

    return json({ updated: data?.length ?? 0, project_id: projectId });
  } catch (e) {
    console.error("[link-event-to-project]", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
