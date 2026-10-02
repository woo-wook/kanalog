import { devices, expect, test } from "@playwright/test";

test.use({
  browserName: "webkit",
  userAgent: devices["iPhone 13"].userAgent,
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});

test("전체 섞기 208장을 끝까지 저장하고 빈 레슨에서도 자유 연습으로 이어간다", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await page.goto("/login");
  await page.getByLabel("이메일").fill(process.env.E2E_EMAIL!);
  await page.getByLabel("비밀번호").fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "오늘도 한 레슨씩" }),
  ).toBeVisible();
  const original = await (await page.request.get("/api/settings")).json();
  const me = await (await page.request.get("/api/me")).json();
  const headers = {
    Origin: new URL(process.env.E2E_BASE_URL!).origin,
    "X-CSRF-Token": me.csrfToken,
  };
  const dashboard = await (await page.request.get("/api/dashboard")).json();
  const used = original.dailyNewLimit - dashboard.dailyNewRemaining;
  expect(used).toBeGreaterThan(0);
  try {
    expect(
      (
        await page.request.patch("/api/settings", {
          headers,
          data: {
            dailyNewLimit: used + 4,
            autoPlayAudio: false,
          },
        })
      ).ok(),
    ).toBe(true);
    const before = await (await page.request.get("/api/stats")).json();
    await page.goto("/courses/levels/starter");
    await expect(page.getByLabel("한 번에 연습할 문자")).toHaveCount(0);
    await expect(page.getByLabel("연습 방식")).toHaveCount(0);
    const basicStart = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/study/sessions") &&
        r.request().method() === "POST",
    );
    await page.getByRole("link", { name: "섞어서 시작", exact: true }).click();
    const basic = await (await basicStart).json();
    expect(basic.practice).toBe(true);
    expect(basic.cards).toHaveLength(46);
    const legacyStart = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/study/sessions") &&
        r.request().method() === "POST",
    );
    await page.goto("/study?kana=hiragana&groups=basic&size=4&practice=0");
    const legacy = await (await legacyStart).json();
    expect(legacy.practice).toBe(true);
    expect(legacy.cards).toHaveLength(46);
    await page.goto("/courses/levels/starter");
    await page.getByLabel("문자 종류").selectOption("both");
    for (const name of ["탁음 20자", "반탁음 5자", "요음 33개"])
      await page.getByRole("checkbox", { name, exact: true }).check();
    const start = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/study/sessions") &&
        r.request().method() === "POST",
    );
    await page.getByRole("link", { name: "섞어서 시작", exact: true }).click();
    const session = await (await start).json();
    expect(session.cards).toHaveLength(208);
    expect(new Set(session.cards.map((c: { id: string }) => c.id)).size).toBe(
      208,
    );
    expect(session.queueInfo.newRemaining).toBe(4);
    expect(session.practice).toBe(true);
    for (let i = 0; i < 208; i++) {
      await expect(page.locator(".study-progress")).toContainText(
        `${i + 1} / 208`,
      );
      await page.getByRole("button", { name: /정답 보기/ }).click();
      const save = page.waitForResponse((r) =>
        r.url().endsWith("/api/study/reviews"),
      );
      await page.getByRole("button", { name: "보통", exact: true }).click();
      expect((await save).status()).toBe(200);
    }
    await expect(
      page.getByText("학습한 고유 카드 208장 · 답변 208회"),
    ).toBeVisible();
    const persisted = await (
      await page.request.get(`/api/study/sessions/${session.id}`)
    ).json();
    expect(persisted.answered).toBe(208);
    expect(persisted.cards).toEqual([]);
    const repeat = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/study/sessions") &&
        r.request().method() === "POST",
    );
    await page.getByRole("button", { name: "다시 섞어 연습" }).click();
    const next = await (await repeat).json();
    expect(next.id).not.toBe(session.id);
    expect(next.cards).toHaveLength(208);
    expect(
      (
        await page.request.patch("/api/settings", {
          headers,
          data: { dailyNewLimit: used },
        })
      ).ok(),
    ).toBe(true);
    const courses = await (await page.request.get("/api/courses")).json();
    const lesson = courses
      .filter((c: { kind: string }) => c.kind === "hiragana")
      .flatMap(
        (c: {
          lessons: {
            id: string;
            studiedCards: number;
            totalCards: number;
            dueCount: number;
          }[];
        }) => c.lessons,
      )
      .find(
        (l: { studiedCards: number; totalCards: number; dueCount: number }) =>
          l.studiedCards < l.totalCards && l.dueCount === 0,
      );
    expect(lesson).toBeTruthy();
    await page.goto(`/study?lessonId=${lesson.id}`);
    await expect(
      page.getByRole("heading", { name: "지금 예정된 카드가 없습니다" }),
    ).toBeVisible();
    await expect(page.getByText(/今日|이번 학습을 마쳤습니다/)).toHaveCount(0);
    await expect(page.getByText(/오늘 새 카드 한도를 모두 사용/)).toBeVisible();
    const free = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/study/sessions") &&
        r.request().method() === "POST",
    );
    await page.getByRole("button", { name: "같은 범위 자유 연습" }).click();
    const scoped = await (await free).json();
    expect(scoped.practice).toBe(true);
    expect(scoped.cards).toHaveLength(lesson.totalCards);
    expect(scoped.lessonId).toBe(lesson.id);
    await expect(page.getByRole("button", { name: /정답 보기/ })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const after = await (await page.request.get("/api/stats")).json();
    for (const key of [
      "answers7Days",
      "answers30Days",
      "uniqueCards7Days",
      "uniqueCards30Days",
      "learnedCards",
      "unseenCards",
      "lastStudiedAt",
      "decks",
    ])
      expect(after[key]).toEqual(before[key]);
  } finally {
    expect(
      (
        await page.request.patch("/api/settings", { headers, data: original })
      ).ok(),
    ).toBe(true);
    await page.goto("/settings");
    await page.getByRole("button", { name: "로그아웃", exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
  }
});
