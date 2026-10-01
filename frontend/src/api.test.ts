import { afterEach, expect, it, vi } from "vitest";
import { api, me, json, setCsrfToken, apiSpeech } from "./api";
afterEach(() => {
  vi.unstubAllGlobals();
  setCsrfToken(undefined);
});
it("서버 음성은 로그인 쿠키와 CSRF 토큰으로 요청하고 개인 음성을 캐시하지 않는다", async () => {
  setCsrfToken("csrf");
  const fetcher = vi.fn().mockResolvedValue(
    new Response(new Uint8Array([1, 2]), {
      headers: { "Content-Type": "audio/wav" },
    }),
  );
  vi.stubGlobal("fetch", fetcher);
  const controller = new AbortController();
  const result = await apiSpeech("ア", "F1", controller.signal);
  expect(result.type).toBe("audio/wav");
  const [path, request] = fetcher.mock.calls[0]!;
  expect(path).toBe("/api/speech");
  expect(request.credentials).toBe("include");
  expect(request.cache).toBe("no-store");
  expect(request.headers["X-CSRF-Token"]).toBe("csrf");
  expect(request.signal).toBe(controller.signal);
  expect(JSON.parse(request.body)).toEqual({ text: "ア", voice: "F1" });
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
