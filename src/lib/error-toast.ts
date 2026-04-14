import { toast } from "@/hooks/use-toast";

export function showErrorToast(err: unknown, title = "Error") {
  const message = err instanceof Error ? err.message : "An unexpected error occurred";
  toast({ title, description: message, variant: "destructive" });
}
