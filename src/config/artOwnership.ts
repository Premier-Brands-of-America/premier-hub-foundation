/**
 * Art Department ownership matrix — customer/brand → creative manager.
 *
 * Stored as editable config data (NOT inline conditionals) so it can be
 * seeded/edited later. The routing logic in `src/lib/artRouting.ts` consumes
 * this. Manager + Art-Lead email identities are config/env values; see
 * `resolveManagerEmail` / `resolveArtLeadEmail` below and DECISIONS.md for
 * where the real values must be supplied.
 */

export type ManagerId = "jaclyn" | "megan" | "dan";

export interface Manager {
  id: ManagerId;
  name: string;
  /** Vite env var that supplies the manager's real email at build/runtime. */
  emailEnvKey: string;
  /** Fallback used in dev/preview when the env var is not set. */
  fallbackEmail: string;
}

export const MANAGERS: Record<ManagerId, Manager> = {
  jaclyn: {
    id: "jaclyn",
    name: "Jaclyn Baum",
    emailEnvKey: "VITE_MANAGER_JACLYN_EMAIL",
    fallbackEmail: "jbaum@premier-brands.com",
  },
  megan: {
    id: "megan",
    name: "Megan Oettinger",
    emailEnvKey: "VITE_MANAGER_MEGAN_EMAIL",
    fallbackEmail: "moettinger@premier-brands.com",
  },
  dan: {
    id: "dan",
    name: "Dan De Lello",
    emailEnvKey: "VITE_MANAGER_DAN_EMAIL",
    fallbackEmail: "ddelello@premier-brands.com",
  },
};

/**
 * Customer/brand → owning manager(s). A customer owned by more than one manager
 * is a "multi-owner" customer (e.g. Master Dielines) and requires the requester
 * to pick the responsible manager at request time.
 *
 * Keys are the canonical display names; matching is case/spacing-insensitive
 * (see `normalizeCustomer`).
 */
export const OWNERSHIP: Record<string, ManagerId[]> = {
  // Jaclyn
  "Best Choice": ["jaclyn"],
  CVS: ["jaclyn"],
  "Caring Mill": ["jaclyn"],
  Kroger: ["jaclyn"],
  "Premier Solutions": ["jaclyn"],
  "Quality Choice": ["jaclyn"],
  "Top Care": ["jaclyn"],
  "Walmart/Equate": ["jaclyn"],
  Winco: ["jaclyn"],
  EndZone: ["jaclyn"],
  Leader: ["jaclyn"],
  Rugby: ["jaclyn"],

  // Megan
  "Albertson's": ["megan"],
  "Care One": ["megan"],
  "Dollar Tree": ["megan"],
  Equaline: ["megan"],
  "Family Dollar": ["megan"],
  "GNP (Good Neighbor Pharmacy)": ["megan"],
  "Harris Teeter": ["megan"],
  HEB: ["megan"],
  Meijer: ["megan"],
  "QHP (life, Atoma, Option+, Equate, Compliments)": ["megan"],
  "Rite Aid": ["megan"],
  Target: ["megan"],
  Walgreens: ["megan"],
  "Good Sense": ["megan"],

  // Dan
  "Arm & Hammer": ["dan"],
  "Comfort Zone": ["dan"],
  Corporate: ["dan"],
  "Indi Brands": ["dan"],
  Trojan: ["dan"],
  "Special Projects": ["dan"],

  // Multi-owner (all three) — requires manager selection at request time.
  "Master Dielines": ["jaclyn", "megan", "dan"],
};

/** Sorted, de-duplicated list of customer display names for pickers. */
export const CUSTOMERS: string[] = Object.keys(OWNERSHIP).sort((a, b) =>
  a.localeCompare(b),
);

/** Normalize a customer name for tolerant matching (case + whitespace). */
export function normalizeCustomer(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

const NORMALIZED_OWNERSHIP: Record<string, ManagerId[]> = Object.fromEntries(
  Object.entries(OWNERSHIP).map(([k, v]) => [normalizeCustomer(k), v]),
);

/** Look up owners for a customer (tolerant match). Empty array if unknown. */
export function ownersFor(customer: string): ManagerId[] {
  return NORMALIZED_OWNERSHIP[normalizeCustomer(customer)] ?? [];
}

function readEnv(key: string): string | undefined {
  // import.meta.env is statically replaced by Vite; guard for test/node.
  const env = (import.meta as unknown as { env?: Record<string, string> }).env;
  return env?.[key];
}

/** Resolve a manager's email from env, falling back to the dev default. */
export function resolveManagerEmail(id: ManagerId): string {
  const m = MANAGERS[id];
  return readEnv(m.emailEnvKey) ?? m.fallbackEmail;
}

/**
 * The "Art Department Lead" recipient CC'd on every art request by default.
 * Config/env (`VITE_ART_LEAD_EMAIL`); documented in DECISIONS.md.
 */
export function resolveArtLeadEmail(): string {
  return readEnv("VITE_ART_LEAD_EMAIL") ?? "art-lead@premier-brands.com";
}
