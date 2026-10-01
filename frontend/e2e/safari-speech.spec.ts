import { devices, expect, test } from "@playwright/test";

test.use({
  browserName: "webkit",
  userAgent: devices["iPhone 13"].userAgent,
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});

test("iPhone WebKit는 모델 다운로드나 worker 없이 같은 음성을 반복 재생하고 새로고침 후 진도를 유지한다", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const modelRequests: string[] = [];
  page.on("request", (request) => {
    if (/\/tts\/(supertonic|runtime|worker)/.test(request.url()))
      modelRequests.push(request.url());
  });
  await page.goto("/login");
  await page.getByLabel("이메일").fill(process.env.E2E_EMAIL!);
  await page.getByLabel("비밀번호").fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "오늘도 한 레슨씩" }),
  ).toBeVisible();
  await page.goto("/settings");
  await expect(
    page.getByText(
      "이 기기에서는 작은 음성 파일만 받아 재생합니다. 인터넷 연결이 필요합니다.",
    ),
  ).toBeVisible();
  const user = await (await page.request.get("/api/me")).json();
  const origin = new URL(process.env.E2E_BASE_URL!).origin;
  expect(
    (
      await page.request.post("/api/speech", {
        headers: { Origin: origin },
        data: { text: "ア", voice: "F1" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await page.request.post("/api/speech", {
        headers: { Origin: origin, "X-CSRF-Token": user.csrfToken },
        data: { text: "ア", voice: "invalid" },
      })
    ).status(),
  ).toBe(400);
  const before = await (await page.request.get("/api/stats")).json();
  const courses = await (await page.request.get("/api/courses")).json();
  const lesson = courses
    .find((c: { kind: string }) => c.kind === "katakana")
    .lessons.find(
      (l: { totalCards: number; studiedCards: number; optional: boolean }) =>
        !l.optional && l.studiedCards < l.totalCards,
    );
  await page.goto(`/study?lessonId=${lesson.id}`);
  await expect(page.getByRole("button", { name: /정답 보기/ })).toBeVisible();
  let navigations = 0;
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) navigations++;
  });
  for (let i = 0; i < 3; i++) {
    const response = page.waitForResponse(
      (r) => r.url().endsWith("/api/speech") && r.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "글자 발음 듣기", exact: true })
      .click();
    const wav = await response;
    expect(wav.status()).toBe(200);
    expect(wav.headers()["content-type"]).toContain("audio/wav");
    expect((await wav.body()).length).toBeLessThan(1024 * 1024);
    const resume = page.getByRole("button", {
      name: "준비된 음성 재생",
      exact: true,
    });
    const player = page.getByLabel("현재 발음 오디오");
    await expect(player).toBeVisible();
    if (await resume.isVisible()) await resume.click();
    await expect
      .poll(() => player.evaluate((a: HTMLAudioElement) => a.currentTime))
      .toBeGreaterThan(0);
    await expect(page.getByRole("status")).toHaveText("재생 완료");
  }
  expect(navigations).toBe(0);
  expect(modelRequests).toEqual([]);
  await page.getByRole("button", { name: "새로고침", exact: true }).click();
  await expect(page.getByRole("button", { name: /정답 보기/ })).toBeVisible();
  const response = page.waitForResponse((r) => r.url().endsWith("/api/speech"));
  await page
    .getByRole("button", { name: "글자 발음 듣기", exact: true })
    .click();
  expect((await response).status()).toBe(200);
  expect(modelRequests).toEqual([]);
  const after = await (await page.request.get("/api/stats")).json();
  expect(after.answers7Days).toBe(before.answers7Days);
  await page.getByRole("button", { name: "로그아웃", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(
    (
      await page.request.post("/api/speech", {
        headers: { Origin: origin },
        data: { text: "ア", voice: "F1" },
      })
    ).status(),
  ).toBe(401);
});
