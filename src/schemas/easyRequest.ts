import { z } from "zod";

export const projectTypes = [
  "Mockup",
  "Small Art Change",
  "Render",
  "Quick Update",
  "Other",
] as const;

export const responsibleDepts = ["NPD", "PL", "Brand"] as const;

const today = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export const basicsSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120, "Max 120 characters"),
  department_id: z.string().min(1, "Department required"),
  // Routing: the chosen customer determines the owning creative manager (lead).
  customer: z.string().min(1, "Customer is required"),
  // Manager chosen by the requester for multi-owner customers (e.g. Master Dielines).
  assigned_manager: z.string().optional().or(z.literal("")),
  // Concise, scannable summary points for the art request.
  key_points: z.array(z.string().trim().min(1)).default([]),
  // "Meet to discuss" flag, visible to the project lead regardless of integration.
  meeting_required: z.boolean().default(false),
  due_date: z
    .string()
    .min(1, "Due date is required")
    .refine((v) => {
      const d = new Date(v);
      return !Number.isNaN(d.getTime()) && d >= today();
    }, "Due date must be today or later"),
  priority: z.enum(["low", "medium", "high", "urgent"]),
});

export const detailsSchema = z
  .object({
    description: z
      .string()
      .trim()
      .min(20, "Please provide at least 20 characters — be specific"),
    project_type: z.array(z.enum(projectTypes)).min(1, "Pick at least one type"),
    project_type_other: z.string().trim().max(120).optional().or(z.literal("")),
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
  })
  .refine(
    (d) => !d.project_type.includes("Other") || (d.project_type_other && d.project_type_other.length > 0),
    { path: ["project_type_other"], message: "Please describe the project type" },
  );

export const specificsSchema = z
  .object({
    digital_renders: z
      .array(
        z.object({
          product: z.string().trim().min(1, "Product name required"),
          sku: z.string().trim().max(80).optional().or(z.literal("")),
        }),
      )
      .default([]),
    package_type: z.string().trim().max(200).optional().or(z.literal("")),
    responsible_dept: z.enum(responsibleDepts).optional(),
    physical_mockups: z.boolean().default(false),
    mockup_qty: z.number().int().min(1).optional(),
    shipping_info: z.string().trim().max(2000).optional().or(z.literal("")),
  })
  .refine((d) => !d.physical_mockups || (typeof d.mockup_qty === "number" && d.mockup_qty >= 1), {
    path: ["mockup_qty"],
    message: "Quantity required when physical mockups are needed",
  });

export const easyRequestSchema = basicsSchema
  .and(detailsSchema)
  .and(specificsSchema);

export type BasicsValues = z.infer<typeof basicsSchema>;
export type DetailsValues = z.infer<typeof detailsSchema>;
export type SpecificsValues = z.infer<typeof specificsSchema>;
export type EasyRequestValues = BasicsValues & DetailsValues & SpecificsValues;

export const defaultEasyValues: EasyRequestValues = {
  title: "",
  department_id: "",
  customer: "",
  assigned_manager: "",
  key_points: [],
  meeting_required: false,
  due_date: "",
  priority: "medium",
  description: "",
  project_type: ["Mockup"],
  project_type_other: "",
  notes: "",
  digital_renders: [],
  package_type: "",
  responsible_dept: undefined,
  physical_mockups: false,
  mockup_qty: undefined,
  shipping_info: "",
};

export const DRAFT_KEY = "art-request-draft-easy";