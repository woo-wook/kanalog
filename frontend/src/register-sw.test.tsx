import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { RegisterSw } from "./register-sw";
import config from "../next.config";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("PWA를 다시 열면 HTTP 캐시 없이 서비스워커의 최신 코드를 확인한다", async () => {
  const update = vi.fn().mockResolvedValue(undefined);
  const register = vi.fn().mockResolvedValue({ update });
  vi.stubGlobal("navigator", { serviceWorker: { register } });
  render(<RegisterSw />);
  await waitFor(() =>
    expect(register).toHaveBeenCalledWith("/sw.js", { updateViaCache: "none" }),
  );
  await waitFor(() => expect(update).toHaveBeenCalledOnce());
  const headers = await config.headers!();
  expect(
    headers.find((item) => item.source === "/sw.js")?.headers,
  ).toContainEqual({
    key: "Cache-Control",
    value: "no-cache, no-store, must-revalidate",
  });
});
