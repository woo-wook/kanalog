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

it("확인된 MAX 구조에서 해석·핵심 표현·세 설명을 제목 있는 영역으로 나눈다", () => {
  render(
    <GrammarAnswer
      front="この本です。"
      answer={
        "この本です。\n이 책입니다.\n이~\n뉘앙스\n가까운 대상을 나타냅니다.\n접속\n명사 앞에 씁니다.\n헷갈리는 문형\n다른 표현과 비교합니다."
      }
    />,
  );
  const answer = screen.getByRole("region", { name: "정답과 해설" });
  for (const title of [
    "예문 해석",
    "핵심 표현",
    "뉘앙스",
    "접속",
    "헷갈리는 문형",
  ])
    expect(within(answer).getByRole("heading", { name: title })).toBeVisible();
  expect(within(answer).queryByText("この本です。")).not.toBeInTheDocument();
  expect(within(answer).getByText("이 책입니다.")).toHaveClass(
    "grammar-translation",
  );
  expect(within(answer).getByText("이~")).toHaveClass("grammar-expression");
  expect(
    within(answer).getByText("명사 앞에 씁니다.").closest("section"),
  ).toHaveAccessibleName("접속");
});

it("확인되지 않은 구성은 잘못 나누거나 내용을 숨기지 않는다", () => {
  const lines = [
    "新しい質問",
    "새 해석입니다.",
    "표현",
    "알 수 없는 제목",
    "설명",
    "뉘앙스",
    "비교",
    "접속",
    "접속 설명",
    "헷갈리는 문형",
    "추가 설명",
  ];
  render(<GrammarAnswer front="新しい質問" answer={lines.join("\n")} />);
  const answer = screen.getByRole("region", { name: "정답과 해설" });
  expect(
    Array.from(answer.querySelectorAll("p"), (p) => p.textContent),
  ).toEqual(lines);
  expect(
    within(answer).queryByRole("heading", { name: "핵심 표현" }),
  ).not.toBeInTheDocument();
});
