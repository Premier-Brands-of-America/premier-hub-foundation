# Anytype Research

> Research for Premier Project Hub v2. Focus: Anytype's typed-object/relation model, graph paradigm, and local-first UX — and which ideas map onto our projects ↔ tasks ↔ pages workflow.
> Sources current as of 2025–2026.

## Overview

Anytype is a free, open-source, **local-first** knowledge workspace where "everything is an Object" — notes, tasks, books, people, meetings, and ideas are all modeled as typed objects connected by relations ([Anytype Docs – Types](https://doc.anytype.io/anytype-docs/getting-started/types)). It positions itself as the privacy-respecting middle ground between Notion (flexible databases, but cloud-hosted and proprietary) and Obsidian (local files + graph, but loosely structured). Product Hunt frames it bluntly as "if Notion and Slack had a decentralized baby" ([Product Hunt](https://www.producthunt.com/products/anytype)), and head-to-head reviews pitch it as a "privacy showdown" winner against Notion ([ToolPilgrim](https://toolpilgrim.com/notion-vs-anytype/)).

Its core audience is privacy- and ownership-minded knowledge workers: people who want a Notion-like structured database experience but with their data encrypted and stored on-device. It runs on Windows, macOS, Linux, iOS, Android, plus a Chrome web-clipper extension ([TheBusinessDive review](https://thebusinessdive.com/anytype-review)). Reviewers consistently rate it ~4.2/5, praising the model while flagging a steep learning curve ([AIProductivity](https://aiproductivity.ai/tools/anytype/)).

## Most-loved features (and why)

A Reddit/community sentiment analysis surfaces a consistent set of loves: **data ownership, privacy, offline mode, the flexible object model, open-source code, and a clean UI** ([Toksta sentiment summary](https://www.toksta.com/products/anytype)). The "why" behind each:

- **Local-first speed.** Reviewers repeatedly note it "feels noticeably faster, especially with large knowledge bases, with no loading spinners or sync delays" — because the primary copy lives on-device, not behind a network round-trip ([TheBusinessDive](https://thebusinessdive.com/anytype-review)). One long-term user: *"I have used Anytype daily for nearly 2 years. It never fails… It works on the subway (aka offline). It's flexible. The UX is clean."* ([Toksta](https://www.toksta.com/products/anytype)).
- **Ownership & privacy.** End-to-end encryption with a user-held recovery phrase means the team literally cannot read your data — a strong trust signal for the audience ([Anytype Docs – Privacy & Encryption](https://doc.anytype.io/anytype-docs/advanced/data-and-security/how-we-keep-your-data-safe)).
- **The customizable object/type model.** Users like building their own structures rather than being boxed into "pages and folders" ([Toksta](https://www.toksta.com/products/anytype)).

Common gripes worth designing around: a **steep learning curve**, a **proprietary export format** (perceived lock-in), and **slower feature development** with some core gaps like formulas ([Toksta](https://www.toksta.com/products/anytype); [MakeUseOf](https://www.makeuseof.com/anytype-app-review-notion-obsidian-comparison/)). MakeUseOf's headline — "Uniquely Complicated" — is the cautionary lesson: the object model is powerful but can overwhelm casual users.

## What makes the UX feel good

- **Block editor.** Like Notion, content is composed of blocks; objects open instantly with no spinner, which is the single most-cited UX delight ([TheBusinessDive](https://thebusinessdive.com/anytype-review)).
- **Object-centric navigation.** Instead of a file tree, you navigate by following relations between objects, and the graph gives a spatial mental map (see below). A 2026 desktop update added **tabs** — open multiple objects in one window, drag-reorder, and pin frequent ones — making multi-object work feel like a browser ([Anytype Feb 2026 community update](https://blog.anytype.io/february-community-update-2026/)).
- **Performance from local-first.** Everything works offline; sync happens "quietly in the background," so the app never feels gated on the network ([Anytype FAQ](https://anytype.io/faq/)).
- **Privacy "feel."** No email signup — you're identified by a cryptographic key, not an account — which removes onboarding friction and reinforces the ownership narrative ([Anytype Docs – Privacy & Encryption](https://doc.anytype.io/anytype-docs/advanced/data-and-security/how-we-keep-your-data-safe)).

## Objects / types / relations / graph paradigm

This is Anytype's defining idea and the most relevant to us.

- **Objects.** The atomic unit. *Everything* is an object — a task, a person, a project, a note ([Anytype Docs – Types](https://doc.anytype.io/anytype-docs/getting-started/types)).
- **Types.** Every object has exactly one **Type** (set at creation, changeable later) that categorizes it — Task, Note, Book, Movie, Person. Each Type carries its own default properties, layout, **templates**, and a built-in **query** that surfaces all objects of that type ([Anytype Docs – Types](https://doc.anytype.io/anytype-docs/getting-started/types)). Guidance is to keep Types *broad* and use Templates for specificity.
- **Relations (Properties).** Relations do double duty: they store **attributes** (e.g. a due date, a status) *and* define **links between objects** (e.g. a Task's "Assignee" → a Person object) ([Anytype Docs – Properties](https://doc.anytype.io/anytype-docs/getting-started/types/relations)). This is the key difference from Notion: relations are first-class, typed, and reusable across types.
- **Sets/Queries vs. Collections.** A **Query (Set)** is a live, auto-updating view of the graph filtered by Type or Property — it doesn't *store* objects, it *finds* them. A **Collection** behaves like a traditional manual database: it starts empty and you add objects to it (and can mix types) ([Anytype Docs – Queries](https://doc.anytype.io/anytype-docs/getting-started/sets); [Anytype Docs – Collections](https://doc.anytype.io/anytype-docs/getting-started/sets/collections)). Both render as Grid, Kanban, Calendar, Gallery, or Graph views (some desktop-only).
- **Graph view.** Renders every object as a node and every relation as an edge, "letting you see the big picture of how your knowledge connects" and making implicit relationships explicit for serendipitous discovery ([Anytype Docs – Graph](https://doc.anytype.io/anytype-docs/basics/graph)). Crucially, the graph is *generated from the typed relations* — not hand-drawn — so it stays in sync with the data automatically.

The takeaway: Anytype's graph is **a byproduct of a typed data model**, whereas Obsidian's graph is a byproduct of free-text `[[links]]`. The former yields richer, queryable, filterable connections.

## Integration / sync / privacy approach

- **Encryption.** Two-layer scheme: layer one links changes within an object using per-document keys; layer two encrypts the actual data with AES (CFB stream mode). The master key is a **BIP-39 recovery phrase** held only by the user ([Anytype Docs – Privacy & Encryption](https://doc.anytype.io/anytype-docs/advanced/data-and-security/how-we-keep-your-data-safe)).
- **Sync model (any-sync).** The MIT-licensed **any-sync** protocol keeps the primary copy local and syncs peer-to-peer / via backup nodes in the background. Backup nodes receive only the *first* encryption layer (enough to bundle and relay changes) and "HAVE NO access to the second layer," so they store but cannot read your content ([Anytype Docs – Privacy & Encryption](https://doc.anytype.io/anytype-docs/advanced/data-and-security/how-we-keep-your-data-safe)). Conflict-free merge across devices is handled by the protocol.
- **Self-host / local-only.** You can run your own backup node, or use **local-only mode** that disables backup nodes entirely and syncs only across devices on the same LAN ([Anytype Docs – Local-only](https://doc.anytype.io/anytype-docs/advanced/data-and-security/self-hosting/local-only)).
- **Collaboration direction (2025–2026).** Anytype is building real-time, E2E-encrypted collaboration with "one space = one group = one chat," plus **object threads** (discussion directly on a document) and shared-space favorites ([Anytype 2025 plans](https://blog.anytype.io/our-journey-and-plans-for-2025/); [Feb 2026 update](https://blog.anytype.io/february-community-update-2026/)). There's also a **Business** tier for team workspaces ([Anytype for Business](https://business.anytype.io/)).
- **API.** A developer API + Anytype CLI ("headless server for automation and scripting") exposes objects, spaces, types, search, files, and chat — with markdown body patching for object creation/update ([Anytype Developers](https://developers.anytype.io/)). Useful as a conceptual reference for our own object API shape, though it's local/desktop-oriented, not a hosted SaaS API.

## Mapping to Premier Project Hub

Our app already has the three nouns Anytype generalizes — **projects, tasks, pages**. The high-value moves borrow Anytype's *typed-object + relation + generated-graph* thinking without adopting its local-first stack (we're Supabase + TanStack Query, cloud-first by design).

| # | Idea from Anytype | How it maps to Premier Hub | Complexity |
|---|---|---|---|
| 1 | **Typed objects with first-class relations** — model project/task/page as objects sharing a common relation system (assignee→Person, task→project, page→task). | Add a lightweight `relations` layer over our existing Postgres tables so any entity can link to any other with a typed edge. Powers the graph and back-references. | **L** |
| 2 | **Generated graph from typed relations** (not free-text links) — Obsidian-style graph, but edges come from real FK/relations. | Our planned Obsidian-style graph should be *derived from* project↔task↔page relations + page mentions, so it stays accurate automatically. Anytype proves this model. | **M** |
| 3 | **Sets/Queries vs. Collections** — live filtered views vs. manual hand-picked lists, both rendered as Grid/Kanban/Calendar/Board. | Our editable dashboard widgets = saved "Queries" (e.g. "my open tasks"); a manual "Collection" = a curated board. Reuse one view engine across both. | **M** |
| 4 | **Per-type templates + built-in type query** — each Type ships a template and an auto-list of its instances. | Project/task/page templates for our recurring workflows (e.g. art-request projects); each type gets a default "all of this type" view. | **S** |
| 5 | **Object back-references / "linked from"** — every object shows what links to it. | On a page or task, show "Referenced by" (which tasks/projects mention it). Cheap once the relations layer (#1) exists; high perceived value. | **S–M** |
| 6 | **Object threads / discussion on a document** (2026 roadmap) — comment threads attached to an object, not a separate chat. | Pairs naturally with our Teams/Outlook integration: thread a discussion on a task/page and surface it in Teams. | **M–L** |

**Recommended priority:** ship #4 and #5 first (small, immediately useful), build #1's relation layer as the foundation, then #2 (graph) and #3 (views) on top. #6 aligns with the Teams integration track.

**Caveats to carry forward:** Anytype's biggest weaknesses — a steep learning curve and an over-flexible model that overwhelms casual users ([MakeUseOf](https://www.makeuseof.com/anytype-app-review-notion-obsidian-comparison/)) — are the trap to avoid. For an *internal* tool, we want the typed-relation *power under the hood* with **opinionated defaults on the surface** (pre-built types, templates, and dashboard views) so Premier staff get the graph's benefits without the configuration burden.
