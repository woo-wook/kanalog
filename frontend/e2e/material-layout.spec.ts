import { expect, test } from "@playwright/test";
import { login } from "./helpers/notes-layout";
import { resolve } from "node:path";

test.use({
  browserName: "webkit",
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
test.setTimeout(180_000);

test("Material 탐색·상태색·화면은 모바일부터 데스크톱까지 유지된다", async ({
  page,
}) => {
  await login(page);
  for (const width of [360, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    for (const path of ["/", "/courses", "/notes", "/settings", "/stats"]) {
      await page.goto(path);
      await expect(page.getByRole("main")).toBeVisible();
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(
        page.locator(".material-nav-link[aria-current='page']:visible"),
      ).toHaveCount(1);
      const layout = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - innerWidth,
        primary: getComputedStyle(document.documentElement)
          .getPropertyValue("--md-sys-color-primary")
          .trim(),
        target: [
          ...document.querySelectorAll<HTMLElement>(".material-nav-link"),
        ]
          .filter((el) => el.getBoundingClientRect().width > 0)
          .every((el) => el.getBoundingClientRect().height >= 48),
      }));
      expect(layout.primary).toBe("#006a63");
      expect(layout.overflow).toBeLessThanOrEqual(1);
      expect(layout.target).toBe(true);
      if (width === 390) {
        const selected = page.locator(
          ".material-navigation-bar .material-nav-link[aria-current='page'] .material-nav-indicator",
        );
        await expect(selected).toHaveCSS(
          "background-color",
          "rgb(206, 232, 226)",
        );
        await page.screenshot({
          path: resolve(
            `../private-data/e2e/material-${path.replaceAll("/", "") || "home"}-390.png`,
          ),
        });
      }
    }
  }
});
