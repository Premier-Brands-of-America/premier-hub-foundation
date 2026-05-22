import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { EntityIcon } from "@/components/common/EntityIcon";
import { MatchHighlight } from "@/components/search/MatchHighlight";
import { useSearch, useSearchPeople } from "@/hooks/use-search";
import { useRecentItems } from "@/hooks/use-recent-items";
import type { SearchEntityType, SearchHit } from "@/types/search";
import { Calendar, FilePlus2, FolderPlus, LayoutDashboard, PlusSquare, User } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function routeFor(type: SearchEntityType | "user", id: string): string {
  switch (type) {
    case "project": return `/owned-projects?focus=${id}`;
    case "task":    return `/tasks?focus=${id}`;
    case "request": return `/requests/${id}`;
    case "page":    return `/pages/${id}`;
    case "user":    return `/profile?u=${id}`;
  }
}

function groupHits(hits: SearchHit[]): Record<SearchEntityType, SearchHit[]> {
  const out: Record<SearchEntityType, SearchHit[]> = {
    page: [], project: [], task: [], request: [],
  };
  for (const h of hits) out[h.entity_type]?.push(h);
  return out;
}

const GROUP_LABEL: Record<SearchEntityType, string> = {
  page: "Pages",
  project: "Projects",
  task: "Tasks",
  request: "Requests",
};

export function GlobalCommandPalette({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const { items: recent, push } = useRecentItems();

  const showResults = query.trim().length >= 2;
  const { data: hits = [], isFetching } = useSearch(query, undefined, 25);
  const { data: people = [] } = useSearchPeople(query, 8);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const grouped = groupHits(hits);

  const go = (
    path: string,
    item?: { entity_type: SearchHit["entity_type"] | "user"; id: string; title: string },
  ) => {
    if (item) push({ entity_type: item.entity_type, id: item.id, title: item.title });
    onOpenChange(false);
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search projects, tasks, requests, pages, people…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {isFetching ? "Searching…" : showResults ? "No matches found." : "Type to search."}
        </CommandEmpty>

        <CommandGroup heading="Quick actions">
          <CommandItem onSelect={() => go("/tasks")}>
            <PlusSquare className="mr-2 h-4 w-4" />Create task
          </CommandItem>
          <CommandItem onSelect={() => go("/owned-projects")}>
            <FolderPlus className="mr-2 h-4 w-4" />New project
          </CommandItem>
          <CommandItem onSelect={() => go("/requests/new")}>
            <FilePlus2 className="mr-2 h-4 w-4" />New request
          </CommandItem>
          <CommandItem onSelect={() => go("/pages")}>
            <PlusSquare className="mr-2 h-4 w-4" />New page
          </CommandItem>
          <CommandItem onSelect={() => go("/")}>
            <LayoutDashboard className="mr-2 h-4 w-4" />Go to dashboard
          </CommandItem>
          <CommandItem onSelect={() => go("/timeline")}>
            <Calendar className="mr-2 h-4 w-4" />Open timeline
          </CommandItem>
        </CommandGroup>

        {!showResults && recent.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Recent">
              {recent.map((r) => (
                <CommandItem
                  key={`recent-${r.entity_type}-${r.id}`}
                  value={`recent-${r.entity_type}-${r.id}-${r.title}`}
                  onSelect={() =>
                    go(routeFor(r.entity_type, r.id), {
                      entity_type: r.entity_type, id: r.id, title: r.title,
                    })
                  }
                >
                  <EntityIcon type={r.entity_type} className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{r.title}</span>
                  <span className="ml-auto text-[10px] uppercase text-muted-foreground">{r.entity_type}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {showResults &&
          (Object.keys(GROUP_LABEL) as SearchEntityType[]).map((type) =>
            grouped[type].length > 0 ? (
              <CommandGroup key={type} heading={GROUP_LABEL[type]}>
                {grouped[type].map((h) => (
                  <CommandItem
                    key={`${h.entity_type}-${h.id}`}
                    value={`${h.entity_type}-${h.id}-${h.title}`}
                    onSelect={() =>
                      go(routeFor(h.entity_type, h.id), {
                        entity_type: h.entity_type, id: h.id, title: h.title,
                      })
                    }
                  >
                    <EntityIcon type={h.entity_type} className="mr-2 h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="truncate text-sm">{h.title}</span>
                      {h.snippet && (
                        <MatchHighlight html={h.snippet} className="truncate text-xs text-muted-foreground" />
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null,
          )}

        {showResults && people.length > 0 && (
          <CommandGroup heading="People">
            {people.map((p) => (
              <CommandItem
                key={`user-${p.user_id}`}
                value={`user-${p.user_id}-${p.full_name ?? p.email ?? ""}`}
                onSelect={() =>
                  go(routeFor("user", p.user_id), {
                    entity_type: "user", id: p.user_id,
                    title: p.full_name ?? p.email ?? "User",
                  })
                }
              >
                <User className="mr-2 h-4 w-4 text-muted-foreground" />
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="truncate text-sm">{p.full_name ?? p.email}</span>
                  {p.department && (
                    <span className="truncate text-xs text-muted-foreground">
                      {p.role} · {p.department}
                    </span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {showResults && (
          <>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem onSelect={() => go(`/search?q=${encodeURIComponent(query)}`)}>
                <span className="text-sm">See all results for “{query}”</span>
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
      <div className="border-t border-border px-3 py-2 text-[10px] text-muted-foreground">
        ↑↓ navigate · ↵ open · esc close
      </div>
    </CommandDialog>
  );
}