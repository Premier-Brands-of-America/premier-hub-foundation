export const ALL_FEATURE_KEYS = [
  "art_request_portal",
  "sharepoint_integration",
  "completion_summary",
  "audit_trail",
  "file_uploads",
  "designer_assignment",
  "department_dashboard",
  "admin_settings",
  "notifications",
  "reports",
] as const;

export type FeatureKey = (typeof ALL_FEATURE_KEYS)[number];

export const FEATURE_DESCRIPTIONS: Record<FeatureKey, string> = {
  art_request_portal: "Art request submission and tracking",
  sharepoint_integration: "Auto SharePoint folder creation",
  completion_summary: "Auto-generated completion PDF",
  audit_trail: "Request history and decisions log",
  file_uploads: "Attachment uploads on requests",
  designer_assignment: "Assign requests to designers",
  department_dashboard: "Department workload view",
  admin_settings: "Admin settings panel",
  notifications: "Email + in-app notifications",
  reports: "Analytics and reports",
};