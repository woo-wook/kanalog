import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { VerbConjugationPanel } from "./verb-conjugation";
import type { VerbConjugation } from "./api";

afterEach(cleanup);

const conjugation: VerbConjugation = {
  verbClass: "GODAN",
  classLabel: "5단 동사",
  dictionaryForm: "書く",
  dictionaryReading: "かく",
  rule: "어미 く가 활용에 따라 바뀝니다.",
  forms: [
    {
      key: "masu",
      label: "ます형",
      group: "BASIC",
      description: "공손한 표현",
      japanese: "書きます",
      reading: "かきます",
      stem: "書き",
      suffix: "ます",
      readingGuide: {
        source: "READING",
        segments: [{ text: "書", reading: "か" }, { text: "きます" }],
        hangul: "카키마스",
        hangulSource: "APPROXIMATE",
      },
    },
    {
      key: "te",
      label: "て형",
      group: "CONNECT",
      description: "동작을 잇기",
      japanese: "書いて",
      reading: "かいて",
      stem: "書い",
      suffix: "て",
      readingGuide: { source: "READING", segments: [{ text: "書いて" }] },
    },
    {
      key: "potential",
      label: "가능형",
      group: "ADVANCED",
      description: "할 수 있다",
      japanese: "書ける",
      reading: "かける",
      stem: "書け",
      suffix: "る",
      readingGuide: { source: "READING", segments: [{ text: "書ける" }] },
    },
  ],
};

it("활용을 분류별로 모두 표시하고 바뀐 어미와 가나 읽기를 분리한다", () => {
  const { container } = render(
    <VerbConjugationPanel
      conjugation={conjugation}
      settings={{ showFurigana: false, showHangulHint: false }}
    />,
  );
  expect(screen.getByRole("region", { name: "동사 활용" })).toBeVisible();
  expect(screen.getByText("5단 동사")).toBeVisible();
  expect(screen.getByText(conjugation.rule)).toBeVisible();
  expect(screen.getByRole("heading", { name: "기본 활용" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "이어 말하기" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "표현 넓히기" })).toBeVisible();
  expect(screen.getByText("かきます")).toBeVisible();
  expect(screen.queryByText("카키마스")).not.toBeInTheDocument();
  expect(container.querySelectorAll(".verb-form-row")).toHaveLength(3);
  expect(container.querySelector(".verb-form-row mark")?.textContent).toBe(
    "ます",
  );
  expect(container.querySelector("rt")).toBeNull();
});

it("한글 보조와 후리가나는 설정을 따르고 활용형 읽기는 원형 음성을 쓰지 않는다", async () => {
  const onPlay = vi.fn();
  const { container } = render(
    <VerbConjugationPanel
      conjugation={conjugation}
      settings={{ showFurigana: true, showHangulHint: true }}
      onPlay={onPlay}
    />,
  );
  expect(screen.getByText(/카키마스/)).toBeVisible();
  expect(container.querySelector("rt")).toHaveTextContent("か");
  await userEvent.click(
    screen.getByRole("button", { name: "書きます 활용형 듣기" }),
  );
  expect(onPlay).toHaveBeenCalledWith("かきます", "masu");
});

it("서버가 제한한 활용은 추가하지 않고 대체형 안내와 읽기를 그대로 보여준다", async () => {
  const onPlay = vi.fn();
  const reviewed: VerbConjugation = {
    ...conjugation,
    verbClass: "ICHIDAN",
    classLabel: "1단 동사",
    dictionaryForm: "準じる",
    dictionaryReading: "じゅんじる",
    rule: "원본 準ずる 대신 같은 뜻의 현대형 準じる 활용을 보여줍니다.",
    forms: [
      {
        key: "masu",
        label: "정중형",
        group: "BASIC",
        description: "정중하게 말할 때",
        japanese: "準じます",
        reading: "じゅんじます",
        stem: "準じ",
        suffix: "ます",
        readingGuide: {
          source: "READING",
          segments: [{ text: "準", reading: "じゅん" }, { text: "じます" }],
          hangul: "준지마스",
          hangulSource: "APPROXIMATE",
          hangulStatus: "COMPLETE",
        },
      },
    ],
  };
  const { container } = render(
    <VerbConjugationPanel
      conjugation={reviewed}
      settings={{ showFurigana: true, showHangulHint: true }}
      onPlay={onPlay}
    />,
  );
  expect(screen.getByText(reviewed.rule)).toBeVisible();
  expect(container.querySelectorAll(".verb-form-row")).toHaveLength(1);
  expect(
    screen.queryByRole("heading", { name: "표현 넓히기" }),
  ).not.toBeInTheDocument();
  expect(screen.getByText(/준지마스/)).toBeVisible();
  await userEvent.click(
    screen.getByRole("button", { name: "準じます 활용형 듣기" }),
  );
  expect(onPlay).toHaveBeenCalledWith("じゅんじます", "masu");
});
