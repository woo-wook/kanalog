import { expect, test } from "@playwright/test";

test("실제 MAX 음성은 디코딩·재생되고 수동 컨트롤과 범위 요청을 지원한다", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("이메일").fill(process.env.E2E_EMAIL!);
  await page.getByLabel("비밀번호").fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  const decks = await (await page.request.get("/api/decks")).json();
  const vocabulary = decks.find(
    (d: { kind: string; level: string }) =>
      d.kind === "vocabulary" && d.level === "N5",
  );
  expect(vocabulary).toBeTruthy();
  await page.goto(`/study?deckId=${vocabulary.id}`);
  const media = page.waitForResponse(
    (r) => r.url().includes("/api/media/") && [200, 206].includes(r.status()),
  );
  await page.getByRole("button", { name: "기본 음성 듣기" }).click();
  const response = await media;
  const player = page.locator("audio[controls]");
  await expect(player).toBeVisible();
  await expect
    .poll(() => player.evaluate((a: HTMLAudioElement) => a.currentTime))
    .toBeGreaterThan(0);
  const signal = await page.evaluate(async (url) => {
    const result = await fetch(url);
    const bytes = await result.arrayBuffer();
    const size = bytes.byteLength;
    const context = new AudioContext();
    const decoded = await context.decodeAudioData(bytes);
    const samples = decoded.getChannelData(0);
    let energy = 0;
    for (const sample of samples) energy += sample * sample;
    await context.close();
    return {
      size,
      duration: decoded.duration,
      rms: Math.sqrt(energy / samples.length),
    };
  }, response.url());
  expect(signal.size).toBeGreaterThan(128);
  expect(signal.duration).toBeGreaterThan(0);
  expect(signal.rms).toBeGreaterThan(0.001);
  const range = await page.request.get(response.url(), {
    headers: { Range: "bytes=0-127" },
  });
  expect(range.status()).toBe(206);
  expect(range.headers()["content-length"]).toBe("128");
  expect((await range.body()).byteLength).toBe(128);
  await page.getByRole("button", { name: "로그아웃" }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.request.get(response.url())).status()).toBe(401);
});
