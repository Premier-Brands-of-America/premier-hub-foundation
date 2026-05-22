import { Fragment } from "react";

/**
 * Renders ts_headline output safely.
 * Only the literal `<b>…</b>` markers are interpreted; all other HTML is escaped.
 */
export function MatchHighlight({ html, className }: { html: string; className?: string }) {
  if (!html) return null;
  const parts = html.split(/(<b>.*?<\/b>)/gi);
  return (
    <span className={className}>
      {parts.map((part, i) => {
        const m = /^<b>(.*?)<\/b>$/i.exec(part);
        if (m) {
          return (
            <mark key={i} className="bg-primary/20 text-foreground px-0.5 rounded">
              {m[1]}
            </mark>
          );
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </span>
  );
}