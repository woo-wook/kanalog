import { test } from "@playwright/test";
import { checkGrammar } from "./helpers/grammar-layout";
test("태블릿과 데스크톱도 긴 문법이 읽기 좋은 크기와 문단으로 표시된다", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await checkGrammar(
    page,
    [
      [768, 1024],
      [1280, 900],
    ],
    "grammar-desktop.png",
  );
});
