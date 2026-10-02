import { expect, test, type Page } from "@playwright/test";
import { resolve } from "node:path";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("이메일").fill(process.env.E2E_EMAIL!);
  await page.getByLabel("비밀번호").fill(process.env.E2E_PASSWORD!);
  const loginResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/auth/login") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  expect((await loginResponse).status(), "로그인 HTTP 응답").toBe(200);
  await expect(
    page.getByRole("heading", { name: "오늘도 한 레슨씩" }),
  ).toBeVisible();
}

async function assertFits(page: Page) {
  const geometry = await page.evaluate(() => {
    const actions = document
      .querySelector(".study-actions")!
      .getBoundingClientRect();
    const card = document.querySelector(".study-card")!.getBoundingClientRect();
    const navigation = Array.from(document.querySelectorAll("nav"))
      .find((n) => getComputedStyle(n).position === "fixed")!
      .getBoundingClientRect();
    return {
      widthOverflow: document.documentElement.scrollWidth - innerWidth,
      heightOverflow: document.documentElement.scrollHeight - innerHeight,
      actionsBottom: actions.bottom,
      cardBottom: card.bottom,
      actionsTop: actions.top,
      navigationTop: navigation.top,
      buttonHeights: Array.from(
        document.querySelectorAll(
          "button.study-actions, .study-actions button",
        ),
      ).map((button) => button.getBoundingClientRect().height),
    };
  });
  expect(geometry.widthOverflow).toBeLessThanOrEqual(1);
  expect(geometry.heightOverflow).toBeLessThanOrEqual(1);
  expect(geometry.actionsBottom).toBeLessThanOrEqual(geometry.navigationTop);
  expect(geometry.cardBottom).toBeLessThanOrEqual(geometry.actionsTop);
  for (const height of geometry.buttonHeights)
    expect(height).toBeGreaterThanOrEqual(56);
}

for (const [width, height] of [
  [360, 640],
  [390, 844],
  [360, 740],
]) {
  test(`${width}x${height} 가나 카드와 근사 발음 및 네 평가가 한 화면에 들어온다`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: width!, height: height! });
    await login(page);
    const courses = await (await page.request.get("/api/courses")).json();
    const lesson = courses
      .find((c: { kind: string }) => c.kind === "katakana")
      .lessons.find(
        (l: { totalCards: number; studiedCards: number; optional: boolean }) =>
          !l.optional && l.studiedCards < l.totalCards,
      );
    expect(lesson).toBeTruthy();
    await page.goto(`/study?lessonId=${lesson.id}`);
    await expect(page.getByRole("button", { name: /정답 보기/ })).toBeVisible();
    await assertFits(page);
    await page.getByRole("button", { name: /정답 보기/ }).click();
    await expect(page.getByText("근사 발음", { exact: true })).toBeVisible();
    const actions = page.getByRole("group", { name: "기억 정도 평가" });
    await expect(actions.getByRole("button")).toHaveCount(4);
    await assertFits(page);
    await page.getByText("발음 안내", { exact: true }).click();
    await assertFits(page);
    if (width === 390)
      await page.screenshot({
        path: resolve("../private-data/e2e/mobile-study-390.png"),
      });
    await page.getByRole("button", { name: "로그아웃" }).click();
  });
}

test("긴 단어 예문과 음성 조절도 카드 안에서 펼치고 평가 버튼은 화면에 유지된다", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await login(page);
  const courses = await (await page.request.get("/api/courses")).json();
  const lesson = courses
    .find(
      (c: { kind: string; level: string }) =>
        c.kind === "vocabulary" && c.level === "N5",
    )
    .lessons.find(
      (l: { totalCards: number; studiedCards: number }) =>
        l.studiedCards < l.totalCards,
    );
  await page.goto(`/study?lessonId=${lesson.id}`);
  await page.getByRole("button", { name: /정답 보기/ }).click();
  await expect(
    page.getByRole("group", { name: "기억 정도 평가" }),
  ).toBeVisible();
  const details = page.getByText("예문과 설명 더 보기", { exact: true });
  if (await details.count()) await details.click();
  await page
    .getByRole("button", { name: "기본 음성 듣기", exact: true })
    .click();
  await expect
    .poll(() =>
      page
        .getByLabel("현재 발음 오디오")
        .evaluate((a: HTMLAudioElement) => a.readyState),
    )
    .toBeGreaterThanOrEqual(2);
  await assertFits(page);
  await page.getByRole("button", { name: "로그아웃" }).click();
});
