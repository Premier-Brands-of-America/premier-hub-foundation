/**
 * Org hierarchy mapping (Feature 1).
 *
 * Pure, DB-agnostic logic that turns a flat list of people (each pointing at a
 * manager) into a reports-to / direct-reports tree. Used by the /org route and
 * the graph "Org" layout toggle, and seeded by the preview demo org tree.
 *
 * Cycle-safe: if the manager links contain a loop, nodes already placed are
 * never re-parented, so the build always terminates.
 */

export interface OrgPerson {
  id: string;
  /** id of this person's manager, or null/undefined for a root. */
  managerId?: string | null;
  name?: string;
  title?: string;
  department?: string;
}

export interface OrgNode<T extends OrgPerson = OrgPerson> {
  person: T;
  /** Direct reports, sorted by name then id for stable rendering. */
  reports: OrgNode<T>[];
  /** Distance from a root (root = 0). */
  depth: number;
}

const byNameThenId = (a: OrgPerson, b: OrgPerson) =>
  (a.name ?? "").localeCompare(b.name ?? "") || a.id.localeCompare(b.id);

/**
 * Build a forest of org trees. People whose managerId is null/undefined or
 * points outside the supplied set become roots. Duplicate ids are de-duped
 * (first wins). Self-management and cycles are broken (the looping person is
 * treated as a root).
 */
export function buildOrgTree<T extends OrgPerson>(people: readonly T[]): OrgNode<T>[] {
  const byId = new Map<string, T>();
  for (const p of people) if (!byId.has(p.id)) byId.set(p.id, p);

  const nodes = new Map<string, OrgNode<T>>();
  for (const p of byId.values()) nodes.set(p.id, { person: p, reports: [], depth: 0 });

  const roots: OrgNode<T>[] = [];
  for (const node of nodes.values()) {
    const mgrId = node.person.managerId;
    const parent = mgrId && mgrId !== node.person.id ? nodes.get(mgrId) : undefined;
    if (parent && !createsCycle(nodes, node.person.id, mgrId!)) {
      parent.reports.push(node);
    } else {
      roots.push(node);
    }
  }

  // Assign depth + sort reports deterministically.
  const assign = (node: OrgNode<T>, depth: number) => {
    node.depth = depth;
    node.reports.sort((a, b) => byNameThenId(a.person, b.person));
    for (const child of node.reports) assign(child, depth + 1);
  };
  roots.sort((a, b) => byNameThenId(a.person, b.person));
  for (const r of roots) assign(r, 0);
  return roots;
}

/** True if making `childId` report to `managerId` would close a management loop. */
function createsCycle<T extends OrgPerson>(
  nodes: Map<string, OrgNode<T>>,
  childId: string,
  managerId: string,
): boolean {
  let cursor: string | null | undefined = managerId;
  const seen = new Set<string>();
  while (cursor) {
    if (cursor === childId) return true;
    if (seen.has(cursor)) return true;
    seen.add(cursor);
    cursor = nodes.get(cursor)?.person.managerId ?? null;
  }
  return false;
}

/** Direct reports of a person (one level), sorted for stable rendering. */
export function directReportsOf<T extends OrgPerson>(people: readonly T[], managerId: string): T[] {
  return people.filter((p) => p.managerId === managerId && p.id !== managerId).sort(byNameThenId);
}

/** The management chain from a person up to the root: [manager, manager's manager, ...]. Cycle-safe. */
export function managementChainOf<T extends OrgPerson>(people: readonly T[], personId: string): T[] {
  const byId = new Map(people.map((p) => [p.id, p]));
  const chain: T[] = [];
  const seen = new Set<string>([personId]);
  let cursor = byId.get(personId)?.managerId ?? null;
  while (cursor && !seen.has(cursor)) {
    const mgr = byId.get(cursor);
    if (!mgr) break;
    chain.push(mgr);
    seen.add(cursor);
    cursor = mgr.managerId ?? null;
  }
  return chain;
}

/** Total number of people in the subtree rooted at `node` (excluding the node itself). */
export function countDescendants<T extends OrgPerson>(node: OrgNode<T>): number {
  return node.reports.reduce((sum, child) => sum + 1 + countDescendants(child), 0);
}

/** Flatten a forest depth-first (roots first), useful for list rendering. */
export function flattenOrg<T extends OrgPerson>(roots: readonly OrgNode<T>[]): OrgNode<T>[] {
  const out: OrgNode<T>[] = [];
  const walk = (n: OrgNode<T>) => {
    out.push(n);
    n.reports.forEach(walk);
  };
  roots.forEach(walk);
  return out;
}
