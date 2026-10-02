import { expect, test, type Page } from "@playwright/test";

async function waitForPlayback(page: Page) {
  const audio = page.getByLabel("현재 발음 오디오");
  await expect(audio).toBeVisible({ timeout: 150_000 });
  await expect
    .poll(() => audio.evaluate((a: HTMLAudioElement) => a.readyState), {
      timeout: 30_000,
    })
    .toBeGreaterThanOrEqual(2);
  const start = page.getByRole("button", {
    name: "자동재생 시작",
    exact: true,
  });
  if (await start.isVisible()) {
    const preparedSource = await audio.getAttribute("src");
    await start.click();
    await expect(audio).toHaveAttribute("src", preparedSource!);
  }
  await expect
    .poll(() => audio.evaluate((a: HTMLAudioElement) => a.currentTime))
    .toBeGreaterThan(0);
  return audio;
}

test("새로고침 후 로그인과 가나 연습 기록을 유지하고 생성 음성과 다음 카드 자동재생을 이어간다", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.getByLabel("이메일").fill(process.env.E2E_EMAIL!);
  await page.getByLabel("비밀번호").fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "오늘도 한 레슨씩" }),
  ).toBeVisible();
  const original = await (await page.request.get("/api/settings")).json();
  const user = await (await page.request.get("/api/me")).json();
  const headers = {
    "X-CSRF-Token": user.csrfToken,
    Origin: new URL(process.env.E2E_BASE_URL!).origin,
  };
  try {
    await page.goto("/settings");
    await page.getByRole("checkbox", { name: /^카드 음성 자동재생/ }).check();
    await page
      .getByRole("checkbox", { name: "정답 전에 발음 듣기", exact: true })
      .check();
    await page
      .getByLabel("음성 엔진", { exact: true })
      .selectOption("SUPERTONIC");
    const save = page.getByRole("button", { name: "설정 저장", exact: true });
    if (await save.isEnabled()) await save.click();
    await expect(save).toBeDisabled();
    const before = await (await page.request.get("/api/stats")).json();
    await page.goto("/study?kana=katakana&groups=basic");
    await expect(
      page.getByRole("button", { name: "새로고침", exact: true }),
    ).toBeVisible();
    const sessionResponse = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/study/sessions") &&
        r.request().method() === "POST",
    );
    const reloaded = page.waitForEvent("domcontentloaded");
    await page.getByRole("button", { name: "새로고침", exact: true }).click();
    await reloaded;
    const session = await (await sessionResponse).json();
    expect(session.practice).toBe(true);
    expect(session.cards).toHaveLength(46);
    await expect(page.getByRole("button", { name: /정답 보기/ })).toBeVisible();
    const audio = await waitForPlayback(page);
    const firstSource = await audio.getAttribute("src");
    await page.getByRole("button", { name: /정답 보기/ }).click();
    await expect(audio).toHaveAttribute("src", firstSource!);
    const saved = page.waitForResponse((r) =>
      r.url().endsWith("/api/study/reviews"),
    );
    await page.getByRole("button", { name: "보통", exact: true }).click();
    expect((await (await saved).json()).state).toBe("PRACTICED");
    await expect(page.locator(".study-progress")).toContainText("2 /");
    // The next card must play without a second tap on its audio button.
    await expect(audio).not.toHaveAttribute("src", firstSource!, {
      timeout: 60_000,
    });
    await expect
      .poll(() => audio.evaluate((a: HTMLAudioElement) => a.currentTime), {
        timeout: 60_000,
      })
      .toBeGreaterThan(0);
    const after = await (await page.request.get("/api/stats")).json();
    expect(after.answers7Days).toBe(before.answers7Days);
    const progress = await (
      await page.request.get(`/api/study/sessions/${session.id}`)
    ).json();
    expect(progress.answered).toBe(1);
    await page.getByRole("button", { name: "새로고침", exact: true }).click();
    await expect(page.getByRole("button", { name: /정답 보기/ })).toBeVisible();
    const restored = await (await page.request.get("/api/stats")).json();
    expect(restored.answers7Days).toBe(after.answers7Days);
    const restoredProgress = await (
      await page.request.get(`/api/study/sessions/${session.id}`)
    ).json();
    expect(restoredProgress.answered).toBe(1);
    const persisted = await (await page.request.get("/api/settings")).json();
    expect(persisted.autoPlayAudio).toBe(true);
  } finally {
    const reset = await page.request.patch("/api/settings", {
      headers,
      data: original,
    });
    expect(reset.ok()).toBe(true);
    await page.goto("/settings");
    await page.getByRole("button", { name: "로그아웃", exact: true }).click();
  }
});
