import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { useDesignMode } from "@/providers/DesignModeProvider";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  const { mode } = useDesignMode();
  const isModern = mode === "modern";

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position={isModern ? "bottom-right" : undefined}
      toastOptions={{
        classNames: {
          toast:
            isModern
              ? "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-l-2 group-[.toaster]:border-l-primary group-[.toaster]:border-y-0 group-[.toaster]:border-r-0 group-[.toaster]:shadow-[0_12px_32px_-8px_hsl(var(--foreground)/0.16)]"
              : "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
