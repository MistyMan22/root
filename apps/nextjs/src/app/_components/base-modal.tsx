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

  // Lock body scroll while open and prevent horizontal scroll
  useEffect(() => {
    if (!open) return;
    const { style } = document.body;
    const previousOverflow = style.overflow;
    const previousOverflowX = style.overflowX;
    const previousOverflowY = style.overflowY;

    // Prevent all scrolling
    style.overflow = "hidden";
    style.overflowX = "hidden";
    style.overflowY = "hidden";

    return () => {
      style.overflow = previousOverflow;
      style.overflowX = previousOverflowX;
      style.overflowY = previousOverflowY;
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
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
          "flex max-h-[90vh] w-full max-w-md flex-col rounded-lg bg-white shadow-xl outline-none",
          "transform transition-all duration-300 ease-out",
          !!open
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-4 scale-95 opacity-0",
          className,
        )}
        onMouseDown={(e) => {
          // Prevent panel clicks from triggering overlay onMouseDown
          e.stopPropagation();
        }}
      >
        {/* Header */}
        {(title ?? !hideCloseButton) && (
          <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
            {title ? (
              <h2 id={titleId} className="text-lg font-semibold tracking-tight">
                {title}
              </h2>
            ) : (
              <span />
            )}
            {!hideCloseButton && (
              <button
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
                onClick={onClose}
                aria-label="Close"
              >
                Done
              </button>
            )}
          </div>
        )}

        {/* Content - scrollable when needed */}
        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
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
