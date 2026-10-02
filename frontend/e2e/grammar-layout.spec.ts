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

test("あの 문형 제목과 원본 예문 강조·쓰임·해석을 구분해 표시한다", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await checkGrammar(page, [[390, 844]], "grammar-intro-390.png", 0, "あの");
});
