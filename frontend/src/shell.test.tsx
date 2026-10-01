import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { Shell } from "./shell";
import userEvent from "@testing-library/user-event";
import { reloadApp } from "./reload-app";
import { ApiError, me } from "./api";
const navigation = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("./reload-app", () => ({ reloadApp: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/courses/katakana",
  useRouter: () => navigation,
}));
vi.mock("./api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./api")>()),
  api: vi.fn(),
  me: vi.fn(),
  setCsrfToken: vi.fn(),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it("실제로 세션이 만료된 401 응답은 로그인 화면으로 이동한다", async () => {
  vi.mocked(me).mockRejectedValueOnce(
    new ApiError(401, "UNAUTHORIZED", "로그인이 필요합니다"),
  );
  const client = new QueryClient();
  render(
    <QueryClientProvider client={client}>
      <Shell>
        <h1>보호된 화면</h1>
      </Shell>
    </QueryClientProvider>,
  );
  await waitFor(() =>
    expect(navigation.replace).toHaveBeenCalledWith("/login"),
  );
  expect(
    screen.queryByRole("heading", { name: "보호된 화면" }),
  ).not.toBeInTheDocument();
});

it("일시적인 네트워크 실패는 로그인 이동 없이 로그인 확인을 다시 시도한다", async () => {
  vi.mocked(me)
    .mockRejectedValueOnce(new TypeError("Failed to fetch"))
    .mockResolvedValueOnce({ id: "qa", email: "qa@kanalog.test" });
  const client = new QueryClient();
  render(
    <QueryClientProvider client={client}>
      <Shell>
        <h1>복구된 화면</h1>
      </Shell>
    </QueryClientProvider>,
  );
  await userEvent.click(
    await screen.findByRole("button", { name: "다시 확인" }),
  );
  expect(
    await screen.findByRole("heading", { name: "복구된 화면" }),
  ).toBeVisible();
  expect(navigation.replace).not.toHaveBeenCalled();
});

it("설치한 PWA에서도 화면의 새로고침 버튼으로 현재 페이지를 다시 연다", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity } },
  });
  client.setQueryData(["me"], { id: "qa", email: "qa@kanalog.test" });
  render(
    <QueryClientProvider client={client}>
      <Shell>
        <h1>학습</h1>
      </Shell>
    </QueryClientProvider>,
  );
  await userEvent.click(
    screen.getAllByRole("button", { name: "새로고침" })[0]!,
  );
  expect(reloadApp).toHaveBeenCalledTimes(1);
});

it("keeps the course tab selected on lesson pages and provides a keyboard shortcut to content", () => {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity } },
  });
  client.setQueryData(["me"], { id: "qa", email: "qa@kanalog.test" });
  render(
    <QueryClientProvider client={client}>
      <Shell>
        <h1>가타카나</h1>
      </Shell>
    </QueryClientProvider>,
  );
  for (const link of screen.getAllByRole("link", { name: "코스" })) {
    expect(link).toHaveAttribute("aria-current", "page");
  }
  expect(
    screen.getByRole("link", { name: "본문으로 건너뛰기" }),
  ).toHaveAttribute("href", "#main-content");
  expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
});
