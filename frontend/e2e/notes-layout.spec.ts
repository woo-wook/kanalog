import { devices, test } from "@playwright/test";
import { checkNotebook } from "./helpers/notes-layout";
test.use({
  browserName: "webkit",
  userAgent: devices["iPhone 13"].userAgent,
  isMobile: true,
  hasTouch: true,
});
test("짧은 문법 목록과 강조 상세·북마크·학습 제외·분류·검색이 동작한다", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await checkNotebook(
    page,
    [
      [360, 640],
      [390, 844],
    ],
    "mobile-390",
  );
});
