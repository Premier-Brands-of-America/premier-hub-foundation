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
import {
  Calendar, CheckSquare, FilePlus2, FileType2, FolderKanban, Home, Inbox,
  KanbanSquare, ListChecks, Network, PlusSquare, ScrollText, Settings, User, BarChart3, Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Jump-to destinations — every real nav target, so the palette navigates the
// whole 8-item IA (not the 6 hardcoded actions the old build shipped).
const NAV_TARGETS: { label: string; to: string; icon: LucideIcon }[] = [
  { label: "Home", to: "/", icon: Home },
  { label: "My Tasks", to: "/tasks", icon: CheckSquare },
  { label: "Planner", to: "/planner", icon: KanbanSquare },
  { label: "Calendar", to: "/timeline", icon: Calendar },
  { label: "Projects", to: "/projects", icon: FolderKanban },
  { label: "Pages", to: "/pages", icon: FileType2 },
  { label: "Art Requests", to: "/requests", icon: ListChecks },
  { label: "Queue", to: "/queue", icon: Inbox },
  { label: "Reports", to: "/reports", icon: BarChart3 },
  { label: "Explore", to: "/graph", icon: Network },
  { label: "Admin Tools", to: "/admin", icon: Wrench },
  { label: "Audit Log", to: "/audit", icon: ScrollText },
  { label: "Settings", to: "/admin/settings", icon: Settings },
];

function routeFor(type: SearchEntityType | "user", id: string): string {
  switch (type) {
    case "project": return `/projects/${id}`;
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
        placeholder="Search or jump to…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {isFetching ? "Searching…" : showResults ? "No matches found." : "Type to search."}
        </CommandEmpty>

        <CommandGroup heading="Quick actions">
          <CommandItem value="action new task" onSelect={() => go("/tasks")}>
            <PlusSquare className="mr-2 h-4 w-4" />New task
          </CommandItem>
          <CommandItem value="action new project" onSelect={() => go("/projects")}>
            <FolderKanban className="mr-2 h-4 w-4" />New project
          </CommandItem>
          <CommandItem value="action new art request" onSelect={() => go("/requests/new")}>
            <FilePlus2 className="mr-2 h-4 w-4" />New art request
          </CommandItem>
          <CommandItem value="action new page" onSelect={() => go("/pages")}>
            <FileType2 className="mr-2 h-4 w-4" />New page
          </CommandItem>
        </CommandGroup>

        {!showResults && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Go to">
              {NAV_TARGETS.map((n) => (
                <CommandItem key={n.to} value={`go ${n.label}`} onSelect={() => go(n.to)}>
                  <n.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  {n.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

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