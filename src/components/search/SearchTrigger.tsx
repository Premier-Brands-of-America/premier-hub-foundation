import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

const isMac =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

export function SearchTrigger({ onClick }: { onClick: () => void }) {
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={onClick}
        aria-label="Open search (Command K)"
        className="hidden md:flex h-8 gap-2 px-2 text-xs text-muted-foreground"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Search…</span>
        <kbd className="ml-2 inline-flex items-center rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono">
          {isMac ? "⌘" : "Ctrl"}K
        </kbd>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onClick}
        aria-label="Open search"
        className="md:hidden h-8 w-8 text-muted-foreground"
      >
        <Search className="h-4 w-4" />
      </Button>
    </>
  );
}