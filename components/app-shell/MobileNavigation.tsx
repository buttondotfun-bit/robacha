"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { XIcon } from "@/components/brand/XIcon";
import { SOCIAL_LINKS } from "@/lib/constants";
import { useEffect, useState } from "react";
import { RobachaLogo } from "@/components/brand/RobachaLogo";
import { ButtonLink, IconButton } from "@/components/ui/Button";
import { useMounted } from "@/lib/use-mounted";
import { cn } from "@/lib/utils";
import { RobinhoodChainMark } from "@/components/brand/RobinhoodChainMark";
import { NETWORK_LABEL } from "@/lib/web3";

export interface NavItem {
  label: string;
  href: string;
}

export function MobileNavigation({
  items,
  cta,
  className,
}: {
  items: readonly NavItem[];
  cta?: { label: string; href: string };
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  /**
   * The overlay is rendered into `document.body`, not where it sits in the tree.
   *
   * This button lives inside the floating header, and that header is a
   * `.glass-nav` — which means `backdrop-filter`. An element with a
   * backdrop-filter becomes the containing block for every `position: fixed`
   * descendant, so `fixed inset-0` here did not mean the viewport. It meant the
   * header bar: 349x56 in the corner. The scrim was painting inside that strip,
   * the panel spilled out of it with nothing dimmed behind it, and the page
   * showed straight through the menu — which is exactly what it looked like on
   * a phone. The panel's own translucency made it worse, but this was the bug.
   *
   * It also fixes the stacking. `z-[90]` was being resolved inside the header's
   * own `z-50` context, so the menu could never reliably sit above anything the
   * page put above 50. At the body it competes on its own terms.
   *
   * Mounted-gated because `document` does not exist while rendering on the
   * server.
   */
  const mounted = useMounted();

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <IconButton
        label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className={className}
      >
        <Menu className="h-4.5 w-4.5" aria-hidden="true" />
      </IconButton>

      {mounted
        ? createPortal(
            <AnimatePresence>
              {open ? (
                <div className="fixed inset-0 z-[90]">
                  <motion.div
                    className="absolute inset-0 bg-[rgb(var(--ink-rgb)_/_0.5)] backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    onClick={() => setOpen(false)}
                    aria-hidden="true"
                  />
                  <motion.div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Menu"
                    initial={{ y: -24, opacity: 0, scale: 0.97 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: -16, opacity: 0, scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    className="glass-modal glass-reflection glass-highlight relative z-10 mx-3 mt-3 rounded-[28px] px-4 pb-5 pt-3.5"
                  >
                    <div className="flex items-center justify-between">
                      <Link
                        href="/"
                        aria-label="ROBACHA home"
                        onClick={() => setOpen(false)}
                      >
                        <RobachaLogo size={26} />
                      </Link>
                      <IconButton
                        label="Close menu"
                        onClick={() => setOpen(false)}
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </IconButton>
                    </div>

                    <nav
                      className="mt-5 flex flex-col gap-1"
                      aria-label="Primary"
                    >
                      {items.map((item) => {
                        const active =
                          item.href === pathname ||
                          (item.href !== "/" && pathname.startsWith(item.href));
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setOpen(false)}
                            className={cn(
                              "rounded-2xl px-3.5 py-3 text-[16px] font-medium tracking-[-0.02em] transition-colors",
                              active
                                ? "bg-[rgb(var(--edge-rgb)_/_0.75)] text-ink shadow-[0_1px_0_rgb(var(--edge-rgb)_/_0.9)_inset]"
                                : "text-ink-2 hover:bg-[rgb(var(--edge-rgb)_/_0.5)] hover:text-ink",
                            )}
                          >
                            {item.label}
                          </Link>
                        );
                      })}
                    </nav>

                    {cta ? (
                      <ButtonLink
                        href={cta.href}
                        variant="primary"
                        size="lg"
                        fullWidth
                        className="mt-4"
                        onClick={() => setOpen(false)}
                      >
                        {cta.label}
                      </ButtonLink>
                    ) : null}

                    <a
                      href={SOCIAL_LINKS[0].href}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => setOpen(false)}
                      className="mt-4 flex items-center justify-center gap-2 rounded-full py-2 text-[13.5px] font-medium text-ink-2 transition-colors hover:text-ink"
                    >
                      <XIcon className="h-3.5 w-3.5" />
                      {SOCIAL_LINKS[0].handle}
                    </a>

                    <p className="mt-4 flex items-center justify-center gap-1.5 text-[12px] text-ink-3">
                      <span
                        className="pulse-dot h-1.5 w-1.5 rounded-full bg-[#8ec500]"
                        aria-hidden="true"
                      />
                      <RobinhoodChainMark
                        className="h-3.5 w-auto opacity-80"
                        title={null}
                      />
                      Built on {NETWORK_LABEL}
                    </p>
                  </motion.div>
                </div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}
