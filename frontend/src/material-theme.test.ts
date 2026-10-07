import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("provides Material surface and state roles with compact accessible navigation", () => {
  const css = readFileSync("app/globals.css", "utf8");
  for (const role of [
    "--md-sys-color-primary",
    "--md-sys-color-on-primary",
    "--md-sys-color-primary-container",
    "--md-sys-color-surface",
    "--md-sys-color-surface-container",
    "--md-sys-color-outline",
    "--md-sys-color-error",
  ]) {
    expect(css).toContain(role);
  }
  expect(css).toContain(".material-nav-indicator");
  expect(css).toContain('.material-nav-link[aria-current="page"]');
  expect(css).toContain("--navigation-bar-height: 4rem");
  expect(css).toContain("prefers-reduced-motion");
});
