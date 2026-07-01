import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateRequest } from "@/hooks/useRequests";
import { toast } from "sonner";
import type { ArtRequest } from "@/types/request";

/** Owner-only edit of a request's core fields. Auto-save elsewhere; this is an
 *  explicit edit dialog the requester opens from the request detail. */
export function EditRequestDialog({
  request,
  open,
  onOpenChange,
}: {
  request: ArtRequest;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const update = useUpdateRequest();
  const [title, setTitle] = useState(request.title);
  const [description, setDescription] = useState(request.description ?? "");
  const [priority, setPriority] = useState(request.priority);
  const [dueDate, setDueDate] = useState(
    request.due_date ? request.due_date.slice(0, 10) : "",
  );

  const save = async () => {
    try {
      await update.mutateAsync({
        id: request.id,
        patch: {
          title: title.trim(),
          description: description.trim() || null,
          priority,
          due_date: dueDate || null,
        },
      });
      toast.success("Request updated");
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error)?.message ?? "Could not update request");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit request</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="er-title">Title</Label>
            <Input id="er-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="er-desc">Description</Label>
            <Textarea id="er-desc" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as ArtRequest["priority"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="er-due">Due date</Label>
              <Input id="er-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={update.isPending || !title.trim()}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
