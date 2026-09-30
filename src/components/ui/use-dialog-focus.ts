"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Focus management shared by every dialog (Modal, CommandMenu, QuickCapture).
 *
 * The effect depends on `open` only. Callbacks are read through a ref, so a
 * parent re-render (typing in a field recreates inline `onClose` handlers)
 * never re-runs it — re-running used to move focus to the close button.
 *
 * - Initial focus: keep an `autoFocus` that already landed inside the dialog;
 *   else `[data-autofocus]`; else the first tabbable that is not a close button.
 * - Tab / Shift+Tab stay inside the dialog, in DOM order (radio groups count
 *   once, like the browser does).
 * - Escape closes only the topmost dialog, and not when a nested control
 *   (a menu, a combobox) already handled it.
 * - On close, focus returns to the element that opened the dialog.
 */

const TABBABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]",
  "[contenteditable='true']",
].join(",");

/** Dialogs currently open, innermost last. Only the top one handles keys. */
const stack: symbol[] = [];

/**
 * Focus history. A field with `autoFocus` takes focus during React's commit —
 * before any effect runs — so when a dialog opens with focus already inside
 * it, the opener is the element focused just before.
 */
let focusedNow: HTMLElement | null = null;
let focusedBefore: HTMLElement | null = null;
if (typeof document !== "undefined") {
  document.addEventListener(
    "focusin",
    (event) => {
      if (event.target === focusedNow || !(event.target instanceof HTMLElement)) return;
      focusedBefore = focusedNow;
      focusedNow = event.target;
    },
    true,
  );
}

/** Global shortcuts must stay quiet while any dialog is open. */
export function isDialogOpen() {
  return stack.length > 0;
}

function isVisible(el: HTMLElement) {
  return el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
}

/** Elements reachable with Tab, in order. A radio group contributes one stop. */
export function tabbables(root: HTMLElement): HTMLElement[] {
  const seenGroups = new Set<string>();
  return Array.from(root.querySelectorAll<HTMLElement>(TABBABLE)).filter((el) => {
    if (el.tabIndex < 0 || el.closest("[inert]") || !isVisible(el)) return false;
    if (el instanceof HTMLInputElement && el.type === "radio" && el.name) {
      const group = Array.from(root.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${CSS.escape(el.name)}"]`)).filter((r) => !r.disabled);
      const stop = group.find((r) => r.checked) ?? group[0];
      if (seenGroups.has(el.name) || el !== stop) return false;
      seenGroups.add(el.name);
    }
    return true;
  });
}

export function useDialogFocus(panelRef: RefObject<HTMLElement | null>, open: boolean, onEscape: () => void) {
  const escapeRef = useRef(onEscape);
  useEffect(() => {
    escapeRef.current = onEscape;
  });

  useEffect(() => {
    if (!open) return;
    const id = Symbol("dialog");
    stack.push(id);
    let panel = panelRef.current;
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const opener = active && panel?.contains(active) ? focusedBefore : active;

    // After paint: the panel exists and any autoFocus has already run.
    const frame = requestAnimationFrame(() => {
      panel = panelRef.current;
      if (!panel || panel.contains(document.activeElement)) return;
      const target = panel.querySelector<HTMLElement>("[data-autofocus]") ?? tabbables(panel).find((el) => !el.hasAttribute("data-dialog-close")) ?? panel;
      target.focus();
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id || event.defaultPrevented || event.isComposing) return;
      if (event.key === "Escape") {
        event.preventDefault();
        escapeRef.current();
        return;
      }
      const root = panelRef.current;
      if (event.key !== "Tab" || !root) return;
      const nodes = tabbables(root);
      if (nodes.length === 0) {
        event.preventDefault();
        root.focus();
        return;
      }
      const first = nodes[0]!;
      const last = nodes[nodes.length - 1]!;
      const active = document.activeElement;
      if (!root.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && (active === first || active === root)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    // window, not document: React's handlers (on the root) run first, so a
    // nested control can claim Escape with preventDefault().
    window.addEventListener("keydown", onKeyDown);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
      stack.splice(stack.indexOf(id), 1);
      // Give focus back only if it is inside the dialog or was lost with it —
      // never pull it away from something the person deliberately moved to.
      const active = document.activeElement;
      const lost = !active || active === document.body || Boolean(panel?.contains(active));
      if (lost && opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [open, panelRef]);
}
