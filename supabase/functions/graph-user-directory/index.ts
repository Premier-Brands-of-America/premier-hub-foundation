// ============================================================================
// graph-user-directory — sync richer M365 user info into org_directory (Feature 1)
// ----------------------------------------------------------------------------
// verify_jwt = true   ← we need the caller's identity to read the org via their
//   delegated token. DB writes use the admin client (BYPASSRLS); org_directory
//   is directory-level readable by all authenticated users.
//
// Pulls, for the signed-in user's tenant:
//   - /me                       → ms_user_id, ms_tenant_id
//   - /users?$select=...&$expand=manager  → jobTitle, department, officeLocation,
//                                          mail, manager (paged via @odata.nextLink)
//   - per user /users/{id}/directReports/$count (best-effort)
// then upserts org_directory (on user_id where it maps to a known profile, else by
// ms_user_id) and backfills profiles.title/department/office_location/manager_email
// when those are null.
//
// Required Graph scopes (delegated OR application): User.Read.All  (or User.Read +
//   Directory.Read.All for manager/directReports). See docs/GRAPH-PERMISSIONS.md.
//   Admin consent is granted by the owner; the app registration is NOT modified here.
//
// Secrets (via _shared/ms-graph.ts): MS_GRAPH_*, TOKEN_ENCRYPTION_KEY,
//   SUPABASE_SECRET_KEY, SUPABASE_PUBLISHABLE_KEY.
// ============================================================================

import {
  handleOptions,
  json,
  getAuthedUserId,
  getAdminClient,
  graphFetch,
} from "../_shared/ms-graph.ts";

interface GraphUser {
  id: string;
  displayName?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  officeLocation?: string | null;
  mail?: string | null;
  accountEnabled?: boolean | null;
  userPrincipalName?: string | null;
  manager?: { id?: string; mail?: string; userPrincipalName?: string } | null;
}

const SELECT = "id,displayName,jobTitle,department,officeLocation,mail,userPrincipalName,accountEnabled";

Deno.serve(async (req: Request) => {
  const pre = handleOptions(req);
  if (pre) return pre;

  try {
    const userId = await getAuthedUserId(req);
    if (!userId) return json({ error: "unauthorized" }, 401);

    // Resolve the caller's tenant from /me.
    const meRes = await graphFetch(userId, "/me?$select=id");
    if (meRes.status === 401 || meRes.status === 403) {
      return json({ error: "graph_unauthorized", message: "Reconnect Outlook / grant Directory access." }, 401);
    }
    const me = (await meRes.json()) as { id?: string };
    const msTenantId = req.headers.get("x-ms-tenant") ?? null;

    // Page through the org's users with their manager.
    const users: GraphUser[] = [];
    let path: string | null = `/users?$select=${SELECT}&$expand=manager($select=id,mail,userPrincipalName)&$top=100`;
    let guard = 0;
    while (path && guard < 50) {
      guard++;
      const res = await graphFetch(userId, path);
      if (res.status === 401 || res.status === 403) {
        return json({ error: "graph_unauthorized", message: "Missing User.Read.All / Directory.Read.All." }, 401);
      }
      if (!res.ok) return json({ error: "graph_error", status: res.status, body: await res.text() }, 500);
      const page = (await res.json()) as { value?: GraphUser[]; "@odata.nextLink"?: string };
      users.push(...(page.value ?? []));
      const next = page["@odata.nextLink"];
      path = next ? next.replace("https://graph.microsoft.com/v1.0", "") : null;
    }

    const admin = getAdminClient();

    // Map Graph users to local profiles by email; build directReports counts.
    const reportsByManager = new Map<string, number>();
    for (const u of users) {
      const mgr = u.manager?.id;
      if (mgr) reportsByManager.set(mgr, (reportsByManager.get(mgr) ?? 0) + 1);
    }

    // Resolve local profile user_ids by email for upsert keying.
    const emails = users.map((u) => (u.mail ?? u.userPrincipalName ?? "").toLowerCase()).filter(Boolean);
    const { data: profiles } = await admin
      .from("profiles")
      .select("user_id, email")
      .in("email", emails);
    const userIdByEmail = new Map((profiles ?? []).map((p: { user_id: string; email: string | null }) => [(p.email ?? "").toLowerCase(), p.user_id]));

    let synced = 0;
    for (const u of users) {
      const email = (u.mail ?? u.userPrincipalName ?? "").toLowerCase();
      const localUserId = userIdByEmail.get(email);
      const row = {
        user_id: localUserId ?? null,
        ms_user_id: u.id,
        ms_tenant_id: msTenantId,
        job_title: u.jobTitle ?? null,
        department: u.department ?? null,
        office_location: u.officeLocation ?? null,
        mail: u.mail ?? u.userPrincipalName ?? null,
        full_name: u.displayName ?? null,
        account_enabled: u.accountEnabled ?? true,
        manager_ms_user_id: u.manager?.id ?? null,
        manager_email: (u.manager?.mail ?? u.manager?.userPrincipalName ?? null),
        direct_reports_count: reportsByManager.get(u.id) ?? 0,
        synced_at: new Date().toISOString(),
      };
      // Upsert keyed by ms_user_id (stable per tenant).
      const { error } = await admin.from("org_directory").upsert(row, { onConflict: "ms_user_id" });
      if (error) continue;
      synced++;

      // Backfill richer fields onto the local profile when missing.
      if (localUserId) {
        await admin
          .from("profiles")
          .update({
            title: u.jobTitle ?? undefined,
            department: u.department ?? undefined,
            office_location: u.officeLocation ?? undefined,
            manager_email: row.manager_email ?? undefined,
          })
          .eq("user_id", localUserId);
      }
    }

    return json({ ok: true, synced, total: users.length, me: me.id ?? null });
  } catch (e) {
    return json({ error: "internal", message: e instanceof Error ? e.message : String(e) }, 500);
  }
});
