# Notion — Research for Premier Project Hub v2

> Reference doc for our block-editor pages, project/task/page database paradigm, and — most importantly — the **Teams + Outlook + meeting-transcription** integration we're building on Supabase Edge Functions + Microsoft Graph. Sources are current (2025–2026) primary (Notion Help, Microsoft Learn) and community references, cited inline.

## Overview

Notion is a hosted, database-first "all-in-one workspace" that fuses notes, wikis, tasks, and structured databases into a single block-based surface. Everything you create is a **page**, and every page is built from composable **blocks**; collections of pages become **databases** you can re-view as tables, boards, calendars, and more ([Notion — Intro to databases](https://www.notion.com/help/intro-to-databases)). Where Obsidian is a local-first file pile and the appeal is ownership, Notion's appeal is the opposite: a connected, multiplayer cloud workspace where one dataset feeds many views ([Zapier — What is Notion](https://zapier.com/blog/what-is-notion/)). The people who love it are teams who want docs, project tracking, and a company wiki in one tool without stitching together five apps. In 2025 Notion repositioned hard around AI for work — search across connected apps, database autofill, and the new AI Meeting Notes — pitching itself as the place where meetings, docs, and tasks converge ([eWeek — Notion AI for Work](https://www.eweek.com/news/notion-ai-work/)).

## Most-loved features

- **One database, many views.** The single most-praised structural idea: enter data once, then see it as a table, kanban board, calendar, or timeline without duplicating anything ([Notion — Using database views](https://www.notion.com/help/guides/using-database-views)).
- **The block editor.** Every paragraph, heading, toggle, image, or embed is a draggable block. Reviewers consistently call Notion "brilliant for docs and wikis" ([eesel — Notion review 2026](https://www.eesel.ai/blog/notion-review)).
- **AI Meeting Notes.** The most consistently praised Notion AI feature — users report saving "15 to 20 minutes per meeting" on follow-up, and it's a Notion-specific capability that standalone AI tools don't replicate inside your workspace ([AI Tool Discovery — Notion AI Reddit 2026](https://www.aitooldiscovery.com/guides/notion-ai-reddit)).
- **Templates + relations.** Teams build a project tracker once and reuse it; relations link a task to its project and roll up status across the set ([Notion — Intro to databases](https://www.notion.com/help/intro-to-databases)).
- **Search everything.** Transcripts, summaries, decisions, and action items are all saved as native pages and are "fully searchable across your workspace using Notion AI" ([Notion — AI Meeting Notes](https://www.notion.com/help/ai-meeting-notes)).

## What makes the UX feel good

The defining interaction is the **slash menu**: type `/` anywhere and a searchable palette of block types appears inline — `/table`, `/database`, `/heading`, `/todo`, `/meet` to start meeting notes ([Notion — AI Meeting Notes](https://www.notion.com/help/ai-meeting-notes)). You never leave the keyboard or hunt through toolbars; the document *is* the command surface. Blocks are **drag-and-drop** by their handle and can be nested or dropped into columns, so layout is direct-manipulation rather than menu-driven. A **quick-find / command palette** (`Cmd/Ctrl+P`) jumps to any page by typing a few characters. Micro-interactions reinforce the flow: hovering a block reveals its handle and `+` button, slash results filter as you type, and AI actions surface as a contextual menu on selected text. The throughline is *progressive disclosure* — a page looks like a clean document until you invoke structure, at which point the full database/AI machinery is one keystroke away.

## Pages / blocks / databases paradigm

**Block model.** A page is an ordered tree of typed blocks (text, heading, toggle, callout, code, image, embed, child page, database). Blocks carry their own permissions context and can be referenced/linked elsewhere. This granularity is what lets a transcript, a summary, and an action-item list coexist as distinct blocks on one meeting page.

**Databases & views.** A database is a collection of pages (rows) with typed **properties** (columns). The same rows render through multiple **view types** — Table, Board (kanban grouped by a select/person property), Calendar (by a date property), Timeline (date-range Gantt), List, and Gallery (cards) — each with independent filters, sorts, and grouping ([Notion — Using database views](https://www.notion.com/help/guides/using-database-views), [Notion — When to use each view](https://www.notion.com/help/guides/when-to-use-each-type-of-database-view)). Filters/sorts/groups are per-view, so a "My open tasks" table and a "Sprint board" can read the same source ([Notion — Views, filters & sorts](https://www.notion.com/help/views-filters-and-sorts)).

**Relations & rollups.** A **relation** property links rows across databases (task ↔ project). A **rollup** then pulls and aggregates a property from those related rows — e.g. count of open tasks per project — and "can only exist if there is a corresponding Relation property from which to pull data" ([Notion — Intro to databases](https://www.notion.com/help/intro-to-databases)). **Linked databases** embed a filtered live view of an existing database on another page without copying data — the mechanism we'd mirror to surface "this project's tasks" inside a project page.

## Teams / Outlook / Meeting transcription (deep)

### (a) Microsoft / Outlook connectors & calendar integration

Notion's Microsoft story is split and, frankly, thinner than its marketing implies. The **Microsoft Outlook AI Connector** (Business/Enterprise only) lets Notion AI "read all Microsoft Outlook emails associated with the connected account" — but it's **email-only**, can't read attachments, and is for AI search, not page-linking or calendar sync. Setup is a standard Microsoft OAuth consent popup ("A popup from Microsoft will ask to accept application permissions"), one Notion workspace maps to one Microsoft tenant, and disconnecting makes that content "immediately become unsearchable" ([Notion — Microsoft Outlook AI Connector](https://www.notion.com/help/microsoft-outlook-ai-connector)). **Notion Calendar** (the standalone app) supports linking Outlook/Microsoft and iCloud accounts so events appear in the calendar UI, but there is no native two-way **database↔Outlook-calendar sync** — every working option for syncing a Notion *database* to Outlook still routes through a third party (Morgen, 2sync, Zapier) that calls Microsoft Graph itself ([Morgen — Outlook + Notion](https://www.morgen.so/outlook-notion-integration), [Akiflow — Notion Calendar integration 2026](https://akiflow.com/blog/notion-calendar-integration-smarter-scheduling)). **Takeaway for us:** Notion does *not* deeply wire Outlook calendar into pages — that's an open lane where our Graph-native build can actually beat them.

### (b) Notion AI Meeting Notes — the full pipeline

Announced May 2025 as a direct shot at Granola/Otter, AI Meeting Notes is native and on-device-initiated ([TechCrunch, 2025-05-13](https://techcrunch.com/2025/05/13/notion-takes-on-ai-notetakers-like-granola-with-its-own-transcription-feature/)). The pipeline ([Notion — AI Meeting Notes](https://www.notion.com/help/ai-meeting-notes)):

1. **Capture.** Type `/meet` on any page. The **desktop app captures system audio + mic** (so it hears both sides of a video call); the **browser captures mic only**. There's no bot that joins the call — it records locally from the device.
2. **Transcription.** "The audio file is sent directly to our sub-processors for real-time transcription" (sub-processors named: OpenAI, Anthropic, Fireworks, Baseten, X.AI). A summary needs **≥300 transcribed characters (~1 minute)**.
3. **Speaker labels.** Desktop labels speakers and starts a new line on speaker change, but works best 1:1 and is **English-only** — community reviews flag that in practice multi-party transcripts often collapse into "one block of text" with no reliable attribution ([Sally — AI Meeting Notes review 2026](https://www.sally.io/blog/notion-ai-meeting-notes-review)).
4. **AI summary + action items.** After the meeting, Notion AI generates a structured summary with action items, tunable by meeting-type templates (sales call, standup) or custom instructions ([Notion — AI Meeting Notes](https://www.notion.com/help/ai-meeting-notes)).
5. **Linking.** Output lands as a native page; transcript/summary/decisions/actions are blocks, searchable workspace-wide, and **inherit the permissions of the page they're saved on**.

**Privacy / storage.** Sub-processors "do not store audio." On desktop/browser, audio is temporary local during the session; only if processing fails is audio uploaded and **retained ≤3 days for retry**. On mobile, audio uploads and is "deleted immediately after successful processing." Optionally the 10 most-recent local audio files are kept on the recorder's device (off by default). Requires **Business or Enterprise**, **10 hours/user/day** limit, and must be enabled by workspace owners ([Notion — AI Meeting Notes](https://www.notion.com/help/ai-meeting-notes)).

### (c) Praise vs. complaints

Praise: huge time savings, summaries "instantly after the meeting ends," and everything searchable in-workspace ([AI Tool Discovery](https://www.aitooldiscovery.com/guides/notion-ai-reddit)). Complaints cluster on three things: (1) **speaker labels are unreliable** beyond 1:1 / English ([Sally](https://www.sally.io/blog/notion-ai-meeting-notes-review)); (2) the **May 2025 pricing move** that killed the $10 add-on and locked AI behind Business/Enterprise drew a "mostly negative" Reddit reaction ([AI Tool Discovery](https://www.aitooldiscovery.com/guides/notion-ai-reddit)); (3) it "captures audio but doesn't join meetings," so for distributed teams it's "a solid recording and summarization feature, but not a serious meeting assistant" and hits GDPR/structured-task limits fast ([tl;dv review 2026](https://tldv.io/blog/notion-ai-meeting-notes-review/)).

### (d) Building an equivalent on Supabase Edge Functions + Microsoft Graph

Because our org runs on Microsoft 365, we get a structural advantage Notion forgoes: **let Teams do the recording and transcription, and fetch the artifacts via Graph** — better speaker attribution (Teams ties transcript lines to Entra identities) and no in-app recorder to maintain.

**Graph endpoints**
- Transcripts (delegated, per meeting): `GET /me/onlineMeetings/{meetingId}/transcripts` and `.../transcripts/{id}/content?$format=text/vtt` — content is a **`.vtt`** file ([Microsoft Learn — List transcripts](https://learn.microsoft.com/en-us/graph/api/onlinemeeting-list-transcripts?view=graph-rest-1.0), [Get callTranscript](https://learn.microsoft.com/en-us/graph/api/calltranscript-get?view=graph-rest-1.0)).
- Resolve the meeting id from a calendar event's join URL: `GET /me/onlineMeetings?$filter=JoinWebUrl eq '{url}'`.
- Calendar: `GET /me/events` (and `/me/calendarView`) to discover meetings and link them to pages; Mail: `GET /me/messages` for the email-search parity Notion offers.
- **Change notifications** instead of polling: subscribe to `users/{userId}/onlineMeetings/getAllTranscripts` (user-scoped) or `communications/onlineMeetings/getAllTranscripts` (tenant) — the notification carries the meeting + organizer id so you can fetch the new transcript the moment it's ready ([Microsoft Learn — Fetch meeting transcripts overview](https://learn.microsoft.com/en-us/microsoftteams/platform/graph-api/meeting-transcripts/overview-transcripts)). App-only access additionally requires an **application access policy** granted by a tenant admin ([graphpermissions — OnlineMeetingTranscript.Read.All](https://graphpermissions.merill.net/permission/OnlineMeetingTranscript.Read.All)).

**OAuth scopes (delegated):** `OnlineMeetingTranscript.Read.All`, `OnlineMeetings.Read`, `Calendars.Read`, `Mail.Read`, plus `offline_access` `openid` `profile` for refresh tokens. (Tenant-wide automation would use the application-permission equivalents + access policy.)

**Transcription engine.** Primary path: **none of our own** — consume the Teams `.vtt` and run summary/action-item extraction through our existing read-only AI assistant model in an Edge Function (parse VTT → speaker-tagged segments → LLM summary). Fallback path for non-Teams/in-person meetings (in-browser recorder): stream to **Deepgram Nova-3** (cheap, fast, built-in diarization) or OpenAI `gpt-4o-transcribe`, then the same summarizer.

**Supabase schema sketch (RLS):**
```sql
-- per-user Graph OAuth tokens (refresh token encrypted at rest)
ms_connections(id, user_id uuid->auth.users, ms_tenant_id, ms_user_id,
  refresh_token_enc, scopes text[], expires_at, created_at)
-- webhook subscription lifecycle (Graph expires ~3 days, must renew)
graph_subscriptions(id, user_id, resource text, subscription_id, expiration, client_state)
-- transcript linked to a page AND/OR project
meeting_transcripts(id, user_id, project_id->projects, page_id->pages,
  ms_meeting_id, subject, started_at, vtt_url, summary_md, status)
transcript_segments(id, transcript_id->meeting_transcripts,
  speaker, text, start_ms, end_ms)
calendar_events(id, user_id, ms_event_id, subject, join_web_url, start_at, end_at, project_id)
```
**RLS:** every table `enable row level security`; owner policy `user_id = auth.uid()`. For shared visibility, gate `meeting_transcripts`/`transcript_segments` on project membership: `project_id in (select project_id from project_members where user_id = auth.uid())`. Never expose `refresh_token_enc` to the client — read it only inside Edge Functions via the service role.

**Edge Functions:** `ms-oauth-callback` (token exchange), `graph-subscribe` / `graph-renew` (cron to refresh ~3-day subscriptions), `graph-webhook` (validate `clientState`, fetch new transcript), `transcribe-summarize` (VTT → segments → AI summary), `link-event-to-project`.

**Secret names (Supabase secrets):** `MS_GRAPH_CLIENT_ID`, `MS_GRAPH_CLIENT_SECRET`, `MS_GRAPH_TENANT_ID`, `MS_GRAPH_REDIRECT_URI`, `GRAPH_WEBHOOK_CLIENT_STATE`, `TOKEN_ENCRYPTION_KEY`, `DEEPGRAM_API_KEY` (fallback path), `AI_ASSISTANT_API_KEY`.

## Mapping to Premier Project Hub

1. **`/meet`-style meeting notes on a page (L).** Slash command spins up a meeting page; pull the Teams transcript via Graph webhook, store segments + AI summary, render transcript/summary/action-item blocks. Our biggest differentiator and the v2 headline.
2. **Auto-link meetings → projects/tasks (M).** Match `/me/events` join URLs to projects; one-click "turn action items into tasks" — closes the exact gap reviewers fault Notion for (structured tasks).
3. **Outlook calendar surfaced on project pages (M).** Native Graph `calendarView` panel per project — beating Notion, which has no deep page-level Outlook calendar link.
4. **Database-style multi-view for tasks (M).** Table + Board + Calendar + Timeline over one task dataset with per-view filters — directly mirrors Notion's one-source-many-views model.
5. **Relations + rollups (S–M).** Task→project relation with a rollup of open-task counts/status on the project record.
6. **Slash menu in the block editor (S).** `/` palette for block insertion and AI actions — the interaction that makes Notion feel fast, low cost to adopt.

---

### Sources
- Notion — AI Meeting Notes (Help): https://www.notion.com/help/ai-meeting-notes
- Notion — AI Meeting Notes (product): https://www.notion.com/product/ai-meeting-notes
- Notion — Microsoft Outlook AI Connector: https://www.notion.com/help/microsoft-outlook-ai-connector
- Notion — Intro to databases: https://www.notion.com/help/intro-to-databases
- Notion — Using database views: https://www.notion.com/help/guides/using-database-views
- Notion — Views, filters & sorts: https://www.notion.com/help/views-filters-and-sorts
- Notion — When to use each database view: https://www.notion.com/help/guides/when-to-use-each-type-of-database-view
- TechCrunch — Notion takes on AI notetakers (2025-05-13): https://techcrunch.com/2025/05/13/notion-takes-on-ai-notetakers-like-granola-with-its-own-transcription-feature/
- eWeek — Notion AI for Work: https://www.eweek.com/news/notion-ai-work/
- tl;dv — Notion AI Meeting Notes review 2026: https://tldv.io/blog/notion-ai-meeting-notes-review/
- Sally — Notion AI Meeting Notes review 2026: https://www.sally.io/blog/notion-ai-meeting-notes-review
- AI Tool Discovery — Notion AI Reddit 2026: https://www.aitooldiscovery.com/guides/notion-ai-reddit
- eesel — Notion review 2026: https://www.eesel.ai/blog/notion-review
- Zapier — What is Notion: https://zapier.com/blog/what-is-notion/
- Morgen — Outlook + Notion integration: https://www.morgen.so/outlook-notion-integration
- Akiflow — Notion Calendar integration 2026: https://akiflow.com/blog/notion-calendar-integration-smarter-scheduling
- Microsoft Learn — Fetch meeting transcripts & recordings (Teams): https://learn.microsoft.com/en-us/microsoftteams/platform/graph-api/meeting-transcripts/overview-transcripts
- Microsoft Learn — List transcripts: https://learn.microsoft.com/en-us/graph/api/onlinemeeting-list-transcripts?view=graph-rest-1.0
- Microsoft Learn — Get callTranscript: https://learn.microsoft.com/en-us/graph/api/calltranscript-get?view=graph-rest-1.0
- Microsoft Learn — onlineMeeting: getAllTranscripts: https://learn.microsoft.com/en-us/graph/api/onlinemeeting-getalltranscripts?view=graph-rest-1.0
- Graph Permissions — OnlineMeetingTranscript.Read.All: https://graphpermissions.merill.net/permission/OnlineMeetingTranscript.Read.All
