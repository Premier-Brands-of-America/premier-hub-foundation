import logoSrc from "@/assets/logo.svg";

/**
 * Centralized brand configuration.
 * Update logo, app name, colors, and fonts here — no need to touch component code.
 */

export const brand = {
  /** Application name shown in sidebar, login, and page titles */
  appName: "Premier Project Hub",

  /** Short name / abbreviation used when space is limited (e.g. collapsed sidebar) */
  appShortName: "P",

  /** Tagline shown on the login screen */
  tagline: "Internal project management for Premier Brands of America",

  /** Copyright holder */
  companyName: "Premier Brands of America",

  /**
   * Logo configuration.
   * Set `src` to an imported image or a URL string.
   * When null, the app falls back to `appShortName` in a colored box.
   */
  logo: {
    src: logoSrc as string | null,
    alt: "Premier Brands logo",
    /** Width in pixels for the sidebar logo */
    sidebarWidth: 32,
    /** Width in pixels for the login page logo */
    loginWidth: 64,
  },

  /** External links (optional) */
  links: {
    support: null as string | null,
    privacy: null as string | null,
  },
} as const;
