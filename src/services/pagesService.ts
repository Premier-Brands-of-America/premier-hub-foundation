import { supabase } from "@/integrations/supabase/client";
import { isPreviewEnvironment } from "@/lib/environment";
import { getPreviewViewer } from "@/lib/previewViewer";
import { currentDemoViewer, DEMO_OTHER } from "@/lib/aclDemo";
import { canViewPageRow } from "@/lib/visibility";
import { DIRECTORY_PEOPLE } from "@/lib/directory";
import type {
  BacklinkRow, BacklinkTargetType, Page, PageTreeNode, PageVisibility,
  PageShare, EnrichedPageShare, PageShareRole,
} from "@/types/pages";

const IS_PREVIEW = isPreviewEnvironment();

// ─── Mock in-memory ───
let mockPages: Page[] = [];
let mockPageShares: PageShare[] = [];
let mockBacklinks: Array<{ source_page_id: string; source_title: string; snippet: string; created_at: string; target_type: BacklinkTargetType; target_id: string }> = [];
let counter = 1;
const newId = () => `mock-page-${counter++}`;

// ─── Preview ACL/sharing demo (Feature 5 + 6) ───
let pagesSeededFor: string | null = null;
function ensurePagesAclDemo() {
  if (!IS_PREVIEW) return;
  const pv = getPreviewViewer();
  if (!pv || pagesSeededFor === pv.userId) return;
  mockPages = mockPages.filter((p) => !p.id.startsWith("demo-acl-page-"));
  mockPageShares = mockPageShares.filter((s) => !s.page_id.startsWith("demo-acl-page-"));
  const now = new Date().toISOString();
  const mkPage = (id: string, owner: string, title: string, visibility: PageVisibility): Page => ({
    id, title, slug: id, body: {}, body_md: "", body_text: "", parent_id: null,
    owner_id: owner, visibility, department_id: null, icon: null, cover_url: null,
    created_at: now, updated_at: now, archived_at: null,
  });
  mockPages.push(
    mkPage("demo-acl-page-1", pv.userId, "My research notes", "private"),
    mkPage("demo-acl-page-2", DEMO_OTHER.user_id, "Team handbook (public)", "public"),
    mkPage("demo-acl-page-3", DEMO_OTHER.user_id, "Shared with you: Q3 brief", "private"),
    mkPage("demo-acl-page-4", DEMO_OTHER.user_id, "Morgan's private draft", "private"),
  );
  mockPageShares.push(
    { id: "demo-acl-share-1", page_id: "demo-acl-page-1", grantee_user_id: DEMO_OTHER.user_id, role: "view", created_at: now },
    { id: "demo-acl-share-2", page_id: "demo-acl-page-3", grantee_user_id: pv.userId, role: "view", created_at: now },
  );
  pagesSeededFor = pv.userId;
}

function sharesForPage(pageId: string): { granteeId: string; role: PageShareRole }[] {
  return mockPageShares
    .filter((s) => s.page_id === pageId)
    .map((s) => ({ granteeId: s.grantee_user_id, role: s.role }));
}

function slugify(t: string) {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Math.random().toString(36).slice(2, 8);
}

function extractMentions(md: string) {
  const re = /\[\[(page|project|task|request|user):([0-9a-fA-F-]{36})\]\]/g;
  const out: Array<{ target_type: BacklinkTargetType; target_id: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(md))) out.push({ target_type: m[1] as BacklinkTargetType, target_id: m[2] });
  return out;
}

export async function fetchPageTree(rootId?: string): Promise<PageTreeNode[]> {
  if (IS_PREVIEW) {
    ensurePagesAclDemo();
    const viewer = currentDemoViewer();
    const visible = (p: Page) =>
      !viewer ||
      canViewPageRow(viewer, {
        id: p.id,
        owner_id: p.owner_id,
        visibility: p.visibility,
        department_id: p.department_id,
        shares: sharesForPage(p.id),
      });
    const tree: PageTreeNode[] = [];
    const walk = (parent: string | null, depth: number) => {
      mockPages
        .filter((p) => p.parent_id === parent && !p.archived_at && visible(p) && (rootId ? depth > 0 || p.id === rootId : true))
        .sort((a, b) => a.title.localeCompare(b.title))
        .forEach((p) => {
          tree.push({ id: p.id, title: p.title, parent_id: p.parent_id, icon: p.icon, depth });
          walk(p.id, depth + 1);
        });
    };
    if (rootId) {
      const root = mockPages.find((p) => p.id === rootId);
      if (root) {
        tree.push({ id: root.id, title: root.title, parent_id: root.parent_id, icon: root.icon, depth: 0 });
        walk(root.id, 1);
      }
    } else {
      walk(null, 0);
    }
    return tree;
  }
  const { data, error } = await supabase.rpc("get_page_tree", { p_root_id: rootId ?? undefined });
  if (error) throw error;
  return (data ?? []) as PageTreeNode[];
}

export async function fetchPage(id: string): Promise<Page | null> {
  if (IS_PREVIEW) {
    ensurePagesAclDemo();
    const p = mockPages.find((p) => p.id === id) ?? null;
    if (!p) return null;
    const viewer = currentDemoViewer();
    if (
      viewer &&
      !canViewPageRow(viewer, {
        id: p.id,
        owner_id: p.owner_id,
        visibility: p.visibility,
        department_id: p.department_id,
        shares: sharesForPage(p.id),
      })
    )
      return null;
    return p;
  }
  const { data, error } = await supabase.from("pages").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as Page) ?? null;
}

export async function createPage(input: { title: string; parent_id?: string | null; visibility?: PageVisibility }): Promise<string> {
  if (IS_PREVIEW) {
    const id = newId();
    const now = new Date().toISOString();
    mockPages.push({
      id,
      title: input.title,
      slug: slugify(input.title),
      body: {},
      body_md: "",
      body_text: "",
      parent_id: input.parent_id ?? null,
      owner_id: getPreviewViewer()?.userId ?? "preview-user",
      visibility: input.visibility ?? "private",
      department_id: null,
      icon: null,
      cover_url: null,
      created_at: now,
      updated_at: now,
      archived_at: null,
    });
    return id;
  }
  const { data, error } = await supabase.rpc("create_page", {
    p_title: input.title,
    p_parent_id: input.parent_id ?? undefined,
    p_visibility: input.visibility ?? "private",
  });
  if (error) throw error;
  return data as string;
}

export async function savePageBody(id: string, body_md: string): Promise<void> {
  if (IS_PREVIEW) {
    const p = mockPages.find((x) => x.id === id);
    if (!p) return;
    p.body_md = body_md;
    p.body_text = body_md.replace(/\[\[[a-z]+:[0-9a-fA-F-]{36}\]\]/g, " ");
    p.updated_at = new Date().toISOString();
    mockBacklinks = mockBacklinks.filter((b) => b.source_page_id !== id);
    extractMentions(body_md).forEach((m) =>
      mockBacklinks.push({
        source_page_id: id,
        source_title: p.title,
        snippet: p.body_text?.slice(0, 80) ?? "",
        created_at: new Date().toISOString(),
        target_type: m.target_type,
        target_id: m.target_id,
      }),
    );
    return;
  }
  const { error } = await supabase.from("pages").update({ body_md }).eq("id", id);
  if (error) throw error;
}

export async function updatePageTitle(id: string, title: string): Promise<void> {
  if (IS_PREVIEW) {
    const p = mockPages.find((x) => x.id === id);
    if (p) { p.title = title; p.updated_at = new Date().toISOString(); }
    return;
  }
  const { error } = await supabase.from("pages").update({ title }).eq("id", id);
  if (error) throw error;
}

export async function updatePageMeta(id: string, patch: Partial<Pick<Page, "icon" | "cover_url" | "visibility" | "department_id">>): Promise<void> {
  if (IS_PREVIEW) {
    const p = mockPages.find((x) => x.id === id);
    if (p) Object.assign(p, patch, { updated_at: new Date().toISOString() });
    return;
  }
  const { error } = await supabase.from("pages").update(patch).eq("id", id);
  if (error) throw error;
}

export async function archivePage(id: string): Promise<void> {
  if (IS_PREVIEW) {
    const p = mockPages.find((x) => x.id === id);
    if (p) p.archived_at = new Date().toISOString();
    return;
  }
  const { error } = await supabase.from("pages").update({ archived_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function fetchBacklinks(targetType: BacklinkTargetType, targetId: string): Promise<BacklinkRow[]> {
  if (IS_PREVIEW) {
    return mockBacklinks
      .filter((b) => b.target_type === targetType && b.target_id === targetId)
      .map(({ source_page_id, source_title, snippet, created_at }) => ({ source_page_id, source_title, snippet, created_at }));
  }
  const { data, error } = await supabase.rpc("get_backlinks", { p_target_type: targetType, p_target_id: targetId });
  if (error) throw error;
  return (data ?? []) as BacklinkRow[];
}

export async function fetchAncestors(id: string): Promise<PageTreeNode[]> {
  if (IS_PREVIEW) {
    const chain: PageTreeNode[] = [];
    let cur = mockPages.find((p) => p.id === id);
    while (cur) {
      chain.unshift({ id: cur.id, title: cur.title, parent_id: cur.parent_id, icon: cur.icon, depth: 0 });
      cur = cur.parent_id ? mockPages.find((p) => p.id === cur!.parent_id) : undefined;
    }
    return chain;
  }
  // Walk via repeated parent lookups (small N)
  const chain: PageTreeNode[] = [];
  let curId: string | null = id;
  for (let i = 0; i < 12 && curId; i++) {
    const { data }: { data: { id: string; title: string; parent_id: string | null; icon: string | null } | null } =
      await supabase.from("pages").select("id,title,parent_id,icon").eq("id", curId).maybeSingle();
    if (!data) break;
    chain.unshift({ id: data.id, title: data.title, parent_id: data.parent_id, icon: data.icon, depth: 0 });
    curId = data.parent_id;
  }
  return chain;
}

// ─── Per-person sharing (Feature 6) ───

export async function fetchPageShares(pageId: string): Promise<EnrichedPageShare[]> {
  if (IS_PREVIEW) {
    ensurePagesAclDemo();
    return mockPageShares
      .filter((s) => s.page_id === pageId)
      .map((s) => {
        const p = DIRECTORY_PEOPLE.find((d) => d.user_id === s.grantee_user_id);
        return {
          ...s,
          full_name: p?.full_name ?? null,
          email: p?.email ?? null,
          title: p?.title ?? null,
          department: p?.department ?? null,
        };
      });
  }
  const { data, error } = await supabase
    .from("page_shares")
    .select("id, page_id, grantee_user_id, role, created_at")
    .eq("page_id", pageId);
  if (error) throw error;
  const shares = (data ?? []) as PageShare[];
  if (shares.length === 0) return [];
  const ids = shares.map((s) => s.grantee_user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, full_name, email, title, department")
    .in("user_id", ids);
  const byId = new Map((profiles ?? []).map((p) => [p.user_id, p]));
  return shares.map((s) => {
    const p = byId.get(s.grantee_user_id);
    return {
      ...s,
      full_name: p?.full_name ?? null,
      email: p?.email ?? null,
      title: p?.title ?? null,
      department: p?.department ?? null,
    };
  });
}

export async function addPageShare(pageId: string, granteeUserId: string, role: PageShareRole = "view"): Promise<void> {
  if (IS_PREVIEW) {
    ensurePagesAclDemo();
    const existing = mockPageShares.find((s) => s.page_id === pageId && s.grantee_user_id === granteeUserId);
    if (existing) {
      existing.role = role;
      return;
    }
    mockPageShares.push({
      id: newId(),
      page_id: pageId,
      grantee_user_id: granteeUserId,
      role,
      created_at: new Date().toISOString(),
    });
    return;
  }
  const { error } = await supabase
    .from("page_shares")
    .upsert({ page_id: pageId, grantee_user_id: granteeUserId, role }, { onConflict: "page_id,grantee_user_id" });
  if (error) throw error;
}

export async function updatePageShareRole(shareId: string, role: PageShareRole): Promise<void> {
  if (IS_PREVIEW) {
    const s = mockPageShares.find((x) => x.id === shareId);
    if (s) s.role = role;
    return;
  }
  const { error } = await supabase.from("page_shares").update({ role }).eq("id", shareId);
  if (error) throw error;
}

export async function removePageShare(shareId: string): Promise<void> {
  if (IS_PREVIEW) {
    mockPageShares = mockPageShares.filter((s) => s.id !== shareId);
    return;
  }
  const { error } = await supabase.from("page_shares").delete().eq("id", shareId);
  if (error) throw error;
}