"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

import { cn } from "@acme/ui";

export interface BaseModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string; // extra classes for the dialog panel
  hideCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement>;
  ariaLabel?: string; // required if no title is provided
}

export function BaseModal(props: BaseModalProps) {
  const {
    open,
    onClose,
    title,
    children,
    className,
    hideCloseButton = false,
    closeOnBackdrop = true,
    closeOnEsc = true,
    initialFocusRef,
    ariaLabel,
  } = props;

  const overlayRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedElementRef = useRef<Element | null>(null);
  const titleId = useId();

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const { style } = document.body;
    const previousOverflow = style.overflow;
    style.overflow = "hidden";
    return () => {
      style.overflow = previousOverflow;
    };
  }, [open]);

  // Manage focus when opening/closing
  useEffect(() => {
    if (!open) return;
    previouslyFocusedElementRef.current = document.activeElement;

    const focusTarget =
      initialFocusRef?.current ?? getFirstFocusable(dialogRef.current);
    focusTarget?.focus();

    return () => {
      const prev = previouslyFocusedElementRef.current as HTMLElement | null;
      prev?.focus();
    };
  }, [open, initialFocusRef]);

  // Trap focus within dialog
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && closeOnEsc) {
        e.stopPropagation();
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Tab") {
        const container = dialogRef.current;
        if (!container) return;
        const focusables = getFocusableElements(container);
        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }
        const currentIndex = focusables.indexOf(
          document.activeElement as HTMLElement,
        );
        let nextIndex = currentIndex;
        if (e.shiftKey) {
          nextIndex =
            currentIndex <= 0 ? focusables.length - 1 : currentIndex - 1;
        } else {
          nextIndex =
            currentIndex === focusables.length - 1 ? 0 : currentIndex + 1;
        }
        e.preventDefault();
        focusables[nextIndex]?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open, closeOnEsc, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
      onMouseDown={(e) => {
        if (!closeOnBackdrop) return;
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={!title ? ariaLabel : undefined}
        className={cn(
          "w-full max-w-sm rounded-md bg-white p-4 shadow-lg outline-none",
          className,
        )}
        onMouseDown={(e) => {
          // Prevent panel clicks from triggering overlay onMouseDown
          e.stopPropagation();
        }}
      >
        {(!!title || !hideCloseButton) && (
          <div className="mb-3 flex items-center justify-between">
            {title ? (
              <h2 id={titleId} className="text-sm font-semibold tracking-tight">
                {title}
              </h2>
            ) : (
              <span />
            )}
            {!hideCloseButton && (
              <button
                className="text-xs underline"
                onClick={onClose}
                aria-label="Close"
              >
                Close
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}

function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];
  const selectors = [
    "a[href]",
    "area[href]",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "button:not([disabled])",
    "iframe",
    "object",
    "embed",
    "[contenteditable]",
    '[tabindex]:not([tabindex="-1"])',
  ];
  const nodes = Array.from(
    container.querySelectorAll<HTMLElement>(selectors.join(",")),
  );
  return nodes.filter((el) => isVisible(el));
}

function getFirstFocusable(
  container: HTMLElement | null,
): HTMLElement | undefined {
  return getFocusableElements(container)[0];
}

function isVisible(element: HTMLElement): boolean {
  return !!(
    element.offsetWidth ||
    element.offsetHeight ||
    element.getClientRects().length
  );
}
