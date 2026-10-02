import { devices, expect, test } from "@playwright/test";

test.use({
  browserName: "webkit",
  userAgent: devices["iPhone 13"].userAgent,
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});

test("히라가나 우선과 혼합 자유 연습을 모바일에서 선택하고 기록·진도 분리를 확인한다", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const models: string[] = [];
  page.on("request", (r) => {
    if (/\/tts\/(supertonic|runtime|worker)/.test(r.url()))
      models.push(r.url());
  });
  await page.goto("/login");
  await expect(
    page.getByText("히라가나부터, 오늘의 학습을 이어가세요."),
  ).toBeVisible();
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
  try {
    expect(
      (
        await page.request.patch("/api/settings", {
          headers,
          data: { autoPlayAudio: false, audioEngine: "SUPERTONIC" },
        })
      ).ok(),
    ).toBe(true);
    const before = await (await page.request.get("/api/stats")).json();
    const curriculum = await (await page.request.get("/api/curriculum")).json();
    expect(
      curriculum.levels[0].units.slice(0, 2).map((u: { key: string }) => u.key),
    ).toEqual(["hiragana-basic", "katakana-basic"]);
    await page.goto("/courses/levels/starter");
    await expect(
      page.getByRole("heading", { name: "가나 섞어 연습" }),
    ).toBeVisible();
    for (const width of [360, 390]) {
      await page.setViewportSize({ width, height: 844 });
      for (const label of ["문자 종류"]) {
        expect(
          (await page.getByLabel(label).boundingBox())!.height,
        ).toBeGreaterThanOrEqual(44);
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await page.getByLabel("문자 종류").selectOption("both");
    await page
      .getByRole("checkbox", { name: "기본 46자", exact: true })
      .uncheck();
    await page
      .getByRole("checkbox", { name: "반탁음 5자", exact: true })
      .check();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const start = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/study/sessions") &&
        r.request().method() === "POST",
    );
    await page.getByRole("link", { name: "섞어서 시작", exact: true }).click();
    const session = await (await start).json();
    expect(session.practice).toBe(true);
    expect(session.cards).toHaveLength(10);
    expect(new Set(session.cards.map((c: { kind: string }) => c.kind))).toEqual(
      new Set(["hiragana", "katakana"]),
    );
    expect(
      new Set(session.cards.map((c: { front: string }) => c.front)),
    ).toEqual(
      new Set(["ぱ", "ぴ", "ぷ", "ぺ", "ぽ", "パ", "ピ", "プ", "ペ", "ポ"]),
    );
    await expect(page.getByRole("button", { name: /정답 보기/ })).toBeVisible();
    const wav = page.waitForResponse((r) => r.url().endsWith("/api/speech"));
    await page
      .getByRole("button", { name: "글자 발음 듣기", exact: true })
      .click();
    expect((await wav).status()).toBe(200);
    const audio = page.getByLabel("현재 발음 오디오");
    const resume = page.getByRole("button", {
      name: "준비된 음성 재생",
      exact: true,
    });
    await expect(audio).toBeVisible();
    await expect
      .poll(
        async () =>
          (await resume.isVisible()) ||
          (await audio.evaluate((a: HTMLAudioElement) => a.currentTime > 0)),
      )
      .toBe(true);
    if (await resume.isVisible()) await resume.click();
    await expect
      .poll(() => audio.evaluate((a: HTMLAudioElement) => a.currentTime))
      .toBeGreaterThan(0);
    for (let index = 0; index < 10; index++) {
      await page.getByRole("button", { name: /정답 보기/ }).click();
      const save = page.waitForResponse((r) =>
        r.url().endsWith("/api/study/reviews"),
      );
      await page.getByRole("button", { name: "보통", exact: true }).click();
      const answer = await (await save).json();
      expect(answer.state).toBe("PRACTICED");
      expect(answer.due).toBeUndefined();
      if (index < 9)
        await expect(page.locator(".study-progress")).toContainText(
          `${index + 2} /`,
        );
    }
    await expect(
      page.getByRole("heading", { name: "자유 연습을 마쳤습니다" }),
    ).toBeVisible();
    await expect(
      page.getByText("학습한 고유 카드 10장 · 답변 10회"),
    ).toBeVisible();
    const persisted = await (
      await page.request.get(`/api/study/sessions/${session.id}`)
    ).json();
    expect(persisted.answered).toBe(10);
    expect(persisted.cards).toEqual([]);
    expect(persisted.practice).toBe(true);
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
    const updated = await (await page.request.get("/api/curriculum")).json();
    expect(updated.levels[0].completedCards).toBe(
      curriculum.levels[0].completedCards,
    );
    const again = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/study/sessions") &&
        r.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "다시 섞어 연습", exact: true })
      .click();
    expect((await (await again).json()).id).not.toBe(session.id);
    await expect(page.getByRole("button", { name: /정답 보기/ })).toBeVisible();
    expect(models).toEqual([]);
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
