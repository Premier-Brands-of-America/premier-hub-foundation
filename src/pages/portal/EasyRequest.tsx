import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useCreateRequest } from "@/hooks/useRequests";
import {
  DRAFT_KEY,
  defaultEasyValues,
  easyRequestSchema,
  projectTypes,
  responsibleDepts,
  type EasyRequestValues,
} from "@/schemas/easyRequest";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DatePickerField } from "@/components/DatePickerField";
import { DepartmentPicker } from "@/components/forms/DepartmentPicker";
import { ArtRequestRouting } from "@/components/request-form/ArtRequestRouting";
import { routeRequest, resolveRecipients } from "@/lib/artRouting";
import type { ManagerId } from "@/config/artOwnership";
import { Plus, Trash2, X } from "lucide-react";

const STEP_TITLES = ["Basics", "Details", "Specifics"];

export default function EasyRequest() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const createMutation = useCreateRequest();

  const [step, setStep] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showCancel, setShowCancel] = useState(false);
  const [draftFound, setDraftFound] = useState(false);

  const profileDeptId = profile?.department_id ?? "";

  const form = useForm<EasyRequestValues>({
    resolver: zodResolver(easyRequestSchema),
    defaultValues: { ...defaultEasyValues, department_id: profileDeptId },
    mode: "onChange",
  });

  const { control, handleSubmit, watch, setValue, getValues, formState, trigger, reset } = form;

  // Draft handling
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) setDraftFound(true);
    } catch { /* noop */ }
  }, []);

  // Autosave
  useEffect(() => {
    const sub = watch((values) => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ step, values }));
      } catch { /* noop */ }
    });
    return () => sub.unsubscribe();
  }, [watch, step]);

  // Default department from profile only when empty
  useEffect(() => {
    if (!getValues("department_id") && profileDeptId) {
      setValue("department_id", profileDeptId);
    }
  }, [profileDeptId, setValue, getValues]);

  const renders = useFieldArray({ control, name: "digital_renders" });

  const projectType = watch("project_type");
  const physicalMockups = watch("physical_mockups");

  // Routing completeness: a multi-owner customer needs a chosen manager.
  const customerVal = watch("customer");
  const managerVal = watch("assigned_manager") ?? "";
  const routingIncomplete = useMemo(() => {
    if (!customerVal) return false;
    const r = routeRequest(customerVal, (managerVal || null) as ManagerId | null);
    return r.requiresManagerSelection && !r.lead;
  }, [customerVal, managerVal]);

  const stepFields: Array<Array<keyof EasyRequestValues>> = useMemo(() => [
    ["title", "department_id", "customer", "assigned_manager", "due_date", "priority"],
    ["description", "project_type", "project_type_other", "notes"],
    ["digital_renders", "package_type", "responsible_dept", "physical_mockups", "mockup_qty", "shipping_info"],
  ], []);

  const handleNext = async () => {
    const ok = await trigger(stepFields[step] as never);
    if (step === 0 && routingIncomplete) return; // block until manager chosen
    if (ok) setStep((s) => Math.min(s + 1, 2));
  };

  const onSubmit = async (values: EasyRequestValues) => {
    setSubmitError(null);
    if (!profile) {
      setSubmitError("You must be signed in to submit a request.");
      return;
    }
    // Resolve routing: chosen customer → owning manager (lead) + email recipients.
    const route = routeRequest(
      values.customer,
      (values.assigned_manager || null) as ManagerId | null,
    );
    const recipients = route.lead ? resolveRecipients(route.lead) : null;
    const metadata: Record<string, unknown> = {
      customer: values.customer,
      assigned_manager: route.lead,
      project_lead: route.lead,
      notify_to: recipients?.to ?? [],
      notify_cc: recipients?.cc ?? [],
      key_points: (values.key_points ?? []).filter((p) => p.trim()),
      meeting_required: values.meeting_required,
      project_type: values.project_type,
      ...(values.project_type === "Other" && { project_type_other: values.project_type_other }),
      notes: values.notes || null,
      digital_renders: values.digital_renders,
      package_type: values.package_type || null,
      responsible_dept: values.responsible_dept ?? null,
      physical_mockups: values.physical_mockups,
      ...(values.physical_mockups && {
        mockup_qty: values.mockup_qty,
        shipping_info: values.shipping_info || null,
      }),
    };
    try {
      const created = await createMutation.mutateAsync({
        title: values.title,
        description: values.description,
        request_type: "easy",
        priority: values.priority,
        requester_id: profile.user_id,
        department_id: values.department_id,
        due_date: values.due_date,
        metadata,
      });
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* noop */ }
      toast.success(`Request submitted: ${created.request_number}`);
      navigate(`/requests/${created.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to submit request";
      setSubmitError(msg);
    }
  };

  const resumeDraft = () => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const { step: s, values } = JSON.parse(raw);
      reset({ ...defaultEasyValues, ...values });
      setStep(typeof s === "number" ? s : 0);
    } catch { /* noop */ }
    setDraftFound(false);
  };

  const discardDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* noop */ }
    setDraftFound(false);
  };

  const errors = formState.errors;

  return (
    <div className="mx-auto max-w-3xl pb-12">
      <div className="sticky top-0 z-10 -mx-4 mb-6 border-b border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Easy Request · Step {step + 1} of 3
            </p>
            <h1 className="truncate text-lg font-semibold tracking-tight">{STEP_TITLES[step]}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="stat-numeral hidden text-sm text-muted-foreground sm:inline">
              {Math.round(((step + 1) / 3) * 100)}%
            </span>
            <Button variant="ghost" size="sm" onClick={() => setShowCancel(true)} className="gap-1.5">
              <X className="h-4 w-4" /> Cancel
            </Button>
          </div>
        </div>
        <Progress value={((step + 1) / 3) * 100} className="mt-3 h-1" />
      </div>

      {draftFound && (
        <Alert className="mb-4">
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>You have a saved draft.</span>
            <span className="flex gap-2">
              <Button size="sm" variant="outline" onClick={discardDraft}>Discard</Button>
              <Button size="sm" onClick={resumeDraft}>Resume</Button>
            </span>
          </AlertDescription>
        </Alert>
      )}

      {submitError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader className="edge-rail">
            <CardTitle className="text-base">{STEP_TITLES[step]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {step === 0 && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
                  <Input id="title" maxLength={120} {...form.register("title")} />
                  {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dept">Department <span className="text-destructive">*</span></Label>
                  <DepartmentPicker
                    id="dept"
                    value={watch("department_id")}
                    onChange={(v) => setValue("department_id", v, { shouldValidate: true })}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Defaults to your profile department — change if this request belongs to a different department.
                  </p>
                  {errors.department_id && <p className="text-xs text-destructive">{errors.department_id.message}</p>}
                </div>

                <ArtRequestRouting
                  customer={watch("customer")}
                  manager={watch("assigned_manager") ?? ""}
                  keyPoints={watch("key_points") ?? []}
                  meetingRequired={!!watch("meeting_required")}
                  onCustomerChange={(v) => {
                    setValue("customer", v, { shouldValidate: true });
                    setValue("assigned_manager", "", { shouldValidate: true });
                  }}
                  onManagerChange={(v) => setValue("assigned_manager", v, { shouldValidate: true })}
                  onKeyPointsChange={(v) => setValue("key_points", v, { shouldValidate: true })}
                  onMeetingChange={(v) => setValue("meeting_required", v, { shouldValidate: true })}
                />
                {errors.customer && <p className="text-xs text-destructive">{errors.customer.message}</p>}
                {routingIncomplete && (
                  <p className="text-xs text-destructive">
                    This customer has multiple owners — select the responsible manager.
                  </p>
                )}

                <div className="space-y-1.5">
                  <Label>Due Date <span className="text-destructive">*</span></Label>
                  <DatePickerField
                    value={watch("due_date")}
                    onChange={(v) => setValue("due_date", v, { shouldValidate: true })}
                  />
                  {errors.due_date && <p className="text-xs text-destructive">{errors.due_date.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Priority</Label>
                  <Select value={watch("priority")} onValueChange={(v) => setValue("priority", v as EasyRequestValues["priority"], { shouldValidate: true })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="description">Description of Job <span className="text-destructive">*</span></Label>
                  <Textarea id="description" rows={5} placeholder="Be specific" {...form.register("description")} />
                  {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Project Type</Label>
                  <Select value={watch("project_type")} onValueChange={(v) => setValue("project_type", v as EasyRequestValues["project_type"], { shouldValidate: true })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {projectTypes.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {projectType === "Other" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="pto">Describe project type</Label>
                    <Input id="pto" maxLength={120} {...form.register("project_type_other")} />
                    {errors.project_type_other && <p className="text-xs text-destructive">{errors.project_type_other.message}</p>}
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" rows={3} {...form.register("notes")} />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Digital Renders — Products</Label>
                    <Button type="button" variant="outline" size="sm" onClick={() => renders.append({ product: "", sku: "" })}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add product
                    </Button>
                  </div>
                  {renders.fields.length === 0 && (
                    <p className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-3 text-center text-xs text-muted-foreground">
                      No products yet.
                    </p>
                  )}
                  <div className="space-y-2">
                    {renders.fields.map((f, idx) => (
                      <div key={f.id} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                        <Input placeholder="Product name" {...form.register(`digital_renders.${idx}.product`)} />
                        <Input placeholder="SKU (optional)" {...form.register(`digital_renders.${idx}.sku`)} />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => renders.remove(idx)}
                          aria-label="Remove product"
                          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pkg">Identify Package Type</Label>
                  <Input id="pkg" {...form.register("package_type")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Responsible Department</Label>
                  <Select
                    value={watch("responsible_dept") ?? ""}
                    onValueChange={(v) => setValue("responsible_dept", v as EasyRequestValues["responsible_dept"], { shouldValidate: true })}
                  >
                    <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>
                      {responsibleDepts.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between rounded-md border border-border bg-muted/20 p-3">
                  <div className="space-y-0.5">
                    <Label htmlFor="pm">Physical Mockups Needed</Label>
                    <p className="text-xs text-muted-foreground">Toggle on if physical samples are required.</p>
                  </div>
                  <Switch
                    id="pm"
                    checked={physicalMockups}
                    onCheckedChange={(c) => setValue("physical_mockups", c, { shouldValidate: true })}
                  />
                </div>
                {physicalMockups && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="qty">Quantity</Label>
                      <Input
                        id="qty"
                        type="number"
                        min={1}
                        value={watch("mockup_qty") ?? ""}
                        onChange={(e) => setValue("mockup_qty", e.target.value ? Number(e.target.value) : undefined, { shouldValidate: true })}
                      />
                      {errors.mockup_qty && <p className="text-xs text-destructive">{errors.mockup_qty.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ship">Shipping Info / Package Arrival Date</Label>
                      <Textarea id="ship" rows={3} {...form.register("shipping_info")} />
                    </div>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
          <Button type="button" variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            Back
          </Button>
          {step < 2 ? (
            <Button type="button" onClick={handleNext}>Next</Button>
          ) : (
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Submitting..." : "Submit"}
            </Button>
          )}
        </div>
      </form>

      <AlertDialog open={showCancel} onOpenChange={setShowCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this request?</AlertDialogTitle>
            <AlertDialogDescription>
              Your draft will be kept locally. You can resume from the form later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={() => navigate("/")}>Cancel & exit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}