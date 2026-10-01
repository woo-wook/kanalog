import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it } from "vitest";
import { KanaMix } from "./kana-mix";
afterEach(cleanup);

it("히라가나 기본 10장이 기본값이고 문자 종류·탁음·반탁음·요음·장수·자유 연습을 조합한다", async () => {
  const user = userEvent.setup();
  render(<KanaMix />);
  const link = screen.getByRole("link", { name: "섞어서 시작" });
  expect(link).toHaveAttribute(
    "href",
    "/study?kana=hiragana&groups=basic&size=10&practice=0",
  );
  await user.selectOptions(screen.getByLabelText("문자 종류"), "both");
  await user.click(screen.getByRole("checkbox", { name: /탁음 20/ }));
  await user.click(screen.getByRole("checkbox", { name: /반탁음 5/ }));
  await user.click(screen.getByRole("checkbox", { name: /요음 33/ }));
  await user.selectOptions(screen.getByLabelText("한 번에 연습할 문자"), "all");
  await user.selectOptions(screen.getByLabelText("연습 방식"), "practice");
  expect(link).toHaveAttribute(
    "href",
    "/study?kana=both&groups=basic%2Cvoiced%2CsemiVoiced%2Cyoon&size=208&practice=1",
  );
  expect(
    screen.getByText(/복습 일정과 코스 진도를 바꾸지 않아요/),
  ).toBeVisible();
  for (const checkbox of screen.getAllByRole("checkbox"))
    await user.click(checkbox);
  expect(
    screen.queryByRole("link", { name: "섞어서 시작" }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "섞어서 시작" })).toBeDisabled();
});
