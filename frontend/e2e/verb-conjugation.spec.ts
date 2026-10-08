import { devices, expect, test } from "@playwright/test";
import { resolve } from "node:path";
import { login } from "./helpers/notes-layout";
import { baseJapanese } from "./helpers/japanese-text";
import type {
  Note,
  Page as NotePage,
  StudySession,
  VerbConjugation,
} from "../src/api";

type VerbNote = Note & { verbConjugation: VerbConjugation };

test.use({
  browserName: "webkit",
  userAgent: devices["iPhone 13"].userAgent,
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});

async function csrfHeaders(page: import("@playwright/test").Page) {
  const me = await (
    await page.request.get("/api/me", { timeout: 15_000 })
  ).json();
  return {
    Origin: new URL(process.env.E2E_BASE_URL!).origin,
    "X-CSRF-Token": me.csrfToken as string,
  };
}

async function findMaxVerb(
  page: import("@playwright/test").Page,
  verbClass: VerbConjugation["verbClass"],
  queries: string[],
): Promise<{ note: VerbNote; query: string }> {
  for (const query of queries) {
    const url = `/api/notes?query=${encodeURIComponent(query)}&page=0&size=20&kind=vocabulary`;
    const response = await page.request.get(url);
    expect(response.ok()).toBe(true);
    const found = ((await response.json()) as NotePage<Note>).content.find(
      (note) =>
        note.source !== "PERSONAL" &&
        note.verbConjugation?.verbClass === verbClass,
    );
    if (found) return { note: found as VerbNote, query };
  }
  throw new Error(`QA MAX ${verbClass} 활용 노트를 찾지 못했습니다.`);
}

async function assertCompletePanel(
  panel: import("@playwright/test").Locator,
  conjugation: VerbConjugation,
) {
  await expect(panel).toBeVisible();
  for (const title of ["기본 활용", "이어 말하기", "표현 넓히기"])
    await expect(panel.getByRole("heading", { name: title })).toBeVisible();
  const rows = panel.locator(".verb-form-row");
  await expect(rows).toHaveCount(conjugation.forms.length);
  const ordered = (["BASIC", "CONNECT", "ADVANCED"] as const).flatMap((group) =>
    conjugation.forms.filter((form) => form.group === group),
  );
  for (const [index, form] of ordered.entries()) {
    const row = rows.nth(index);
    expect(await baseJapanese(row.locator(".japanese-text"))).toBe(
      form.japanese,
    );
    await expect(row.locator("p[lang='ja']").last()).toHaveText(form.reading);
    if (form.stem + form.suffix === form.japanese && form.suffix)
      await expect(row.locator("mark")).toHaveText(form.suffix);
  }
}

test("개인 동사 활용은 서버 응답으로 생성되고 단어장 재접속 후에도 읽힌다", async ({
  page,
}) => {
  test.setTimeout(150_000);
  await login(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/notes");
  const marker = `활용 회귀 ${crypto.randomUUID()}`;
  await page.getByRole("button", { name: "내 단어 추가" }).click();
  await page.getByRole("textbox", { name: "일본어 표기" }).fill("食べる");
  await page.getByRole("textbox", { name: "가나 읽기" }).fill("たべる");
  await page
    .getByRole("textbox", { name: "한국어 뜻" })
    .fill(`먹다\n${marker}`);
  const created = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/notes" &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "저장", exact: true }).click();
  const response = await created;
  expect(response.ok()).toBe(true);
  const note = (await response.json()) as VerbNote;
  expect(note.verbConjugation?.verbClass).toBe("ICHIDAN");
  expect(note.verbConjugation.forms.length).toBeGreaterThanOrEqual(20);
  const entry = page.locator(`[data-note-id="${note.id}"]`);
  await expect(entry).toBeVisible();
  await entry.locator("summary").click();
  const panel = entry.getByRole("region", { name: "동사 활용" });
  await assertCompletePanel(panel, note.verbConjugation);
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
  }
  await page.reload();
  await page.getByLabel("단어 검색").fill(marker);
  await page.getByRole("button", { name: "검색", exact: true }).click();
  await expect(entry).toBeVisible();
  await entry.locator("summary").click();
  await expect(entry.getByRole("region", { name: "동사 활용" })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: resolve("../private-data/e2e/verb-personal-notebook-390.png"),
  });

  const decks = (await (await page.request.get("/api/decks")).json()) as {
    id: string;
    title: string;
    totalCards: number;
  }[];
  const personal = decks.find((deck) => deck.title === "내 단어");
  expect(personal, "개인 단어 덱이 필요합니다").toBeTruthy();
  const headers = await csrfHeaders(page);
  let session: StudySession | undefined;
  let targetIndex = -1;
  const attempts = Math.min(
    12,
    Math.max(2, Math.ceil(personal!.totalCards / 50) * 3),
  );
  for (let i = 0; i < attempts; i++) {
    const started = await page.request.post("/api/study/sessions", {
      headers,
      data: { deckId: personal!.id, practice: true },
    });
    expect(started.ok()).toBe(true);
    const candidate = (await started.json()) as StudySession;
    const index = candidate.cards.findIndex((card) =>
      card.meaning?.includes(marker),
    );
    if (index >= 0) {
      session = candidate;
      targetIndex = index;
      break;
    }
  }
  expect(
    session,
    "개인 단어 덱의 활용 카드를 연습 세션에서 찾지 못했습니다",
  ).toBeTruthy();
  for (const card of session!.cards.slice(0, targetIndex)) {
    const review = await page.request.post("/api/study/reviews", {
      headers,
      data: {
        sessionId: session!.id,
        cardId: card.id,
        version: card.version,
        rating: "GOOD",
        idempotencyKey: crypto.randomUUID(),
      },
    });
    expect(review.ok()).toBe(true);
  }
  await page.goto(`/study?sessionId=${session!.id}`);
  await expect(page.getByRole("heading", { name: "食べる" })).toBeVisible();
  await expect(page.getByRole("region", { name: "동사 활용" })).toHaveCount(0);
  await page.getByRole("button", { name: /정답 보기/ }).click();
  const studyPanel = page.getByRole("region", { name: "동사 활용" });
  await assertCompletePanel(studyPanel, note.verbConjugation);
  const card = page.getByRole("article", { name: "학습 카드" });
  await studyPanel.locator(".verb-form-row").last().scrollIntoViewIfNeeded();
  expect(await card.evaluate((element) => element.scrollTop)).toBeGreaterThan(
    0,
  );
  await expect(page.getByRole("button", { name: /^보통/ })).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBeLessThanOrEqual(1);
  await page.screenshot({
    path: resolve("../private-data/e2e/verb-study-390.png"),
  });
});

test("MAX 5단·する·来る 전체 활용과 가나 합성 음성을 실제 단어장에서 확인한다", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await login(page);
  await page.setViewportSize({ width: 390, height: 844 });
  const original = await (await page.request.get("/api/settings")).json();
  const headers = await csrfHeaders(page);
  let testFailure: unknown;
  try {
    const changed = await page.request.patch("/api/settings", {
      headers,
      data: {
        audioEngine: "SUPERTONIC",
        supertonicVoice: "F1",
        autoPlayAudio: false,
        showFurigana: true,
      },
    });
    expect(changed.ok()).toBe(true);
    await page.goto("/notes");
    await page.reload();
    const cases = [
      {
        verbClass: "GODAN",
        queries: ["書く", "飲む", "話す", "行く"],
        file: "godan",
      },
      {
        verbClass: "SURU",
        queries: [
          "勉強する",
          "勉強",
          "練習する",
          "練習",
          "する",
          "散歩",
          "電話",
        ],
        file: "suru",
      },
      { verbClass: "KURU", queries: ["来る", "くる"], file: "kuru" },
    ] as const;
    for (const { verbClass, queries, file } of cases) {
      const { note, query } = await findMaxVerb(page, verbClass, [...queries]);
      expect(note.verbConjugation.classLabel.length).toBeGreaterThan(0);
      expect(note.verbConjugation.rule.length).toBeGreaterThan(0);
      expect(note.verbConjugation.forms.length).toBeGreaterThanOrEqual(18);
      await page.goto("/notes");
      await page.getByRole("button", { name: "단어", exact: true }).click();
      await page.getByLabel("단어 검색").fill(query);
      await page.getByRole("button", { name: "검색", exact: true }).click();
      const entry = page.locator(`[data-note-id="${note.id}"]`);
      await expect(entry).toBeVisible();
      await entry.locator("summary").click();
      const panel = entry.getByRole("region", { name: "동사 활용" });
      await assertCompletePanel(panel, note.verbConjugation);
      await expect(panel).toContainText(note.verbConjugation.classLabel);
      await expect(panel).toContainText(note.verbConjugation.rule);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        ),
      ).toBeLessThanOrEqual(1);
      await panel.evaluate((element) => {
        window.scrollTo({
          top: window.scrollY + element.getBoundingClientRect().top - 72,
          behavior: "auto",
        });
      });
      await page.screenshot({
        path: resolve(`../private-data/e2e/verb-max-${file}-390.png`),
      });
      await panel.screenshot({
        path: resolve(`../private-data/e2e/verb-max-${file}-panel.png`),
      });
      if (verbClass !== "GODAN") continue;
      const form = note.verbConjugation.forms.find(
        (item) => item.key === "masu",
      )!;
      const speech = page.waitForResponse(
        (result) =>
          new URL(result.url()).pathname === "/api/speech" &&
          result.request().method() === "POST",
      );
      await panel
        .getByRole("button", { name: `${form.japanese} 활용형 듣기` })
        .click();
      const wav = await speech;
      expect(wav.status()).toBe(200);
      expect(wav.headers()["content-type"]).toContain("audio/wav");
      const payload = wav.request().postDataJSON();
      expect(payload.text).toBe(form.reading);
      expect(payload.voice).toBe("F1");
      const audio = page.getByLabel("단어장 발음 오디오");
      await expect(audio).toHaveAttribute("src", /blob:/);
      const resume = entry.getByRole("button", {
        name: "준비된 음성 재생",
        exact: true,
      });
      await expect
        .poll(
          async () =>
            (await audio.evaluate(
              (element: HTMLAudioElement) => element.currentTime > 0,
            )) || (await resume.isVisible()),
        )
        .toBe(true);
      if (await resume.isVisible()) await resume.click();
      await expect
        .poll(() =>
          audio.evaluate((element: HTMLAudioElement) => element.currentTime),
        )
        .toBeGreaterThan(0);
      const sound = await audio.evaluate(async (element: HTMLAudioElement) => {
        const response = await fetch(element.src);
        const bytes = await response.arrayBuffer();
        const context = new AudioContext();
        try {
          const decoded = await context.decodeAudioData(bytes);
          const samples = decoded.getChannelData(0);
          const rms = Math.sqrt(
            samples.reduce((sum, value) => sum + value * value, 0) /
              samples.length,
          );
          return { bytes: bytes.byteLength, seconds: decoded.duration, rms };
        } finally {
          await context.close();
        }
      });
      expect(sound.bytes).toBeGreaterThan(1000);
      expect(sound.seconds).toBeGreaterThan(0.1);
      expect(sound.rms).toBeGreaterThan(0.001);
      await page.screenshot({
        path: resolve("../private-data/e2e/verb-godan-audio-390.png"),
      });
    }
  } catch (error) {
    testFailure = error;
    throw error;
  } finally {
    try {
      const current = await csrfHeaders(page);
      const restored = await page.request.patch("/api/settings", {
        headers: current,
        data: original,
        timeout: 15_000,
      });
      expect(restored.ok()).toBe(true);
    } catch (restoreError) {
      if (!testFailure) throw restoreError;
    }
  }
});
