import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it } from "vitest";
import { KanaMix } from "./kana-mix";
afterEach(cleanup);

it("문자 종류와 포함 분류만 선택해서 장수 제한 없이 전체 연습한다", async () => {
  const user = userEvent.setup();
  render(<KanaMix />);
  const link = screen.getByRole("link", { name: "섞어서 시작" });
  expect(link).toHaveAttribute("href", "/study?kana=hiragana&groups=basic");
  expect(
    screen.queryByLabelText("한 번에 연습할 문자"),
  ).not.toBeInTheDocument();
  expect(screen.queryByLabelText("연습 방식")).not.toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText("문자 종류"), "both");
  await user.click(screen.getByRole("checkbox", { name: /탁음 20/ }));
  await user.click(screen.getByRole("checkbox", { name: /반탁음 5/ }));
  await user.click(screen.getByRole("checkbox", { name: /요음 33/ }));
  expect(link).toHaveAttribute(
    "href",
    "/study?kana=both&groups=basic%2Cvoiced%2CsemiVoiced%2Cyoon",
  );
  expect(
    screen.getByText(/다시·어려움으로 평가한 문자가 다음 연습에서 먼저/),
  ).toBeVisible();
  for (const checkbox of screen.getAllByRole("checkbox"))
    await user.click(checkbox);
  expect(
    screen.queryByRole("link", { name: "섞어서 시작" }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "섞어서 시작" })).toBeDisabled();
});

it("가타카나 단일 코스에는 문자 종류 선택 없이 전체 범위를 제공한다", async () => {
  render(<KanaMix script="katakana" />);
  expect(screen.getByRole("heading", { name: "가타카나 연습" })).toBeVisible();
  expect(screen.queryByLabelText("문자 종류")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "연습 시작" })).toHaveAttribute(
    "href",
    "/study?kana=katakana&groups=basic",
  );
  expect(screen.getByText("총 46개 문자")).toBeVisible();
});
