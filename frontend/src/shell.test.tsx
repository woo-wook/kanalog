import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { Shell } from "./shell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/courses/katakana",
  useRouter: () => ({ replace: vi.fn() }),
}));
vi.mock("./api", () => ({ api: vi.fn(), me: vi.fn(), setCsrfToken: vi.fn() }));
afterEach(cleanup);

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
