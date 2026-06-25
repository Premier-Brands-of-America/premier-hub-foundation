import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") || "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY = Deno.env.get("AI_GATEWAY_URL") || "https://api.openai.com/v1/chat/completions";
const AI_MODEL = Deno.env.get("AI_MODEL") || "gpt-4o-mini";

// ─── Rate limiting ───
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT;
}

// ─── Context limits ───
const MAX_TASKS = 50;
const MAX_PROJECTS = 50;
const MAX_ACTIVITY = 15;
const MAX_UPDATES = 10;
const MAX_DESCRIPTION_LENGTH = 150;

// ─── In-memory context cache (per session) ───
const contextCache = new Map<string, { context: string; timestamp: number }>();
const CONTEXT_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ─── Context building helpers ───

function buildUserInfo(profile: any, user: any): string {
  const parts: string[] = [];
  const userName = profile?.full_name || user.email || "User";
  const isAdmin = profile?.is_admin || false;
  parts.push(`Current user: ${userName} (${user.email})`);
  parts.push(`Role: ${isAdmin ? "Admin" : "Standard user"}`);
  if (profile?.department) parts.push(`Department: ${profile.department}`);
  if (profile?.title) parts.push(`Title: ${profile.title}`);
  return parts.join("\n");
}

function formatTasksContext(tasks: any[]): string {
  const parts: string[] = [];
  if (!tasks || tasks.length === 0) {
    return "\n--- USER'S TASKS ---\nNo tasks found.";
  }
  const activeTasks = tasks.filter((t: any) => t.status === "active");
  const completedTasks = tasks.filter((t: any) => t.status === "complete");
  const overdueTasks = activeTasks.filter((t: any) => {
    if (!t.due_date) return false;
    return new Date(t.due_date) < new Date() && new Date(t.due_date).toDateString() !== new Date().toDateString();
  });

  parts.push(`\n--- USER'S TASKS ---`);
  parts.push(`Total: ${tasks.length} (${activeTasks.length} active, ${completedTasks.length} completed, ${overdueTasks.length} overdue)`);

  const tasksToShow = tasks.slice(0, MAX_TASKS);
  for (const t of tasksToShow) {
    const due = t.due_date ? ` | Due: ${t.due_date}` : "";
    const pct = t.percent_complete !== null ? ` | ${t.percent_complete}%` : "";
    parts.push(`- [${t.status.toUpperCase()}] ${t.title}${due}${pct}`);
  }
  if (tasks.length > MAX_TASKS) {
    parts.push(`(Showing ${MAX_TASKS} of ${tasks.length} tasks)`);
  }
  return parts.join("\n");
}

function formatProjectsContext(
  projects: any[], stakeholders: any[], profileMap: Map<string, any>, userId: string
): string {
  const parts: string[] = [];
  const getName = (uid: string) => {
    const p = profileMap.get(uid);
    return p?.full_name || p?.email || uid.slice(0, 8);
  };

  const ownedProjects = projects.filter((p: any) => p.owner_id === userId);
  const assignedProjects = projects.filter((p: any) =>
    p.owner_id !== userId &&
    (stakeholders || []).some((s: any) => s.project_id === p.id && s.user_id === userId)
  );
  const activeProjects = projects.filter((p: any) => p.status === "active");
  const overdueProjects = activeProjects.filter((p: any) => {
    const due = p.updated_due_date || p.desired_due_date;
    if (!due) return false;
    return new Date(due) < new Date() && new Date(due).toDateString() !== new Date().toDateString();
  });

  parts.push(`\n--- PROJECTS ---`);
  parts.push(`Total visible: ${projects.length} (${ownedProjects.length} owned, ${assignedProjects.length} assigned, ${overdueProjects.length} overdue)`);

  const projectsToShow = projects.slice(0, MAX_PROJECTS);
  for (const p of projectsToShow) {
    const owner = getName(p.owner_id);
    const due = p.updated_due_date || p.desired_due_date ? ` | Due: ${p.updated_due_date || p.desired_due_date}` : "";
    const pct = p.overall_percent_complete !== null ? ` | ${p.overall_percent_complete}%` : "";
    const vis = p.visibility === "public" ? "PUBLIC" : "PRIVATE";
    const projectStakeholders = (stakeholders || [])
      .filter((s: any) => s.project_id === p.id)
      .map((s: any) => getName(s.user_id));

    parts.push(`- [${p.status.toUpperCase()}/${vis}] "${p.title}" | Owner: ${owner}${due}${pct}`);
    if (projectStakeholders.length > 0) {
      parts.push(`  Stakeholders: ${projectStakeholders.join(", ")}`);
    }
    if (p.description) {
      const desc = p.description.length > MAX_DESCRIPTION_LENGTH
        ? p.description.slice(0, MAX_DESCRIPTION_LENGTH) + "..."
        : p.description;
      parts.push(`  Description: ${desc}`);
    }
  }
  if (projects.length > MAX_PROJECTS) {
    parts.push(`(Showing ${MAX_PROJECTS} of ${projects.length} projects)`);
  }
  return parts.join("\n");
}

function formatActivityContext(activity: any[], projects: any[], profileMap: Map<string, any>): string {
  if (!activity || activity.length === 0) return "";
  const parts: string[] = [];
  const getName = (uid: string) => {
    const p = profileMap.get(uid);
    return p?.full_name || p?.email || uid.slice(0, 8);
  };

  parts.push(`\n--- RECENT PROJECT ACTIVITY (last ${activity.length} entries) ---`);
  for (const a of activity) {
    const proj = projects.find((p: any) => p.id === a.project_id);
    const actor = getName(a.user_id);
    const projTitle = proj?.title || a.project_id.slice(0, 8);
    let desc = a.action;
    if (a.field_name) desc += ` (${a.field_name})`;
    if (a.old_value || a.new_value) desc += `: ${a.old_value || "—"} → ${a.new_value || "—"}`;
    parts.push(`- ${a.created_at.slice(0, 10)} | "${projTitle}" | ${actor}: ${desc}`);
  }
  return parts.join("\n");
}

function formatUpdatesContext(updates: any[], projects: any[], profileMap: Map<string, any>): string {
  if (!updates || updates.length === 0) return "";
  const parts: string[] = [];
  const getName = (uid: string) => {
    const p = profileMap.get(uid);
    return p?.full_name || p?.email || uid.slice(0, 8);
  };

  parts.push(`\n--- RECENT PROJECT UPDATES (last ${updates.length}) ---`);
  for (const u of updates) {
    const proj = projects.find((p: any) => p.id === u.project_id);
    const author = getName(u.user_id);
    const content = u.content.length > 300 ? u.content.slice(0, 300) + "..." : u.content;
    parts.push(`- ${u.created_at.slice(0, 10)} | "${proj?.title}" | By ${author}: ${content}`);
  }
  return parts.join("\n");
}

async function buildUserContext(supabase: any, user: any, profile: any): Promise<string> {
  const parts: string[] = [];

  // User info
  parts.push(buildUserInfo(profile, user));

  // Tasks
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, status, due_date, percent_complete, created_at, completed_at, description")
    .order("created_at", { ascending: false })
    .limit(MAX_TASKS + 10);
  parts.push(formatTasksContext(tasks || []));

  // Projects
  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, status, visibility, owner_id, desired_due_date, updated_due_date, overall_percent_complete, created_at, completed_at, description")
    .order("created_at", { ascending: false })
    .limit(MAX_PROJECTS + 10);

  if (projects && projects.length > 0) {
    const projectIds = projects.map((p: any) => p.id);
    const { data: stakeholders } = await supabase
      .from("project_stakeholders")
      .select("project_id, user_id")
      .in("project_id", projectIds);

    const allUserIds = new Set<string>();
    projects.forEach((p: any) => allUserIds.add(p.owner_id));
    (stakeholders || []).forEach((s: any) => allUserIds.add(s.user_id));

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, department, title")
      .in("user_id", Array.from(allUserIds));

    const profileMap = new Map<string, any>();
    (profiles || []).forEach((p: any) => profileMap.set(p.user_id, p));

    parts.push(formatProjectsContext(projects, stakeholders || [], profileMap, user.id));

    // Recent activity (limited)
    const { data: recentActivity } = await supabase
      .from("project_activity")
      .select("project_id, action, field_name, old_value, new_value, created_at, user_id")
      .in("project_id", projectIds)
      .order("created_at", { ascending: false })
      .limit(MAX_ACTIVITY);
    parts.push(formatActivityContext(recentActivity || [], projects, profileMap));

    // Recent updates (limited)
    const { data: recentUpdates } = await supabase
      .from("project_updates")
      .select("project_id, content, user_id, created_at, updated_at, edited_by")
      .in("project_id", projectIds)
      .order("created_at", { ascending: false })
      .limit(MAX_UPDATES);
    parts.push(formatUpdatesContext(recentUpdates || [], projects, profileMap));
  } else {
    parts.push(`\n--- PROJECTS ---\nNo projects visible.`);
  }

  parts.push(`\nContext gathered at: ${new Date().toISOString()} (data may be a few minutes old during this conversation)`);
  return parts.filter(Boolean).join("\n");
}

// ─── Main handler ───

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const AI_ASSISTANT_API_KEY = Deno.env.get("AI_ASSISTANT_API_KEY");
    if (!AI_ASSISTANT_API_KEY) throw new Error("AI_ASSISTANT_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error("Missing Supabase environment variables");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!checkRateLimit(user.id)) {
      return new Response(JSON.stringify({ error: "Too many requests. Please wait a moment." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { sessionId, messages, refreshContext } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Get user profile ───
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, department, title, is_admin, can_view_diagnostics")
      .eq("user_id", user.id)
      .single();

    const canViewDiagnostics = profile?.can_view_diagnostics || false;

    // ─── Context caching per session ───
    const cacheKey = sessionId ? `${user.id}:${sessionId}` : user.id;
    let contextString: string | null = null;

    if (!refreshContext) {
      const cached = contextCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CONTEXT_TTL_MS) {
        contextString = cached.context;
      }
    }

    if (!contextString) {
      contextString = await buildUserContext(supabase, user, profile);
      contextCache.set(cacheKey, { context: contextString, timestamp: Date.now() });
    }

    // ─── Build system prompt ───
    const systemPrompt = `You are Premier Project Hub AI Assistant — a read-only, permission-aware assistant.

CRITICAL RULES:
1. You are READ-ONLY. You cannot create, edit, or delete anything. If asked to make changes, politely explain that you can only view and summarize data.
2. You only see data the current user is authorized to access. Everything below is the user's authorized view.
3. Be concise and helpful. Use bullet points and clear formatting.
4. When referring to dates, use relative terms like "3 days ago" alongside the actual date.
5. Today's date is ${new Date().toISOString().slice(0, 10)}.

USER'S AUTHORIZED DATA:
${contextString}

CAPABILITIES:
- Summarize the user's work (tasks and projects)
- Identify overdue items
- Explain ownership and stakeholder relationships
- Summarize recent changes and activity
- Answer questions about project status, assignments, and history
${canViewDiagnostics ? "- Answer diagnostics-oriented questions (user has diagnostics access)" : "- User does NOT have diagnostics access — do not share diagnostics data"}

If a question is outside the available data, say so clearly.`;

    // ─── Call AI gateway ───
    const aiResponse = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_ASSISTANT_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.slice(-20),
        ],
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(aiResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-assistant error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
