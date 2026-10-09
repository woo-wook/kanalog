// @vitest-environment node
import { mkdtemp, writeFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { readAndroidDownload, downloadResponse } from "./app-download-files";

let root: string;
const artifact = {
  file: `kanalog-android-${"a".repeat(12)}.apk`,
  version: "1.0.0",
  bytes: 10,
  sha256: "a".repeat(64),
  builtAt: "2026-10-09T00:00:00Z",
};
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "kanalog-download-"));
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});
async function publish(value: unknown = artifact) {
  await writeFile(
    join(root, "manifest.json"),
    JSON.stringify({ schemaVersion: 1, android: value }),
  );
  await writeFile(join(root, artifact.file), "0123456789");
}
it("실제 파일이 없거나 manifest가 유효하지 않으면 다운로드를 제공하지 않는다", async () => {
  expect(await readAndroidDownload(root)).toBeNull();
  await publish({ ...artifact, file: "../private-data/personal.apk" });
  expect(await readAndroidDownload(root)).toBeNull();
  await publish({ ...artifact, bytes: 999 });
  expect(await readAndroidDownload(root)).toBeNull();
  await publish();
  expect(await readAndroidDownload(root)).toEqual(artifact);
});
it("manifest 밖의 파일과 심볼릭 링크는 공개하지 않는다", async () => {
  await publish();
  expect(
    (
      await downloadResponse(
        new Request("https://example.com"),
        "personal.apk",
        root,
      )
    ).status,
  ).toBe(404);
  await rm(join(root, artifact.file));
  await symlink(join(root, "manifest.json"), join(root, artifact.file));
  expect(await readAndroidDownload(root)).toBeNull();
});
it("비인증 APK 다운로드·HEAD·이어받기와 잘못된 Range를 처리한다", async () => {
  await publish();
  const response = await downloadResponse(
    new Request("https://example.com"),
    artifact.file,
    root,
  );
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe(
    "application/vnd.android.package-archive",
  );
  expect(response.headers.get("content-disposition")).toContain("attachment");
  expect(await response.text()).toBe("0123456789");
  const head = await downloadResponse(
    new Request("https://example.com", { method: "HEAD" }),
    artifact.file,
    root,
  );
  expect(head.headers.get("content-length")).toBe("10");
  expect(await head.text()).toBe("");
  for (const [range, expected, status] of [
    ["bytes=2-4", "234", 206],
    ["bytes=-3", "789", 206],
    ["bytes=10-", "", 416],
    ["bytes=0-1,3-4", "", 416],
  ] as const) {
    const partial = await downloadResponse(
      new Request("https://example.com", { headers: { Range: range } }),
      artifact.file,
      root,
    );
    expect(partial.status).toBe(status);
    expect(await partial.text()).toBe(expected);
  }
});
