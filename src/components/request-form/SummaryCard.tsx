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
        <CardTitle className="text-sm">{title}</CardTitle>
        <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
        </Button>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {fields.map((f) => (
            <div key={f.label} className="space-y-0.5">
              <dt className="text-xs text-muted-foreground">{f.label}</dt>
              <dd className="text-foreground break-words">
                {f.value === "" || f.value === null || f.value === undefined ? (
                  <span className="text-muted-foreground italic">—</span>
                ) : f.value}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}