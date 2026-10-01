import { afterEach, expect, it, vi } from "vitest";
import { api, me, json, setCsrfToken } from "./api";
afterEach(() => {
  vi.unstubAllGlobals();
  setCsrfToken(undefined);
});
it("sends the server CSRF token and cookie credentials on writes", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: "user-id",
          email: "learner@example.com",
          csrfToken: "server-token",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ dailyNewLimit: 5 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  vi.stubGlobal("fetch", fetchMock);
  await me();
  await api("/settings", json("PATCH", { dailyNewLimit: 5 }));
  const [path, options] = fetchMock.mock.calls[1]!;
  expect(path).toBe("/api/settings");
  expect(options.credentials).toBe("include");
  expect(options.headers["X-CSRF-Token"]).toBe("server-token");
});
