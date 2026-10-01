import { expect, test } from "@playwright/test";

test("가타카나 코스의 레슨으로 시작하고 평가 진도가 재로그인 뒤 유지된다", async ({
  page,
}) => {
  async function login() {
    await page.goto("/login");
    await page.getByLabel("이메일").fill(process.env.E2E_EMAIL!);
    await page.getByLabel("비밀번호").fill(process.env.E2E_PASSWORD!);
    await page.getByRole("button", { name: "로그인", exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
  }
  await login();
  await page.goto("/courses");
  await expect(
    page.getByRole("heading", { name: "학습 코스", exact: true }),
  ).toBeVisible();
  const card = page.locator('article[data-course-kind="katakana"]');
  await card.getByRole("link", { name: "코스 보기" }).click();
  await expect(
    page.getByRole("heading", { name: "가타카나", exact: true }),
  ).toBeVisible();
  const courses = await (await page.request.get("/api/courses")).json();
  const katakana = courses.find((c: { kind: string }) => c.kind === "katakana");
  const lesson = katakana.lessons.find(
    (l: { optional: boolean; studiedCards: number; totalCards: number }) =>
      !l.optional && l.studiedCards < l.totalCards,
  );
  expect(lesson).toBeTruthy();
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/study/sessions") &&
      r.request().method() === "POST",
  );
  await page
    .locator(`article[data-lesson-id="${lesson.id}"]`)
    .getByRole("link", { name: "레슨 시작" })
    .click();
  const session = await (await response).json();
  expect(session.lessonId).toBe(lesson.id);
  expect(session.cards.length).toBeGreaterThan(0);
  expect(
    session.cards.every((c: { kind: string }) => c.kind === "katakana"),
  ).toBe(true);
  // Due reviews come before new cards; answering one review does not add a unique card.
  const firstNew = session.cards.findIndex(
    (c: { version: number }) => c.version === 0,
  );
  expect(
    firstNew,
    "신규 카드의 진도를 검증할 오늘의 한도가 필요합니다",
  ).toBeGreaterThanOrEqual(0);
  for (let index = 0; index <= firstNew; index++) {
    await expect(page.getByText("이 문자는 어떻게 읽을까요?")).toBeVisible();
    await page.getByRole("button", { name: /정답 보기/ }).click();
    const saved = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/study/reviews") &&
        r.request().method() === "POST",
    );
    await page.getByRole("button", { name: /보통/ }).click();
    expect((await saved).status()).toBe(200);
  }
  await page.getByRole("button", { name: "로그아웃" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await login();
  const current = await (
    await page.request.get(`/api/courses/${katakana.id}`)
  ).json();
  const persisted = current.lessons.find(
    (l: { id: string }) => l.id === lesson.id,
  );
  expect(persisted.studiedCards).toBe(lesson.studiedCards + 1);
  expect(persisted.completedCards).toBeGreaterThan(lesson.completedCards);
});
