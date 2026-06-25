import type { LucideIcon } from "lucide-react";
import {
  CheckSquare,
  FolderKanban,
  FileText,
  CalendarDays,
  Inbox,
  Share2,
} from "lucide-react";
import type { CardType, WidgetConfig } from "./types";
import { MyOpenTasksCard } from "./cards/MyOpenTasksCard";
import { ProjectRollupCard } from "./cards/ProjectRollupCard";
import { RecentPagesCard } from "./cards/RecentPagesCard";
import { CalendarWeekCard } from "./cards/CalendarWeekCard";
import { ArtRequestQueueCard } from "./cards/ArtRequestQueueCard";
import { MiniGraphCard } from "./cards/MiniGraphCard";

export interface CardDefinition {
  type: CardType;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Default column/row span on add (12-col grid). */
  defaultSize: { w: number; h: number };
  /** Default saved-view config on add. */
  defaultConfig: WidgetConfig;
  /** Body renderer — receives the widget's saved view config. */
  render: (config: WidgetConfig) => JSX.Element;
}

export const CARD_REGISTRY: Record<CardType, CardDefinition> = {
  "my-open-tasks": {
    type: "my-open-tasks",
    title: "My Open Tasks",
    description: "Your active tasks, soonest due first.",
    icon: CheckSquare,
    defaultSize: { w: 4, h: 2 },
    defaultConfig: { source: "tasks", filter: { status: "active" }, sort: { field: "due_date", dir: "asc" }, limit: 6 },
    render: (config) => <MyOpenTasksCard config={config} />,
  },
  "project-rollup": {
    type: "project-rollup",
    title: "Project Rollup",
    description: "Count of projects grouped by status.",
    icon: FolderKanban,
    defaultSize: { w: 4, h: 2 },
    defaultConfig: { source: "projects", scope: "owned", group: "status" },
    render: (config) => <ProjectRollupCard config={config} />,
  },
  "recent-pages": {
    type: "recent-pages",
    title: "Recent Pages",
    description: "Pages you've touched most recently.",
    icon: FileText,
    defaultSize: { w: 4, h: 2 },
    defaultConfig: { source: "pages", sort: { field: "updated_at", dir: "desc" }, limit: 6 },
    render: (config) => <RecentPagesCard config={config} />,
  },
  "calendar-week": {
    type: "calendar-week",
    title: "This Week",
    description: "Your Outlook calendar for the week.",
    icon: CalendarDays,
    defaultSize: { w: 4, h: 2 },
    defaultConfig: { source: "calendar_events" },
    render: () => <CalendarWeekCard />,
  },
  "art-request-queue": {
    type: "art-request-queue",
    title: "Art Requests",
    description: "Your role's slice of the request portal.",
    icon: Inbox,
    defaultSize: { w: 4, h: 2 },
    defaultConfig: { source: "requests", limit: 6 },
    render: (config) => <ArtRequestQueueCard config={config} />,
  },
  "mini-graph": {
    type: "mini-graph",
    title: "Relations",
    description: "A compact overview of your graph.",
    icon: Share2,
    defaultSize: { w: 4, h: 1 },
    defaultConfig: {},
    render: () => <MiniGraphCard />,
  },
};

export const CARD_TYPES = Object.keys(CARD_REGISTRY) as CardType[];

export function getCardDefinition(type: CardType): CardDefinition {
  return CARD_REGISTRY[type];
}
