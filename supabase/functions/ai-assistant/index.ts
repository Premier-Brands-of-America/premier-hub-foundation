import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY)
      throw new Error("Missing Supabase environment variables");

    // Extract user token from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create client as the authenticated user
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, isPreview, previewProfile } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Gather user-authorized data context ───
    let contextParts: string[] = [];

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    const userName = profile?.full_name || user.email || "User";
    const canViewDiagnostics = profile?.can_view_diagnostics || false;
    const isAdmin = profile?.is_admin || false;

    contextParts.push(`Current user: ${userName} (${user.email})`);
    contextParts.push(`Role: ${isAdmin ? "Admin" : "Standard user"}`);
    if (profile?.department) contextParts.push(`Department: ${profile.department}`);
    if (profile?.title) contextParts.push(`Title: ${profile.title}`);

    // Fetch user's tasks (private to them via RLS)
    const { data: tasks } = await supabase
      .from("tasks")
      .select("id, title, status, due_date, percent_complete, created_at, completed_at, description")
      .order("created_at", { ascending: false })
      .limit(100);

    if (tasks && tasks.length > 0) {
      const activeTasks = tasks.filter((t: any) => t.status === "active");
      const completedTasks = tasks.filter((t: any) => t.status === "complete");
      const overdueTasks = activeTasks.filter((t: any) => {
        if (!t.due_date) return false;
        return new Date(t.due_date) < new Date() && new Date(t.due_date).toDateString() !== new Date().toDateString();
      });

      contextParts.push(`\n--- USER'S TASKS ---`);
      contextParts.push(`Total: ${tasks.length} (${activeTasks.length} active, ${completedTasks.length} completed, ${overdueTasks.length} overdue)`);
      for (const t of tasks) {
        const due = t.due_date ? ` | Due: ${t.due_date}` : "";
        const pct = t.percent_complete !== null ? ` | ${t.percent_complete}%` : "";
        contextParts.push(`- [${t.status.toUpperCase()}] ${t.title}${due}${pct}`);
      }
    } else {
      contextParts.push(`\n--- USER'S TASKS ---\nNo tasks found.`);
    }

    // Fetch projects user can see (RLS handles visibility)
    const { data: projects } = await supabase
      .from("projects")
      .select("id, title, status, visibility, owner_id, desired_due_date, updated_due_date, overall_percent_complete, created_at, completed_at, description")
      .order("created_at", { ascending: false })
      .limit(100);

    if (projects && projects.length > 0) {
      // Get stakeholder info for these projects
      const projectIds = projects.map((p: any) => p.id);
      const { data: stakeholders } = await supabase
        .from("project_stakeholders")
        .select("project_id, user_id")
        .in("project_id", projectIds);

      // Get profile names for owners and stakeholders
      const allUserIds = new Set<string>();
      projects.forEach((p: any) => allUserIds.add(p.owner_id));
      (stakeholders || []).forEach((s: any) => allUserIds.add(s.user_id));

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, department, title")
        .in("user_id", Array.from(allUserIds));

      const profileMap = new Map<string, any>();
      (profiles || []).forEach((p: any) => profileMap.set(p.user_id, p));

      const getName = (uid: string) => {
        const p = profileMap.get(uid);
        return p?.full_name || p?.email || uid.slice(0, 8);
      };

      // Classify projects
      const ownedProjects = projects.filter((p: any) => p.owner_id === user.id);
      const assignedProjects = projects.filter((p: any) =>
        p.owner_id !== user.id &&
        (stakeholders || []).some((s: any) => s.project_id === p.id && s.user_id === user.id)
      );
      const activeProjects = projects.filter((p: any) => p.status === "active");
      const overdueProjects = activeProjects.filter((p: any) => {
        const due = p.updated_due_date || p.desired_due_date;
        if (!due) return false;
        return new Date(due) < new Date() && new Date(due).toDateString() !== new Date().toDateString();
      });

      contextParts.push(`\n--- PROJECTS ---`);
      contextParts.push(`Total visible: ${projects.length} (${ownedProjects.length} owned, ${assignedProjects.length} assigned, ${overdueProjects.length} overdue)`);

      for (const p of projects) {
        const owner = getName(p.owner_id);
        const due = p.updated_due_date || p.desired_due_date ? ` | Due: ${p.updated_due_date || p.desired_due_date}` : "";
        const pct = p.overall_percent_complete !== null ? ` | ${p.overall_percent_complete}%` : "";
        const vis = p.visibility === "public" ? "PUBLIC" : "PRIVATE";
        const projectStakeholders = (stakeholders || [])
          .filter((s: any) => s.project_id === p.id)
          .map((s: any) => getName(s.user_id));

        contextParts.push(`- [${p.status.toUpperCase()}/${vis}] "${p.title}" | Owner: ${owner}${due}${pct}`);
        if (projectStakeholders.length > 0) {
          contextParts.push(`  Stakeholders: ${projectStakeholders.join(", ")}`);
        }
        if (p.description) {
          contextParts.push(`  Description: ${p.description.slice(0, 200)}`);
        }
      }

      // Fetch recent activity across all visible projects
      const { data: recentActivity } = await supabase
        .from("project_activity")
        .select("project_id, action, field_name, old_value, new_value, created_at, user_id")
        .in("project_id", projectIds)
        .order("created_at", { ascending: false })
        .limit(30);

      if (recentActivity && recentActivity.length > 0) {
        contextParts.push(`\n--- RECENT PROJECT ACTIVITY (last 30 entries) ---`);
        for (const a of recentActivity) {
          const proj = projects.find((p: any) => p.id === a.project_id);
          const actor = getName(a.user_id);
          const projTitle = proj?.title || a.project_id.slice(0, 8);
          let desc = a.action;
          if (a.field_name) desc += ` (${a.field_name})`;
          if (a.old_value || a.new_value) desc += `: ${a.old_value || "—"} → ${a.new_value || "—"}`;
          contextParts.push(`- ${a.created_at.slice(0, 10)} | "${projTitle}" | ${actor}: ${desc}`);
        }
      }

      // Fetch recent project updates
      const { data: recentUpdates } = await supabase
        .from("project_updates")
        .select("project_id, content, user_id, created_at, updated_at, edited_by")
        .in("project_id", projectIds)
        .order("created_at", { ascending: false })
        .limit(20);

      if (recentUpdates && recentUpdates.length > 0) {
        contextParts.push(`\n--- RECENT PROJECT UPDATES (last 20) ---`);
        for (const u of recentUpdates) {
          const proj = projects.find((p: any) => p.id === u.project_id);
          const author = getName(u.user_id);
          contextParts.push(`- ${u.created_at.slice(0, 10)} | "${proj?.title}" | By ${author}: ${u.content.slice(0, 300)}`);
        }
      }
    } else {
      contextParts.push(`\n--- PROJECTS ---\nNo projects visible.`);
    }

    // Build system prompt
    const systemPrompt = `You are Premier Project Hub AI Assistant — a read-only, permission-aware assistant.

CRITICAL RULES:
1. You are READ-ONLY. You cannot create, edit, or delete anything. If asked to make changes, politely explain that you can only view and summarize data.
2. You only see data the current user is authorized to access. Everything below is the user's authorized view.
3. Be concise and helpful. Use bullet points and clear formatting.
4. When referring to dates, use relative terms like "3 days ago" alongside the actual date.
5. Today's date is ${new Date().toISOString().slice(0, 10)}.

USER'S AUTHORIZED DATA:
${contextParts.join("\n")}

CAPABILITIES:
- Summarize the user's work (tasks and projects)
- Identify overdue items
- Explain ownership and stakeholder relationships
- Summarize recent changes and activity
- Answer questions about project status, assignments, and history
${canViewDiagnostics ? "- Answer diagnostics-oriented questions (user has diagnostics access)" : "- User does NOT have diagnostics access — do not share diagnostics data"}

If a question is outside the available data, say so clearly.`;

    // Call AI gateway with streaming
    const aiResponse = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.slice(-20), // Keep conversation manageable
        ],
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
