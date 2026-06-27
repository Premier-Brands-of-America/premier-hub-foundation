/**
 * Art Request routing UI — pick a customer → the owning creative manager
 * becomes project lead. Multi-owner customers (e.g. Master Dielines) require
 * the requester to choose the manager. Shows the resolved lead and the email
 * recipients (incl. the default Art-Lead CC). Plus key points + meeting toggle.
 *
 * Pure presentation on top of lib/artRouting + config/artOwnership.
 */
import { Plus, X, ArrowRight, Mail, Users } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CUSTOMERS, MANAGERS, type ManagerId } from "@/config/artOwnership";
import { routeRequest, resolveRecipients, managerName } from "@/lib/artRouting";

export function ArtRequestRouting({
  customer,
  manager,
  keyPoints,
  meetingRequired,
  onCustomerChange,
  onManagerChange,
  onKeyPointsChange,
  onMeetingChange,
}: {
  customer: string;
  manager: string;
  keyPoints: string[];
  meetingRequired: boolean;
  onCustomerChange: (v: string) => void;
  onManagerChange: (v: string) => void;
  onKeyPointsChange: (v: string[]) => void;
  onMeetingChange: (v: boolean) => void;
}) {
  const route = customer ? routeRequest(customer, (manager || null) as ManagerId | null) : null;
  const recipients = route?.lead ? resolveRecipients(route.lead) : null;

  function addPoint() {
    onKeyPointsChange([...keyPoints, ""]);
  }
  function setPoint(i: number, val: string) {
    onKeyPointsChange(keyPoints.map((p, idx) => (idx === i ? val : p)));
  }
  function removePoint(i: number) {
    onKeyPointsChange(keyPoints.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Customer / Brand <span className="text-destructive">*</span></Label>
          <Select value={customer} onValueChange={onCustomerChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select customer…" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {CUSTOMERS.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {route?.requiresManagerSelection && (
          <div className="space-y-1.5">
            <Label>
              Responsible manager <span className="text-destructive">*</span>
            </Label>
            <Select value={manager} onValueChange={onManagerChange}>
              <SelectTrigger>
                <SelectValue placeholder="Choose manager…" />
              </SelectTrigger>
              <SelectContent>
                {route.owners.map((id) => (
                  <SelectItem key={id} value={id}>{MANAGERS[id].name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              This customer is owned by multiple managers — pick the lead.
            </p>
          </div>
        )}
      </div>

      {/* Routing result */}
      {customer && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
          {route?.unknownCustomer ? (
            <span className="text-muted-foreground">
              No owner mapped for this customer — it will be triaged manually.
            </span>
          ) : route?.lead ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="font-medium">{managerName(route.lead)}</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">becomes project lead</span>
              </div>
              {recipients && (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  <span>Alert to {recipients.to.join(", ")}</span>
                  {recipients.cc.length > 0 && (
                    <span>· CC Art Lead ({recipients.cc.join(", ")})</span>
                  )}
                  {recipients.cc.length === 0 && (
                    <span>· (lead is the Art Lead — no duplicate CC)</span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <span className="text-amber-600 dark:text-amber-400">
              Select the responsible manager to route this request.
            </span>
          )}
        </div>
      )}

      {/* Key points */}
      <div className="space-y-2">
        <Label>Key points</Label>
        {keyPoints.map((p, i) => (
          <div key={i} className="flex gap-2">
            <Input
              value={p}
              placeholder="e.g. Match 2026 seasonal palette"
              onChange={(e) => setPoint(i, e.target.value)}
            />
            <Button type="button" size="icon" variant="ghost" onClick={() => removePoint(i)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button type="button" size="sm" variant="outline" onClick={addPoint}>
          <Plus className="mr-1.5 h-4 w-4" /> Add key point
        </Button>
      </div>

      {/* Meeting toggle */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="req-meet" className="text-sm font-medium">
            Meet to discuss this request?
          </Label>
        </div>
        <Switch id="req-meet" checked={meetingRequired} onCheckedChange={onMeetingChange} />
      </div>
    </div>
  );
}
