import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useCreateRequest } from "@/hooks/useRequests";
import {
  FB_DRAFT_KEY,
  brandsList,
  channels,
  defaultFullBriefValues,
  deliverableFormatsList,
  fbApprovalsSchema,
  fbBasicsSchema,
  fbBrandSchema,
  fbContentSchema,
  fbObjectiveSchema,
  fbReferencesSchema,
  fullBriefSchema,
  requiredElementsList,
  tones,
  type FullBriefValues,
} from "@/schemas/fullBriefRequest";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DatePickerField } from "@/components/DatePickerField";
import { DepartmentPicker } from "@/components/forms/DepartmentPicker";
import { StepperShell } from "@/components/request-form/StepperShell";
import { MultiSelectChips } from "@/components/request-form/MultiSelectChips";
import { RepeatableList } from "@/components/request-form/RepeatableList";
import { SummarySection } from "@/components/request-form/SummaryCard";

const STEP_TITLES = [
  "Basics",
  "Objective & Audience",
  "Brand Direction",
  "References",
  "Content Requirements",
  "Approvals & Submit",
];

const stepSchemas = [
  fbBasicsSchema,
  fbObjectiveSchema,
  fbBrandSchema,
  fbReferencesSchema,
  fbContentSchema,
  fbApprovalsSchema,
];

const stepFieldNames: Array<Array<keyof FullBriefValues>> = [
  ["title", "department_id", "due_date", "priority", "owner_email"],
  ["objective", "audience", "channels"],
  ["brand", "tone", "brand_guidelines_url", "mandatory_brand_elements"],
  ["competitor_refs", "inspiration_refs", "avoid_notes"],
  ["copy_claims", "required_elements", "other_required_elements", "deliverable_formats"],
  ["approvals", "notify_stakeholders", "additional_context", "confidential"],
];

export default function FullBriefRequest() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const createMutation = useCreateRequest();

  const [step, setStep] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showCancel, setShowCancel] = useState(false);
  const [draftFound, setDraftFound] = useState(false);

  const profileDeptId = profile?.department_id ?? "";

  const form = useForm<FullBriefValues>({
    resolver: zodResolver(fullBriefSchema),
    defaultValues: { ...defaultFullBriefValues, department_id: profileDeptId },
    mode: "onChange",
  });
  const { control, handleSubmit, watch, setValue, getValues, formState, trigger, reset, register } = form;
  const errors = formState.errors;

  const competitors = useFieldArray({ control, name: "competitor_refs" });
  const inspirations = useFieldArray({ control, name: "inspiration_refs" });
  const approvals = useFieldArray({ control, name: "approvals" });

  // Draft load detection
  useEffect(() => {
    try {
      if (localStorage.getItem(FB_DRAFT_KEY)) setDraftFound(true);
    } catch { /* noop */ }
  }, []);

  // Autosave
  useEffect(() => {
    const sub = watch((values) => {
      try { localStorage.setItem(FB_DRAFT_KEY, JSON.stringify({ step, values })); } catch { /* noop */ }
    });
    return () => sub.unsubscribe();
  }, [watch, step]);

  useEffect(() => {
    if (!getValues("department_id") && profileDeptId) {
      setValue("department_id", profileDeptId);
    }
  }, [profileDeptId, setValue, getValues]);

  const stepValid = useMemo(() => async (i: number) => {
    const ok = await trigger(stepFieldNames[i] as never);
    if (ok) {
      // Also revalidate via per-step schema for richer cross-field rules
      const subset = stepSchemas[i].safeParse(getValues());
      return subset.success;
    }
    return ok;
  }, [trigger, getValues]);

  const handleNext = async () => {
    const ok = await stepValid(step);
    if (!ok) return;
    const next = Math.min(step + 1, STEP_TITLES.length - 1);
    setStep(next);
    setMaxReached((m) => Math.max(m, next));
  };

  const handleJump = (i: number) => {
    if (i <= maxReached) setStep(i);
  };

  const onSubmit = async (values: FullBriefValues) => {
    setSubmitError(null);
    if (!profile) {
      setSubmitError("You must be signed in to submit a request.");
      return;
    }
    const metadata: Record<string, unknown> = {
      objective: values.objective,
      audience: values.audience,
      channels: values.channels,
      brand: values.brand,
      tone: values.tone,
      brand_guidelines_url: values.brand_guidelines_url || null,
      mandatory_brand_elements: values.mandatory_brand_elements || null,
      competitor_refs: values.competitor_refs,
      inspiration_refs: values.inspiration_refs,
      avoid_notes: values.avoid_notes || null,
      copy_claims: values.copy_claims || null,
      required_elements: values.required_elements,
      ...(values.required_elements.includes("Other") && {
        other_required_elements: values.other_required_elements,
      }),
      deliverable_formats: values.deliverable_formats,
      approvals: values.approvals,
      notify_stakeholders: values.notify_stakeholders,
      additional_context: values.additional_context || null,
      confidential: values.confidential,
      owner_email: values.owner_email || null,
    };
    try {
      const created = await createMutation.mutateAsync({
        title: values.title,
        description: values.objective,
        request_type: "full_brief",
        priority: values.priority,
        requester_id: profile.user_id,
        department_id: values.department_id,
        due_date: values.due_date,
        metadata,
      });
      try { localStorage.removeItem(FB_DRAFT_KEY); } catch { /* noop */ }
      toast.success(`Request submitted: ${created.request_number}`);
      navigate(`/requests/${created.id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to submit request");
    }
  };

  const resumeDraft = () => {
    try {
      const raw = localStorage.getItem(FB_DRAFT_KEY);
      if (!raw) return;
      const { step: s, values } = JSON.parse(raw);
      reset({
        ...defaultFullBriefValues,
        ...values,
      });
      const restored = typeof s === "number" ? s : 0;
      setStep(restored);
      setMaxReached(restored);
    } catch { /* noop */ }
    setDraftFound(false);
  };

  const discardDraft = () => {
    try { localStorage.removeItem(FB_DRAFT_KEY); } catch { /* noop */ }
    setDraftFound(false);
  };

  const v = watch();

  return (
    <StepperShell
      title="Full Brief"
      steps={STEP_TITLES}
      current={step}
      maxReached={maxReached}
      onJump={handleJump}
      onCancel={() => setShowCancel(true)}
    >
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
        {step < 5 && (
          <Card>
            <CardHeader className="edge-rail">
              <CardTitle className="text-base">{STEP_TITLES[step]}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {step === 0 && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
                    <Input id="title" maxLength={120} {...register("title")} />
                    {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="fb-dept">Department <span className="text-destructive">*</span></Label>
                    <DepartmentPicker
                      id="fb-dept"
                      value={watch("department_id")}
                      onChange={(v) => setValue("department_id", v, { shouldValidate: true })}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Defaults to your profile department — change if this request belongs to a different department.
                    </p>
                    {errors.department_id && <p className="text-xs text-destructive">{errors.department_id.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Due Date <span className="text-destructive">*</span></Label>
                    <DatePickerField
                      value={watch("due_date")}
                      onChange={(val) => setValue("due_date", val, { shouldValidate: true })}
                    />
                    {errors.due_date && <p className="text-xs text-destructive">{errors.due_date.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Priority</Label>
                    <Select value={watch("priority")} onValueChange={(val) => setValue("priority", val as FullBriefValues["priority"], { shouldValidate: true })}>
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
                    <Label htmlFor="owner_email">Project Owner / Stakeholder Email</Label>
                    <Input id="owner_email" type="email" {...register("owner_email")} />
                    {errors.owner_email && <p className="text-xs text-destructive">{errors.owner_email.message}</p>}
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="objective">Project Objective <span className="text-destructive">*</span></Label>
                    <Textarea id="objective" rows={4} {...register("objective")} />
                    <p className="text-xs text-muted-foreground">What outcome should this design drive?</p>
                    {errors.objective && <p className="text-xs text-destructive">{errors.objective.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="audience">Target Audience <span className="text-destructive">*</span></Label>
                    <Textarea id="audience" rows={3} {...register("audience")} />
                    <p className="text-xs text-muted-foreground">Who sees this? Demographics, channels, context.</p>
                    {errors.audience && <p className="text-xs text-destructive">{errors.audience.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Primary Channel <span className="text-destructive">*</span></Label>
                    <MultiSelectChips
                      options={channels}
                      value={watch("channels")}
                      onChange={(val) => setValue("channels", val, { shouldValidate: true })}
                      ariaLabel="Channels"
                    />
                    {errors.channels && <p className="text-xs text-destructive">{(errors.channels as { message?: string }).message}</p>}
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="space-y-1.5">
                    <Label>Brand <span className="text-destructive">*</span></Label>
                    <Select value={watch("brand")} onValueChange={(val) => setValue("brand", val, { shouldValidate: true })}>
                      <SelectTrigger><SelectValue placeholder="Select brand" /></SelectTrigger>
                      <SelectContent>
                        {brandsList.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {errors.brand && <p className="text-xs text-destructive">{errors.brand.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tone</Label>
                    <MultiSelectChips
                      options={tones}
                      value={watch("tone")}
                      onChange={(val) => setValue("tone", val, { shouldValidate: true })}
                      ariaLabel="Tone"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="bg_url">Brand Guidelines URL</Label>
                    <Input id="bg_url" placeholder="https://..." {...register("brand_guidelines_url")} />
                    {errors.brand_guidelines_url && <p className="text-xs text-destructive">{errors.brand_guidelines_url.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="mbe">Mandatory Brand Elements</Label>
                    <Textarea id="mbe" rows={3} placeholder="Logos, colors, fonts..." {...register("mandatory_brand_elements")} />
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <RepeatableList
                    label="Competitor References"
                    items={competitors.fields}
                    onAdd={() => competitors.append({ name: "", url: "", note: "" })}
                    onRemove={(i) => competitors.remove(i)}
                    addLabel="Add competitor"
                    renderItem={(idx) => (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <Input placeholder="Name" {...register(`competitor_refs.${idx}.name`)} />
                        <Input placeholder="URL" {...register(`competitor_refs.${idx}.url`)} />
                        <Input className="md:col-span-2" placeholder="Note (optional)" {...register(`competitor_refs.${idx}.note`)} />
                      </div>
                    )}
                  />
                  <RepeatableList
                    label="Inspirational References"
                    items={inspirations.fields}
                    onAdd={() => inspirations.append({ name: "", url: "", note: "" })}
                    onRemove={(i) => inspirations.remove(i)}
                    addLabel="Add inspiration"
                    renderItem={(idx) => (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <Input placeholder="Name" {...register(`inspiration_refs.${idx}.name`)} />
                        <Input placeholder="URL" {...register(`inspiration_refs.${idx}.url`)} />
                        <Input className="md:col-span-2" placeholder="Note (optional)" {...register(`inspiration_refs.${idx}.note`)} />
                      </div>
                    )}
                  />
                  <div className="space-y-1.5">
                    <Label htmlFor="avoid">Avoid / Do-Not-Use Notes</Label>
                    <Textarea id="avoid" rows={3} {...register("avoid_notes")} />
                  </div>
                </>
              )}

              {step === 4 && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="copy">Required Copy / Claims</Label>
                    <Textarea id="copy" rows={4} placeholder="Paste claims, taglines, legal copy..." {...register("copy_claims")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Required Elements Checklist</Label>
                    <MultiSelectChips
                      options={requiredElementsList}
                      value={watch("required_elements")}
                      onChange={(val) => setValue("required_elements", val, { shouldValidate: true })}
                      ariaLabel="Required elements"
                    />
                  </div>
                  {watch("required_elements").includes("Other") && (
                    <div className="space-y-1.5">
                      <Label htmlFor="other_re">Other Required Elements</Label>
                      <Input id="other_re" {...register("other_required_elements")} />
                      {errors.other_required_elements && <p className="text-xs text-destructive">{errors.other_required_elements.message}</p>}
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label>Deliverable Formats</Label>
                    <MultiSelectChips
                      options={deliverableFormatsList}
                      value={watch("deliverable_formats")}
                      onChange={(val) => setValue("deliverable_formats", val, { shouldValidate: true })}
                      ariaLabel="Deliverable formats"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {step === 5 && (
          <div className="space-y-5">
            <Card>
              <CardHeader className="edge-rail">
                <CardTitle className="text-base">Approvals & Extra Context</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <RepeatableList
                  label="Approvals Required"
                  items={approvals.fields}
                  onAdd={() => approvals.append({ name: "", role: "", email: "" })}
                  onRemove={(i) => approvals.remove(i)}
                  addLabel="Add approver"
                  renderItem={(idx) => (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <Input placeholder="Name" {...register(`approvals.${idx}.name`)} />
                      <Input placeholder="Role" {...register(`approvals.${idx}.role`)} />
                      <Input placeholder="Email" type="email" {...register(`approvals.${idx}.email`)} />
                    </div>
                  )}
                />
                <div className="space-y-1.5">
                  <Label htmlFor="notify">Internal Stakeholders to Notify</Label>
                  <Input
                    id="notify"
                    placeholder="Comma-separated emails"
                    value={watch("notify_stakeholders").join(", ")}
                    onChange={(e) => setValue(
                      "notify_stakeholders",
                      e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                      { shouldValidate: true },
                    )}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ac">Additional Context</Label>
                  <Textarea id="ac" rows={4} {...register("additional_context")} />
                </div>
                <div className="flex items-start gap-3 rounded-md border border-border bg-muted/20 p-3">
                  <Checkbox
                    id="confidential"
                    checked={watch("confidential")}
                    onCheckedChange={(c) => setValue("confidential", Boolean(c), { shouldValidate: true })}
                  />
                  <div className="space-y-0.5">
                    <Label htmlFor="confidential">This project is confidential</Label>
                    <p className="text-xs text-muted-foreground">Restrict visibility (additional rules will be enforced later).</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <h2 className="edge-rail pt-2 text-base font-semibold tracking-tight">Review &amp; Submit</h2>
            <SummarySection
              title="Basics"
              onEdit={() => setStep(0)}
              fields={[
                { label: "Title", value: v.title },
                { label: "Department", value: v.department_id || profile?.department },
                { label: "Due Date", value: v.due_date },
                { label: "Priority", value: v.priority },
                { label: "Owner Email", value: v.owner_email },
              ]}
            />
            <SummarySection
              title="Objective & Audience"
              onEdit={() => setStep(1)}
              fields={[
                { label: "Objective", value: v.objective },
                { label: "Audience", value: v.audience },
                { label: "Channels", value: v.channels.join(", ") },
              ]}
            />
            <SummarySection
              title="Brand Direction"
              onEdit={() => setStep(2)}
              fields={[
                { label: "Brand", value: v.brand },
                { label: "Tone", value: v.tone.join(", ") },
                { label: "Guidelines URL", value: v.brand_guidelines_url },
                { label: "Mandatory Elements", value: v.mandatory_brand_elements },
              ]}
            />
            <SummarySection
              title="References"
              onEdit={() => setStep(3)}
              fields={[
                { label: "Competitors", value: v.competitor_refs.length ? `${v.competitor_refs.length} item(s)` : "" },
                { label: "Inspirations", value: v.inspiration_refs.length ? `${v.inspiration_refs.length} item(s)` : "" },
                { label: "Avoid", value: v.avoid_notes },
              ]}
            />
            <SummarySection
              title="Content Requirements"
              onEdit={() => setStep(4)}
              fields={[
                { label: "Copy / Claims", value: v.copy_claims },
                { label: "Required Elements", value: v.required_elements.join(", ") },
                ...(v.required_elements.includes("Other")
                  ? [{ label: "Other Element", value: v.other_required_elements }]
                  : []),
                { label: "Deliverable Formats", value: v.deliverable_formats.join(", ") },
              ]}
            />
          </div>
        )}

        <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
          <Button type="button" variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            Back
          </Button>
          {step < STEP_TITLES.length - 1 ? (
            <Button type="button" onClick={handleNext}>Next</Button>
          ) : (
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Submitting..." : "Submit Request"}
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
    </StepperShell>
  );
}