/**
 * "Meet to discuss" toggle + "Schedule in Outlook" action. Shared capability.
 *
 * The toggle persists a flag visible to the project lead regardless of
 * integration availability. When checked, the action opens the Outlook calendar
 * scheduler pre-filled from the item (subject, attendees, body + link back).
 * Uses lib/outlookPrefill (Graph payload for the deployed edge fn + a web
 * deeplink fallback that needs no elevated scopes).
 */
import { CalendarPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { buildOutlookDeeplink, type MeetingPrefillInput } from "@/lib/outlookPrefill";

export function MeetingScheduler({
  meetingRequired,
  onToggle,
  prefill,
}: {
  meetingRequired: boolean;
  onToggle: (next: boolean) => void;
  prefill: MeetingPrefillInput;
}) {
  function schedule() {
    const url = buildOutlookDeeplink(prefill);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="meet-toggle" className="text-sm font-medium">
            Meet to discuss
          </Label>
        </div>
        <Switch
          id="meet-toggle"
          checked={meetingRequired}
          onCheckedChange={onToggle}
        />
      </div>
      {meetingRequired && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Flagged for the project lead. Schedule a kickoff/review pre-filled
            from this item.
          </p>
          <Button size="sm" variant="outline" onClick={schedule} className="w-full">
            <CalendarPlus className="mr-1.5 h-3.5 w-3.5" />
            Schedule in Outlook
          </Button>
        </div>
      )}
    </div>
  );
}
