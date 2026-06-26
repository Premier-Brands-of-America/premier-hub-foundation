import ReactMarkdown from "react-markdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Video, AlertTriangle } from "lucide-react";

/**
 * Meeting-notes block schema — the contract shared with INTEG-TEAMS.
 * PAGES inserts the scaffold via `/meet` (status "pending"); the Teams pipeline
 * (Graph transcript → summarize Edge Function) later fills summary/actionItems/segments.
 */
export interface MeetingBlockData {
  subject?: string;
  meetingId?: string | null;
  status?: "pending" | "fetched" | "summarized" | "failed";
  summary?: string | null;
  actionItems?: string[];
  segments?: Array<{ speaker?: string; text: string }>;
}

const STATUS_LABEL: Record<NonNullable<MeetingBlockData["status"]>, string> = {
  pending: "Awaiting transcript",
  fetched: "Transcript ready",
  summarized: "Summarized",
  failed: "Failed",
};

function parse(raw: string): MeetingBlockData | null {
  try {
    return JSON.parse(raw.trim()) as MeetingBlockData;
  } catch {
    return null;
  }
}

export function MeetingBlock({ raw }: { raw: string }) {
  const data = parse(raw);
  if (!data) {
    return (
      <Card className="not-prose my-3 border-dashed">
        <CardContent className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5 text-[hsl(var(--status-warning))]" />
          This meeting block has an invalid configuration.
        </CardContent>
      </Card>
    );
  }

  const status = data.status ?? "pending";
  const actionItems = data.actionItems ?? [];
  const segments = data.segments ?? [];

  return (
    <Card className="not-prose my-3">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[hsl(var(--entity-request)/0.12)] text-[hsl(var(--entity-request))]">
            <Video className="h-3.5 w-3.5" />
          </span>
          {data.subject || "Meeting notes"}
        </CardTitle>
        <Badge variant={status === "failed" ? "destructive" : "secondary"}>{STATUS_LABEL[status]}</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Summary */}
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Summary</h4>
          {data.summary ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{data.summary}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Awaiting the Teams transcript — the summary fills in once the recording is processed.
            </p>
          )}
        </section>

        {/* Action items */}
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Action items</h4>
          {actionItems.length === 0 ? (
            <p className="text-xs text-muted-foreground">No action items yet.</p>
          ) : (
            <ul className="space-y-1">
              {actionItems.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Checkbox checked={false} disabled className="mt-0.5" aria-label={item} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Transcript */}
        {segments.length > 0 && (
          <section>
            <Separator className="mb-2" />
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Transcript</h4>
            <ScrollArea className="max-h-48">
              <div className="space-y-1.5 pr-3">
                {segments.map((s, i) => (
                  <p key={i} className="text-sm leading-snug">
                    {s.speaker && <span className="font-medium text-foreground">{s.speaker}: </span>}
                    <span className="text-muted-foreground">{s.text}</span>
                  </p>
                ))}
              </div>
            </ScrollArea>
          </section>
        )}
      </CardContent>
    </Card>
  );
}
