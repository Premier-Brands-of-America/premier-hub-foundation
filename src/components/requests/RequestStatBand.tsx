/**
 * The portal's one bold element: a crimson `edge-rail` stat band, mirroring the
 * pattern on Tasks / Projects. The page title lives in the app-shell header (via
 * <PageHeader>), so this band carries at-a-glance counts instead of a duplicate
 * heading.
 */
export interface Stat {
  label: string;
  value: number;
  /** Optional CSS color token (e.g. "--status-done") for the numeral. */
  tone?: string;
}

export function RequestStatBand({ stats }: { stats: Stat[] }) {
  return (
    <section className="edge-rail flex flex-wrap items-center gap-6">
      {stats.map((s) => (
        <div key={s.label}>
          <p
            className="stat-numeral text-2xl leading-none text-foreground"
            style={s.tone ? { color: `hsl(var(${s.tone}))` } : undefined}
          >
            {s.value}
          </p>
          <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
            {s.label}
          </p>
        </div>
      ))}
    </section>
  );
}
