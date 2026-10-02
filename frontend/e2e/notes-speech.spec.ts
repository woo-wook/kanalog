import {
  devices,
  expect,
  test,
  type Locator,
  type Page,
} from "@playwright/test";
import { resolve } from "node:path";
import { login } from "./helpers/notes-layout";
import type { Note, Page as NotePage, StudySession } from "../src/api";

test.use({
  browserName: "webkit",
  userAgent: devices["iPhone 13"].userAgent,
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});

async function waitForPlayback(page: Page, player: Locator, controls: Locator) {
  await expect(player).toHaveAttribute("src", /blob:/);
  const resume = controls.getByRole("button", {
    name: /준비된 음성 재생|자동재생 시작/,
  });
  await expect
    .poll(
      async () =>
        (await player.evaluate((a: HTMLAudioElement) => a.currentTime > 0)) ||
        (await resume.isVisible()),
    )
    .toBe(true);
  if (await resume.isVisible()) await resume.click();
  await expect
    .poll(() => player.evaluate((a: HTMLAudioElement) => a.currentTime))
    .toBeGreaterThan(0);
  const signal = await player.evaluate(async (a: HTMLAudioElement) => {
    const context = new AudioContext();
    try {
      const decoded = await context.decodeAudioData(
        await (await fetch(a.src)).arrayBuffer(),
      );
      const samples = decoded.getChannelData(0);
      return {
        seconds: decoded.duration,
        rms: Math.sqrt(
          samples.reduce((sum, v) => sum + v * v, 0) / samples.length,
        ),
      };
    } finally {
      await context.close();
    }
  });
  expect(signal.seconds).toBeGreaterThan(0.1);
  expect(signal.rms).toBeGreaterThan(0.001);
}

test("단어장에서 실제 MAX 문법·어휘 및 개인 단어를 합성하고 기본 음성을 구분해 재생한다", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await login(page);
  const original = await (await page.request.get("/api/settings")).json();
  const me = await (await page.request.get("/api/me")).json();
  const headers = {
    Origin: new URL(process.env.E2E_BASE_URL!).origin,
    "X-CSRF-Token": me.csrfToken,
  };
  const models: string[] = [];
  page.on("request", (request) => {
    if (/\/tts\/(supertonic|runtime|worker)/.test(request.url()))
      models.push(request.url());
  });
  try {
    expect(
      (
        await page.request.patch("/api/settings", {
          headers,
          data: {
            audioEngine: "SUPERTONIC",
            supertonicVoice: "M1",
            playbackSpeed: 0.8,
            autoPlayAudio: false,
          },
        })
      ).ok(),
    ).toBe(true);
    const before = await (await page.request.get("/api/stats")).json();
    await page.goto("/notes");
    async function select(kind: string, label: string): Promise<Note[]> {
      const loaded = page.waitForResponse(
        (r) =>
          new URL(r.url()).pathname === "/api/notes" &&
          new URL(r.url()).searchParams.get("kind") === kind,
      );
      await page.getByRole("button", { name: label, exact: true }).click();
      return ((await (await loaded).json()) as NotePage<Note>).content;
    }
    const grammar = (await select("grammar", "문법"))[0]!;
    const entry = page.locator(`[data-note-id="${grammar.id}"]`);
    await entry.locator("summary").click();
    const player = page.getByLabel("단어장 발음 오디오");
    async function listen(entry: Locator, label: string, text?: string) {
      const response = page.waitForResponse(
        (r) =>
          r.url().endsWith("/api/speech") && r.request().method() === "POST",
      );
      await entry.getByRole("button", { name: label, exact: true }).click();
      const result = await response;
      expect(result.status()).toBe(200);
      expect(result.headers()["content-type"]).toContain("audio/wav");
      const payload = result.request().postDataJSON();
      expect(payload.text === text && payload.voice === "M1").toBe(true);
      await waitForPlayback(page, player, entry);
      expect(
        await player.evaluate((a: HTMLAudioElement) => a.playbackRate),
      ).toBe(0.8);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
    }
    await listen(entry, "예문 듣기", grammar.front ?? grammar.japanese);
    await page.screenshot({
      path: resolve("../private-data/e2e/notes-grammar-speech-390.png"),
    });
    await entry.locator("summary").click();
    await expect(player).not.toHaveAttribute("src");
    const words = await select("vocabulary", "단어");
    const imported = words.find(
      (note) =>
        note.source !== "PERSONAL" &&
        note.reading &&
        note.example &&
        note.audioId,
    );
    expect(Boolean(imported)).toBe(true);
    const wordEntry = page.locator(`[data-note-id="${imported!.id}"]`);
    await wordEntry.locator("summary").click();
    await listen(wordEntry, "단어 듣기", imported!.reading);
    await listen(wordEntry, "예문 듣기", imported!.example);
    const originalAudio = page.waitForResponse(
      (r) => new URL(r.url()).pathname === `/api/media/${imported!.audioId}`,
    );
    await wordEntry
      .getByRole("button", { name: "기본 음성", exact: true })
      .click();
    expect([200, 206].includes((await originalAudio).status())).toBe(true);
    await expect
      .poll(() => player.evaluate((a: HTMLAudioElement) => a.currentTime))
      .toBeGreaterThan(0);
    const personal = words.find(
      (note) => note.source === "PERSONAL" && note.reading && note.example,
    );
    expect(Boolean(personal)).toBe(true);
    const personalEntry = page.locator(`[data-note-id="${personal!.id}"]`);
    await personalEntry.locator("summary").click();
    await listen(personalEntry, "단어 듣기", personal!.reading);
    await listen(personalEntry, "예문 듣기", personal!.example);
    await page.screenshot({
      path: resolve("../private-data/e2e/notes-word-speech-390.png"),
    });
    await page.getByRole("button", { name: "가나", exact: true }).click();
    await expect(player).not.toHaveAttribute("src");
    expect(models).toEqual([]);
    const after = await (await page.request.get("/api/stats")).json();
    expect(after.answers7Days).toBe(before.answers7Days);
  } finally {
    expect(
      (
        await page.request.patch("/api/settings", { headers, data: original })
      ).ok(),
    ).toBe(true);
  }
});

test("문법 학습의 자동재생도 실제 일본어 예문만 읽고 정답 공개 때 재다운로드하지 않는다", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await login(page);
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
          data: {
            audioEngine: "SUPERTONIC",
            supertonicVoice: "F1",
            autoPlayAudio: true,
            allowAudioBeforeReveal: true,
          },
        })
      ).ok(),
    ).toBe(true);
    const courses = await (await page.request.get("/api/courses")).json();
    const lesson = courses.find(
      (course: { kind: string }) => course.kind === "grammar",
    ).lessons[0];
    const started = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/study/sessions") &&
        r.request().method() === "POST",
    );
    const speech = page.waitForResponse((r) => r.url().endsWith("/api/speech"));
    let requests = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/speech")) requests++;
    });
    await page.goto(`/study?lessonId=${lesson.id}&practice=1`);
    const session = (await (await started).json()) as StudySession;
    const result = await speech;
    expect(result.status()).toBe(200);
    expect(
      result.request().postDataJSON().text === session.cards[0]!.front,
    ).toBe(true);
    const player = page.getByLabel("현재 발음 오디오");
    await waitForPlayback(page, player, page.locator(".study-card"));
    const source = await player.getAttribute("src");
    await page.getByRole("button", { name: /정답 보기/ }).click();
    await expect(player).toHaveAttribute("src", source!);
    expect(requests).toBe(1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  } finally {
    expect(
      (
        await page.request.patch("/api/settings", { headers, data: original })
      ).ok(),
    ).toBe(true);
  }
});
