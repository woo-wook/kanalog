import { expect, it } from "vitest";
import manifest from "../app/manifest";
import { appConfig } from "./app-config";

it("설치된 앱에도 현재 화면의 배경과 포인트 색을 사용한다", () => {
  expect(manifest()).toMatchObject({
    background_color: appConfig.colors.surface,
    theme_color: appConfig.colors.primary,
  });
});
