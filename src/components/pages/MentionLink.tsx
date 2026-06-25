import { useNavigate } from "react-router-dom";
import { EntityIcon } from "@/components/common/EntityIcon";
import { entityHref } from "@/lib/entity-links";
import type { EntityType } from "@/types/relations";
import { cn } from "@/lib/utils";

interface Props {
  type: EntityType;
  id: string;
  title?: string;
}

/** Renders a stored `[[type:id]]` wikilink as a clickable, titled chip. */
export function MentionLink({ type, id, title }: Props) {
  const navigate = useNavigate();
  const href = entityHref(type, id);
  const label = title || type;
  const base =
    "inline-flex items-center gap-1 rounded bg-primary/10 text-primary px-1.5 py-0.5 text-xs font-medium not-prose align-baseline";

  if (!href) {
    return (
      <span className={base}>
        <EntityIcon type={type} className="h-3 w-3" />
        {label}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => navigate(href)}
      className={cn(base, "cursor-pointer transition hover:bg-primary/20")}
      title={`Open ${type}`}
    >
      <EntityIcon type={type} className="h-3 w-3" />
      {label}
    </button>
  );
}
