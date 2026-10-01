import { expect, it } from "vitest";
import manifest from "../app/manifest";

it("설치된 앱에도 현재 화면의 배경과 포인트 색을 사용한다", () => {
  expect(manifest()).toMatchObject({
    background_color: "#f8fafc",
    theme_color: "#2563eb",
  });
});
