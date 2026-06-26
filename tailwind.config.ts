import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['var(--font-display)', 'Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      transitionTimingFunction: {
        "out-quart": "var(--ease-out-quart, cubic-bezier(0.25,1,0.5,1))",
        "out-expo": "var(--ease-out-expo, cubic-bezier(0.16,1,0.3,1))",
        "in-out-smooth": "var(--ease-in-out-smooth, cubic-bezier(0.45,0,0.25,1))",
        "spring-soft": "var(--ease-spring, cubic-bezier(0.34,1.26,0.64,1))",
        standard: "var(--ease-standard, cubic-bezier(0.2,0,0,1))",
      },
      transitionDuration: {
        instant: "var(--duration-instant, 80ms)",
        fast: "var(--duration-fast, 140ms)",
        base: "var(--duration-base, 220ms)",
        slow: "var(--duration-slow, 320ms)",
        deliberate: "var(--duration-deliberate, 480ms)",
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
          muted: "hsl(var(--sidebar-muted))",
        },
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "check-pop": {
          "0%,100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.08)" },
        },
        "optimistic-flash": {
          "0%": { backgroundColor: "hsl(var(--primary)/0.08)" },
          "100%": { backgroundColor: "transparent" },
        },
        "shake-x": {
          "0%,100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-4px)" },
          "75%": { transform: "translateX(4px)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 1.4s linear infinite",
        "check-pop": "check-pop 280ms var(--ease-spring)",
        "optimistic-flash": "optimistic-flash 220ms var(--ease-standard)",
        "shake-x": "shake-x 220ms var(--ease-standard) 2",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography"),
    plugin(function ({ addVariant }) {
      // v2: a single revamped design. The legacy `modern:` prefix is kept
      // working (so existing components don't need editing) but now always
      // matches. `classic:` is retired and intentionally never matches.
      addVariant("modern", "&");
      addVariant("classic", "&:not(*)");
      addVariant("compact", '[data-density="compact"] &');
      addVariant("comfortable", '[data-density="comfortable"] &');
    }),
  ],
} satisfies Config;
