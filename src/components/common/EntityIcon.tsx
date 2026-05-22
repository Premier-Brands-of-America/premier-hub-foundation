import { Folder, CheckSquare, FileText, FileType2, User, Building2 } from "lucide-react";
import type { EntityType } from "@/types/relations";

const map: Record<EntityType, React.ComponentType<{ className?: string }>> = {
  project: Folder,
  task: CheckSquare,
  request: FileText,
  page: FileType2,
  user: User,
  department: Building2,
};

export function EntityIcon({ type, className }: { type: EntityType; className?: string }) {
  const Icon = map[type];
  return <Icon className={className} />;
}