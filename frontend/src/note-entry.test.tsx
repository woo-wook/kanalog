import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { NoteEntry } from "./note-entry";
afterEach(cleanup);

it("문법 목록은 문형과 뜻만 요약하고 상세에서 원본 강조 예문과 구분된 설명을 읽는다", async () => {
  const front = "この本はこの人のです。";
  const note = {
    id: "grammar",
    kind: "grammar",
    level: "N5",
    source: "JLPT MAX",
    front,
    meaning: `${front}\n이 책은 이 사람의 것입니다.\n이~\n뉘앙스\n가까운 대상을 나타냅니다.\n접속\n명사 앞에 씁니다.\n헷갈리는 문형\n다른 표현과 비교합니다.`,
    grammarFocus: {
      title: "この",
      segments: [
        { text: "この本は", highlighted: false },
        { text: "この", highlighted: true },
        { text: "人のです。", highlighted: false },
      ],
    },
  };
  const { container } = render(
    <NoteEntry
      note={note}
      onPatch={vi.fn()}
      onEdit={vi.fn()}
      pending={false}
    />,
  );
  expect(screen.getByRole("heading", { name: "この" })).toBeVisible();
  expect(screen.getByText("이~", { exact: true })).toBeVisible();
  expect(container.querySelector("details")).not.toHaveAttribute("open");
  expect(screen.getByText("가까운 대상을 나타냅니다.")).not.toBeVisible();
  await userEvent.click(screen.getByText("예문·설명 보기"));
  expect(container.querySelector("details")).toHaveAttribute("open");
  expect(screen.getByRole("region", { name: "문법 설명" })).toBeVisible();
  expect(screen.getByRole("region", { name: "접속" })).toHaveTextContent(
    "명사 앞에 씁니다.",
  );
  const example = container.querySelector(".grammar-example")!;
  expect(example.textContent).toBe(front);
  expect(example.querySelector("mark")?.previousSibling?.textContent).toBe(
    "この本は",
  );
  expect(example.querySelector("mark")?.textContent).toBe("この");
  expect(
    screen.queryByRole("button", { name: "수정" }),
  ).not.toBeInTheDocument();
  expect(screen.queryByText(/JLPT MAX|출처/)).not.toBeInTheDocument();
});
