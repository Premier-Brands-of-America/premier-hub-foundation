import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil } from "lucide-react";

export interface SummaryField {
  label: string;
  value: React.ReactNode;
}

interface SummarySectionProps {
  title: string;
  fields: SummaryField[];
  onEdit: () => void;
}

export function SummarySection({ title, fields, onEdit }: SummarySectionProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </CardTitle>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="h-7 gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Button>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          {fields.map((f) => (
            <div key={f.label} className="space-y-0.5">
              <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{f.label}</dt>
              <dd className="break-words text-foreground">
                {f.value === "" || f.value === null || f.value === undefined ? (
                  <span className="italic text-muted-foreground">—</span>
                ) : f.value}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}