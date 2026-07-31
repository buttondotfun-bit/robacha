"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type ThemeChoice } from "@/lib/use-theme";
import { cn } from "@/lib/utils";

/**
 * Light / system / dark.
 *
 * Light is the default: the site is designed light first and that is the
 * version every visitor should meet, so a dark operating system does not
 * silently decide what someone sees on their first visit. System sits in the
 * middle as the bridge between the two explicit ends, and choosing it is
 * remembered like any other choice.
 *
 * Labelled by icon with real accessible names rather than a bare sun that
 * changes meaning depending on state, which is the usual version of this
 * control and is ambiguous about whether it shows the current theme or the one
 * you would get by pressing it.
 *
 * Note for callers: `cn` here is a plain joiner, not tailwind-merge, so
 * passing a display class in `className` will not override the `inline-flex`
 * below — it will just sit next to it and lose. Wrap this instead when you
 * need to hide it at a breakpoint.
 */
const OPTIONS: { value: ThemeChoice; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "system", label: "Match my device", Icon: Monitor },
  { value: "dark", label: "Dark", Icon: Moon },
];

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useTheme();

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full bg-[rgb(var(--ink-rgb)_/_0.06)] p-0.5",
        className,
      )}
      role="group"
      aria-label="Colour theme"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = theme.choice === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => theme.setChoice(value)}
            aria-pressed={active}
            title={label}
            className={cn(
              "grid h-7 w-7 place-items-center rounded-full transition-colors",
              active
                ? "bg-surface text-ink shadow-sm"
                : "text-ink-3 hover:text-ink-2",
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
