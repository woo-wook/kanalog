import { render, screen, cleanup } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import LoginPage from "../app/login/page";
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
afterEach(cleanup);
it("로그인 폼은 초기화 전 입력을 받지 않고 클라이언트 준비 후에 활성화한다", () => {
  const client = new QueryClient();
  const element = (
    <QueryClientProvider client={client}>
      <LoginPage />
    </QueryClientProvider>
  );
  const html = renderToString(element);
  const dom = document.createElement("div");
  dom.innerHTML = html;
  expect(dom.querySelectorAll("input[disabled]")).toHaveLength(2);
  expect(dom.querySelector("button[disabled]")).not.toBeNull();
  render(element);
  expect(screen.getByLabelText("이메일")).toBeEnabled();
  expect(screen.getByLabelText("비밀번호")).toBeEnabled();
  expect(screen.getByRole("button", { name: "로그인" })).toBeEnabled();
});
