import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "quiet" | "danger";
type Size = "sm" | "md" | "lg";

const BASE =
  "group/btn relative inline-flex items-center justify-center gap-2 overflow-hidden font-medium whitespace-nowrap " +
  "transition-[transform,box-shadow,background-color,border-color,color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] " +
  "active:translate-y-px active:scale-[0.985] disabled:pointer-events-none disabled:opacity-45";

const VARIANTS: Record<Variant, string> = {
  // Neon glass. The one loud surface — reserved for the single primary action.
  primary: [
    "text-ink border border-[rgba(150,190,0,0.55)]",
    "bg-[linear-gradient(168deg,rgba(226,255,120,0.96)_0%,rgba(204,255,0,0.98)_46%,rgba(186,232,0,0.98)_100%)]",
    "shadow-[var(--shadow-neon)]",
    "hover:-translate-y-0.5 hover:shadow-[0_1px_0_rgb(var(--edge-rgb)_/_0.6)_inset,0_8px_22px_-6px_rgba(160,200,0,0.62),0_18px_44px_-20px_rgba(120,150,0,0.5)]",
  ].join(" "),
  // Frosted white glass with a bright rim.
  secondary: [
    "glass-chip text-ink border-[rgb(var(--edge-rgb)_/_0.8)]",
    "hover:-translate-y-0.5 hover:bg-[rgb(var(--edge-rgb)_/_0.78)]",
    "hover:shadow-[0_1px_0_rgb(var(--edge-rgb)_/_0.8)_inset,0_8px_20px_-8px_rgb(var(--ink-rgb)_/_0.18)]",
  ].join(" "),
  ghost:
    "text-ink-2 border border-transparent hover:text-ink hover:bg-[rgb(var(--edge-rgb)_/_0.55)] hover:backdrop-blur-md",
  quiet:
    "glass-quiet text-ink-2 hover:text-ink hover:bg-[rgb(var(--edge-rgb)_/_0.6)]",
  danger:
    "border border-[rgba(190,120,120,0.4)] bg-[rgba(253,243,243,0.72)] text-[#8f3434] backdrop-blur-md hover:bg-[rgba(251,237,237,0.85)]",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] rounded-full",
  md: "h-10 px-4 text-sm rounded-full",
  lg: "h-12 px-6 text-[15px] rounded-full",
};

/** A one-pass sheen that sweeps on hover. Primary only, never idle-looping. */
function Sheen() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 -left-full w-1/2 bg-[linear-gradient(100deg,transparent,rgb(var(--edge-rgb)_/_0.65),transparent)] opacity-0 transition-opacity duration-200 group-hover/btn:opacity-100 group-hover/btn:[animation:robacha-sheen_0.9s_ease-out]"
    />
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  children?: ReactNode;
}

export function Button({
  variant = "secondary",
  size = "md",
  fullWidth,
  className,
  type = "button",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        BASE,
        VARIANTS[variant],
        SIZES[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {variant === "primary" ? <Sheen /> : null}
      <span className="relative inline-flex items-center gap-2">{children}</span>
    </button>
  );
}

export function PrimaryButton(props: Omit<ButtonProps, "variant">) {
  return <Button variant="primary" {...props} />;
}

export function SecondaryButton(props: Omit<ButtonProps, "variant">) {
  return <Button variant="secondary" {...props} />;
}

export interface ButtonLinkProps {
  href: string;
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  className?: string;
  children?: ReactNode;
  external?: boolean;
  onClick?: () => void;
  "aria-label"?: string;
}

export function ButtonLink({
  href,
  variant = "secondary",
  size = "md",
  fullWidth,
  className,
  external,
  children,
  ...rest
}: ButtonLinkProps) {
  const classes = cn(
    BASE,
    VARIANTS[variant],
    SIZES[size],
    fullWidth && "w-full",
    className,
  );

  const inner = (
    <>
      {variant === "primary" ? <Sheen /> : null}
      <span className="relative inline-flex items-center gap-2">{children}</span>
    </>
  );

  if (external) {
    return (
      <a
        href={href}
        className={classes}
        target="_blank"
        rel="noreferrer noopener"
        {...rest}
      >
        {inner}
      </a>
    );
  }

  return (
    <Link href={href} className={classes} {...rest}>
      {inner}
    </Link>
  );
}

/** Circular glass icon button. */
export function IconButton({
  className,
  children,
  label,
  size = "md",
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  children: ReactNode;
  label: string;
  size?: "sm" | "md";
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "glass-chip grid shrink-0 place-items-center rounded-full text-ink-2 transition-[transform,color,background-color] duration-200",
        "hover:text-ink hover:bg-[rgb(var(--edge-rgb)_/_0.78)] active:scale-95",
        size === "sm" ? "h-8 w-8" : "h-10 w-10",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
