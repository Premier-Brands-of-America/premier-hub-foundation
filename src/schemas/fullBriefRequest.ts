import { z } from "zod";

export const FB_DRAFT_KEY = "art-request-draft-full-brief";

export const channels = [
  "Retail", "Ecommerce", "Trade Show", "Digital Ad",
  "Social", "Email", "Print", "Packaging", "Other",
] as const;

export const tones = [
  "Premium", "Playful", "Bold", "Minimal",
  "Heritage", "Modern", "Family", "Trustworthy",
] as const;

export const brandsList = [
  "Arm & Hammer Foot Care", "Trojan Men's Care", "Other",
] as const;

export const requiredElementsList = [
  "Logo", "Tagline", "SKU/UPC", "Nutrition Panel", "Allergen Statement",
  "Disclaimer", "Awards/Certifications", "QR Code", "Net Weight", "Other",
] as const;

export const deliverableFormatsList = [
  "Print-ready PDF", "Hi-res JPG/PNG", "Vector AI/EPS", "Layered PSD",
  "INDD", "Web Banner", "Social Crops", "Other",
] as const;

const today = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .optional()
  .or(z.literal(""))
  .refine(
    (v) => !v || /^https?:\/\/.+/i.test(v),
    "Must be a valid URL starting with http(s)://",
  );

const optionalEmail = z
  .string()
  .trim()
  .max(255)
  .optional()
  .or(z.literal(""))
  .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Invalid email");

export const fbBasicsSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120, "Max 120 characters"),
  department_id: z.string().min(1, "Department required"),
  due_date: z
    .string()
    .min(1, "Due date is required")
    .refine((v) => {
      const d = new Date(v);
      return !Number.isNaN(d.getTime()) && d >= today();
    }, "Due date must be today or later"),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  owner_email: optionalEmail,
});

export const fbObjectiveSchema = z.object({
  objective: z.string().trim().min(30, "Min 30 characters").max(2000),
  audience: z.string().trim().min(20, "Min 20 characters").max(2000),
  channels: z.array(z.enum(channels)).min(1, "Pick at least one channel"),
});

export const fbBrandSchema = z.object({
  brand: z.string().min(1, "Brand required"),
  tone: z.array(z.enum(tones)).default([]),
  brand_guidelines_url: optionalUrl,
  mandatory_brand_elements: z.string().trim().max(2000).optional().or(z.literal("")),
});

const refItem = z.object({
  name: z.string().trim().max(200).optional().or(z.literal("")),
  url: z.string().trim().max(500).optional().or(z.literal("")),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

export const fbReferencesSchema = z.object({
  competitor_refs: z.array(refItem).default([]),
  inspiration_refs: z.array(refItem).default([]),
  avoid_notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const fbContentSchema = z
  .object({
    copy_claims: z.string().trim().max(4000).optional().or(z.literal("")),
    required_elements: z.array(z.enum(requiredElementsList)).default([]),
    other_required_elements: z.string().trim().max(500).optional().or(z.literal("")),
    deliverable_formats: z.array(z.enum(deliverableFormatsList)).default([]),
  })
  .refine(
    (d) =>
      !d.required_elements.includes("Other") ||
      (d.other_required_elements && d.other_required_elements.length > 0),
    { path: ["other_required_elements"], message: "Please describe the other element" },
  );

const approvalItem = z.object({
  name: z.string().trim().max(200).optional().or(z.literal("")),
  role: z.string().trim().max(200).optional().or(z.literal("")),
  email: optionalEmail,
});

export const fbApprovalsSchema = z.object({
  approvals: z.array(approvalItem).default([]),
  notify_stakeholders: z.array(z.string()).default([]),
  additional_context: z.string().trim().max(4000).optional().or(z.literal("")),
  confidential: z.boolean().default(false),
});

export const fullBriefSchema = fbBasicsSchema
  .and(fbObjectiveSchema)
  .and(fbBrandSchema)
  .and(fbReferencesSchema)
  .and(fbContentSchema)
  .and(fbApprovalsSchema);

export type FullBriefValues = z.infer<typeof fullBriefSchema>;

export const defaultFullBriefValues: FullBriefValues = {
  title: "",
  department_id: "",
  due_date: "",
  priority: "medium",
  owner_email: "",
  objective: "",
  audience: "",
  channels: [],
  brand: "",
  tone: [],
  brand_guidelines_url: "",
  mandatory_brand_elements: "",
  competitor_refs: [],
  inspiration_refs: [],
  avoid_notes: "",
  copy_claims: "",
  required_elements: [],
  other_required_elements: "",
  deliverable_formats: [],
  approvals: [],
  notify_stakeholders: [],
  additional_context: "",
  confidential: false,
};