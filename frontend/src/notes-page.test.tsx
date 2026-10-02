import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import NotesPage from "../app/(app)/notes/page";
import { api } from "./api";
vi.mock("./api", () => ({
  api: vi.fn(),
  apiSpeech: vi.fn(),
  json: (method: string, body: unknown) => ({
    method,
    body: JSON.stringify(body),
  }),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it("분류 변경은 서버 페이지네이션을 처음으로 돌리고 검색어와 함께 요청한다", async () => {
  vi.mocked(api).mockResolvedValue({
    content: [
      {
        id: "word",
        kind: "vocabulary",
        japanese: "本",
        reading: "ほん",
        meaning: "책",
        source: "JLPT MAX",
      },
    ],
    number: 0,
    totalPages: 2,
    totalElements: 21,
  });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  render(
    <QueryClientProvider client={client}>
      <NotesPage />
    </QueryClientProvider>,
  );
  await screen.findByRole("heading", { name: "本" });
  await userEvent.click(screen.getByRole("button", { name: "다음" }));
  await waitFor(() =>
    expect(vi.mocked(api)).toHaveBeenCalledWith(
      "/notes?query=&page=1&size=20&kind=",
    ),
  );
  await userEvent.click(screen.getByRole("button", { name: "문법" }));
  await waitFor(() =>
    expect(vi.mocked(api)).toHaveBeenCalledWith(
      "/notes?query=&page=0&size=20&kind=grammar",
    ),
  );
  expect(screen.getByRole("button", { name: "문법" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await userEvent.type(
    screen.getByRole("textbox", { name: "단어 검색" }),
    "この",
  );
  await userEvent.click(screen.getByRole("button", { name: "검색" }));
  await waitFor(() =>
    expect(vi.mocked(api)).toHaveBeenCalledWith(
      "/notes?query=%E3%81%93%E3%81%AE&page=0&size=20&kind=grammar",
    ),
  );
});

it("개인 단어의 여러 줄 뜻과 메모를 보존하고 저장 중 중복 제출을 막는다", async () => {
  let finish: (value: unknown) => void = () => {};
  vi.mocked(api).mockImplementation(async (path) =>
    path === "/notes"
      ? new Promise((resolve) => {
          finish = resolve;
        })
      : { content: [], number: 0, totalPages: 0, totalElements: 0 },
  );
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <NotesPage />
    </QueryClientProvider>,
  );
  await userEvent.click(screen.getByRole("button", { name: "내 단어 추가" }));
  expect(screen.getByLabelText("한국어 뜻").tagName).toBe("TEXTAREA");
  await userEvent.type(screen.getByLabelText("일본어 표기"), "本");
  await userEvent.type(screen.getByLabelText("가나 읽기"), "ほん");
  await userEvent.type(
    screen.getByLabelText("한국어 뜻"),
    "책\n문맥에 따라 권",
  );
  await userEvent.type(screen.getByLabelText("개인 메모"), "첫째 줄\n둘째 줄");
  await userEvent.click(screen.getByRole("button", { name: "저장" }));
  expect(screen.getByRole("button", { name: "저장 중…" })).toBeDisabled();
  expect(screen.getByLabelText("일본어 표기")).toBeDisabled();
  const posts = vi.mocked(api).mock.calls.filter(([path]) => path === "/notes");
  expect(posts).toHaveLength(1);
  const payload = JSON.parse(String(posts[0]![1]!.body));
  expect(payload.meaning).toBe("책\n문맥에 따라 권");
  expect(payload.memo).toBe("첫째 줄\n둘째 줄");
  finish({ id: "created" });
  await screen.findByText("단어를 저장했습니다.");
  expect(screen.queryByLabelText("한국어 뜻")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "단어" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
