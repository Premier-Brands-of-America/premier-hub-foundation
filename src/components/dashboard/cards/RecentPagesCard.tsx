import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowRight, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isPreviewEnvironment } from "@/lib/environment";
import { Button } from "@/components/ui/button";
import type { WidgetConfig } from "../types";
import { CardLoading, CardError, CardEmpty } from "./card-states";

const IS_PREVIEW = isPreviewEnvironment();

interface PageRow {
  id: string;
  title: string;
  icon: string | null;
  updated_at: string;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function RecentPagesCard({ config }: { config: WidgetConfig }) {
  const { user, profile } = useAuth();
  const userId = user?.id ?? profile?.user_id;
  const limit = config.limit ?? 6;
  const navigate = useNavigate();

  const query = useQuery({
    queryKey: ["dashboard-card", "recent-pages", userId, limit],
    enabled: !!userId,
    queryFn: async (): Promise<PageRow[]> => {
      if (IS_PREVIEW || !userId) return [];
      const { data, error } = await supabase
        .from("pages")
        .select("id, title, icon, updated_at")
        .is("archived_at", null)
        .order("updated_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (query.isLoading) return <CardLoading />;
  if (query.isError) return <CardError onRetry={() => query.refetch()} />;

  const pages = query.data ?? [];
  if (pages.length === 0) {
    return (
      <CardEmpty
        message="No pages yet"
        hint="Recently edited pages will appear here."
        action={
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/pages")}
          >
            Open Pages <ArrowRight className="h-3 w-3" />
          </Button>
        }
      />
    );
  }

  return (
    <ul className="space-y-0.5">
      {pages.map((p) => (
        <li key={p.id}>
          <button
            type="button"
            onClick={() => navigate(`/pages/${p.id}`)}
            className="group flex w-full items-center gap-2.5 rounded-md px-1.5 py-1.5 text-left hover:bg-accent"
          >
            <span className="grid h-4 w-4 shrink-0 place-items-center text-muted-foreground">
              {p.icon ? <span className="text-sm leading-none">{p.icon}</span> : <FileText className="h-3.5 w-3.5" />}
            </span>
            <span className="flex-1 truncate text-sm text-foreground">{p.title || "Untitled"}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{relativeTime(p.updated_at)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
