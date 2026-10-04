import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
test.use({
  browserName: "webkit",
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
test.setTimeout(120_000);

test("홈의 레벨 전체 범위와 N5 전체 복습이 레슨 선택 없이 열린다", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("이메일").fill(process.env.E2E_EMAIL!);
  await page.getByLabel("비밀번호").fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "내 레벨에서 골고루" }),
  ).toBeVisible();
  const me = await (await page.request.get("/api/me")).json();
  const headers = {
    "X-CSRF-Token": me.csrfToken,
    Origin: new URL(process.env.E2E_BASE_URL!).origin,
  };
  const old = await (await page.request.get("/api/settings")).json();
  try {
    await page.getByLabel("내 학습 레벨").selectOption("N5");
    await expect(page.getByRole("link", { name: /단어 연습/ })).toHaveAttribute(
      "href",
      "/study?level=N5&kind=vocabulary",
    );
    const options = await (await page.request.get("/api/study/options")).json();
    expect(
      options.find(
        (row: { level: string; kind: string }) =>
          row.level === "N5" && row.kind === "vocabulary",
      ).total,
    ).toBe(779);
    expect(
      options.find(
        (row: { level: string; kind: string }) =>
          row.level === "N5" && row.kind === "grammar",
      ).total,
    ).toBe(99);
    await expect(
      page.getByRole("link", { name: /모든 레벨 복습/ }),
    ).toHaveAttribute("href", "/study?level=all&mode=review");
    await page.getByRole("link", { name: /N5 전체 복습/ }).click();
    await expect(page).toHaveURL(/level=N5.*mode=review.*sessionId=/);
    const sessionId = new URL(page.url()).searchParams.get("sessionId");
    const session = await (
      await page.request.get(`/api/study/sessions/${sessionId}`)
    ).json();
    expect(session.lessonId).toBeFalsy();
    expect(session.lessonTitle).toBe("N5 · 전체 복습");
    expect(
      session.cards.every(
        (card: { kind: string; due: string }) =>
          ["vocabulary", "grammar"].includes(card.kind) && card.due !== null,
      ),
    ).toBeTruthy();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow).toBeFalsy();
  } finally {
    await page.request.patch("/api/settings", {
      headers,
      data: { practiceLevel: old.practiceLevel },
    });
  }
});

test("실제 MAX 카드의 다시 평가와 새로고침 후 즉시 재연습을 완료하고 다음날 기록을 남긴다", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("이메일").fill(process.env.E2E_EMAIL!);
  await page.getByLabel("비밀번호").fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "내 레벨에서 골고루" }),
  ).toBeVisible();
  const me = await (await page.request.get("/api/me")).json();
  const headers = {
    "X-CSRF-Token": me.csrfToken,
    Origin: new URL(process.env.E2E_BASE_URL!).origin,
  };
  const old = await (await page.request.get("/api/settings")).json();
  try {
    const options = await (await page.request.get("/api/study/options")).json();
    const target =
      [...options]
        .reverse()
        .find(
          (row: { due: number; total: number; studied: number }) =>
            row.due === 0 && row.total > row.studied,
        ) ??
      [...options]
        .sort((a, b) => a.due - b.due)
        .find((row: { due: number }) => row.due > 0);
    expect(
      target,
      "미학습 또는 예정된 MAX 카드가 있는 범위가 필요합니다",
    ).toBeTruthy();
    expect(
      (
        await page.request.patch("/api/settings", {
          headers,
          data: { dailyNewLimit: 100, autoPlayAudio: false },
        })
      ).ok(),
    ).toBeTruthy();
    const dashboard = await (await page.request.get("/api/dashboard")).json();
    const used = 100 - dashboard.dailyNewRemaining;
    expect(used).toBeLessThan(100);
    expect(
      (
        await page.request.patch("/api/settings", {
          headers,
          data: { dailyNewLimit: target.due > 0 ? 0 : used + 1 },
        })
      ).ok(),
    ).toBeTruthy();
    await page.goto(`/study?level=${target.level}&kind=${target.kind}`);
    await expect(page.getByRole("button", { name: /정답 보기/ })).toBeVisible();
    const sessionId = new URL(page.url()).searchParams.get("sessionId");
    expect(sessionId).toBeTruthy();
    const first = await (
      await page.request.get(`/api/study/sessions/${sessionId}`)
    ).json();
    expect(first.cards.length).toBeGreaterThan(0);
    const scheduledCount = first.cards.length;
    await page.getByRole("button", { name: /정답 보기/ }).click();
    const firstSaved = page.waitForResponse((r) =>
      r.url().endsWith("/api/study/reviews"),
    );
    await page.getByRole("button", { name: /^다시/ }).click();
    expect((await firstSaved).status()).toBe(200);
    // Existing QA reviews remain intact. Finish other scheduled cards through the real API
    // so the retry is the only remaining card; never reset FSRS/due timestamps for a fixture.
    const pending = await (
      await page.request.get(`/api/study/sessions/${sessionId}`)
    ).json();
    for (const other of pending.cards.filter(
      (c: { reinforcement?: boolean }) => !c.reinforcement,
    )) {
      const response = await page.request.post("/api/study/reviews", {
        headers,
        data: {
          sessionId,
          cardId: other.id,
          version: other.version,
          rating: "GOOD",
          idempotencyKey: randomUUID(),
        },
      });
      expect(response.status()).toBe(200);
    }
    await page.reload();
    await expect(
      page.getByText("한 번 더 기억해 보기", { exact: false }),
    ).toBeVisible();
    const restored = await (
      await page.request.get(`/api/study/sessions/${sessionId}`)
    ).json();
    expect(restored.cards).toHaveLength(1);
    expect(restored.cards[0].reinforcement).toBeTruthy();
    expect(restored.answered).toBe(scheduledCount);
    const buttons = page.getByRole("button", { name: /정답 보기/ });
    const before = await buttons.boundingBox();
    expect(before!.y + before!.height).toBeLessThanOrEqual(844);
    await buttons.click();
    await page.getByRole("button", { name: /^보통/ }).click();
    await expect(
      page.getByRole("heading", { name: "이번 학습을 마쳤습니다" }),
    ).toBeVisible();
    await expect(
      page.getByText(
        `학습한 고유 카드 ${scheduledCount}장 · 답변 ${scheduledCount + 1}회`,
      ),
    ).toBeVisible();
    const completed = await (
      await page.request.get(`/api/study/sessions/${sessionId}`)
    ).json();
    expect(completed.cards).toHaveLength(0);
    expect(completed.answered).toBe(scheduledCount + 1);
    expect(completed.ratingCounts).toEqual({ AGAIN: 1, GOOD: scheduledCount });
    await page.reload();
    await expect(
      page.getByText(
        `학습한 고유 카드 ${scheduledCount}장 · 답변 ${scheduledCount + 1}회`,
      ),
    ).toBeVisible();
  } finally {
    await page.request.patch("/api/settings", {
      headers,
      data: {
        dailyNewLimit: old.dailyNewLimit,
        autoPlayAudio: old.autoPlayAudio,
        practiceLevel: old.practiceLevel,
      },
    });
  }
});

test("빈 학습의 하루 한도 안내는 새로고침 뒤에도 유지된다", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("이메일").fill(process.env.E2E_EMAIL!);
  await page.getByLabel("비밀번호").fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "내 레벨에서 골고루" }),
  ).toBeVisible();
  const me = await (await page.request.get("/api/me")).json();
  const headers = {
    "X-CSRF-Token": me.csrfToken,
    Origin: new URL(process.env.E2E_BASE_URL!).origin,
  };
  const old = await (await page.request.get("/api/settings")).json();
  try {
    const options = await (await page.request.get("/api/study/options")).json();
    const target = options.find(
      (row: { due: number; total: number; studied: number }) =>
        row.due === 0 && row.total > row.studied,
    );
    const courses = await (await page.request.get("/api/courses")).json();
    const untouchedLesson = courses
      .filter((c: { kind: string }) =>
        ["vocabulary", "grammar"].includes(c.kind),
      )
      .flatMap(
        (c: {
          lessons: { id: string; studiedCards: number; totalCards: number }[];
        }) => c.lessons,
      )
      .find(
        (l: { studiedCards: number; totalCards: number }) =>
          l.studiedCards === 0 && l.totalCards > 0,
      );
    expect(Boolean(target || untouchedLesson)).toBeTruthy();
    const studyUrl = target
      ? `/study?level=${target.level}&kind=${target.kind}`
      : `/study?lessonId=${untouchedLesson.id}`;
    expect(
      (
        await page.request.patch("/api/settings", {
          headers,
          data: { dailyNewLimit: 0 },
        })
      ).ok(),
    ).toBeTruthy();
    await page.goto(studyUrl);
    await expect(
      page.getByText(/오늘 새 카드 한도를 모두 사용했습니다/),
    ).toBeVisible();
    const sessionId = new URL(page.url()).searchParams.get("sessionId");
    await page.reload();
    await expect(
      page.getByText(/오늘 새 카드 한도를 모두 사용했습니다/),
    ).toBeVisible();
    const session = await (
      await page.request.get(`/api/study/sessions/${sessionId}`)
    ).json();
    expect(session.queueInfo.reason).toBe("DAILY_LIMIT");
    expect(session.cards).toHaveLength(0);
    expect(session.answered).toBe(0);
    await expect(
      page.getByRole("heading", { name: "이번 학습을 마쳤습니다" }),
    ).not.toBeVisible();
  } finally {
    await page.request.patch("/api/settings", {
      headers,
      data: { dailyNewLimit: old.dailyNewLimit },
    });
  }
});
