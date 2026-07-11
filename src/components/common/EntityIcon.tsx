import { Folder, CheckSquare, FileText, FileType2, User, Building2, Sparkles, Circle } from "lucide-react";

// Keyed by string (not EntityType) so memory-graph node types like "concept" or
// "transcript" resolve to a fallback icon instead of `undefined` — rendering
// `<undefined />` throws "Element type is invalid" and took down the whole Explore
// view (the app-level ErrorBoundary) whenever a concept node was listed.
const map: Record<string, React.ComponentType<{ className?: string }>> = {
  project: Folder,
  task: CheckSquare,
  request: FileText,
  page: FileType2,
  user: User,
  department: Building2,
  concept: Sparkles,
};

export function EntityIcon({ type, className }: { type: string; className?: string }) {
  const Icon = map[type] ?? Circle;
  return <Icon className={className} />;
}