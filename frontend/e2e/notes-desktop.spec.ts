import { expect, test } from "@playwright/test";
import { checkNotebook, login } from "./helpers/notes-layout";

test("태블릿과 PC 단어장도 요약과 상세가 구분된다", async ({ page }) => {
  test.setTimeout(120_000);
  await checkNotebook(
    page,
    [
      [768, 1024],
      [1280, 900],
    ],
    "desktop",
  );
});

test("개인 단어의 여러 줄 저장·수정·재접속 후 상세가 유지된다", async ({
  page,
}) => {
  await login(page);
  await page.goto("/notes");
  const token = "qa-notebook-" + crypto.randomUUID();
  await page.getByRole("button", { name: "내 단어 추가" }).click();
  expect(
    await page
      .getByRole("textbox", { name: "일본어 표기", exact: true })
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
  ).toBeGreaterThanOrEqual(16);
  await page
    .getByRole("textbox", { name: "일본어 표기", exact: true })
    .fill("確認");
  await page
    .getByRole("textbox", { name: "가나 읽기", exact: true })
    .fill("かくにん");
  await page
    .getByRole("textbox", { name: "한국어 뜻", exact: true })
    .fill("확인\n" + token);
  await page
    .getByRole("textbox", { name: "예문", exact: true })
    .fill("本を読みます。");
  await page
    .getByRole("textbox", { name: "예문 해석", exact: true })
    .fill("책을 읽습니다.");
  await page
    .getByRole("textbox", { name: "개인 메모", exact: true })
    .fill("첫째 줄\n둘째 줄");
  const create = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === "/api/notes" &&
      r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "저장", exact: true }).click();
  const response = await create;
  expect(response.status()).toBe(200);
  const note = await response.json();
  const entry = page.locator(`[data-note-id="${note.id}"]`);
  await expect(entry).toBeVisible();
  await expect(
    page.getByRole("button", { name: "단어", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await entry.locator("summary").click();
  await expect(entry.getByRole("region", { name: "개인 메모" })).toContainText(
    "둘째 줄",
  );
  await entry.getByRole("button", { name: "수정", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "한국어 뜻", exact: true }),
  ).toHaveValue("확인\n" + token);
  await page
    .getByRole("textbox", { name: "개인 메모", exact: true })
    .fill("수정된 메모\n줄바꿈 보존");
  const edit = page.waitForResponse(
    (r) =>
      r.url().endsWith(`/api/notes/${note.id}`) &&
      r.request().method() === "PATCH",
  );
  await page.getByRole("button", { name: "저장", exact: true }).click();
  expect((await edit).status()).toBe(200);
  await page.reload();
  await page.getByLabel("단어 검색").fill(token);
  await page.getByRole("button", { name: "검색", exact: true }).click();
  await expect(entry).toBeVisible();
  await entry.locator("summary").click();
  await expect(entry.getByRole("region", { name: "개인 메모" })).toContainText(
    "줄바꿈 보존",
  );
  const stored = await (await page.request.get(`/api/notes/${note.id}`)).json();
  expect(stored.meaning === "확인\n" + token).toBe(true);
  expect(stored.memo === "수정된 메모\n줄바꿈 보존").toBe(true);
});
