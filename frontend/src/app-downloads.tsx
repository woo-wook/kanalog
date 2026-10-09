import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Check,
  Download,
  Monitor,
  Smartphone,
} from "lucide-react";
import { appConfig } from "./app-config";

export interface AndroidDownload {
  file: string;
  version: string;
  bytes: number;
  sha256: string;
  builtAt: string;
}

export function AppDownloadsPage({
  android,
}: {
  android: AndroidDownload | null;
}) {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-5 pb-12 pt-6 sm:px-8 sm:pt-8">
      <header className="flex items-center justify-between gap-4">
        <Link
          href="/download"
          className="flex min-h-12 items-center gap-3 font-semibold"
        >
          <span className="grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <BookOpen className="size-5" aria-hidden="true" />
          </span>
          {appConfig.name}
        </Link>
        <Link href="/login" className="btn text-sm">
          웹 로그인 <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </header>
      <section className="pb-9 pt-12 sm:pb-12 sm:pt-16">
        <span className="rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
          언제 어디서든, 한 글자부터
        </span>
        <h1 className="mt-6 text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
          나에게 맞는 학습 방법
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          휴대폰에서는 앱으로, 컴퓨터에서는 웹으로.
          <br />
          가나부터 차근차근 일본어를 익혀 보세요.
        </p>
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        <section
          aria-labelledby="android-title"
          className="surface flex flex-col p-6 sm:p-8"
        >
          <div className="mb-5 flex items-center justify-between gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Smartphone aria-hidden="true" />
            </span>
            <span className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
              Android
            </span>
          </div>
          <h2
            id="android-title"
            className="text-2xl font-semibold tracking-tight"
          >
            내 손안의 일본어 연습
          </h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            로그인 없이 기기에 학습 기록을 저장해요. 인터넷 연결 없이도 가나를
            연습할 수 있어요.
          </p>
          <ul className="my-6 space-y-3 text-sm">
            {[
              "히라가나·가타카나 208자 포함",
              "섞어서 연습하고, 어려운 글자는 다시 복습",
              "단어·문법은 개인 자료를 가져와서 추가",
            ].map((label) => (
              <li key={label} className="flex items-start gap-2">
                <Check
                  className="mt-0.5 size-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                {label}
              </li>
            ))}
          </ul>
          {android ? (
            <>
              <a
                href={`/downloads/${android.file}`}
                download
                className="btn btn-primary mt-auto w-full"
              >
                <Download className="size-5" aria-hidden="true" />
                Android 앱 다운로드
              </a>
              <p className="mt-3 text-center text-xs leading-relaxed text-muted-foreground">
                v{android.version} · {(android.bytes / 1024 / 1024).toFixed(1)}{" "}
                MB · Android 8.0 이상 · 개발 버전
              </p>
              <details className="mt-5 border-t border-border pt-4 text-sm">
                <summary className="cursor-pointer font-medium">
                  설치 방법과 파일 정보
                </summary>
                <ol className="mt-3 list-inside list-decimal space-y-2 leading-relaxed text-muted-foreground">
                  <li>APK 파일을 내려받고 열어 주세요.</li>
                  <li>
                    설치 화면에서 요청하면 이 브라우저의 앱 설치를 허용해
                    주세요.
                  </li>
                  <li>설치한 앱에서 바로 가나 연습을 시작하세요.</li>
                </ol>
                <p className="mt-4 text-xs font-medium">SHA-256</p>
                <code className="mt-1 block break-all text-xs leading-relaxed text-muted-foreground">
                  {android.sha256}
                </code>
              </details>
            </>
          ) : (
            <p
              role="status"
              className="mt-auto rounded-2xl bg-secondary p-4 text-center text-sm text-muted-foreground"
            >
              파일 준비 중
            </p>
          )}
        </section>
        <section
          aria-labelledby="ios-title"
          className="surface flex flex-col p-6 sm:p-8"
        >
          <div className="mb-5 flex items-center justify-between gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-secondary text-foreground">
              <Smartphone aria-hidden="true" />
            </span>
            <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground">
              iPhone · iPad
            </span>
          </div>
          <h2 id="ios-title" className="text-2xl font-semibold tracking-tight">
            iOS 앱
          </h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            네이티브 앱의 설치 배포를 준비하고 있어요. 지금은 Safari에서 웹으로
            학습할 수 있어요.
          </p>
          <div className="my-6 rounded-2xl bg-secondary p-5">
            <p className="font-semibold">배포 준비 중</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              설치 링크가 준비되면 이 페이지에 추가됩니다.
            </p>
          </div>
          <div className="mt-auto border-t border-border pt-5 text-sm leading-relaxed text-muted-foreground">
            <p className="font-semibold text-foreground">
              홈 화면에서도 바로 열기
            </p>
            <p className="mt-2">
              Safari에서 웹 학습에 로그인한 뒤, 공유 메뉴의 ‘홈 화면에 추가’를
              선택하세요.
            </p>
          </div>
        </section>
      </div>
      <section
        className="surface mt-4 flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8"
        aria-labelledby="web-title"
      >
        <div className="flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-secondary">
            <Monitor aria-hidden="true" />
          </span>
          <div>
            <h2 id="web-title" className="text-xl font-semibold">
              설치 없이 웹으로
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              웹 계정에 로그인해서 저장된 단어·문법과 학습을 이어가세요.
              <br />
              앱의 기기 기록과 웹 계정의 기록은 각각 저장됩니다.
            </p>
          </div>
        </div>
        <Link href="/login" className="btn shrink-0">
          웹으로 학습하기 <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </section>
    </main>
  );
}
