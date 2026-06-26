import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * Page header coordination for the app shell.
 *
 * The top header (rendered in AppLayout) shows a contextual title + an
 * optional primary-action slot. Screens declare those by rendering the
 * `<PageHeader>` component anywhere in their tree — it publishes into this
 * context and the shell reads it. Both are OPTIONAL: a screen that never
 * renders <PageHeader> simply falls back to the route breadcrumb title, so
 * no existing screen breaks. This is presentation/composition only.
 */

export interface PageHeaderState {
  /** Contextual page title shown in the header. */
  title?: ReactNode;
  /** Optional one-line subtitle / context under the title. */
  subtitle?: ReactNode;
  /** Primary-action slot, right-aligned in the header (e.g. "New project"). */
  actions?: ReactNode;
}

interface PageHeaderCtx {
  header: PageHeaderState;
  setHeader: (next: PageHeaderState | null) => void;
}

const Ctx = createContext<PageHeaderCtx | null>(null);

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [header, setHeader] = useState<PageHeaderState>({});
  const value = useMemo<PageHeaderCtx>(
    () => ({ header, setHeader: (next) => setHeader(next ?? {}) }),
    [header],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Read the current header state (used by the shell header). */
export function usePageHeaderState(): PageHeaderState {
  const ctx = useContext(Ctx);
  return ctx?.header ?? {};
}

/**
 * Declarative page-header setter. Render once per screen:
 *
 *   <PageHeader title="My Tasks" actions={<Button>New task</Button>} />
 *
 * Re-publishes whenever its props change and clears on unmount.
 */
export function PageHeader(props: PageHeaderState) {
  const ctx = useContext(Ctx);
  const { title, subtitle, actions } = props;

  useEffect(() => {
    if (!ctx) return;
    ctx.setHeader({ title, subtitle, actions });
    return () => ctx.setHeader(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, subtitle, actions]);

  return null;
}
