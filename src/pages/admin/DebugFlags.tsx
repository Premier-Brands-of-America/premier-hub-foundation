import { ALL_FEATURE_KEYS } from "@/lib/featureKeys";
import { useFeatureFlagsContext } from "@/providers/FeatureFlagsProvider";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/lib/utils";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export default function DebugFlags() {
  const { flags, loading } = useFeatureFlagsContext();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Feature Flags" subtitle="Resolved values for the current user — read-only" />

      <header className="edge-rail">
        <h1 className="text-2xl font-semibold tracking-tight">Feature Flags</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The effective flag values for the current user. Read-only diagnostic view.
        </p>
      </header>

      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Feature key</TableHead>
              <TableHead className="text-right">Enabled</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ALL_FEATURE_KEYS.map((key) => {
              const value = flags[key];
              return (
                <TableRow key={key}>
                  <TableCell className="font-mono text-xs">{key}</TableCell>
                  <TableCell className="text-right">
                    {loading ? (
                      <span className="text-sm text-muted-foreground">…</span>
                    ) : value === true ? (
                      <Badge
                        variant="outline"
                        className="rounded-full border-transparent bg-[hsl(var(--status-done)/0.14)] px-2.5 text-[hsl(var(--status-done))]"
                      >
                        Enabled
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className={cn(
                          "rounded-full border-transparent px-2.5",
                          value === false
                            ? "bg-muted text-muted-foreground"
                            : "bg-[hsl(var(--status-warning)/0.14)] text-[hsl(var(--status-warning))]"
                        )}
                      >
                        {value === false ? "Disabled" : "Unresolved"}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
