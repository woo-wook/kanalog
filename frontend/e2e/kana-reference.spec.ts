import { expect, test } from "@playwright/test";
import { login } from "./helpers/notes-layout";
import { resolve } from "node:path";

test.use({
  browserName: "webkit",
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
test.setTimeout(120_000);

test("실제 가나 참고표는 104쌍을 한 페이지에 표시하며 모바일과 데스크톱에서 넘치지 않는다", async ({
  page,
}) => {
  await login(page);
  const original = await (await page.request.get("/api/settings")).json();
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
          data: { showHangulHint: true },
        })
      ).ok(),
    ).toBe(true);
    await page.goto("/courses");
    await page.getByRole("link", { name: /히라가나·가타카나 참고표/ }).click();
    await expect(
      page.getByRole("heading", { name: "히라가나 · 가타카나" }),
    ).toBeVisible();
    const searchPadding = await page
      .getByRole("searchbox", { name: "가나 찾기" })
      .evaluate((el) => ({
        left: parseFloat(getComputedStyle(el).paddingLeft),
        right: parseFloat(getComputedStyle(el).paddingRight),
      }));
    expect(searchPadding.left).toBeGreaterThanOrEqual(40);
    expect(searchPadding.right).toBeGreaterThanOrEqual(44);
    await expect(page.locator(".kana-reference-pair")).toHaveCount(104);
    const source = await (await page.request.get("/api/kana/reference")).json();
    const pairs = source.flatMap((g: { rows: { characters: unknown[] }[] }) =>
      g.rows.flatMap((r) => r.characters),
    );
    expect(pairs.length).toBe(104);
    for (const pair of pairs) {
      const cell = page.getByLabel(
        `히라가나 ${pair.hiragana}, 가타카나 ${pair.katakana}, ${pair.romaji}`,
        { exact: true },
      );
      await expect(cell).toHaveCount(1);
      expect((await cell.textContent())?.includes(pair.hangul)).toBe(true);
    }
    for (const width of [360, 390, 768, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      const layout = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - innerWidth,
        badCells: [...document.querySelectorAll(".kana-reference-pair")].filter(
          (c) => c.scrollWidth > c.clientWidth + 1,
        ).length,
      }));
      expect(layout.overflow).toBeLessThanOrEqual(1);
      expect(layout.badCells).toBe(0);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: resolve("../private-data/e2e/kana-reference-390.png"),
      fullPage: true,
    });
    await page.screenshot({
      path: resolve("../private-data/e2e/kana-reference-viewport-390.png"),
    });
    await page.getByRole("searchbox", { name: "가나 찾기" }).fill("キャ");
    await expect(page.locator(".kana-reference-pair")).toHaveCount(1);
    await expect(
      page.getByLabel("히라가나 きゃ, 가타카나 キャ, kya"),
    ).toContainText("캬");
    await page.getByRole("button", { name: "검색 지우기" }).click();
    await expect(page.locator(".kana-reference-pair")).toHaveCount(104);
    await page.getByRole("link", { name: "반탁음", exact: true }).click();
    await expect(
      page.getByRole("region", { name: "반탁음", exact: true }),
    ).toBeInViewport();
    expect(
      (
        await page.request.patch("/api/settings", {
          headers,
          data: { showHangulHint: false },
        })
      ).ok(),
    ).toBe(true);
    await page.reload();
    await expect(
      page.locator(".kana-reference-pair").first(),
    ).not.toContainText("아");
    await page.getByRole("button", { name: "로그아웃", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "로그인", exact: true }),
    ).toBeVisible();
    expect((await page.request.get("/api/kana/reference")).status()).toBe(401);
    // Restore settings in a new authenticated session after verifying logout.
    await login(page);
    const restoredMe = await (await page.request.get("/api/me")).json();
    headers["X-CSRF-Token"] = restoredMe.csrfToken;
  } finally {
    expect(
      (
        await page.request.patch("/api/settings", { headers, data: original })
      ).ok(),
    ).toBe(true);
  }
});
