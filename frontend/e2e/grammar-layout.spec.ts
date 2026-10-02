import { devices, test } from "@playwright/test";
import { checkGrammar } from "./helpers/grammar-layout";
test.use({
  browserName: "webkit",
  userAgent: devices["iPhone 13"].userAgent,
  isMobile: true,
  hasTouch: true,
});
test("긴 MAX 해설은 문단으로 표시되고 카드만 스크롤되며 평가가 화면에 유지된다", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await checkGrammar(
    page,
    [
      [360, 640],
      [390, 740],
      [390, 844],
    ],
    "grammar-mobile-390.png",
  );
});

test("첫 N5 문법도 큰 질문과 구분된 해석·핵심 표현·설명으로 표시한다", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await checkGrammar(page, [[390, 844]], "grammar-intro-390.png", 0);
});
