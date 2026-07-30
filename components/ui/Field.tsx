"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import { useId, type InputHTMLAttributes, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function SearchInput({
  label,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const id = useId();
  return (
    <div className={cn("relative", className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3"
        aria-hidden="true"
      />
      <input
        id={id}
        type="search"
        className="h-10 w-full glass-card rounded-[14px] pl-9 pr-3 text-sm text-ink placeholder:text-ink-3 transition-colors hover:border-[rgb(var(--line-rgb)_/_0.14)] focus:border-ink/30"
        {...props}
      />
    </div>
  );
}

export function Select<T extends string>({
  label,
  value,
  onChange,
  options,
  className,
  hideLabel = true,
  ...props
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange" | "value"> & {
  label: string;
  value: T;
  onChange: (next: T) => void;
  options: { value: T; label: string }[];
  hideLabel?: boolean;
}) {
  const id = useId();
  return (
    <div className={cn("relative", className)}>
      <label
        htmlFor={id}
        className={cn(hideLabel ? "sr-only" : "micro mb-1.5 block")}
      >
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="h-10 w-full appearance-none glass-card rounded-[14px] pl-3 pr-9 text-sm font-medium text-ink transition-colors hover:border-[rgb(var(--line-rgb)_/_0.14)] focus:border-ink/30"
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute bottom-3 right-3 h-4 w-4 text-ink-3"
        aria-hidden="true"
      />
    </div>
  );
}

/** Filter pill. Selected state uses the accent — one of its allowed uses. */
export function FilterPill({
  active,
  children,
  count,
  onClick,
  className,
  rarity,
}: {
  active: boolean;
  children: React.ReactNode;
  count?: number;
  onClick: () => void;
  className?: string;
  /** Renders a rarity dot; requires a [data-rarity] wrapper. */
  rarity?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors",
        active
          ? "border-[#bfe800] bg-accent-soft text-ink"
          : "glass-chip text-ink-2 hover:text-ink",
        className,
      )}
    >
      {rarity ? (
        <span
          className="rarity-dot h-1.5 w-1.5 rounded-full"
          aria-hidden="true"
        />
      ) : null}
      {children}
      {typeof count === "number" ? (
        <span className="num text-[11px] text-ink-3">{count}</span>
      ) : null}
      {active ? <Check className="h-3 w-3" aria-hidden="true" /> : null}
    </button>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "inline-flex cursor-pointer select-none items-center gap-2 text-[13px] text-ink-2",
        className,
      )}
    >
      <span className="relative grid h-4 w-4 place-items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="peer absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-[5px] glass-input transition-colors checked:border-[#bfe800] checked:bg-accent"
        />
        <Check
          className="pointer-events-none relative h-3 w-3 text-ink opacity-0 transition-opacity peer-checked:opacity-100"
          aria-hidden="true"
        />
      </span>
      {label}
    </label>
  );
}
