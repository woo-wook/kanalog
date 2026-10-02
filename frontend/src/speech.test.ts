import { describe, expect, it } from "vitest";
import { canPlayExample, speechText } from "./speech";

describe("학습 음성에 사용할 일본어", () => {
  it("문법의 일본어 앞면은 읽되 한국어가 섞인 해설은 읽지 않는다", () => {
    expect(
      speechText({ kind: "grammar", front: "あの本は田中さんのです。" }),
    ).toBe("あの本は田中さんのです。");
    expect(
      speechText({
        kind: "grammar",
        front: "あの는 멀리 있는 대상을 가리킵니다.",
      }),
    ).toBeNull();
    expect(
      speechText(
        { kind: "grammar", front: "질문" },
        { japanese: "이것은 책입니다." },
      ),
    ).toBeNull();
    expect(canPlayExample({ japanese: "이것은 책입니다." })).toBe(false);
  });
  it("원본 음성이 없는 일본어 예문도 합성 엔진에서 들을 수 있다", () => {
    expect(canPlayExample({ japanese: "雨が降る。" }, "SUPERTONIC")).toBe(true);
    expect(canPlayExample({ japanese: "雨が降る。" }, "DEVICE")).toBe(true);
    expect(canPlayExample({ japanese: "雨が降る。" }, "ORIGINAL")).toBe(false);
    expect(
      canPlayExample({ japanese: " ", audioId: "media" }, "ORIGINAL"),
    ).toBe(true);
    expect(canPlayExample({ japanese: " " }, "SUPERTONIC")).toBe(false);
  });
  it("단어는 한자 대신 읽기, 가나는 로마자 대신 글자를 읽는다", () => {
    expect(
      speechText({ kind: "vocabulary", front: "生", reading: "なま" }),
    ).toBe("なま");
    expect(speechText({ kind: "katakana", front: "ア", reading: "a" })).toBe(
      "ア",
    );
    expect(speechText({ kind: "hiragana", front: "し", reading: "shi" })).toBe(
      "し",
    );
  });
  it("한국어 문법 질문은 합성하지 않고 일본어 예문만 읽는다", () => {
    expect(
      speechText({ kind: "grammar", front: "정답은 무엇인가요?" }),
    ).toBeNull();
    expect(
      speechText(
        { kind: "grammar", front: "질문" },
        { japanese: "雨が降る。" },
      ),
    ).toBe("雨が降る。");
  });
});
