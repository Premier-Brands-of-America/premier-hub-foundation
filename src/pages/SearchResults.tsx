import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EntityIcon } from "@/components/common/EntityIcon";
import { MatchHighlight } from "@/components/search/MatchHighlight";
import { useSearch, useSearchPeople } from "@/hooks/use-search";
import type { SearchEntityType, SearchHit } from "@/types/search";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const TABS: Array<{ value: "all" | SearchEntityType | "people"; label: string }> = [
  { value: "all", label: "All" },
  { value: "page", label: "Pages" },
  { value: "project", label: "Projects" },
  { value: "task", label: "Tasks" },
  { value: "request", label: "Requests" },
  { value: "people", label: "People" },
];

function routeFor(type: SearchEntityType | "user", id: string): string {
  switch (type) {
    case "project": return `/owned-projects?focus=${id}`;
    case "task":    return `/tasks?focus=${id}`;
    case "request": return `/requests/${id}`;
    case "page":    return `/pages/${id}`;
    case "user":    return `/profile?u=${id}`;
  }
}

function HitRow({ hit, onClick }: { hit: SearchHit; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-start gap-3 rounded-md border border-border bg-card p-3 text-left transition-colors hover:bg-accent"
    >
      <EntityIcon type={hit.entity_type} className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-foreground truncate">{hit.title}</div>
        {hit.snippet && (
          <MatchHighlight html={hit.snippet} className="block text-xs text-muted-foreground line-clamp-2" />
        )}
      </div>
      <span className="text-[10px] uppercase text-muted-foreground">{hit.entity_type}</span>
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

  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <h1 className="text-xl font-semibold text-foreground">Search</h1>
        <form onSubmit={onSubmit} className="relative max-w-xl">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Search projects, tasks, requests, pages…"
            className="pl-8"
            autoFocus
          />
        </form>
        {q && (
          <p className="text-xs text-muted-foreground">
            Showing results for <span className="font-medium text-foreground">“{q}”</span>
          </p>
        )}
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
          ))}
        </TabsList>

        {TABS.filter((t) => t.value !== "people").map((t) => (
          <TabsContent key={t.value} value={t.value} className="space-y-2 mt-3">
            {!q && <p className="text-sm text-muted-foreground">Type a query to start searching.</p>}
            {q && isLoading && (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            )}
            {q && !isLoading && hits.length === 0 && (
              <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No results. Try a broader query or remove filters.
              </div>
            )}
            {hits.map((h) => (
              <HitRow
                key={`${h.entity_type}-${h.id}`}
                hit={h}
                onClick={() => navigate(routeFor(h.entity_type, h.id))}
              />
            ))}
          </TabsContent>
        ))}

        <TabsContent value="people" className="space-y-2 mt-3">
          {!q && <p className="text-sm text-muted-foreground">Type a query to start searching.</p>}
          {q && peopleLoading && (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          )}
          {q && !peopleLoading && people.length === 0 && (
            <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No people match.
            </div>
          )}
          {people.map((p) => (
            <button
              key={p.user_id}
              type="button"
              onClick={() => navigate(routeFor("user", p.user_id))}
              className="w-full flex items-start gap-3 rounded-md border border-border bg-card p-3 text-left hover:bg-accent"
            >
              <EntityIcon type="user" className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground truncate">
                  {p.full_name ?? p.email}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {p.role}{p.department ? ` · ${p.department}` : ""}{p.email ? ` · ${p.email}` : ""}
                </div>
              </div>
            </button>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}