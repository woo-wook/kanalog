import { devices, expect, test } from "@playwright/test";

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
  await expect(page.getByRole("link", { name: /iOS 앱 다운로드/ })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("link", { name: "웹으로 학습하기" }),
  ).toHaveAttribute("href", "/login");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBeLessThanOrEqual(1);
});
