import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import type { ReadingGuide } from "./api";
import {
  JapaneseText,
  PronunciationHint,
  grammarTitleGuide,
} from "./japanese-text";
afterEach(cleanup);
const guide: ReadingGuide = {
  segments: [
    { text: "この" },
    { text: "本", reading: "ほん" },
    { text: "はこの" },
    { text: "人", reading: "ひと" },
    { text: "のです。" },
  ],
  source: "ORIGINAL",
  hangul: "코노혼와코노히토노데스。",
  hangulSource: "APPROXIMATE",
};
it("原文 ruby와 지정된 두 번째 강조 위치를 함께 보존한다", () => {
  const text = "この本はこの人のです。",
    focus = {
      title: "この",
      segments: [
        { text: "この本は", highlighted: false },
        { text: "この", highlighted: true },
        { text: "人のです。", highlighted: false },
      ],
    };
  const { container, rerender } = render(
    <JapaneseText text={text} guide={guide} focus={focus} />,
  );
  expect(container.querySelectorAll("rt")).toHaveLength(2);
  expect(container.querySelector("mark")?.textContent).toBe("この");
  expect(container.querySelector("mark rt")).toBeNull();
  expect(container.querySelector("rt")?.textContent).toBe("ほん");
  rerender(
    <JapaneseText text={text} guide={guide} focus={focus} furigana={false} />,
  );
  expect(container.querySelector("rt")).toBeNull();
  expect(container.textContent).toBe(text);
});
it("불일치 표기는 숨기고 HTML은 실행하지 않는다", () => {
  const { container } = render(<JapaneseText text="別" guide={guide} />);
  expect(container.querySelector("ruby")).toBeNull();
  expect(container.textContent).toBe("別");
});
it("한글 보조 설정과 수동 값 우선순위를 지킨다", () => {
  const { rerender } = render(
    <PronunciationHint guide={guide} enabled={false} />,
  );
  expect(screen.queryByLabelText("한글 발음 보조")).toBeNull();
  rerender(<PronunciationHint guide={guide} enabled />);
  expect(screen.getByText("근사 발음 · 자동")).toBeVisible();
  rerender(<PronunciationHint guide={guide} enabled manual="직접 확인한 값" />);
  expect(screen.getByText("직접 확인한 값")).toBeVisible();
  expect(screen.queryByText("근사 발음 · 자동")).toBeNull();
});

it("문형 제목에는 온전하게 포함된 원본 한자 묶음의 읽기만 붙인다", () => {
  const guide: ReadingGuide = {
    segments: [{ text: "日本語", reading: "にほんご" }, { text: "を話す" }],
    source: "ORIGINAL",
  };
  expect(
    grammarTitleGuide(
      {
        title: "日本語",
        segments: [
          { text: "日本語", highlighted: true },
          { text: "を話す", highlighted: false },
        ],
      },
      guide,
    )?.segments[0]?.reading,
  ).toBe("にほんご");
  expect(
    grammarTitleGuide(
      {
        title: "日本",
        segments: [
          { text: "日本", highlighted: true },
          { text: "語を話す", highlighted: false },
        ],
      },
      guide,
    )?.segments[0]?.reading,
  ).toBeNull();
});
