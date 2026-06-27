# Start prompt for the next session

> Paste the block below into a fresh Claude Code session opened in the repo:
> `cd /Users/edwinmejia/Developer/PremierHubv3/premier-hub-foundation`

---

You are resuming the **Premier Project Hub v2** project. Before doing anything, read
`NEXT SESSION FILES/HANDOFF.md` (authoritative state) and skim `KEYS_SETUP.md` and `audit/SUMMARY.md`.

**State to expect (verify it yourself with `git status`, `git log --oneline -5`, `git branch`, and
`gh pr view 1` before acting):** the entire v2 is built and merged on **`feat/v2`** (HEAD `af0d466`,
45 commits ahead of `main`), pushed to origin, and open as **draft PR #1** (`feat/v2 → main`). `main`
is untouched. `tsc` + `build` are clean. The build is functionally complete and audited; **2 audit
blockers were already fixed**. Nothing is deployed yet.

**Do NOT** re-run the build/redesign/audit — that's done. **Do NOT** push to `main`.

**Your job this session is one (ask me which if unsure):**

1. **Deploy `feat/v2` to the real site** (most likely). Follow `KEYS_SETUP.md` §"Deploy" + HANDOFF §5:
   merge/publish the PR, `supabase db push`, deploy edge functions, set the **new** `ALLOWED_APP_ORIGINS`
   secret + **production-domain** `MS_GRAPH_REDIRECT_URI`, register the `graph-renew` cron, then delete
   `LOVABLE_API_KEY`. I'll need to authorize/link tooling (Supabase CLI, gh) — tell me the exact
   commands to run via `! <command>` when you hit an interactive step.
2. **Clear the non-blocking audit backlog** (HANDOFF §6 / `audit/SUMMARY.md`): the medium form-a11y fix
   (migrate request/create forms to the accessible `Form` primitive), the design-contract drift
   (timeline `text-white` contrast, crimson selection rail, graph token colors), and the minor a11y nits.
   Keep changes presentation-only; preserve routes/data/auth/RLS; keep `tsc`+`build` green; commit to
   `feat/v2` so the PR updates.
3. **Local testing / iteration** on `feat/v2`: `npm run dev` (http://localhost:8080, dev login = mock
   test profiles, all flags on in preview).

**Rules:** preserve the premise (data model, routes, projects↔tasks↔pages workflow, Entra SSO, RLS,
read-only AI). Edge functions only for server logic. Semantic HSL tokens only (no hardcoded colors).
No `window.prompt/confirm`. Commit in small focused commits; never push `main`; ask before any
destructive git op.

**First, report:** (a) the verified current state, (b) which of the three tracks above you recommend,
and (c) a short plan — then wait for my go-ahead.
