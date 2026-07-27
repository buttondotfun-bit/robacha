import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageContainer({
  children,
  className,
  width = "default",
}: {
  children: ReactNode;
  className?: string;
  width?: "default" | "wide" | "narrow";
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 sm:px-6",
        width === "default" && "max-w-[1180px]",
        width === "wide" && "max-w-[1320px]",
        width === "narrow" && "max-w-[820px]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className,
  as: Heading = "h2",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="max-w-[62ch]">
        {eyebrow ? <p className="micro mb-2">{eyebrow}</p> : null}
        <Heading className="text-section-title">{title}</Heading>
        {description ? (
          <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  className,
  emphasis,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  className?: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        "glass-card rounded-[16px] p-4",
        emphasis && "bg-accent-soft border-[#e2f5a8]",
        className,
      )}
    >
      <div className="flex items-center gap-1.5">
        {icon ? <span className="text-ink-3">{icon}</span> : null}
        <p className="micro">{label}</p>
      </div>
      <p className="num mt-2 text-[22px] font-semibold leading-none text-ink">
        {value}
      </p>
      {hint ? (
        <p className="mt-1.5 text-[12px] leading-snug text-ink-2">{hint}</p>
      ) : null}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-14 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="mb-4 grid h-12 w-12 place-items-center rounded-full glass-quiet text-ink-3">
          {icon}
        </div>
      ) : null}
      <p className="text-[15px] font-medium text-ink">{title}</p>
      {description ? (
        <p className="mt-1.5 max-w-[46ch] text-[13px] leading-relaxed text-ink-2">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  action,
  className,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-[14px] border border-[#e8cfcf] bg-[#fdf5f5] px-4 py-3.5",
        className,
      )}
    >
      <p className="text-[13px] font-medium text-[#8f3434]">{title}</p>
      {description ? (
        <p className="mt-1 text-[12.5px] leading-relaxed text-[#a35c5c]">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

/** Small pill used for tags, statuses and the "Live in pool" marker. */
export function Pill({
  children,
  className,
  tone = "neutral",
  dot,
}: {
  children: ReactNode;
  className?: string;
  tone?: "neutral" | "accent" | "quiet";
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full border px-2 text-[11px] font-medium",
        tone === "neutral" && "border-[rgba(20,24,18,0.08)] bg-white/70 text-ink-2",
        tone === "quiet" && "border-transparent bg-canvas text-ink-3",
        tone === "accent" && "border-[#e2f5a8] bg-accent-soft text-accent-ink",
        className,
      )}
    >
      {dot ? (
        <span
          className="pulse-dot h-1.5 w-1.5 rounded-full bg-[#8ec500]"
          aria-hidden="true"
        />
      ) : null}
      {children}
    </span>
  );
}
