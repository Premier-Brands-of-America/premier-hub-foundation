import { brand } from "@/config/brand";

interface BrandLogoProps {
  size?: "sm" | "lg";
  className?: string;
}

/**
 * Renders the brand logo, or a styled fallback letter if no logo is configured.
 * Update `src/config/brand.ts` to swap the logo — no component changes needed.
 */
export function BrandLogo({ size = "sm", className = "" }: BrandLogoProps) {
  const px = size === "lg" ? brand.logo.loginWidth : brand.logo.sidebarWidth;

  if (brand.logo.src) {
    return (
      <img
        src={brand.logo.src}
        alt={brand.logo.alt}
        width={px}
        height={px}
        className={`object-contain ${className}`}
      />
    );
  }

  // Fallback: styled letter box
  const sizeClasses = size === "lg" ? "w-16 h-16 text-xl" : "w-8 h-8 text-sm";
  return (
    <div
      className={`rounded bg-accent flex items-center justify-center shrink-0 ${sizeClasses} ${className}`}
    >
      <span className="font-bold text-accent-foreground">
        {brand.appShortName}
      </span>
    </div>
  );
}
