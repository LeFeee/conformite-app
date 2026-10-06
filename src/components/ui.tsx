import clsx from "clsx";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import type { ControlStatus } from "@/lib/catalog/types";
import { STATUS_LABELS } from "@/lib/catalog/types";
import type { AlertSeverity } from "@/lib/domain";

type Variant = "primary" | "secondary" | "quiet" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-stamp text-white hover:brightness-110 dark:text-paper",
  secondary: "bg-surface text-ink border border-line-strong hover:border-ink-soft",
  quiet: "text-ink-soft hover:text-ink hover:bg-void",
  danger: "text-signal hover:bg-signal-soft",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-md px-4 h-10 text-sm font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none";

export function Button({
  variant = "primary",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={clsx(base, variants[variant], className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={clsx(base, variants[variant], className)} {...props} />;
}

export const STATUS_COLOR: Record<ControlStatus, string> = {
  conforme: "var(--stamp)",
  en_cours: "var(--ochre)",
  a_faire: "var(--idle)",
  non_applicable: "var(--void)",
};

export function StatusDot({ status }: { status: ControlStatus }) {
  return (
    <span
      aria-hidden
      className="inline-block size-2.5 shrink-0 rounded-full"
      style={{ background: STATUS_COLOR[status] }}
    />
  );
}

export function StatusBadge({ status }: { status: ControlStatus }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-ink-soft whitespace-nowrap">
      <StatusDot status={status} />
      {STATUS_LABELS[status]}
    </span>
  );
}

const SEVERITY: Record<AlertSeverity, { label: string; className: string }> = {
  critique: { label: "Critique", className: "bg-signal-soft text-signal" },
  attention: { label: "Attention", className: "bg-ochre-soft text-ochre" },
  info: { label: "À noter", className: "bg-void text-ink-soft" },
};

export function SeverityTag({ severity }: { severity: AlertSeverity }) {
  const s = SEVERITY[severity];
  return (
    <span className={clsx("rounded px-2 py-0.5 text-xs font-semibold", s.className)}>
      {s.label}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <h1 className="text-[1.75rem] font-bold leading-tight tracking-[-0.01em]">{title}</h1>
        {description && <p className="mt-2 text-ink-soft">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </header>
  );
}

export function Section({
  title,
  aside,
  children,
  className,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={clsx("rounded-lg border border-line bg-surface", className)}>
      <div className="flex items-baseline justify-between gap-4 border-b border-line px-5 py-3">
        <h2 className="font-semibold">{title}</h2>
        {aside && <div className="text-sm text-ink-soft">{aside}</div>}
      </div>
      {children}
    </section>
  );
}

export const inputClass =
  "w-full rounded-md border border-line-strong bg-surface px-3 h-10 text-sm text-ink placeholder:text-ink-faint focus:border-stamp focus:outline-none";
