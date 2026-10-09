import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { AppDownloadsPage } from "./app-downloads";

afterEach(cleanup);

it("공개 다운로드는 실제 Android 파일만 연결하고 iOS 준비 상태와 웹 경로를 보여준다", () => {
  render(
    <AppDownloadsPage
      android={{
        file: "kanalog-android-aaaaaaaaaaaa.apk",
        version: "1.0.0",
        bytes: 42 * 1024 * 1024,
        sha256: "a".repeat(64),
        builtAt: "2026-10-09T00:00:00Z",
      }}
    />,
  );
  expect(
    screen.getByRole("heading", { name: "나에게 맞는 학습 방법" }),
  ).toBeTruthy();
  const apk = screen.getByRole("link", { name: /Android 앱 다운로드/ });
  expect(apk.getAttribute("href")).toBe(
    "/downloads/kanalog-android-aaaaaaaaaaaa.apk",
  );
  expect(apk.hasAttribute("download")).toBe(true);
  expect(screen.getByText(/42.0 MB/)).toBeTruthy();
  expect(screen.getByText(/1.0.0/)).toBeTruthy();
  expect(screen.getByText("배포 준비 중")).toBeTruthy();
  expect(screen.queryByRole("link", { name: /iOS 앱 다운로드/ })).toBeNull();
  expect(
    screen.getByRole("link", { name: "웹으로 학습하기" }).getAttribute("href"),
  ).toBe("/login");
});

it("APK가 없는 배포에서는 깨진 다운로드 링크를 노출하지 않는다", () => {
  render(<AppDownloadsPage android={null} />);
  expect(
    screen.queryByRole("link", { name: /Android 앱 다운로드/ }),
  ).toBeNull();
  expect(screen.getByText("파일 준비 중")).toBeTruthy();
});
