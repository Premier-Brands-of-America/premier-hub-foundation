/**
 * Preview demo Memory Graph (Feature 7) — a personal "second brain".
 *
 * Assembles everything the signed-in viewer can see (per ACL) into one
 * interconnected knowledge graph: projects, tasks, pages/notes, requests, people
 * — plus all their links (page [[wikilinks]] + backlinks + @mentions and
 * cross-entity relations). Node degree drives size in the canvas, so hubs
 * (you, a Map-of-Content note) stand out, matching the Obsidian/Roam pattern.
 *
 * On deploy the real Memory Graph reuses the RLS-scoped get_graph_data RPC with
 * all entity + relation types; this builder powers the clickable preview.
 */

import type { GraphEdge, GraphNode, GraphPayload } from "@/types/graph";
import type { VisibilityViewer } from "@/lib/visibility";
import { canViewProjectRow, canViewTaskRow } from "@/lib/visibility";
import { buildDemoProjects, buildDemoTasks, DEMO_OTHER, DEMO_REPORT } from "@/lib/aclDemo";

export function buildMemoryGraph(viewer: VisibilityViewer): GraphPayload {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const nodeIds = new Set<string>();

  const addNode = (n: GraphNode) => {
    if (nodeIds.has(n.id)) return;
    nodeIds.add(n.id);
    nodes.push(n);
  };
  const addEdge = (e: GraphEdge) => {
    if (nodeIds.has(e.source) && nodeIds.has(e.target)) edges.push(e);
  };

  // ── People the viewer interacts with ──
  const people: { id: string; label: string; role: string }[] = [
    { id: viewer.userId, label: "You", role: "you" },
    { id: DEMO_REPORT.user_id, label: DEMO_REPORT.full_name, role: "direct report" },
    { id: DEMO_OTHER.user_id, label: DEMO_OTHER.full_name, role: "colleague" },
  ];
  people.forEach((p) =>
    addNode({ id: `user:${p.id}`, entityId: p.id, type: "user", label: p.label, metadata: { role: p.role } }),
  );

  // ── Projects + tasks (ACL-scoped) ──
  const { projects, stakeholders } = buildDemoProjects({ userId: viewer.userId, full_name: "You" });
  const visibleProjects = projects.filter((p) =>
    canViewProjectRow(viewer, p, stakeholders.filter((s) => s.project_id === p.id).map((s) => s.user_id)),
  );
  visibleProjects.forEach((p) => {
    addNode({
      id: `project:${p.id}`,
      entityId: p.id,
      type: "project",
      label: p.title,
      status: p.status,
      metadata: { visibility: p.visibility },
    });
    // owner / stakeholder edges
    addEdge({ id: `owns-${p.id}`, source: `user:${p.owner_id}`, target: `project:${p.id}`, type: "owns" });
    stakeholders
      .filter((s) => s.project_id === p.id && s.user_id !== p.owner_id)
      .forEach((s) =>
        addEdge({ id: `stake-${p.id}-${s.user_id}`, source: `user:${s.user_id}`, target: `project:${p.id}`, type: "stakeholder" }),
      );
  });

  const visibleTasks = buildDemoTasks({ userId: viewer.userId }).filter((t) => canViewTaskRow(viewer, t));
  // map demo tasks to a related project where it makes sense
  const TASK_PROJECT: Record<string, string> = {
    "demo-acl-t1": "demo-acl-p1",
    "demo-acl-t4": "demo-acl-p4",
  };
  visibleTasks.forEach((t) => {
    addNode({ id: `task:${t.id}`, entityId: t.id, type: "task", label: t.title, status: t.status });
    addEdge({ id: `assign-${t.id}`, source: `task:${t.id}`, target: `user:${t.user_id}`, type: "assigned_to" });
    const proj = TASK_PROJECT[t.id];
    if (proj) addEdge({ id: `belongs-${t.id}`, source: `task:${t.id}`, target: `project:${proj}`, type: "belongs_to" });
  });

  // ── A couple of art requests ──
  const requests = [
    { id: "req-204", label: "ART-204 · Spring banner", project: "demo-acl-p1" },
    { id: "req-205", label: "ART-205 · Riley assets", project: "demo-acl-p4" },
  ];
  requests.forEach((r) => {
    addNode({ id: `request:${r.id}`, entityId: r.id, type: "request", label: r.label, status: "in_review" });
    addEdge({ id: `rel-${r.id}`, source: `request:${r.id}`, target: `project:${r.project}`, type: "relates_to" });
  });

  // ── Notes (pages) with a Map-of-Content hub + wikilinks/mentions ──
  const moc = "page:moc";
  addNode({ id: moc, entityId: "moc", type: "page", label: "🧠 My Notes (MOC)", metadata: { hub: true } });

  const notes = [
    { id: "note-launch", label: "Launch plan notes", mentions: ["project:demo-acl-p1", `user:${viewer.userId}`] },
    { id: "note-campaign", label: "Campaign ideas", mentions: ["project:demo-acl-p4", `user:${DEMO_REPORT.user_id}`] },
    { id: "note-1on1", label: "1:1 with Riley", mentions: [`user:${DEMO_REPORT.user_id}`, "task:demo-acl-t4"] },
    { id: "note-brand", label: "Brand voice", mentions: [] },
    { id: "note-research", label: "Research links", mentions: ["page:note-brand"] },
  ];
  notes.forEach((n) => {
    addNode({ id: `page:${n.id}`, entityId: n.id, type: "page", label: n.label });
    // wikilink from the MOC to each note (parent_of + linked_from)
    addEdge({ id: `moc-${n.id}`, source: moc, target: `page:${n.id}`, type: "linked_from" });
  });
  // backlink/cross-note wikilink
  addEdge({ id: "note-link-1", source: "page:note-research", target: "page:note-brand", type: "linked_from" });
  // @mentions / cross-entity links from notes
  notes.forEach((n) =>
    n.mentions.forEach((target, i) =>
      addEdge({ id: `mention-${n.id}-${i}`, source: `page:${n.id}`, target, type: "mentions" }),
    ),
  );

  return { nodes, edges, truncated: false };
}
