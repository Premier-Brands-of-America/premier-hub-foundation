import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUBFOLDERS = [
  "01-Submission",
  "02-Reference",
  "03-Working",
  "04-Review",
  "05-Approval",
  "06-Final",
  "07-Archive",
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getGraphToken() {
  const tenant = Deno.env.get("AZURE_TENANT_ID")!;
  const clientId = Deno.env.get("AZURE_CLIENT_ID")!;
  const clientSecret = Deno.env.get("AZURE_CLIENT_SECRET")!;
  const res = await fetch(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
    },
  );
  if (!res.ok) throw new Error(`token: ${res.status} ${await res.text()}`);
  const j = await res.json();
  return j.access_token as string;
}

async function graph(
  token: string,
  path: string,
  init: RequestInit = {},
) {
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  return res;
}

async function ensureFolder(
  token: string,
  driveId: string,
  parentPath: string,
  name: string,
) {
  const url = parentPath
    ? `/drives/${driveId}/root:/${encodeURI(parentPath)}:/children`
    : `/drives/${driveId}/root/children`;
  const res = await graph(token, url, {
    method: "POST",
    body: JSON.stringify({
      name,
      folder: {},
      "@microsoft.graph.conflictBehavior": "replace",
    }),
  });
  if (!res.ok) {
    throw new Error(`createFolder ${name}: ${res.status} ${await res.text()}`);
  }
  return await res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Wrap the ENTIRE handler so any thrown error is returned as a CORS-valid 500
  // with the real message (instead of the browser's opaque "Failed to send a
  // request to the Edge Function"). json() already attaches corsHeaders.
  try {
    // Fail fast with a clear message listing exactly which app-only secrets are
    // still missing, so the UI shows what infra is pending. SP_ROOT_FOLDER is
    // intentionally not required — it defaults to "ArtRequests".
    const requiredSecrets: Record<string, string | undefined> = {
      AZURE_TENANT_ID: Deno.env.get("AZURE_TENANT_ID"),
      AZURE_CLIENT_ID: Deno.env.get("AZURE_CLIENT_ID"),
      AZURE_CLIENT_SECRET: Deno.env.get("AZURE_CLIENT_SECRET"),
      SP_DRIVE_ID: Deno.env.get("SP_DRIVE_ID"),
    };
    const missing = Object.entries(requiredSecrets)
      .filter(([, v]) => !v)
      .map(([k]) => k);
    if (missing.length > 0) {
      return json(
        {
          error: `SharePoint provisioning is not configured. Missing secret(s): ${missing.join(", ")}. Set these app-only secrets on the sharepoint-provision function.`,
        },
        500,
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsErr } = await userClient.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (claimsErr || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claimsData.claims.sub as string;

    let body: { request_id?: string };
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }
    if (!body.request_id) return json({ error: "request_id required" }, 400);

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: request, error: reqErr } = await admin
      .from("requests")
      .select("*")
      .eq("id", body.request_id)
      .maybeSingle();
    if (reqErr || !request) return json({ error: "Request not found" }, 404);

    const { data: profile } = await admin
      .from("profiles")
      .select("role, is_admin")
      .eq("user_id", userId)
      .maybeSingle();

    const isPrivileged =
      profile?.is_admin === true || profile?.role === "designer" || profile?.role === "admin";
    if (request.requester_id !== userId && !isPrivileged) {
      return json({ error: "Forbidden" }, 403);
    }

    if (request.sharepoint_folder_url && request.sharepoint_folder_id) {
      return json({
        url: request.sharepoint_folder_url,
        id: request.sharepoint_folder_id,
        cached: true,
      });
    }

    const driveId = Deno.env.get("SP_DRIVE_ID")!;
    const root = Deno.env.get("SP_ROOT_FOLDER") || "ArtRequests";

    try {
      const token = await getGraphToken();
      // ensure root exists (ignore conflict by using replace? we need to NOT replace existing root — use rename behavior)
      // Try create root with fail behavior; if exists ignore.
      const rootRes = await graph(token, `/drives/${driveId}/root/children`, {
        method: "POST",
        body: JSON.stringify({
          name: root,
          folder: {},
          "@microsoft.graph.conflictBehavior": "fail",
        }),
      });
      if (!rootRes.ok && rootRes.status !== 409) {
        // 409 = already exists; anything else is error
        const txt = await rootRes.text();
        if (!txt.includes("nameAlreadyExists")) {
          throw new Error(`ensureRoot: ${rootRes.status} ${txt}`);
        }
      }

      const folderName = `${request.request_number ?? request.id} - ${request.title}`
        .replace(/[\\/:*?"<>|]/g, "-")
        .slice(0, 120);

      const created = await ensureFolder(token, driveId, root, folderName);

      for (const sub of SUBFOLDERS) {
        await ensureFolder(token, driveId, `${root}/${folderName}`, sub);
      }

      const folderUrl = created.webUrl as string;
      const folderId = created.id as string;

      await admin
        .from("requests")
        .update({
          sharepoint_folder_url: folderUrl,
          sharepoint_folder_id: folderId,
        })
        .eq("id", request.id);

      return json({ url: folderUrl, id: folderId, cached: false });
    } catch (e) {
      const msg = (e as Error).message;
      await admin.from("audit_log").insert({
        actor_id: null,
        entity_type: "request",
        entity_id: request.id,
        action: "sharepoint_provision_failed",
        after: { error: msg } as never,
      } as never);
      return json({ error: "Provisioning failed", detail: msg }, 500);
    }
  } catch (err) {
    // Any unexpected throw (auth, config, Supabase, JSON) → CORS-valid 500 with
    // the real message so the browser surfaces the actual cause.
    return json({ error: String((err as Error)?.message ?? err) }, 500);
  }
});

// TODO: Phase 2 — mirror Supabase Storage uploads to SharePoint subfolders by `kind`