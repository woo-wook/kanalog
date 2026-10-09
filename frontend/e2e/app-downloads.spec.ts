import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import { devices, expect, test } from "@playwright/test";

for (const viewport of [
  { width: 360, height: 740 },
  { width: 390, height: 844 },
  { width: 1280, height: 900 },
]) {
  test(`비로그인 ${viewport.width}px 다운로드 페이지와 보호 API`, async ({
    page,
  }) => {
    const apiRequests: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname.startsWith("/api/"))
        apiRequests.push(request.url());
    });
    await page.setViewportSize(viewport);
    const response = await page.goto("/download", {
      waitUntil: "domcontentloaded",
    });
    expect(response!.status()).toBe(200);
    await expect(
      page.getByRole("heading", { name: "나에게 맞는 학습 방법" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Android 앱 다운로드/ }),
    ).toBeVisible();
    await expect(page.getByText("배포 준비 중")).toBeVisible();
    expect(new URL(page.url()).pathname).toBe("/download");
    expect(apiRequests).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
    if (viewport.width === 390)
      await page.screenshot({
        path: resolve("../private-data/app-download-qa/download-390.png"),
        fullPage: true,
      });
    expect((await page.request.get("/api/me")).status()).toBe(401);
    await page.getByRole("link", { name: "웹 로그인" }).click();
    const entry = page.getByRole("link", {
      name: "앱 다운로드 · 로그인 없이 시작하기",
    });
    await expect(entry).toBeVisible();
    await entry.click();
    await expect(
      page.getByRole("heading", { name: "나에게 맞는 학습 방법" }),
    ).toBeVisible();
  });
}

test("APK를 로그인 없이 실제 다운로드하고 해시·Range·파일 접근 범위를 검증한다", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto("/download", { waitUntil: "domcontentloaded" });
  const button = page.getByRole("link", { name: /Android 앱 다운로드/ });
  const href = (await button.getAttribute("href"))!;
  const sha = (await page
    .locator("#android-title")
    .locator("..")
    .locator("code")
    .textContent())!.trim();
  const head = await page.request.head(href);
  expect(head.status()).toBe(200);
  expect(head.headers()["content-type"]).toContain(
    "application/vnd.android.package-archive",
  );
  expect(head.headers()["content-disposition"]).toContain("attachment");
  const pending = page.waitForEvent("download");
  await button.click();
  const download = await pending;
  expect(await download.failure()).toBeNull();
  const path = resolve("../private-data/app-download-qa/downloaded-public.apk");
  await download.saveAs(path);
  expect((await stat(path)).size).toBe(
    Number(head.headers()["content-length"]),
  );
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  expect(hash.digest("hex")).toBe(sha);
  const partial = await page.request.get(href, {
    headers: { Range: "bytes=0-3" },
  });
  expect(partial.status()).toBe(206);
  expect([...(await partial.body())]).toEqual([80, 75, 3, 4]);
  expect(
    (
      await page.request.get(href, { headers: { Range: "bytes=999999999-" } })
    ).status(),
  ).toBe(416);
  expect(
    (await page.request.get("/downloads/personal-content.json")).status(),
  ).toBe(404);
  expect(
    (
      await page.request.get("/downloads/kanalog-android-000000000000.apk")
    ).status(),
  ).toBe(404);
  expect((await page.request.get("/api/decks")).status()).toBe(401);
});

test.describe("iPhone Safari 공개 안내", () => {
  test.use({
    browserName: "webkit",
    userAgent: devices["iPhone 13"].userAgent,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  test("실제 배포 없는 iOS 링크는 표시하지 않고 웹 사용 경로를 제공한다", async ({
    page,
  }) => {
    await page.goto("/download", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: "iOS 앱", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("홈 화면에서도 바로 열기")).toBeVisible();
    await expect(
      page.getByRole("link", { name: /iOS 앱 다운로드/ }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "웹으로 학습하기" }),
    ).toHaveAttribute("href", "/login");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
  });
});
