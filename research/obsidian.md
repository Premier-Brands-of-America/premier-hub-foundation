# Obsidian — Research for Premier Project Hub v2

> Reference doc for our Obsidian-style **graph view** (pages/projects/tasks relationships) and note-linking UX. Focus: the graph. Sources are current (2025–2026) primary and community references, cited inline.

## Overview

Obsidian is a local-first, Markdown-based knowledge base. Your vault is just a folder of plain `.md` files on disk — no proprietary format, no cloud lock-in, no subscription required to read your own data ([aitooldiscovery](https://www.aitooldiscovery.com/guides/obsidian-reddit)). It's free for personal use and extends through an enormous community-plugin ecosystem. The people who love it are "power users, long-term archivists, and anyone who wants notes still readable in 20 years" ([aitooldiscovery](https://www.aitooldiscovery.com/guides/obsidian-reddit)). Positioning: where Notion is a hosted database-first workspace, Obsidian is a fast, offline, file-owned thinking tool whose signature feature is the **bidirectional link** and the **graph** that visualizes those links ([sitepoint](https://www.sitepoint.com/obsidian-beginner-guide/)).

## Most-loved features

- **Local-first, plain-text ownership.** Notes live on-device, work offline, and open in any editor "forever." Users repeatedly cite this as the reason they won't switch ([xda](https://www.xda-developers.com/replaced-entire-productivity-stack-with-open-source-tools-except-obsidian/), [photes.io](https://photes.io/blog/posts/is-obsidian-a-local-first-app)).
- **Bidirectional `[[wikilinks]]` + backlinks.** The core mechanic — linking notes by name and automatically seeing what links back. The most-upvoted r/ObsidianMD posts are workflows built on this ([aitooldiscovery](https://www.aitooldiscovery.com/guides/obsidian-reddit)).
- **The graph view.** Beloved as a visual of how a vault connects — "looks like the kind of thing that belongs on a monitor in a film about a brilliant person solving a hard problem" ([codeculture](https://codeculture.store/blogs/developer-culture/obsidian-graph-view-useful)).
- **Speed.** Local storage means fast load and smooth operation even on large vaults; users say few alternatives "hit the same mix of speed, extensions, and usability" ([xda](https://www.xda-developers.com/replaced-entire-productivity-stack-with-open-source-tools-except-obsidian/)).
- **Progressive disclosure.** Advanced features ship off by default, so it's approachable but scales to power workflows (Dataview dashboards, second-brain systems) ([lindy](https://www.lindy.ai/blog/obsidian-review), [aitooldiscovery](https://www.aitooldiscovery.com/guides/obsidian-reddit)).

## What makes the UX feel good

Obsidian is **keyboard-first**. The **Command Palette** (`Ctrl/Cmd+P`) is the heart of it: type to fuzzy-search every native and plugin command, and each entry shows its hotkey so you learn shortcuts as you go — "other than keyboard shortcuts, there is no faster way to run a command" ([obsidian rocks](https://obsidian.rocks/for-beginners-and-pros-alike-the-command-palette-in-obsidian/), [help](https://help.obsidian.md/plugins/command-palette)). The **Quick Switcher** (`Ctrl/Cmd+O`) jumps to any note by typing a few characters ([xda](https://www.xda-developers.com/obsidian-keyboard-shortcuts-productivity/)). The rule of thumb users internalize: command palette for occasional actions, hotkeys for daily ones ([obsidian rocks](https://obsidian.rocks/for-beginners-and-pros-alike-the-command-palette-in-obsidian/)).

Beyond that: split/stacked **panes** for side-by-side notes, a **slash-command** menu (a core plugin, off by default) to insert blocks Notion-style by typing `/` ([help](https://help.obsidian.md/plugins/slash-commands)), and **live-preview Markdown** that renders formatting inline while still saving plain text — "edit formatted text and still save plain files" ([sitepoint](https://www.sitepoint.com/obsidian-beginner-guide/)). The throughline is low-latency, no-mouse-required flow backed by local files ([photes.io](https://photes.io/blog/posts/is-obsidian-a-local-first-app)).

## The graph view (deep)

**Local vs global.** The **global graph** renders every note that passes the active filters — the whole vault as circles (notes) and lines (links). The **local graph** shows only notes connected to the currently open note, with a **depth slider**: depth 1 = direct neighbors, each additional level adds neighbors-of-neighbors ([help](https://obsidian.md/help/plugins/graph), [deepwiki](https://deepwiki.com/obsidianmd/obsidian-help/4.5-graph-view)). Critically, the local graph can use **all the same settings** as the global graph ([fork my brain](https://notes.nicolevanderhoeven.com/obsidian-playbook/Obsidian+Plugins/Core+Plugins/Graph+view)).

**Force-directed layout & the four tunable forces.** Obsidian runs a physics simulation; nodes repel each other while links pull them together until the system settles. The exposed sliders ([help](https://obsidian.md/help/plugins/graph), [deepwiki](https://deepwiki.com/obsidianmd/obsidian-help/4.5-graph-view), [forum](https://forum.obsidian.md/t/graph-view-physics-and-force-directed-graphs/72586)):

- **Center force** — pulls nodes toward the center; higher = more compact, more circular graph. Raise it to stop sprawl.
- **Repel force** — how strongly each node pushes others away; higher = more spacing, less overlap.
- **Link force** — tension on each link, "like a rubber band"; controls how tightly linked nodes are drawn together.
- **Link distance** — the resting length of the lines between connected notes.

Practical tuning: balance **link force** and **link distance** together for edge length, then use **center force** vs **repel force** to trade compactness against readability ([mindmapping blog](https://mindmappingsoftwareblog.com/obsidian-graph-view/), [forum](https://forum.obsidian.md/t/graph-view-physics-and-force-directed-graphs/72586)). (Note: the official labels above are sometimes described inversely in third-party guides — treat the directions as relative and tune live.)

**Node sizing.** "Node size is proportional to the number of references to that node" — highly-linked hubs render bigger, so importance is visible at a glance. A global **Node size** slider scales everything ([deepwiki](https://deepwiki.com/obsidianmd/obsidian-help/4.5-graph-view), [help](https://obsidian.md/help/plugins/graph)).

**Display settings.** **Arrows** toggles link direction; **Text fade threshold** controls when/how note labels fade in as you zoom; **Link thickness** sets line width; **Animate** plays a time-lapse of nodes appearing by creation date ([help](https://obsidian.md/help/plugins/graph), [deepwiki](https://deepwiki.com/obsidianmd/obsidian-help/4.5-graph-view)).

**Color groups & search-based grouping.** You define **Groups**, each with a search query and a color; any node matching the query is tinted. This surfaces *serendipitous* structure — two notes may not be directly linked but share a color, so visual clusters reveal latent patterns ([help](https://obsidian.md/help/plugins/graph), [mindmapping blog](https://mindmappingsoftwareblog.com/obsidian-graph-view/)). Groups are query-driven (e.g. `path:Projects`, `tag:#active`), which is the key idea to steal.

**Filters.** A **Search files** box filters the visible set; toggles control **Tags**, **Attachments**, **Existing files only** (hide unresolved/placeholder links), and **Orphans** (notes with no links). Excluded-files patterns also apply ([help](https://obsidian.md/help/plugins/graph), [deepwiki](https://deepwiki.com/obsidianmd/obsidian-help/4.5-graph-view)).

**Link types represented.** Edges come from `[[wikilinks]]`; **tags** can appear as their own nodes; **attachments** as nodes; **unlinked mentions are not** drawn as edges (only true links are). Backlinks are the reverse direction of the same edges ([deepwiki](https://deepwiki.com/obsidianmd/obsidian-help/4.2-internal-links-and-backlinks), [help](https://obsidian.md/help/plugins/graph)).

**Navigation.** Hover highlights a node and its connections (dimming the rest); click opens the note; right-click gives a context menu. Scroll/`+`/`-` zoom; drag or arrow keys pan; Shift accelerates ([deepwiki](https://deepwiki.com/obsidianmd/obsidian-help/4.5-graph-view), [help](https://obsidian.md/help/plugins/graph)).

**Performance & sentiment.** This is the most important lesson for us. Praise: under ~50 notes the graph is genuinely useful — clusters form, isolated/orphan notes pop out, and it's a great *diagnostic* after a cleanup ([codeculture](https://codeculture.store/blogs/developer-culture/obsidian-graph-view-useful)). Complaints: past **~200 notes** it degrades into "the hairball" — impressive but navigationally useless — and past **~500 notes** it becomes a performance concern on older hardware ([codeculture](https://codeculture.store/blogs/developer-culture/obsidian-graph-view-useful)). The r/ObsidianMD consensus phrase: the graph is **"more fun to look at than navigate."** Its real limit is that it shows *topology, not operations* — no status, priority, or dates ([codeculture](https://codeculture.store/blogs/developer-culture/obsidian-graph-view-useful)). Plugins like Excalibrain add hierarchy to make it navigable.

## Linking model

- **Wikilinks** `[[Note]]` are the default; typing `[[` triggers fuzzy autocomplete over note names and aliases ([deepwiki](https://deepwiki.com/obsidianmd/obsidian-help/4.2-internal-links-and-backlinks), [obsibrain](https://www.obsibrain.com/blog/obsidian-linking-the-complete-guide-to-connecting-your-notes)).
- **Granular targets:** `[[Note#Heading]]` links to a heading, `[[Note#^blockid]]` to a specific block/paragraph, `[[#Heading]]` within the same file ([deepwiki](https://deepwiki.com/obsidianmd/obsidian-help/4.2-internal-links-and-backlinks)).
- **Aliases & display text:** define aliases in frontmatter; typing `[[AI` can match a note titled "Artificial Intelligence" and write `[[Artificial Intelligence|AI]]`. Aliases are global; the pipe `|` sets per-link display text ([deepwiki](https://deepwiki.com/obsidianmd/obsidian-help/4.2-internal-links-and-backlinks)).
- **Backlinks panel** shows two sets: **Linked Mentions** (notes that explicitly link here) and **Unlinked Mentions** (notes containing this note's name/alias as plain text, with one-click "link" to convert) ([deepwiki](https://deepwiki.com/obsidianmd/obsidian-help/4.2-internal-links-and-backlinks)).
- **Autocomplete UX:** suggestions appear instantly as you type inside `[[`, ranked by fuzzy match, aliases flagged with an icon — the same engine as the Quick Switcher ([deepwiki](https://deepwiki.com/obsidianmd/obsidian-help/4.2-internal-links-and-backlinks)).

## Mapping to Premier Project Hub

Our entities — **projects ↔ tasks ↔ pages** — are already a typed graph. Building with [`react-force-graph-2d`](https://github.com/vasturiano/react-force-graph) (d3-force under the hood), these Obsidian ideas map cleanly. Complexity in (S/M/L):

1. **Force-directed graph of project/task/page links (M).** Nodes = entities, edges = relations (task→project, page→task, page→page). Expose `d3Force('charge')` (= repel), `linkDistance`, and a centering force as user sliders mirroring Obsidian's four. Config: start `d3VelocityDecay≈0.3`, charge strength ≈ `-120`, link distance ≈ `40–80`; call `graph.d3ReheatSimulation()` on slider change.

2. **Node sizing by link count (S).** Precompute each node's degree; set `nodeVal = degree` (area-proportional) so hub projects render larger — straight from Obsidian's "size ∝ references" rule. Use `nodeCanvasObject` with `nodeCanvasObjectMode='after'` to draw labels above a default circle.

3. **Color groups by query/type (S).** Color nodes by entity type (project/task/page) and by status (active/blocked/done) — our equivalent of Obsidian's search-based color groups. This is high-value because status/priority is exactly what users said the Obsidian graph *lacks*; baking it into color makes ours operational, not just topological ([codeculture](https://codeculture.store/blogs/developer-culture/obsidian-graph-view-useful)).

4. **Local graph + depth slider (M).** A focused view rooted on the open project/task/page, with a 1–3 depth control — the single most-praised, least-laggy graph mode. Make this the default surface inside an entity detail page; reserve the global graph for an explicit "see everything" action.

5. **Filters: type / status / orphans / search (S–M).** Toggles to hide done tasks, show only a project's subtree, hide orphan pages, plus a text search that dims non-matches — directly mirrors Obsidian's filter panel.

6. **Hover-highlight + click-to-open navigation (S).** On hover, highlight the node's neighborhood and dim the rest; click routes to that entity's page via TanStack Router/Query. Disable pointer tracking only if profiling demands it ([react-force-graph](https://github.com/vasturiano/react-force-graph)).

**Guidance for the graph build agent:** heed the hairball threshold. Default to the **local graph**, cap the global view, and **virtualize/cap rendering past ~300–500 nodes** (cluster or paginate) since canvas physics degrades there ([codeculture](https://codeculture.store/blogs/developer-culture/obsidian-graph-view-useful)). Encode **status and priority as color/size** so our graph is an operational view, not just a pretty topology — that's the one gap Obsidian users consistently name.

---

### Sources
- Obsidian Help — Graph view: https://obsidian.md/help/plugins/graph
- DeepWiki — Graph view: https://deepwiki.com/obsidianmd/obsidian-help/4.5-graph-view
- DeepWiki — Internal links & backlinks: https://deepwiki.com/obsidianmd/obsidian-help/4.2-internal-links-and-backlinks
- Fork My Brain — Graph view: https://notes.nicolevanderhoeven.com/obsidian-playbook/Obsidian+Plugins/Core+Plugins/Graph+view
- Obsidian Forum — Graph physics & force-directed graphs: https://forum.obsidian.md/t/graph-view-physics-and-force-directed-graphs/72586
- Mind Mapping Software Blog — Obsidian graph view: https://mindmappingsoftwareblog.com/obsidian-graph-view/
- Code Culture — "Beautiful and Almost Completely Useless": https://codeculture.store/blogs/developer-culture/obsidian-graph-view-useful
- AI Tool Discovery — Obsidian Reddit review 2026: https://www.aitooldiscovery.com/guides/obsidian-reddit
- Obsidian Help — Command palette: https://help.obsidian.md/plugins/command-palette
- Obsidian Rocks — The command palette: https://obsidian.rocks/for-beginners-and-pros-alike-the-command-palette-in-obsidian/
- Obsidian Help — Slash commands: https://help.obsidian.md/plugins/slash-commands
- XDA — Obsidian keyboard shortcuts: https://www.xda-developers.com/obsidian-keyboard-shortcuts-productivity/
- XDA — Replaced my productivity stack except Obsidian: https://www.xda-developers.com/replaced-entire-productivity-stack-with-open-source-tools-except-obsidian/
- SitePoint — Obsidian beginner guide: https://www.sitepoint.com/obsidian-beginner-guide/
- Photes.io — Is Obsidian local-first: https://photes.io/blog/posts/is-obsidian-a-local-first-app
- Obsibrain — Obsidian linking complete guide: https://www.obsibrain.com/blog/obsidian-linking-the-complete-guide-to-connecting-your-notes
- react-force-graph (vasturiano): https://github.com/vasturiano/react-force-graph
