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