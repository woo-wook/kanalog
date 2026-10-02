import { devices, expect, test } from "@playwright/test";

test.use({
  browserName: "webkit",
  userAgent: devices["iPhone 13"].userAgent,
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});

test("단일 가나 코스와 섞기 평가가 다음 연습·재접속에 반영된다", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const login = async () => {
    await page.goto("/login");
    await page.getByLabel("이메일").fill(process.env.E2E_EMAIL!);
    await page.getByLabel("비밀번호").fill(process.env.E2E_PASSWORD!);
    const response = page.waitForResponse((r) =>
      r.url().endsWith("/api/auth/login"),
    );
    await page.getByRole("button", { name: "로그인", exact: true }).click();
    expect((await response).status()).toBe(200);
    await expect(
      page.getByRole("heading", { name: "오늘도 한 레슨씩" }),
    ).toBeVisible();
  };
  await login();
  const settings = await (await page.request.get("/api/settings")).json();
  const me = await (await page.request.get("/api/me")).json();
  const headers = {
    Origin: new URL(process.env.E2E_BASE_URL!).origin,
    "X-CSRF-Token": me.csrfToken,
  };
  const sessionResponse = () =>
    page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/study/sessions") &&
        r.request().method() === "POST",
    );
  const scope = {
    kana: { scripts: ["hiragana", "katakana"], groups: ["semiVoiced"] },
  };
  try {
    expect(
      (
        await page.request.patch("/api/settings", {
          headers,
          data: { autoPlayAudio: false },
        })
      ).ok(),
    ).toBe(true);
    // QA account only: normalize the ten test characters before making a known rating distribution.
    const setup = await page.request.post("/api/study/sessions", {
      headers,
      data: scope,
    });
    expect(setup.ok()).toBe(true);
    const initial = await setup.json();
    expect(initial.cards).toHaveLength(10);
    for (const c of initial.cards)
      expect(
        (
          await page.request.post("/api/study/reviews", {
            headers,
            data: {
              sessionId: initial.id,
              cardId: c.id,
              version: c.version,
              rating: "EASY",
              idempotencyKey: crypto.randomUUID(),
            },
          })
        ).ok(),
      ).toBe(true);
    await page.goto("/courses/levels/starter");

    const courses = page.getByRole("region", {
      name: "가나 학습 코스",
      exact: true,
    });
    await expect(courses.getByRole("link")).toHaveCount(2);
    await expect(page.getByText(/카 행|모음 · 기본|사 행/)).toHaveCount(0);
    await courses
      .getByRole("link", { name: "히라가나 연습", exact: true })
      .click();
    const hiraUrl = page.url();
    await expect(
      page.getByRole("heading", { name: "히라가나 연습", exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("문자 종류")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "레슨 시작" })).toHaveCount(0);
    await expect(page.getByText("총 46개 문자")).toBeVisible();
    let response = sessionResponse();
    await page.getByRole("link", { name: "연습 시작", exact: true }).click();
    expect((await (await response).json()).cards).toHaveLength(46);
    await page.goto("/courses/levels/starter");
    await courses
      .getByRole("link", { name: "가타카나 연습", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "가타카나 연습", exact: true }),
    ).toBeVisible();
    response = sessionResponse();
    await page.getByRole("link", { name: "연습 시작", exact: true }).click();
    const kata = await (await response).json();
    expect(kata.cards).toHaveLength(46);
    expect(
      kata.cards.every((c: { kind: string }) => c.kind === "katakana"),
    ).toBe(true);
    await page.goto("/courses/levels/starter");
    await page.getByLabel("문자 종류").selectOption("both");
    await page
      .getByRole("checkbox", { name: "기본 46자", exact: true })
      .uncheck();
    await page
      .getByRole("checkbox", { name: "반탁음 5자", exact: true })
      .check();
    response = sessionResponse();
    await page.getByRole("link", { name: "섞어서 시작", exact: true }).click();
    const mixed = await (await response).json();
    expect(mixed.cards).toHaveLength(10);
    const retryCard = mixed.cards[0],
      hardCard = mixed.cards[1];
    for (let i = 0; i < 10; i++) {
      await page.getByRole("button", { name: /정답 보기/ }).click();
      const saved = page.waitForResponse((r) =>
        r.url().endsWith("/api/study/reviews"),
      );
      await page
        .getByRole("button", {
          name: i === 0 ? "다시" : i === 1 ? "어려움" : "보통",
          exact: true,
        })
        .click();
      expect((await saved).status()).toBe(200);
    }
    await expect(
      page.getByText(/평가를 저장했습니다.*다음 연습에서 먼저/),
    ).toBeVisible();
    response = sessionResponse();
    await page
      .getByRole("button", { name: "다시 섞어 연습", exact: true })
      .click();
    const next = await (await response).json();
    expect(next.cards.slice(0, 2).map((c: { id: string }) => c.id)).toEqual([
      retryCard.id,
      hardCard.id,
    ]);
    expect(next.cards[0].lastRating).toBe("AGAIN");
    expect(next.cards[1].lastRating).toBe("HARD");
    for (const width of [360, 390]) {
      await page.setViewportSize({ width, height: 740 });
      await page.getByRole("button", { name: /정답 보기/ }).click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      for (const name of ["다시", "어려움", "보통", "쉬움"]) {
        const box = await page
          .getByRole("button", { name, exact: true })
          .boundingBox();
        expect(box!.y + box!.height).toBeLessThanOrEqual(740);
      }
      if (width === 360) {
        response = sessionResponse();
        await page.reload();
        await response;
      }
    }
    const saved = page.waitForResponse((r) =>
      r.url().endsWith("/api/study/reviews"),
    );
    await page.getByRole("button", { name: "쉬움", exact: true }).click();
    expect((await saved).status()).toBe(200);
    // Hard first; the former AGAIN card moves behind all eight GOOD cards.
    const changedResponse = await page.request.post("/api/study/sessions", {
      headers,
      data: scope,
    });
    expect(changedResponse.ok()).toBe(true);
    const changed = await changedResponse.json();
    expect(changed.cards[0].id).toBe(hardCard.id);
    expect(changed.cards[9].id).toBe(retryCard.id);
    await page.goto("/settings");
    await page.getByRole("button", { name: "로그아웃", exact: true }).click();
    await login();
    await page.goto(hiraUrl);
    await page
      .getByRole("checkbox", { name: "기본 46자", exact: true })
      .uncheck();
    await page
      .getByRole("checkbox", { name: "반탁음 5자", exact: true })
      .check();
    response = sessionResponse();
    await page.getByRole("link", { name: "연습 시작", exact: true }).click();
    const single = await (await response).json();
    expect(single.cards).toHaveLength(5);
    const hiraRetry = changed.cards.filter(
      (c: { kind: string }) => c.kind === "hiragana",
    );
    const rank = (r?: string) =>
      ({ AGAIN: 0, HARD: 1, GOOD: 3, EASY: 4 })[r ?? ""] ?? 2;
    expect(
      single.cards.map((c: { lastRating?: string }) => rank(c.lastRating)),
    ).toEqual(
      hiraRetry.map((c: { lastRating?: string }) => rank(c.lastRating)),
    );
  } finally {
    const currentMe = await (await page.request.get("/api/me")).json();
    expect(
      (
        await page.request.patch("/api/settings", {
          headers: { ...headers, "X-CSRF-Token": currentMe.csrfToken },
          data: settings,
        })
      ).ok(),
    ).toBe(true);
  }
});
