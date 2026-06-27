# Feature 7 — Memory Graph (personal "second brain", Obsidian/Roam/Logseq-style)

A THIRD graph view (besides Network and Org). Per user, it shows EVERYTHING the user
can see (per ACL) interconnected as a personal knowledge/memory map: pages, projects,
tasks, art-requests, notes — and ALL their links.

## What it is (patterns from Obsidian/Roam/Logseq knowledge graphs)
- A "second brain": nodes = every entity (page/project/task/request/person), edges =
  every relationship: page [[wikilinks]] + backlinks + @mentions, project↔task,
  task↔page, request↔project, assignments, parent/child, "relates to", etc.
- **Global graph** (the whole personal memory) + **Local graph** (focus one node and
  show its neighborhood with a depth/“hops” slider 1–3) — the Obsidian local/global pattern.
- Node SIZE by degree so hubs / Maps-of-Content stand out; color by entity type.
- Filters: by type, by tag, by recency/time, hide-orphans, text highlight/search.
- Optional recency emphasis (recently touched nodes glow brighter) — "memory" feel.
- Scoped by the ACL: only shows what the user is allowed to see; it is the user's own
  memory of their work, not the org-wide network.

## How to build it (reuse what exists)
- REUSE the NexoString GraphCanvas engine (glow/bloom, DiceBear avatars, bob/breathe,
  particles, curved gradient edges, mono labels) — same renderer, different data source.
- Data: build a unified graph payload from ALL entity types + ALL link sources
  (extend the existing graph-data hook / lib/graph build to include pages' wikilinks,
  backlinks, mentions, and cross-entity relations). Pages already have [[ ]] wikilinks +
  backlinks — include those edges.
- Route: add `/memory` (nav entry "Memory") AND/OR make the graph a unified view with a
  mode switch: **Network / Org / Memory**. Local-graph mode opens when you focus a node
  (also reachable from any page/project/task detail: "Open in Memory Graph").
- Keep it performant (cap initial render, lazy expand on focus).

## DoD for feature 7
- [ ] `/memory` route (nav "Memory") with the personal memory graph (global + local
      modes, depth slider, type/tag/recency filters, hide-orphans, search/highlight).
- [ ] Pulls ALL entity types + ALL links (incl. page wikilinks/backlinks/mentions),
      scoped by ACL.
- [ ] Uses the NexoString renderer (glow + avatars + motion). Node size by degree.
- [ ] "Open in Memory Graph" entry point from page/project/task detail (local focus).
- [ ] Works in the preview demo path; tsc+build green; committed.
