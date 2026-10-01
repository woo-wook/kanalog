import { expect, test, type Page } from "@playwright/test";

const email = process.env.E2E_EMAIL!;
const password = process.env.E2E_PASSWORD!;

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("이메일").fill(email);
  await page.getByLabel("비밀번호").fill(password);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "문자부터 차근차근" }),
  ).toBeVisible();
}

async function answersLast7Days(page: Page): Promise<number> {
  await page.goto("/stats");
  await expect(page.getByRole("heading", { name: "학습 통계" })).toBeVisible();
  const value = await page
    .getByText("최근 7일 답변", { exact: true })
    .locator("..")
    .locator("strong")
    .innerText();
  return Number(value.replaceAll(",", ""));
}

test("실제 N5 코스에서 평가를 저장하면 다음 카드와 통계가 바뀐다", async ({
  page,
}) => {
  await login(page);
  const before = await answersLast7Days(page);
  await page.goto("/courses");
  const n5Vocabulary = page
    .locator('article[data-course-kind="vocabulary"]')
    .filter({ hasText: /N5/ })
    .first();
  await expect(n5Vocabulary).toBeVisible();
  await n5Vocabulary.getByRole("link", { name: "코스 보기" }).click();
  await page
    .locator("article[data-lesson-id]")
    .first()
    .getByRole("link", { name: "레슨 시작" })
    .click();
  const reveal = page.getByRole("button", { name: /정답 보기/ });
  await expect(
    reveal,
    "전용 계정에 학습 가능한 카드가 2장 이상 필요합니다",
  ).toBeVisible();
  await reveal.click();
  await expect(page.getByRole("button", { name: /보통/ })).toBeVisible();
  const response = page.waitForResponse(
    (result) =>
      result.url().endsWith("/api/study/reviews") &&
      result.request().method() === "POST",
  );
  await page.getByRole("button", { name: /보통/ }).click();
  expect((await response).status()).toBe(200);
  await expect(page.getByRole("button", { name: /정답 보기/ })).toBeVisible();
  expect(await answersLast7Days(page)).toBe(before + 1);
});

test("로그아웃하면 보호 화면과 API에 접근할 수 없다", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "로그아웃" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/stats");
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.request.get("/api/me")).status()).toBe(401);
});

test("MAX 음성은 로그인한 사용자에게만 오디오 스트림으로 제공된다", async ({
  page,
}) => {
  await login(page);
  await page.goto("/courses");
  const n5Vocabulary = page
    .locator('article[data-course-kind="vocabulary"]')
    .filter({ hasText: /N5/ })
    .first();
  await expect(n5Vocabulary).toBeVisible();
  await n5Vocabulary.getByRole("link", { name: "코스 보기" }).click();
  await page
    .locator("article[data-lesson-id]")
    .first()
    .getByRole("link", { name: "레슨 시작" })
    .click();
  const audioResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/media/") &&
      [200, 206].includes(response.status()),
  );
  await page.getByRole("button", { name: "MAX 음성 듣기" }).click();
  const response = await audioResponse;
  expect(response.headers()["content-type"]).toContain("audio/mpeg");
  expect((await response.body()).byteLength).toBeGreaterThan(0);
  const audioUrl = response.url();
  const logoutResponse = page.waitForResponse((result) =>
    result.url().endsWith("/api/auth/logout"),
  );
  await page.getByRole("button", { name: "로그아웃" }).click();
  expect((await logoutResponse).status()).toBe(200);
  expect(await page.evaluate(async () => (await fetch("/api/me")).status)).toBe(
    401,
  );
  expect(
    await page.evaluate(async (url) => (await fetch(url)).status, audioUrl),
  ).toBe(401);
});

test("가나와 한글 발음 설정이 재로그인 뒤 유지된다", async ({ page }) => {
  await login(page);
  await page.goto("/settings");
  const kana = page.getByRole("checkbox", {
    name: "가나 읽기를 처음부터 표시",
  });
  const hangul = page.getByRole("checkbox", { name: /한글 발음 보조 표시/ });
  await expect(kana).toBeVisible();
  await expect(hangul).toBeVisible();
  const originalKana = await kana.isChecked();
  const originalHangul = await hangul.isChecked();
  try {
    await kana.setChecked(!originalKana);
    await hangul.setChecked(!originalHangul);
    await page.getByRole("button", { name: "설정 저장" }).click();
    await expect(page.getByText("설정을 저장했습니다.")).toBeVisible();
    await page.getByRole("button", { name: "로그아웃" }).click();
    await login(page);
    await page.goto("/settings");
    await expect(kana).toBeChecked({ checked: !originalKana });
    await expect(hangul).toBeChecked({ checked: !originalHangul });
  } finally {
    if (await kana.isVisible().catch(() => false)) {
      await kana.setChecked(originalKana);
      await hangul.setChecked(originalHangul);
      await page.getByRole("button", { name: "설정 저장" }).click();
      await expect(page.getByText("설정을 저장했습니다.")).toBeVisible();
    }
  }
});

test("360px와 390px에서 주요 화면이 가로로 넘치지 않는다", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  for (const width of [360, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (const path of ["/", "/courses", "/settings", "/stats"]) {
      await page.goto(path);
      await expect(page.locator("main h1").first()).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, `${width}px ${path}에서 가로 넘침`).toBeLessThanOrEqual(
        1,
      );
    }
  }
});
