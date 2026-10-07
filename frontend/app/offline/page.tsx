import Link from "next/link";
export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-5 py-12">
      <section
        className="surface w-full p-6 text-center sm:p-8"
        aria-labelledby="offline-title"
      >
        <p className="text-xs font-semibold text-primary">연결 상태</p>
        <h1
          id="offline-title"
          className="mt-3 text-2xl font-semibold tracking-tight"
        >
          인터넷 연결이 필요합니다
        </h1>
        <p className="muted mt-3 text-sm leading-relaxed">
          학습 기록은 서버에 저장됩니다. 연결을 확인한 뒤 다시 시도해 주세요.
        </p>
        <Link className="btn btn-primary mt-8" href="/">
          다시 시도
        </Link>
      </section>
    </main>
  );
}
