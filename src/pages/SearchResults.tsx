import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EntityIcon } from "@/components/common/EntityIcon";
import { MatchHighlight } from "@/components/search/MatchHighlight";
import { useSearch, useSearchPeople } from "@/hooks/use-search";
import type { SearchEntityType, SearchHit } from "@/types/search";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/PageHeader";
import { Search, SearchX, ChevronRight } from "lucide-react";

const TABS: Array<{ value: "all" | SearchEntityType | "people"; label: string }> = [
  { value: "all", label: "All" },
  { value: "page", label: "Pages" },
  { value: "project", label: "Projects" },
  { value: "task", label: "Tasks" },
  { value: "request", label: "Requests" },
  { value: "people", label: "People" },
];

// Maps a search entity type to its categorical color token.
const ENTITY_TOKEN: Record<SearchEntityType | "user", string> = {
  project: "--entity-project",
  task: "--entity-task",
  request: "--entity-request",
  page: "--status-info",
  user: "--entity-person",
};

function routeFor(type: SearchEntityType | "user", id: string): string {
  switch (type) {
    case "project": return `/owned-projects?focus=${id}`;
    case "task":    return `/tasks?focus=${id}`;
    case "request": return `/requests/${id}`;
    case "page":    return `/pages/${id}`;
    case "user":    return `/profile?u=${id}`;
  }
}

function EntityBadge({ type }: { type: SearchEntityType | "user" }) {
  const token = ENTITY_TOKEN[type];
  return (
    <span
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
      style={{ backgroundColor: `hsl(var(${token}) / 0.14)`, color: `hsl(var(${token}))` }}
      aria-hidden="true"
    >
      <EntityIcon type={type} className="h-4 w-4" />
    </span>
  );
}

function HitRow({ hit, onClick }: { hit: SearchHit; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-start gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <EntityBadge type={hit.entity_type} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-foreground">{hit.title}</div>
        {hit.snippet && (
          <MatchHighlight html={hit.snippet} className="mt-0.5 block text-xs text-muted-foreground line-clamp-2" />
        )}
      </div>
      <span className="mt-0.5 shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">{hit.entity_type}</span>
      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground" aria-hidden="true" />
    </button>
  );
}

export default function SearchResults() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const q = params.get("q") ?? "";
  const [tab, setTab] = useState<(typeof TABS)[number]["value"]>("all");
  const [draft, setDraft] = useState(q);

  const types: SearchEntityType[] | undefined =
    tab === "all" || tab === "people" ? undefined : [tab];

  const { data: hits = [], isLoading } = useSearch(q, types, 50);
  const { data: people = [], isLoading: peopleLoading } = useSearchPeople(q, 25);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setParams({ q: draft });
  };

  const activeCount = tab === "people" ? people.length : hits.length;
  const subtitle = q
    ? `${activeCount} ${activeCount === 1 ? "result" : "results"} for “${q}”`
    : "Find projects, tasks, requests, pages, and people";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Search" subtitle={subtitle} />

      {/* The search input is the hero — marked with the crimson edge-rail. */}
      <header className="edge-rail space-y-2">
        <form onSubmit={onSubmit} className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Search projects, tasks, requests, pages…"
            className="h-11 pl-9 text-base"
            autoFocus
          />
        </form>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
          ))}
        </TabsList>

        {TABS.filter((t) => t.value !== "people").map((t) => (
          <TabsContent key={t.value} value={t.value} className="mt-4 space-y-2">
            {!q && (
              <EmptyState
                icon={<Search className="h-6 w-6" />}
                title="Start typing to search"
                description="Search across projects, tasks, requests, and pages in one place."
              />
            )}
            {q && isLoading && (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            )}
            {q && !isLoading && hits.length === 0 && (
              <EmptyState
                icon={<SearchX className="h-6 w-6" />}
                title="No results found"
                description="Try a broader query or remove filters to widen the search."
              />
            )}
            {q && !isLoading && hits.map((h) => (
              <HitRow
                key={`${h.entity_type}-${h.id}`}
                hit={h}
                onClick={() => navigate(routeFor(h.entity_type, h.id))}
              />
            ))}
          </TabsContent>
        ))}

        <TabsContent value="people" className="mt-4 space-y-2">
          {!q && (
            <EmptyState
              icon={<Search className="h-6 w-6" />}
              title="Find people"
              description="Search teammates by name, role, department, or email."
            />
          )}
          {q && peopleLoading && (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          )}
          {q && !peopleLoading && people.length === 0 && (
            <EmptyState
              icon={<SearchX className="h-6 w-6" />}
              title="No people match"
              description="Try a different name, role, or department."
            />
          )}
          {q && !peopleLoading && people.map((p) => (
            <button
              key={p.user_id}
              type="button"
              onClick={() => navigate(routeFor("user", p.user_id))}
              className="group flex w-full items-start gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <EntityBadge type="user" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-foreground">
                  {p.full_name ?? p.email}
                </div>
                <div className="mt-0.5 truncate text-xs text-muted-foreground">
                  {p.role}{p.department ? ` · ${p.department}` : ""}{p.email ? ` · ${p.email}` : ""}
                </div>
              </div>
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground" aria-hidden="true" />
            </button>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
