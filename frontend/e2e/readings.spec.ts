import { expect, test } from "@playwright/test";
import type { ReadingGuide } from "../src/api";
import { login } from "./helpers/notes-layout";
import { baseJapanese, highlightSegments } from "./helpers/japanese-text";
import { resolve } from "node:path";

test.use({
  browserName: "webkit",
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
test.setTimeout(120_000);

test("후리가나·한글 보조 설정은 저장되고 실제 문법·단어·예문에서 함께 표시된다", async ({
  page,
}) => {
  await login(page);
  const old = await (await page.request.get("/api/settings")).json();
  const me = await (await page.request.get("/api/me")).json();
  const headers = {
    Origin: new URL(process.env.E2E_BASE_URL!).origin,
    "X-CSRF-Token": me.csrfToken,
  };
  try {
    expect(
      (
        await page.request.patch("/api/settings", {
          headers,
          data: {
            showFurigana: false,
            showHangulHint: false,
            showReadingHint: true,
            autoPlayAudio: false,
          },
        })
      ).ok(),
    ).toBe(true);
    await page.goto("/settings");
    await page
      .getByRole("checkbox", { name: /한자 위에 후리가나 표시/ })
      .check();
    await page.getByRole("checkbox", { name: /한글 발음 보조 표시/ }).check();
    await page.getByRole("button", { name: "설정 저장", exact: true }).click();
    await expect(page.getByText("설정을 저장했습니다.")).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("checkbox", { name: /한자 위에 후리가나 표시/ }),
    ).toBeChecked();
    await expect(
      page.getByRole("checkbox", { name: /한글 발음 보조 표시/ }),
    ).toBeChecked();
    const courses = await (await page.request.get("/api/courses")).json();
    for (const kind of ["vocabulary", "grammar"]) {
      const course = courses.find(
        (c: { kind: string; level: string }) =>
          c.kind === kind && c.level === "N5",
      );
      const started = page.waitForResponse(
        (r) =>
          r.url().endsWith("/api/study/sessions") &&
          r.request().method() === "POST",
      );
      await page.goto(`/study?lessonId=${course.lessons[0].id}&practice=1`);
      const session = await (await started).json();
      const target = session.cards.findIndex(
        (c: { readingGuide?: ReadingGuide }) =>
          Boolean(c.readingGuide?.hangul) &&
          c.readingGuide?.segments.some((s) => s.reading),
      );
      expect(target).toBeGreaterThanOrEqual(0);
      for (let i = 0; i < target; i++) {
        await page.getByRole("button", { name: /정답 보기/ }).click();
        const saved = page.waitForResponse((r) =>
          r.url().endsWith("/api/study/reviews"),
        );
        await page.getByRole("button", { name: /^보통/ }).click();
        expect((await saved).status()).toBe(200);
        await expect(page.locator(".study-progress")).toContainText(
          `${i + 2} /`,
        );
      }
      const card = session.cards[target];
      expect(
        card.readingGuide.segments
          .map((s: { text: string }) => s.text)
          .join("") === card.front,
      ).toBe(true);
      const primary = page.locator(
        kind === "grammar" ? ".grammar-example" : ".study-prompt",
      );
      await expect(primary.locator("rt").first()).toBeVisible();
      expect((await baseJapanese(primary)) === card.front).toBe(true);
      await expect(page.getByLabel("한글 발음 보조").first()).toBeVisible();
      if (kind === "grammar") {
        expect(card.readingGuide.source).toBe("ORIGINAL");
        expect(
          JSON.stringify(await highlightSegments(primary)) ===
            JSON.stringify(card.grammarFocus.segments),
        ).toBe(true);
      }
      await page.getByRole("button", { name: /정답 보기/ }).click();
      if (kind === "vocabulary") {
        expect(
          card.examples.some(
            (e: { readingGuide?: ReadingGuide }) =>
              e.readingGuide?.source === "ORIGINAL",
          ),
        ).toBe(true);
        await expect(page.locator(".study-card ruby").nth(1)).toBeVisible();
      }
      for (const [width, height] of [
        [360, 640],
        [390, 844],
        [768, 1024],
        [1280, 900],
      ] as [number, number][]) {
        await page.setViewportSize({ width, height });
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        ).toBe(true);
        if (width < 768) {
          await page.screenshot({
            path: resolve(
              `../private-data/e2e/readings-${kind}-${width}x${height}.png`,
            ),
          });
          await expect(
            page.getByRole("button", { name: /^보통/ }),
            `${kind}/${width} 모바일 평가 버튼`,
          ).toBeInViewport();
        } else {
          await page
            .getByRole("button", { name: /^보통/ })
            .scrollIntoViewIfNeeded();
          await expect(
            page.getByRole("button", { name: /^보통/ }),
          ).toBeVisible();
        }
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({
        path: resolve(`../private-data/e2e/readings-${kind}-390.png`),
      });
    }
    await page.goto("/notes");
    await page.getByRole("button", { name: "단어", exact: true }).click();
    await expect(page.locator(".note-title rt").first()).toBeVisible();
    await expect(page.getByLabel("한글 발음 보조").first()).toBeVisible();
    const currentMe = await (await page.request.get("/api/me")).json();
    headers["X-CSRF-Token"] = currentMe.csrfToken;
    expect(
      (
        await page.request.patch("/api/settings", {
          headers,
          data: { showFurigana: false, showHangulHint: false },
        })
      ).ok(),
    ).toBe(true);
    await page.reload();
    await expect(page.locator("rt")).toHaveCount(0);
    await expect(page.getByLabel("한글 발음 보조")).toHaveCount(0);
  } finally {
    const currentMe = await (await page.request.get("/api/me")).json();
    headers["X-CSRF-Token"] = currentMe.csrfToken;
    await page.request.patch("/api/settings", { headers, data: old });
  }
});
