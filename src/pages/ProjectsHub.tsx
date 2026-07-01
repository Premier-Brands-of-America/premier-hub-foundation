import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProjectListPage, { type ProjectViewMode } from "./ProjectListPage";

const TABS: { value: ProjectViewMode; label: string }[] = [
  { value: "assigned", label: "Assigned" },
  { value: "owned", label: "Owned" },
  { value: "public", label: "Public" },
  { value: "completed", label: "Completed" },
];

/**
 * Projects hub — one nav entry with tabs for the four project views
 * (Assigned / Owned / Public / Completed), replacing four separate sidebar items.
 * ProjectListPage already accepts a `mode`, so this just switches it.
 */
export default function ProjectsHub() {
  const [view, setView] = useState<ProjectViewMode>("assigned");
  return (
    <div className="space-y-4">
      <Tabs value={view} onValueChange={(v) => setView(v as ProjectViewMode)}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <ProjectListPage mode={view} />
    </div>
  );
}
