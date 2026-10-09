import type { Metadata } from "next";
import { AppDownloadsPage } from "@/app-downloads";
import { readAndroidDownload } from "@/app-download-files";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "앱 다운로드",
  description: "Android 앱 다운로드와 iPhone·iPad 웹 학습 안내",
};

export default async function DownloadPage() {
  return <AppDownloadsPage android={await readAndroidDownload()} />;
}
