import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { GrammarAnswer } from "./grammar-answer";
afterEach(cleanup);
it("문법 정답은 제목 한 덩어리 대신 원본 문단을 그대로 읽을 수 있게 표시한다", () => {
  render(
    <GrammarAnswer
      answer={
        "あの本は私のです。\n저 책은 제 것입니다.\n설명은 원본 줄바꿈을 보존합니다."
      }
    />,
  );
  const answer = screen.getByRole("region", { name: "정답과 해설" });
  expect(
    within(answer).getByRole("heading", { name: "정답과 해설" }),
  ).toBeVisible();
  expect(within(answer).getByText("あの本は私のです。").tagName).toBe("P");
  expect(within(answer).getByText("저 책은 제 것입니다.").tagName).toBe("P");
  expect(answer.querySelectorAll("p")).toHaveLength(3);
  expect(answer.querySelector("h2")?.textContent).not.toContain("あの本");
});
