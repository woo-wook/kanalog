import { baseJapanese, highlightSegments } from "./japanese-text";
import { expect, type Page } from "@playwright/test";
import { resolve } from "node:path";

export async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("이메일").fill(process.env.E2E_EMAIL!);
  await page.getByLabel("비밀번호").fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "오늘도 한 레슨씩" }),
  ).toBeVisible();
}

export async function checkNotebook(
  page: Page,
  sizes: [number, number][],
  screenshot: string,
) {
  await login(page);
  await page.setViewportSize({ width: sizes[0]![0], height: sizes[0]![1] });
  await page.goto("/notes");
  const filtered = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === "/api/notes" &&
      new URL(r.url()).searchParams.get("kind") === "grammar",
  );
  await page.getByRole("button", { name: "문법", exact: true }).click();
  const result = await (await filtered).json();
  expect(result.content.length).toBe(20);
  expect(result.totalElements).toBe(99);
  expect(
    result.content.every((n: { kind: string }) => n.kind === "grammar"),
  ).toBe(true);
  const note = result.content[0];
  expect(Boolean(note.grammarFocus)).toBe(true);
  const entry = page.locator(`[data-note-id="${note.id}"]`);
  await expect(entry).toBeVisible();
  expect(
    await page
      .getByLabel("단어 검색")
      .evaluate((el) => parseFloat(getComputedStyle(el).paddingLeft)),
  ).toBeGreaterThanOrEqual(40);
  expect(
    (await entry.locator(".note-title").textContent()) ===
      note.grammarFocus.title,
  ).toBe(true);
  await expect(entry.locator("details")).not.toHaveAttribute("open", "");
  await expect(entry.getByRole("region", { name: "문법 설명" })).toBeHidden();
  await expect(
    entry.getByRole("button", { name: "학습에서 제외", exact: true }),
  ).toHaveCount(0);
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    const layout = await entry.evaluate((el) => {
      const summary = el.querySelector("summary")!;
      const title = el.querySelector(".note-title")!;
      const bookmark = el.querySelector("button")!;
      return {
        overflow: document.documentElement.scrollWidth - innerWidth,
        summaryHeight: summary.getBoundingClientRect().height,
        titleFont: parseFloat(getComputedStyle(title).fontSize),
        bookmarkWidth: bookmark.getBoundingClientRect().width,
        bookmarkHeight: bookmark.getBoundingClientRect().height,
      };
    });
    expect(layout.overflow).toBeLessThanOrEqual(1);
    expect(layout.summaryHeight).toBeLessThan(250);
    expect(layout.titleFont).toBe(22);
    expect(layout.bookmarkWidth).toBeGreaterThanOrEqual(44);
    expect(layout.bookmarkHeight).toBeGreaterThanOrEqual(44);
  }
  await page.screenshot({
    path: resolve(`../private-data/e2e/notes-${screenshot}.png`),
  });
  await entry.locator("summary").click();
  await expect(entry.getByRole("region", { name: "문법 설명" })).toBeVisible();
  const parts = await highlightSegments(entry.locator(".grammar-example"));
  expect(
    JSON.stringify(parts) === JSON.stringify(note.grammarFocus.segments),
  ).toBe(true);
  const content = note.meaning
    .split(/\n+/)
    .map((line: string) => line.trim())
    .filter(Boolean);
  const restored = [
    await baseJapanese(entry.locator(".grammar-example")),
    await entry.locator(".grammar-translation").textContent(),
    await entry.locator(".note-preview").textContent(),
  ];
  for (const title of ["뉘앙스", "접속", "헷갈리는 문형"]) {
    const section = entry.getByRole("region", { name: title, exact: true });
    restored.push(title, ...(await section.locator("p").allTextContents()));
  }
  expect(JSON.stringify(restored) === JSON.stringify(content)).toBe(true);
  await expect(
    entry.getByRole("button", { name: "수정", exact: true }),
  ).toHaveCount(0);
  await page.screenshot({
    path: resolve(`../private-data/e2e/notes-detail-${screenshot}.png`),
  });
  const me = await (await page.request.get("/api/me")).json();
  const headers = {
    Origin: new URL(process.env.E2E_BASE_URL!).origin,
    "X-CSRF-Token": me.csrfToken,
  };
  try {
    const save = page.waitForResponse(
      (r) =>
        r.url().endsWith(`/api/notes/${note.id}`) &&
        r.request().method() === "PATCH",
    );
    await entry
      .getByRole("button", {
        name: note.bookmarked ? "북마크 해제" : "북마크 추가",
      })
      .click();
    expect((await save).status()).toBe(200);
    await expect(
      entry.getByRole("button", {
        name: note.bookmarked ? "북마크 추가" : "북마크 해제",
      }),
    ).toHaveAttribute("aria-pressed", String(!note.bookmarked));
    expect(
      (await (await page.request.get(`/api/notes/${note.id}`)).json())
        .bookmarked,
    ).toBe(!note.bookmarked);
    const exclude = page.waitForResponse(
      (r) =>
        r.url().endsWith(`/api/notes/${note.id}`) &&
        r.request().method() === "PATCH",
    );
    await entry
      .getByRole("button", {
        name: note.excluded ? "학습 재개" : "학습에서 제외",
      })
      .click();
    expect((await exclude).status()).toBe(200);
    await expect(
      entry.getByRole("button", {
        name: note.excluded ? "학습에서 제외" : "학습 재개",
      }),
    ).toBeEnabled();
    expect(
      (await (await page.request.get(`/api/notes/${note.id}`)).json()).excluded,
    ).toBe(!note.excluded);
  } finally {
    const restored = await page.request.patch(`/api/notes/${note.id}`, {
      headers,
      data: { bookmarked: note.bookmarked, excluded: note.excluded },
    });
    expect(restored.status()).toBe(200);
  }
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "단어장", exact: true }),
  ).toBeVisible();
  const kana = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === "/api/notes" &&
      new URL(r.url()).searchParams.get("kind") === "kana",
  );
  await page.getByRole("button", { name: "가나", exact: true }).click();
  const kanaRows = await (await kana).json();
  expect(
    kanaRows.content.every((n: { kind: string }) =>
      ["hiragana", "katakana"].includes(n.kind),
    ),
  ).toBe(true);
  expect(kanaRows.totalElements).toBe(208);
  const grammar = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === "/api/notes" &&
      new URL(r.url()).searchParams.get("kind") === "grammar",
  );
  await page.getByRole("button", { name: "문법", exact: true }).click();
  await grammar;
  const next = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === "/api/notes" &&
      new URL(r.url()).searchParams.get("page") === "1",
  );
  await page.getByRole("button", { name: "다음", exact: true }).click();
  expect((await (await next).json()).number).toBe(1);
  await page.getByLabel("단어 검색").fill("qa-no-match-" + crypto.randomUUID());
  await page.getByRole("button", { name: "검색", exact: true }).click();
  await expect(
    page.getByText("검색 결과가 없습니다.", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".note-entry")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
}
