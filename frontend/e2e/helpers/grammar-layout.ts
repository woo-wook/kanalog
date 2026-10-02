import { expect, type Page } from "@playwright/test";
import { resolve } from "node:path";

export async function checkGrammar(
  page: Page,
  sizes: [number, number][],
  screenshot: string,
) {
  await page.goto("/login");
  await page.getByLabel("이메일").fill(process.env.E2E_EMAIL!);
  await page.getByLabel("비밀번호").fill(process.env.E2E_PASSWORD!);
  const login = page.waitForResponse((r) =>
    r.url().endsWith("/api/auth/login"),
  );
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  expect((await login).status()).toBe(200);
  await expect(
    page.getByRole("heading", { name: "오늘도 한 레슨씩" }),
  ).toBeVisible();
  const original = await (await page.request.get("/api/settings")).json();
  const me = await (await page.request.get("/api/me")).json();
  const headers = {
    Origin: new URL(process.env.E2E_BASE_URL!).origin,
    "X-CSRF-Token": me.csrfToken,
  };
  const courses = await (await page.request.get("/api/courses")).json();
  const grammar = courses.find(
    (c: { kind: string; level: string }) =>
      c.kind === "grammar" && c.level === "N5",
  );
  // This real N5 lesson includes a long multi-paragraph answer. No content is copied into fixtures.
  const lesson = grammar.lessons.find(
    (l: { position: number }) => l.position === 2,
  );
  let failed = false;
  try {
    expect(
      (
        await page.request.patch("/api/settings", {
          headers,
          data: { autoPlayAudio: true, allowAudioBeforeReveal: true },
        })
      ).ok(),
    ).toBe(true);
    const started = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/study/sessions") &&
        r.request().method() === "POST",
    );
    await page.setViewportSize({ width: sizes[0]![0], height: sizes[0]![1] });
    await page.goto(`/study?lessonId=${lesson.id}&practice=1`);
    const session = await (await started).json();
    const target = session.cards.reduce(
      (best: number, c: { meaning?: string }, i: number) =>
        (c.meaning?.length ?? 0) > (session.cards[best].meaning?.length ?? 0)
          ? i
          : best,
      0,
    );
    expect(session.cards[target].meaning.length).toBeGreaterThan(400);
    for (let i = 0; i < target; i++) {
      await page.getByRole("button", { name: /정답 보기/ }).click();
      const save = page.waitForResponse((r) =>
        r.url().endsWith("/api/study/reviews"),
      );
      await page.getByRole("button", { name: /^보통/ }).click();
      expect((await save).status()).toBe(200);
      await expect(page.locator(".study-progress")).toContainText(`${i + 2} /`);
    }
    await page.getByRole("button", { name: /정답 보기/ }).click();
    const answer = page.getByRole("region", { name: "정답과 해설" });
    await expect(answer).toBeVisible();
    const paragraphs = session.cards[target].meaning
      .split(/\n+/)
      .map((s: string) => s.trim())
      .filter(Boolean);
    // Boolean comparison prevents personal deck text being printed on assertion failure.
    expect(
      JSON.stringify(await answer.locator("p").allTextContents()) ===
        JSON.stringify(paragraphs),
    ).toBe(true);
    await expect(
      page.getByText(/再生|재생할 음성이 없습니다|읽을 일본어가 없습니다/),
    ).toHaveCount(0);
    await expect(
      page.getByText("예문과 설명 더 보기", { exact: true }),
    ).toHaveCount(0);
    for (const [width, height] of sizes) {
      await page.setViewportSize({ width, height });
      await page.locator(".study-card").evaluate((el) => {
        el.scrollTop = 0;
      });
      const layout = await page.evaluate(() => {
        const panel = document.querySelector(".study-card")!;
        const question = document.querySelector(".study-prompt")!;
        const paragraph = document.querySelector(".grammar-answer p")!;
        const actions = document.querySelector(".study-actions")!;
        const nav = Array.from(document.querySelectorAll("nav")).find(
          (n) => getComputedStyle(n).position === "fixed",
        );
        const style = getComputedStyle(paragraph);
        return {
          widthOverflow: document.documentElement.scrollWidth - innerWidth,
          heightOverflow: document.documentElement.scrollHeight - innerHeight,
          panelTop: panel.getBoundingClientRect().top,
          panelBottom: panel.getBoundingClientRect().bottom,
          questionTop: question.getBoundingClientRect().top,
          questionFont: parseFloat(getComputedStyle(question).fontSize),
          bodyFont: parseFloat(style.fontSize),
          bodyWeight: Number(style.fontWeight),
          align: style.textAlign,
          actionsTop: actions.getBoundingClientRect().top,
          actionsBottom: actions.getBoundingClientRect().bottom,
          navTop: nav?.getBoundingClientRect().top ?? innerHeight,
        };
      });
      expect(layout.widthOverflow).toBeLessThanOrEqual(1);
      expect(layout.bodyFont).toBeLessThanOrEqual(18);
      expect(layout.bodyWeight).toBeLessThanOrEqual(400);
      expect(["left", "start"]).toContain(layout.align);
      expect(layout.questionFont).toBeLessThanOrEqual(22);
      expect(layout.questionTop).toBeGreaterThan(layout.panelTop);
      if (width < 768) {
        expect(layout.heightOverflow).toBeLessThanOrEqual(1);
        expect(layout.panelBottom).toBeLessThanOrEqual(layout.actionsTop);
        expect(layout.actionsBottom).toBeLessThanOrEqual(layout.navTop);
        await page.locator(".study-card").evaluate((el) => {
          el.scrollTop = el.scrollHeight;
        });
        const lastBottom =
          (await answer.locator("p").last().boundingBox())!.y +
          (await answer.locator("p").last().boundingBox())!.height;
        expect(lastBottom).toBeLessThanOrEqual(layout.panelBottom);
      }
    }
    await page.locator(".study-card").evaluate((el) => {
      el.scrollTop = 0;
    });
    await page.screenshot({
      path: resolve(`../private-data/e2e/${screenshot}`),
    });
    // Submit a scrolled answer and confirm the next question starts at the top.
    if (target < session.cards.length - 1) {
      await page.locator(".study-card").evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
      const saved = page.waitForResponse((r) =>
        r.url().endsWith("/api/study/reviews"),
      );
      await page.getByRole("button", { name: /^보통/ }).click();
      expect((await saved).status()).toBe(200);
      await expect(page.locator(".study-progress")).toContainText(
        `${target + 2} /`,
      );
      expect(
        await page.locator(".study-card").evaluate((el) => el.scrollTop),
      ).toBe(0);
    }
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    const restore = await page.request.patch("/api/settings", {
      headers,
      data: original,
    });
    if (!failed) expect(restore.status()).toBe(200);
  }
}
