/**
 * Pixel coordinates of the caret inside a <textarea>, relative to the element's
 * own top-left (i.e. add the element's bounding rect to place a popover at the
 * caret). Uses the classic "mirror div" technique: clone the textarea's text
 * styling into an off-screen div, put a marker span at the caret offset, and
 * read the span's position. No dependency.
 *
 * The result is the caret's top-left; callers typically add ~1 line-height when
 * anchoring a menu *below* the caret. Here we return `top` already advanced by
 * one line height so a popover sits just under the caret line.
 */

const MIRRORED_PROPS = [
  "boxSizing",
  "width",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "fontStyle",
  "fontVariant",
  "fontWeight",
  "fontStretch",
  "fontSize",
  "fontSizeAdjust",
  "lineHeight",
  "fontFamily",
  "textAlign",
  "textTransform",
  "textIndent",
  "letterSpacing",
  "wordSpacing",
  "tabSize",
  "whiteSpace",
  "wordWrap",
  "overflowWrap",
] as const;

export function caretCoordinates(
  el: HTMLTextAreaElement,
  position: number,
): { top: number; left: number } {
  const doc = el.ownerDocument;
  const div = doc.createElement("div");
  const style = div.style;
  const computed = window.getComputedStyle(el);

  style.position = "absolute";
  style.visibility = "hidden";
  style.whiteSpace = "pre-wrap";
  style.wordWrap = "break-word";
  style.overflow = "hidden";

  const styleRecord = style as unknown as Record<string, string>;
  const computedRecord = computed as unknown as Record<string, string>;
  for (const prop of MIRRORED_PROPS) {
    styleRecord[prop] = computedRecord[prop];
  }
  // A textarea always wraps; force the mirror to the element's content width.
  style.width = `${el.clientWidth}px`;

  div.textContent = el.value.slice(0, position);
  const span = doc.createElement("span");
  // A non-empty char so the span has a box even at line end.
  span.textContent = el.value.slice(position) || ".";
  div.appendChild(span);

  doc.body.appendChild(div);
  const lineHeight = parseInt(computed.lineHeight) || parseInt(computed.fontSize) * 1.4;
  const top = span.offsetTop - el.scrollTop + lineHeight;
  const left = span.offsetLeft - el.scrollLeft;
  doc.body.removeChild(div);

  return { top, left };
}
