# Premier Hub — Production Real-Data Audit

Audit of every surface for demo/stub data leaking into **production** instead of real Supabase tables / edge functions. Preview (`isPreviewEnvironment()` → localhost/.ts.net/DEV) keeps the demo path as a mock fallback; production must read real data.

**Scope:** 72 surfaces audited by 11 parallel readers. **7** showed demo/stub data in production; all are the Planner cluster + the dashboard calendar card. The remaining **65** were already correctly wired (demo only in preview).

## Fixed in this pass

| Surface | Was (production) | Now (production) |
|---|---|---|
| **Dashboard "This Week" calendar** (`CalendarWeekCard.tsx`) | Permanent stub — always "Connect Outlook" with a **disabled** button; never read data even when M365 connected | Detects `ms_connections` via `useOutlookConnection`; renders real `calendar_events` for the current week, auto-triggers a background `calendar-sync`; working Connect empty-state only when not connected; demo week only in preview |
| **Profile → Organization** (`ProfilePage.tsx`) | No org info at all (only email/role/Object ID); no way to sync M365 | New Organization card shows real title / department / office / manager (reports-to) / direct-reports from `profiles` + directory; admin-only **"Sync Microsoft 365 directory"** invokes `graph-user-directory` (backfills profiles + `org_directory`) with loading/success/error; prompts after a fresh connect |
| **Planner / Kanban** (board, buckets, cards, drag, charts, assignees) | Permanently demo: `usePlannerBoard("demo-project")` + localStorage + `DEMO_USERS`; never read `project_buckets`/`tasks` | Production project picker + `usePlannerBoardSupabase` reading/writing real `project_buckets`/`tasks`; real user directory for assignees/@mentions; demo/localStorage only in preview |

## Already correct (demo only in preview) — verified

| Surface | Production data source |
|---|---|
| MyRequests.tsx | Queries the real 'requests' Supabase table filtered by requester_id and ordered by created_at descending. No hardcoded stub. |
| Queue.tsx | Queries the real 'requests' Supabase table with status NOT in (complete, archived), ordered by priority then due_date. Renders list or empty state correctly. |
| RequestDetail.tsx | Queries the real 'requests' Supabase table by id. Displays loading state, 'not found' error state (lines 51-73), or full request detail with attachments, Sha… |
| SubmitRequest.tsx | No data fetching. Routes between EasyRequest and FullBriefRequest forms based on user choice. |
| EasyRequest.tsx | Inserts into real 'requests' Supabase table via createRequest(). Also fires async edge function 'sharepoint-provision' in production only (useRequests.ts lin… |
| FullBriefRequest.tsx | Inserts into real 'requests' Supabase table via createRequest() (lines 169-178). Also fires async edge function 'sharepoint-provision' in production only. Sh… |
| Network Graph (/graph mode) | get_graph_data RPC returns real Supabase data (graphService.ts:75-79) |
| Org Chart Graph (/org mode) | get_org_chart_data RPC returns real org_directory data (graphService.ts:109-118); graceful fallback to get_graph_data if RPC not deployed (graphService.ts:11… |
| Memory Graph (/memory mode) | get_graph_data RPC with all entity types [project,task,request,page,user] (graphService.ts:123), RLS-scoped to current user's visible data |
| Graph Realtime Updates | Subscribes to postgres_changes on real Supabase tables: entity_relations, projects, tasks, requests, pages (use-graph-realtime.ts:14-24); invalidates graph c… |
| Node Expansion (expandNode function) | Calls expand_node RPC to fetch neighborhood of a node at given depth (graphService.ts:132-134) |
| Node Detail Sheet | Displays node metadata from real Supabase graph nodes, plus navigation links to detail pages (NodeDetailSheet.tsx:17-22,116-120) |
| OpenInMemoryGraphButton | Same navigation link; target /memory page uses real get_graph_data RPC in production (graphService.ts:123) |
| Audit Log Page (AuditLogPage.tsx) | Queries public.audit_log table directly via Supabase client, joins to profiles table for actor full_name and email, orders by created_at DESC, limits to 500 … |
| Reports.tsx page | Fetches from real Supabase: requests table via supabase.from('requests').select('*'); departments via supabase.from('active_departments').select() (useActive… |
| Workload.tsx page | useQueue() calls listQueue() in services/requests.ts which fetches from real supabase.from('requests').select('*') with filter 'not status in (complete,archi… |
| ReportCharts.tsx component | Receives real ReportItem[] array built from production Supabase requests + departments. Renders charts directly from metrics without any stub states or 'comi… |
| useDepartments.ts hook (useActiveDepartments) | Queries supabase.from('active_departments').select() with order by display_order. Sets up realtime channel on 'departments' table to invalidate query cache o… |
| Page Tree Display | In production (lovable.app), fetchPageTree() calls supabase.rpc('get_page_tree', {p_root_id}) which executes the get_page_tree RPC defined in migrations. The… |
| Page Detail / Editor | In production, fetchPage(id) executes supabase.from('pages').select('*').eq('id', id).maybeSingle() with RLS applied. Updates via savePageBody() call supabas… |
| Page Metadata (Title, Icon, Cover, Visibility) | In production, updatePageTitle() and updatePageMeta() directly execute supabase.from('pages').update({...}).eq('id', id) calls with RLS enforcing can_edit_pa… |
| Backlinks / References Panel | In production, fetchBacklinks() calls supabase.rpc('get_backlinks', {p_target_type, p_target_id}) which queries the page_links table and performs a full-text… |
| Page Sharing (Feature 6) | In production, fetchPageShares() queries supabase.from('page_shares').select(...).eq('page_id', pageId) and then fetches profiles for enrichment. Share mutat… |
| Page Archival | In production, archivePage() calls supabase.from('pages').update({archived_at: new Date().toISOString()}).eq('id', id). Archived pages are filtered out by ge… |
| Page Creation | In production, createPage() calls supabase.rpc('create_page', {p_title, p_parent_id, p_visibility}) which inserts into pages table with auth.uid() as owner_i… |
| Page Ancestors / Breadcrumbs | In production, fetchAncestors() walks parent_id chain via repeated supabase.from('pages').select(...).eq('id', curId).maybeSingle() queries (loop up to 12 it… |
| Search Results (Pages Tab) | In production, searchEntities() first calls search_all() RPC which executes websearch_to_tsquery on page.search_vector (tsvector generated from title + body_… |
| Recent Items | Same as preview - localStorage-based tracking of recently visited items (projects, tasks, requests, pages, users). No Supabase queries. UI displays these for… |
| TasksPage List View | Calls supabase.from('tasks').select(TASK_FIELDS).order('created_at', {ascending: false}).range(from, to) to fetch paginated real data from Supabase tasks tab… |
| TaskDetailPanel - Task Field Editing | Calls supabase.from('tasks').update({...updates}).eq('id', taskId).select().single() to persist changes, then calls supabase.from('task_activity').insert() t… |
| TaskDetailPanel - Task Contacts | Calls supabase.from('task_contacts').insert/delete() to persist changes; fetchTaskContacts() queries supabase.from('task_contacts').select() with eq('task_id… |
| TaskDetailPanel - Task Updates (Notes) | Calls supabase.from('task_updates').insert() to persist; fetchTaskUpdates() queries supabase.from('task_updates').select() with RLS policy ensuring user can … |
| TaskDetailPanel - Task Attachments | Calls supabase.storage.from('task-attachments').upload(path, file) to store file, then supabase.from('task_attachments').insert() to record metadata. getAtta… |
| TaskDetailPanel - Task Links | Calls supabase.from('task_links').insert/delete() with URL validation (isValidUrl check); fetchTaskLinks() queries supabase.from('task_links').select() with … |
| TaskDetailPanel - Activity Trail | fetchTaskActivity() queries supabase.from('task_activity').select() with eq('task_id', taskId) ordered descending; logActivity() calls supabase.from('task_ac… |
| ProjectListPage - Projects List | Calls supabase.from('projects').select(PROJECT_FIELDS).order('created_at', {ascending: false}).range(from, to) to fetch paginated real data; then calls fetch… |
| ProjectDetailPanel - Project Field Editing | Calls supabase.from('projects').update({...updates}).eq('id', projectId).select().single() to persist changes; then calls supabase.from('project_activity').i… |
| ProjectDetailPanel - Project Stakeholders | fetchProjectStakeholders() queries supabase.from('project_stakeholders').select() with eq('project_id', projectId), then batch fetches profiles to enrich wit… |
| ProjectDetailPanel - Project Updates (Notes) | fetchProjectUpdates() queries supabase.from('project_updates').select() with eq('project_id', projectId); addProjectUpdate() calls supabase.from('project_upd… |
| ProjectDetailPanel - Project Attachments | Calls supabase.storage.from('project-attachments').upload(path, file) to store file, then supabase.from('project_attachments').insert() to record metadata. g… |
| ProjectDetailPanel - Project Links | Calls supabase.from('project_links').insert/delete() with URL validation; fetchProjectLinks() queries supabase.from('project_links').select() with eq('projec… |
| ProjectDetailPanel - Activity Trail | fetchProjectActivity() queries supabase.from('project_activity').select() with eq('project_id', projectId) ordered descending; logProjectActivity() calls sup… |
| ProjectDocuments Component | listProjectDocuments() queries supabase.from('project_documents').select() with eq('project_id', projectId) and batch fetches uploader names from profiles ta… |
| Environment Detection and Service Initialization | In production (lovable.app domain), isPreviewEnvironment() returns false due to import.meta.env.DEV check and hostname validation. All services read IS_PREVI… |
| RLS Policy Enforcement | Server-side RLS policies on tasks table (visibility='public' OR user_id=auth.uid() OR is_manager_of() OR is_admin()) and projects table (visibility='public' … |
| ArtRequestQueueCard | Queries Supabase requests table filtered by user role: requester sees own requests, designer sees assignments, admin sees open queue (lines 43-70) |
| MiniGraphCard | Counts entities via parallel queries to projects, tasks, and pages tables using head mode with exact count (lines 40-52) |
| MyOpenTasksCard | Queries tasks table for the user's active tasks, ordered by due_date (lines 37-46) |
| ProjectRollupCard | Queries projects table (for owned projects) or project_stakeholders + projects tables (for assigned) and groups by status (lines 43-69) |
| RecentPagesCard | Queries pages table for non-archived pages, ordered by recent updates (lines 43-50) |
| useDashboardStats hook | Queries real data from tasks, projects, project_stakeholders, task_activity, and project_activity tables. Computes active task count, assigned/owned project … |
| Microsoft365Connections (Profile page integrations section) | Reads real ms_connections table via useOutlookConnection() hook (line 36, 53). When msConn exists (truthy), all services show as 'Connected' (lines 38-42). C… |
| OutlookCalendarPanel (Project detail page calendar + email tabs) | Fetches real ms_connections via useOutlookConnection() (line 53, which calls fetchConnection() that queries ms_connections table via RLS). Fetches real calen… |
| OutlookEmailSearch (Email search within OutlookCalendarPanel) | Calls real mail-search edge function via useMailSearch() hook (line 17-18, which invokes outlook-api.searchMail() that calls the edge function). Results are … |
| StakeholderPicker (Project/Task stakeholder selection popover) | When opened in production (IS_PREVIEW=false), queries real Supabase profiles table with filters is_active=true, ordered by full_name (lines 55-59). Results a… |
| directory.ts fetchDirectory() helper (M365 user directory lookups) | If IS_PREVIEW=false, queries real Supabase profiles table with filters is_active=true, ordered by full_name (lines 28-32). Results are type-cast as Stakehold… |
| SharePointPanel (Request detail page SharePoint folder provisioning) | Receives folderUrl from RequestDetail props (which comes from request.sharepoint_folder_url, set by the real database). Provision button (line 75-86) calls r… |
| ProfilePage - User Profile Details | Reads real profile data from Supabase 'profiles' table via AuthContext.syncAndFetchProfile() which calls supabase.from('profiles').select('*') (AuthContext.t… |
| Org Chart Graph (/org route) | Calls Supabase RPC get_org_chart_data (graphService.ts line 109) which reads from profiles table to build user+department nodes and reports_to/member_of edge… |
| ProfilePage - Microsoft 365 Connections | Reads from useOutlookConnection() hook which queries Supabase ms_connections table (Microsoft365Connections.tsx lines 36-42). Disconnect operation calls supa… |
| Search Results Page | Calls Supabase RPCs: search_all (FTS), search_fuzzy (fuzzy matching), search_people (directory search) with real data from projects, tasks, requests, pages, … |
| Relations System | Calls Supabase RPCs for list_relations, add_relation, remove_relation, bulk_add_relations; subscribes to realtime entity_relations table changes (lines 82-95… |
| Timeline Page | Calls Supabase RPC get_timeline for data; rescheduleEvent updates tasks, projects, requests tables with new dates (lines 63-81) |
| AI Assistant / AI Chat | Streams responses from Supabase edge function ai-assistant which calls OpenAI API with real user context (tasks, projects, activity, stakeholders built from … |
| Realtime Subscriptions | Subscribes to postgres_changes on specified tables (tasks, projects, pages, entity_relations, etc.) and invalidates React Query caches on real-time updates |
