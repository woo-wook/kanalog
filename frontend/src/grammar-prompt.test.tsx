import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { GrammarPrompt } from "./grammar-prompt";
afterEach(cleanup);
it("정답 전에는 문형과 원본 강조만 보여 주고 한국어 뜻과 설명을 숨긴다", () => {
  const front = "この本はこの人のです。";
  const card = {
    front,
    meaning: `${front}\n이 책은 이 사람의 것입니다.\n이~\n뉘앙스\n가까운 대상을 나타냅니다.\n접속\n명사 앞에 씁니다.\n헷갈리는 문형\n비교 설명입니다.`,
    grammarFocus: {
      title: "この",
      segments: [
        { text: "この本は", highlighted: false },
        { text: "この", highlighted: true },
        { text: "人のです。", highlighted: false },
      ],
    },
  };
  const { container, rerender } = render(
    <GrammarPrompt card={card} revealed={false} />,
  );
  expect(screen.getByRole("heading", { name: "この" })).toBeVisible();
  expect(screen.queryByText("이~")).not.toBeInTheDocument();
  expect(
    screen.queryByText("가까운 대상을 나타냅니다."),
  ).not.toBeInTheDocument();
  expect(screen.queryByText("명사 앞에 씁니다.")).not.toBeInTheDocument();
  const example = container.querySelector(".grammar-example")!;
  expect(example.textContent).toBe(front);
  expect(example.querySelectorAll("mark")).toHaveLength(1);
  expect(example.querySelector("mark")?.previousSibling?.textContent).toBe(
    "この本は",
  );
  expect(example.querySelector("mark")?.textContent).toBe("この");
  expect(
    screen.queryByText("이 책은 이 사람의 것입니다."),
  ).not.toBeInTheDocument();
  rerender(<GrammarPrompt card={card} revealed />);
  expect(screen.getByText("이~")).toBeVisible();
  expect(
    screen.queryByRole("region", { name: "문형의 쓰임" }),
  ).not.toBeInTheDocument();
  expect(container.querySelector(".grammar-example mark")?.textContent).toBe(
    "この",
  );
});
