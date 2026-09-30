/** True when a keystroke is text entry: global single-key shortcuts must ignore it. */
export function isTypingTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return Boolean(
    el &&
    (el.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)),
  );
}
