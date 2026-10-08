import { expect, test } from "@playwright/test";
import { login } from "./helpers/notes-layout";

test("개인 동사 활용은 서버 응답으로 생성되고 단어장 재접속 후에도 읽힌다", async ({
  page,
}) => {
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
  const note = await response.json();
  expect(note.verbConjugation?.verbClass).toBe("ICHIDAN");
  expect(note.verbConjugation.forms.length).toBeGreaterThanOrEqual(20);
  const entry = page.locator(`[data-note-id="${note.id}"]`);
  await expect(entry).toBeVisible();
  await entry.locator("summary").click();
  const panel = entry.getByRole("region", { name: "동사 활용" });
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("heading", { name: "기본 활용" })).toBeVisible();
  await expect(
    panel.getByRole("heading", { name: "이어 말하기" }),
  ).toBeVisible();
  await expect(
    panel.getByRole("heading", { name: "표현 넓히기" }),
  ).toBeVisible();
  expect(await panel.locator(".verb-form-row").count()).toBe(
    note.verbConjugation.forms.length,
  );
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
});
