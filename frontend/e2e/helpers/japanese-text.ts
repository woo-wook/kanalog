import type { Locator } from "@playwright/test";

/** Ignore pronunciation annotations when asserting original source text. */
export async function baseJapanese(locator: Locator) {
  return locator.evaluate((el) => {
    const clone = el.cloneNode(true) as Element;
    clone.querySelectorAll("rt,rp").forEach((n) => n.remove());
    return clone.textContent;
  });
}
export async function highlightSegments(locator: Locator) {
  return locator.evaluate((el) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const parts: { text: string; highlighted: boolean }[] = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.parentElement?.closest("rt,rp")) continue;
      const text = node.textContent ?? "";
      if (!text) continue;
      const highlighted = Boolean(node.parentElement?.closest("mark"));
      if (parts.length && parts.at(-1)!.highlighted === highlighted)
        parts.at(-1)!.text += text;
      else parts.push({ text, highlighted });
    }
    return parts;
  });
}
