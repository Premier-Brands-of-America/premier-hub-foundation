# AppFlowy Research

Research for Premier Project Hub v2. Focus: what AppFlowy does well and which ideas map onto our React + Supabase workspace (projects ↔ tasks ↔ pages + art-request portal).

## Overview

AppFlowy is an open-source workspace that bills itself as "the AI collaborative workspace where you achieve more without losing control of your data" and "the leading open source Notion alternative" ([GitHub README](https://github.com/AppFlowy-IO/AppFlowy)). It is built on a single codebase of **Flutter (~74%) for the UI and Rust (~24%) for the core/data engine**, which lets one codebase ship to macOS, Windows, Linux, iOS, and Android ([GitHub README](https://github.com/AppFlowy-IO/AppFlowy)). It is AGPLv3-licensed with ~73k GitHub stars and a community of roughly 400 contributors ([GitHub README](https://github.com/AppFlowy-IO/AppFlowy); [appflowy.com](https://appflowy.com/)).

Its positioning rests on three pillars: **data privacy first, a reliable native experience, and community-driven extensibility** ([GitHub README](https://github.com/AppFlowy-IO/AppFlowy)). The audience that loves it most: privacy-conscious individuals, small/mid teams tired of Notion's per-seat pricing, agencies who need to hand clients a self-hostable workspace, and regulated orgs where "where does the data live?" is a blocking question ([itsfoss](https://itsfoss.com/notion-alternatives/); [makeuseof](https://www.makeuseof.com/replaced-notion-with-appflowy-open-source-app/)).

## Most-loved features

- **Data ownership / self-hosting.** The single most-cited reason people switch. Everything lives locally first and sync is optional, and the whole stack can be self-hosted on infrastructure you control ([makeuseof](https://www.makeuseof.com/replaced-notion-with-appflowy-open-source-app/); [xda-developers](https://www.xda-developers.com/open-source-notion-alternative/)).
- **Flexible database views.** Reviewers repeatedly praise the variety and flexibility of views as the feature that makes it a genuine Notion alternative rather than just a markdown editor ([opentechhub](https://www.opentechhub.io/appflowy/)). In an early community thread one user put it bluntly: *"DATABASES!! I can't stress this enough, I would use any other markdown editor if it wasn't for the databases in Notion"* ([GitHub Discussion #1271](https://github.com/AppFlowy-IO/AppFlowy/discussions/1271)) — and databases are now a core strength.
- **Price.** "Free forever for what you need" is a recurring sentiment from Capterra/SourceForge reviewers, with paid Pro/AI tiers only for managed cloud and frontier models ([xda-developers](https://www.xda-developers.com/open-source-notion-alternative/)).
- **Free local AI.** As of v0.12.5 (April 3, 2025), AppFlowy made local AI via Ollama free for everyone — a differentiator no SaaS competitor matches ([AppFlowy blog](https://appflowy.com/blog/appflowy_local_ai_ollama)).

The honest counterweight: early adopters questioned whether marketing outran feature parity with Notion, and asked the team to be clear about whether it was a Notion replacement or "just a text editor" ([GitHub Discussion #1271](https://github.com/AppFlowy-IO/AppFlowy/discussions/1271)). Mobile sync reliability on spotty connections was a recurring complaint in 2025 reviews, since improved in later releases ([opentechhub](https://www.opentechhub.io/appflowy/)).

## What makes the UX feel good

The dominant theme is **speed and the local-first feel**. Because documents and databases live on disk first, the app is fully usable with zero network access, and pages open instantly with "no spinner, no 'Connecting…' message" — a direct contrast to the cloud round-trips users felt in Notion ([xda-developers](https://www.xda-developers.com/open-source-notion-alternative/); [makeuseof](https://www.makeuseof.com/replaced-notion-with-appflowy-open-source-app/)). The Rust core gives it a native, snappy feel that HN commenters credit alongside the clean UI ([opentechhub](https://www.opentechhub.io/appflowy/)).

On editing, the document side follows the Notion-style block model: rich content types, slash commands, drag-and-drop blocks, plus customizable themes and fonts ([appflowy.com](https://appflowy.com/)). Markdown shortcuts (`#` for headings, `-` for bullets, `/` for the command menu) were explicitly requested by the community early on and are now standard, which is what makes typing feel fluid rather than toolbar-driven ([GitHub Discussion #1271](https://github.com/AppFlowy-IO/AppFlowy/discussions/1271)).

## Databases / views / fields paradigm

This is the part most relevant to us. AppFlowy treats a database as one data source that can be projected into many **views**: **Grid (table), Kanban board, Calendar, Gallery, List, Feed, and Chart**, all with grouping and sorting ([Notion-vs-AppFlowy](https://appflowy.com/compare/notion-vs-appflowy)). Crucially, you can attach **linked views of the same data source**, so the same records appear in multiple places without duplication ([opentechhub](https://www.opentechhub.io/appflowy/)).

The **field/property system** is the engine underneath. It includes typed fields (text, select, checklist, date, etc.) plus **advanced filters, two-way relations, rollups, calculations, multi-row bulk actions, and database templates** ([Notion-vs-AppFlowy](https://appflowy.com/compare/notion-vs-appflowy)). Custom fields can include formulas, relations, and checklist rollups ([opentechhub](https://www.opentechhub.io/appflowy/)). The **block/document model** mirrors Notion's: documents are composed of blocks, and database records open as pages, so a task row and a wiki page share the same underlying paradigm. Notion still leads on Timeline and Map views, which AppFlowy hasn't shipped ([Notion-vs-AppFlowy](https://appflowy.com/compare/notion-vs-appflowy)).

## Integration / sync / AI approach

**Self-host & sync.** AppFlowy Cloud deploys via a single Docker Compose file bundling Postgres, Redis, GoTrue (auth), and MinIO (object storage) on any Linux box, with Kubernetes also supported ([skywork.ai](https://skywork.ai/skypage/en/AppFlowy-&-Docker:-My-Journey-to-a-Self-Hosted,-AI-Powered-Workspace/1975226298207891456)). Sync is local-first with optional cloud, and cross-platform across desktop and mobile ([GitHub README](https://github.com/AppFlowy-IO/AppFlowy)).

**AI.** Three headline capabilities: *Get answers* (ask AI to unblock work / find answers), *Write better* (rewrite, brainstorm, fix grammar in-document), and *Autofill tables* (turn database columns into generated insights) ([appflowy.com](https://appflowy.com/)). It can use cloud models (GPT-5, Gemini 2.5, Claude 3.7) **or** run fully local via Ollama (Llama 3.1, DeepSeek R1, Gemma 3, Phi4, qwen3), with the in-document AI Writer doing summarize/expand/improve/explain and table autofill — all offline if desired ([appflowy.com](https://appflowy.com/); [AppFlowy blog](https://appflowy.com/blog/appflowy_local_ai_ollama)).

## Mapping to Premier Project Hub

Six AppFlowy ideas worth borrowing, with rough complexity (S/M/L) for our React 18 + Vite + TS + Tailwind + shadcn + Supabase + TanStack Query stack.

1. **One data source, many synced views (Grid / Board / Calendar) for tasks & projects** — *L.* This is AppFlowy's standout idea: tasks live once in Supabase, and the UI projects them as a table, a kanban grouped by status, and a calendar by due date — switching views never duplicates data ([Notion-vs-AppFlowy](https://appflowy.com/compare/notion-vs-appflowy)). Build the view layer over a shared TanStack Query cache; the kanban and calendar are the heavy lifts.

2. **Linked views of the same source on the editable dashboard** — *M.* Their "linked views" pattern is exactly what an editable dashboard needs: each dashboard card is a filtered/grouped *view* of the tasks or projects table, not a separate copy ([opentechhub](https://www.opentechhub.io/appflowy/)). Pairs naturally with a draggable widget grid; each widget = a saved view config.

3. **Typed field/property system with filters, sort, and grouping** — *M.* Adopt AppFlowy's typed-field model (select, date, relation, checklist) plus per-view filter/sort/group state ([Notion-vs-AppFlowy](https://appflowy.com/compare/notion-vs-appflowy)). For us this means a small field-definition schema in Supabase driving generic filter/sort UI rather than hard-coded columns.

4. **Two-way relations + rollups across projects ↔ tasks ↔ pages** — *M.* Two-way relations and rollups ([Notion-vs-AppFlowy](https://appflowy.com/compare/notion-vs-appflowy)) map directly onto our projects↔tasks↔pages graph — and the rollups (e.g., "% tasks complete" on a project) feed both dashboard widgets and the planned Obsidian-style graph view.

5. **In-editor AI for pages + table autofill** — *L.* AppFlowy's document AI Writer (summarize/rewrite/expand) and database autofill ([appflowy.com](https://appflowy.com/)) translate to slash-command AI inside our block editor and a "fill column with AI" action on task tables. Sizeable because it needs prompt plumbing and streaming UI; an MVP (selection rewrite + page summary) is closer to *M*.

6. **Local-first / optimistic feel via instant interactions** — *S–M.* We can't be truly offline on Supabase, but the lesson is the snappy, no-spinner feel users love ([xda-developers](https://www.xda-developers.com/open-source-notion-alternative/)). Lean on TanStack Query optimistic updates and cached reads so edits land instantly and reconcile in the background — low cost, high perceived-quality payoff.

**Recommended starting point:** items 2 and 3 (linked views + typed fields) are the highest leverage for the editable dashboard and unlock items 1 and 4 with less rework.
