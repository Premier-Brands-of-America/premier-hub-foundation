import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AIChat } from "@/components/AIChat";

interface AIChatPanelProps {
  onClose: () => void;
}

export function AIChatPanel({ onClose }: AIChatPanelProps) {
  return (
    <div className="w-80 md:w-96 border-l border-border bg-card flex flex-col shrink-0">
      <AIChat variant="panel" onClose={onClose} />
    </div>
  );
}
