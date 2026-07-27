"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Visually hides the title while keeping it announced. */
  hideTitle?: boolean;
  description?: string;
  children: ReactNode;
  className?: string;
  /** `sheet` slides from the right on desktop and up from the bottom on mobile. */
  variant?: "modal" | "sheet";
  /**
   * When false, Escape, the backdrop and the close button are all disabled and
   * the close control is not rendered. For gates the user must answer — a
   * visible control that silently does nothing reads as a broken dialog.
   */
  dismissible?: boolean;
  footer?: ReactNode;
}

/**
 * Accessible dialog: focus is trapped while open, Escape closes, background
 * scroll is locked, and focus returns to the trigger on close.
 */
export function Dialog({
  open,
  onClose,
  title,
  hideTitle,
  description,
  children,
  className,
  variant = "modal",
  dismissible = true,
  footer,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;

    const { overflow, paddingRight } = document.body.style;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;

    const raf = requestAnimationFrame(() => {
      const node = panelRef.current;
      if (!node) return;
      const first = node.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? node).focus();
    });

    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      restoreRef.current?.focus?.();
    };
  }, [open]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        if (dismissible) onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const node = panelRef.current;
      if (!node) return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      );
      if (!items.length) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose, dismissible],
  );

  const isSheet = variant === "sheet";

  return (
    <AnimatePresence>
      {open ? (
        <div
          className={cn(
            "fixed inset-0 z-[100] flex",
            isSheet ? "justify-end" : "items-center justify-center p-4 sm:p-6",
          )}
          onKeyDown={onKeyDown}
        >
          <motion.div
            className="absolute inset-0 bg-[rgba(16,17,15,0.24)] backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={dismissible ? onClose : undefined}
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            initial={
              isSheet ? { x: "100%", opacity: 1 } : { opacity: 0, scale: 0.97, y: 8 }
            }
            animate={isSheet ? { x: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={
              isSheet ? { x: "100%" } : { opacity: 0, scale: 0.98, y: 4 }
            }
            transition={{ type: "spring", stiffness: 420, damping: 38, mass: 0.8 }}
            className={cn(
              "glass-panel glass-reflection glass-highlight relative z-10 flex flex-col outline-none",
              isSheet
                ? "h-full w-full max-w-[460px] rounded-none border-y-0 border-r-0 sm:rounded-l-[32px]"
                : "max-h-[calc(100dvh-2rem)] w-full max-w-[440px] rounded-[28px]",
              className,
            )}
          >
            <div
              className={cn(
                "flex items-start justify-between gap-4 px-5 pt-5",
                hideTitle && "sr-only",
              )}
            >
              <div className="min-w-0">
                <h2 id={titleId} className="text-[17px] font-semibold tracking-[-0.02em]">
                  {title}
                </h2>
                {description ? (
                  <p id={descId} className="mt-1 text-[13px] text-ink-2">
                    {description}
                  </p>
                ) : null}
              </div>
            </div>

            {dismissible ? (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="glass-chip absolute right-3.5 top-3.5 z-20 grid h-9 w-9 place-items-center rounded-full text-ink-2 hover:text-ink"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}

            <div className="rail-scroll min-h-0 flex-1 overflow-y-auto">
              {children}
            </div>

            {footer ? (
              <div className="border-t border-[rgba(20,24,18,0.08)] bg-[rgba(250,252,246,0.5)] px-5 py-4">
                {footer}
              </div>
            ) : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
