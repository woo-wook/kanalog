import { expect, test } from "@playwright/test";

test("Supertonic 3는 실제 브라우저에서 일본어 WAV를 생성하고 재생한다", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.goto("/login");
  await page.getByLabel("이메일").fill(process.env.E2E_EMAIL!);
  await page.getByLabel("비밀번호").fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/settings");
  const engine = page.getByLabel("음성 엔진", { exact: true });
  await expect(engine).toHaveValue("SUPERTONIC");
  await page
    .getByRole("button", { name: "음성 미리 듣기", exact: true })
    .click();
  const player = page.getByLabel("미리 듣기 오디오");
  await expect(player).toBeVisible({ timeout: 150_000 });
  await expect
    .poll(() => player.evaluate((a: HTMLAudioElement) => a.currentTime))
    .toBeGreaterThan(0);
  const signal = await player.evaluate(async (a: HTMLAudioElement) => {
    const bytes = await (await fetch(a.src)).arrayBuffer();
    const context = new AudioContext();
    const decoded = await context.decodeAudioData(bytes);
    const samples = decoded.getChannelData(0);
    const rms = Math.sqrt(
      samples.reduce((sum, v) => sum + v * v, 0) / samples.length,
    );
    await context.close();
    return { rms, seconds: decoded.duration, bytes: bytes.byteLength };
  });
  expect(signal.rms).toBeGreaterThan(0.001);
  expect(signal.seconds).toBeGreaterThan(0.1);
  expect(signal.bytes).toBeGreaterThan(1000);
  await page
    .getByRole("button", { name: "음성 미리 듣기", exact: true })
    .click();
  await page.getByRole("link", { name: "코스", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "학습 코스" })).toBeVisible();
  await expect(page.locator("audio")).toHaveCount(0);
});
