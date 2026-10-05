import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it } from "vitest";
import { KanaReference } from "./kana-reference";
afterEach(cleanup);
const groups = [
  {
    key: "basic",
    title: "기본 문자",
    rows: [
      {
        title: "모음",
        characters: [
          { hiragana: "あ", katakana: "ア", romaji: "a", hangul: "아" },
          { hiragana: "い", katakana: "イ", romaji: "i", hangul: "이" },
        ],
      },
    ],
  },
  {
    key: "yoon",
    title: "요음",
    rows: [
      {
        title: "요음",
        characters: [
          { hiragana: "きゃ", katakana: "キャ", romaji: "kya", hangul: "캬" },
        ],
      },
    ],
  },
];
it("두 문자를 한 셀에서 비교하고 검색 및 한글 표시 설정을 지킨다", async () => {
  const { rerender } = render(
    <KanaReference groups={groups} showHangulHint={false} />,
  );
  const pair = screen.getByLabelText("히라가나 あ, 가타카나 ア, a");
  expect(pair).toHaveTextContent("あアa");
  expect(screen.queryByText("아")).toBeNull();
  rerender(<KanaReference groups={groups} showHangulHint />);
  expect(screen.getByText("아")).toBeVisible();
  await userEvent.type(
    screen.getByRole("searchbox", { name: "가나 찾기" }),
    "キャ",
  );
  expect(
    screen.getByLabelText("히라가나 きゃ, 가타카나 キャ, kya"),
  ).toBeVisible();
  expect(screen.queryByLabelText("히라가나 あ, 가타카나 ア, a")).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: "검색 지우기" }));
  expect(screen.getByLabelText("히라가나 あ, 가타카나 ア, a")).toBeVisible();
  await userEvent.type(screen.getByRole("searchbox"), "없는 문자");
  expect(screen.getByText("일치하는 문자가 없습니다.")).toBeVisible();
});
