import { useState, useEffect, useMemo, useRef } from "react";
import { Search, UserPlus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { StakeholderProfile } from "@/types/projects";
import { supabase } from "@/integrations/supabase/client";
import { isPreviewEnvironment } from "@/lib/environment";

const IS_PREVIEW = isPreviewEnvironment();

// Mock profiles for preview
const MOCK_PROFILES: StakeholderProfile[] = [
  { user_id: "mock-uid-001", full_name: "Jane Doe", email: "jane.doe@premier-brands.com", title: "Project Coordinator", department: "Marketing", manager_email: "manager@premier-brands.com" },
  { user_id: "mock-uid-002", full_name: "Alex Admin", email: "admin@premier-brands.com", title: "IT Director", department: "Information Technology", manager_email: "cto@premier-brands.com" },
  { user_id: "mock-uid-003", full_name: "Dana Diagnostics", email: "diag.user@premier-brands.com", title: "QA Analyst", department: "Quality Assurance", manager_email: "qa-lead@premier-brands.com" },
  { user_id: "mock-uid-004", full_name: "Sam Smith", email: "sam.smith@premier-brands.com", title: "Brand Manager", department: "Marketing", manager_email: "jane.doe@premier-brands.com" },
  { user_id: "mock-uid-005", full_name: "Casey Chen", email: "casey.chen@premier-brands.com", title: "Software Engineer", department: "Information Technology", manager_email: "admin@premier-brands.com" },
  { user_id: "mock-uid-006", full_name: "Riley Roberts", email: "riley.roberts@premier-brands.com", title: "Financial Analyst", department: "Finance", manager_email: "cfo@premier-brands.com" },
];

interface StakeholderPickerProps {
  existingUserIds: string[];
  onSelect: (profile: StakeholderProfile) => void;
}

export function StakeholderPicker({ existingUserIds, onSelect }: StakeholderPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [profiles, setProfiles] = useState<StakeholderProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      if (IS_PREVIEW) {
        setProfiles(MOCK_PROFILES);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, title, department, manager_email")
        .eq("is_active", true)
        .order("full_name");
      if (!error && data) {
        setProfiles(data as StakeholderProfile[]);
      }
      setLoading(false);
    };
    load();
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const filtered = useMemo(() => {
    const available = profiles.filter((p) => !existingUserIds.includes(p.user_id));
    if (!search.trim()) return available;
    const q = search.toLowerCase();
    return available.filter(
      (p) =>
        (p.full_name && p.full_name.toLowerCase().includes(q)) ||
        (p.email && p.email.toLowerCase().includes(q)) ||
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.department && p.department.toLowerCase().includes(q)) ||
        (p.manager_email && p.manager_email.toLowerCase().includes(q))
    );
  }, [profiles, existingUserIds, search]);

  const handleSelect = (profile: StakeholderProfile) => {
    onSelect(profile);
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
          <UserPlus className="h-3.5 w-3.5" /> Add Stakeholder
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Search by name, title, department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
        <ScrollArea className="max-h-64">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              {search ? "No matching users found." : "All active users are already stakeholders."}
            </p>
          ) : (
            <div className="p-1">
              {filtered.map((p) => (
                <Tooltip key={p.user_id} delayDuration={400}>
                  <TooltipTrigger asChild>
                    <button
                      className="w-full text-left px-2.5 py-2 rounded-md hover:bg-muted transition-colors flex items-center gap-2"
                      onClick={() => handleSelect(p)}
                    >
                      <div className="w-7 h-7 rounded-full bg-[hsl(var(--entity-person)/0.14)] flex items-center justify-center text-[11px] font-medium text-[hsl(var(--entity-person))] shrink-0">
                        {(p.full_name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          {p.full_name || p.email || "Unknown"}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {p.department || p.title || p.email}
                        </p>
                      </div>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <div className="space-y-0.5 text-xs">
                      <p className="font-medium">{p.full_name || "Unknown"}</p>
                      {p.title && <p className="text-muted-foreground">{p.title}</p>}
                      {p.department && <p className="text-muted-foreground">Dept: {p.department}</p>}
                      {p.manager_email && <p className="text-muted-foreground">Reports to: {p.manager_email}</p>}
                      {p.email && <p className="text-muted-foreground">{p.email}</p>}
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
