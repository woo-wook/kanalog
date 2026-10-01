import Link from "next/link";
export default function OfflinePage() {
  return (
    <main className="mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="text-2xl font-bold">인터넷 연결이 필요합니다</h1>
      <p className="muted mt-3">
        학습 기록은 서버에 저장됩니다. 연결을 확인한 뒤 다시 시도해 주세요.
      </p>
      <Link className="btn btn-primary mt-8" href="/">
        다시 시도
      </Link>
    </main>
  );
}
