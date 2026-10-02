import { expect, test } from "@playwright/test";

test("가타카나 단일 코스의 평가는 재로그인 뒤에도 재연습 수에 반영된다", async ({
  page,
}) => {
  async function login() {
    await page.goto("/login");
    await page.getByLabel("이메일").fill(process.env.E2E_EMAIL!);
    await page.getByLabel("비밀번호").fill(process.env.E2E_PASSWORD!);
    const response = page.waitForResponse((r) =>
      r.url().endsWith("/api/auth/login"),
    );
    await page.getByRole("button", { name: "로그인", exact: true }).click();
    expect((await response).status()).toBe(200);
    await expect(page).toHaveURL(/\/$/);
  }
  await login();
  await page.goto("/courses/levels/starter");
  const courses = await (await page.request.get("/api/courses")).json();
  const kata = courses.find((c: { kind: string }) => c.kind === "katakana");
  await page.getByRole("link", { name: "가타카나 연습", exact: true }).click();
  await expect(page.getByRole("link", { name: "레슨 시작" })).toHaveCount(0);
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/study/sessions") &&
      r.request().method() === "POST",
  );
  await page.getByRole("link", { name: "연습 시작", exact: true }).click();
  const session = await (await response).json();
  expect(session.practice).toBe(true);
  expect(session.cards).toHaveLength(46);
  const c = session.cards[0];
  await page.getByRole("button", { name: /정답 보기/ }).click();
  const saved = page.waitForResponse((r) =>
    r.url().endsWith("/api/study/reviews"),
  );
  await page.getByRole("button", { name: /^다시(?:\s+1)?$/ }).click();
  expect((await saved).status()).toBe(200);
  const logout = page.waitForResponse((r) =>
    r.url().endsWith("/api/auth/logout"),
  );
  await page.getByRole("button", { name: "로그아웃", exact: true }).click();
  expect((await logout).status()).toBe(200);
  await expect(page).toHaveURL(/\/login$/);
  await login();
  const current = await (
    await page.request.get(`/api/courses/${kata.id}`)
  ).json();
  expect(current.dueCount).toBe(
    kata.dueCount + (["AGAIN", "HARD"].includes(c.lastRating) ? 0 : 1),
  );
  await page.goto(`/courses/${kata.id}`);
  await expect(
    page.getByRole("heading", { name: "가타카나 연습", exact: true }),
  ).toBeVisible();
});
