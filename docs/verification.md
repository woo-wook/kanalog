# 검증 기록

## 동사 활용 전수 검수 (2026-10-08 후속)

### 전수 검사와 수정

- 실제 MAX 2.1.2 동사 **3,361개**의 Kotlin 생성 결과를 독립 Python 규칙표/원본 GUID manifest와 대조했다. 수정 전 **70,546형태·53오류/48노트**에서 수정 후 **70,399형태·0오류**, 누락/미생성 0으로 바뀌었다. 원본 분류 충돌·예외·비의지 기본 뜻·잘못된 가능형·한글 모라 경계를 수정했다. 상세 기준과 교차 사전의 표기 차이/문맥 검수 한계는 [전수 검수 결과](verb-conjugation-review.md)에 기록했다.
- 공통 golden **49개**, 모든 플랫폼에서 같은 정책을 사용한다. Gradle 테스트의 입력에 fixture를 명시해 변경된 예제를 이전 결과로 잘못 처리하지 않도록 했다. Kotlin 실제 결과를 내보내는 DB 없는 CLI와 별도 Python 검수 도구를 추가했다. 원문·개별 보고서·비교 사전 캐시는 개인 디렉터리에만 저장한다.

### 로컬 검증

- BE `ktlintFormat` 다음 별도 `check bootJar`: **77개 통과**, 실패/오류/skip 0; ktlint 통과. 처음 두 태스크를 한 번에 실행할 때 check가 포맷 전 파일을 읽는 실패가 있었고 순서대로 재실행해 통과했다.
- FE TypeScript·ESLint·변경 파일 Prettier·production Docker 빌드 통과, Vitest **88개 통과**. 서버가 제한한 형태/현대형 안내·후리가나·한글·가나 TTS callback을 추가 확인했다.
- Python 독립 규칙/manifest 검수 **5개 통과**. 실제 전체 결과도 0오류로 재실행했다.
- Android 코어 **30개 통과**, 개인 콘텐츠 전수 검사·ktlint·개인 APK 및 테스트 APK 빌드 통과. API 36 ARM64 실제 에뮬레이터 UI **6개 통과**. 개인 APK 재설치 전/UI 후/최종 재설치 후 profile 파일 해시가 동일하다. 공통 Kotlin 원본과 Android 재사용 파일이 일치한다.
- Swift **37개 통과**(실제 개인 패키지 검사 포함). 별도 공개 fixture 실행은 36개 통과/개인 패키지 1개 skip이다. SwiftUI/UI 테스트 소스 parse 통과. iOS의 실제 앱 빌드/화면 결과는 아래 CI와 구분한다.

### 웹 배포와 데이터 보존

서명 커밋 `164d2fd`를 main과 작업 브랜치에 푸시했다. 기존 `infra-postgres`를 재시작하지 않고 backend/frontend만 production 빌드·재배포했다. 개인 DB dump를 백업하고 archive 목차를 읽어 유효성을 확인했다. QA 쓰기 전에 DB **24개 테이블의 행 수와 전체 행 해시가 배포 전후 동일**했다. 공개 HTTPS·Secure 쿠키·backend readiness도 통과했다. 원본 콘텐츠·미디어·FSRS·ReviewLog와 네이티브 개인 패키지는 유지한다.

공개 HTTPS 실제 브라우저 첫 회귀는 11개 중 9개 통과/2개 실패였다. 390px 가나 검사에서 로그인 HTTP 200 후 홈 화면 대기 시간 초과가 발생했고, 새 예외 검사에서는 QA 계정에 가져오지 않은 N4 단어를 찾던 입력 오류가 있었다. API mock이나 성공 처리 없이 로그인은 동일 검사로 재실행하고, 실제 설치된 N5 여섯 예외/발음 항목으로 화면 검사를 한정했다. N4~N1 전체는 별도 3,361개 오프라인 전수 검사와 49개 공통 fixture로 검증했다.

재실행 **2개 모두 통과**: 동일 390px 로그인/가나 검사, 실제 MAX N5 여섯 항목(`くれる・ある・いる・できる・分かる・思う`)의 고정 기대 형태 수/제외 키/가나·한글 보조/반응형 패널. 첫 9개와 합쳐 **11개 항목이 최종 통과**했다. 개인 단어 생성·재접속·학습 정답 전/후, 360/390px 가나·긴 예문·평가 버튼, 긴 문법/あの 강조, 단어장 북마크·제외·검색, 실제 원본 음성 200/206·디코딩·재생, MAX 5단/する/来る의 전체 형태/어미 강조, Supertonic 가나 요청·WAV·비무음·재생을 포함한다. QA 설정은 finally로 복원했다. 최신 390px 활용 패널 캡처도 직접 확인했다. 실제 iPhone Safari/PWA 실기기 청취 품질은 검증하지 않았다.

서명 기능 커밋 `164d2fd`의 [Native CI](https://github.com/woo-wook/kanalog/actions/runs/37789128832)에서 **Android·iOS 둘 다 통과**했다. Android 공개 코어/ktlint/APK/instrumentation 소스 빌드와 Xcode 26.6 Swift 코어/앱 빌드/iOS 시뮬레이터 UI·진도 저장·레이아웃 suite를 포함한다. 공개 CI는 가나와 합성 fixture만 사용한다. 로컬 실제 MAX 패키지 검사는 별도로 수행했다. 실제 iPhone/Android 기기의 청취 품질, 배포 서명 IPA·스토어 제출은 미실행이다. 같은 기능 코드 위에 N5 브라우저 회귀/검수 기록만 추가한 서명 커밋 `22b0135`도 두 브랜치에 푸시했다.

```sh
JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home backend/gradlew -p backend ktlintFormat
JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home backend/gradlew -p backend check bootJar
(cd frontend && pnpm exec tsc --noEmit && pnpm lint && pnpm test)
python3 -m unittest discover -s tools/verb-audit -p 'test_*.py'
native/android/gradlew -p native/android -PverifyPrivateContent=true :core:test ktlintCheck
native/android/gradlew -p native/android -PincludePrivateContent=true :app:assembleDebug :app:assembleDebugAndroidTest
native/android/gradlew -p native/android :app:connectedDebugAndroidTest
NATIVE_PACKAGE_PATH="$PWD/private-data/native/ios" swift test --package-path native/ios
# 전수 export/검수: tools/verb-audit/README.md
# 배포: DB/voice를 재생성하지 않는다.
docker compose build backend frontend
docker compose up -d --no-deps --wait --wait-timeout 90 backend frontend
python3 tools/e2e/check_deployment.py
E2E_BASE_URL=https://kanalog.hanwook.me python3 tools/e2e/run_live.py e2e/verb-conjugation.spec.ts e2e/mobile-study.spec.ts e2e/grammar-layout.spec.ts e2e/notes-layout.spec.ts e2e/audio.spec.ts
```

## 동사 활용·형태별 읽기 (2026-10-08)

### 구현과 데이터 보존

- 웹 단어 상세·정답 확인 후 카드, Android Compose, iOS SwiftUI에 5단·1단·する·くる 활용표를 연결했다. 기본/연결/확장 그룹과 변경 어미 강조, 명시적인 가나, 기존 후리가나·한글 설정을 제공한다. 활용형 TTS는 원형 음성 대신 해당 형태의 확인된 가나를 사용한다.
- 자체 작성한 공통 golden 28개로 5단 9개 어미·음편·行く·ある·問う·명사+する·来る의 모든 읽기·존경 동사·어휘적 サ변과 비동사/읽기 불일치를 비교했다. 사전형에는 변경 어미 강조를 넣지 않는다. 대표 21종의 생성 규칙과 예외는 [동사 활용](verb-conjugation.md)에 있다.
- 개인 MAX 2.1.2 변환본 어휘 9,159개 중 동사 품사 3,361개 모두 생성 확인: 5단 966·1단 490·する 1,902·くる 3. 표의 생성 범위 집계이며 모든 용법의 전문가 검수나 전수 청취 결과는 아니다. 원문/음성/집계 입력은 private-data에만 있다.
- 운영 DB를 개인 dump로 백업했다. backend/frontend만 교체한 후 QA 쓰기 전에 기존 DB public 24개 테이블의 행 수와 전체 행 해시가 모두 동일했다. DB 마이그레이션·재import 없이 기존 콘텐츠·미디어·FSRS·ReviewLog를 유지했다. Android 최신 개인 APK 재설치 전후 기존 profile 파일 해시도 동일했다.

### 로컬 검증

- BE `ktlintFormat check bootJar`: **77개 통과**, 실패/오류 0. 실제 PostgreSQL HTTP에서 개인 단어의 노트/학습 API 활용 계약과 다른 사용자 접근 제한을 포함한다.
- FE TypeScript·ESLint·변경 파일 Prettier·production Docker 빌드 통과. Vitest **87개 통과**. 정답 전 비노출, 전체 그룹/형태, 표시 설정, 실제 읽기를 전달하는 듣기 callback을 RED→GREEN으로 확인했다.
- Android `:core:test` **29개 통과**, 개인 패키지 전수 검사 포함. 전체 ktlint·개인 APK/화면 테스트 APK 빌드 통과. API 36 ARM64 에뮬레이터 UI **6개 통과**: 기존 오프라인 학습/설정과 새 활용 정답 전 숨김, 읽기·한글·후리가나 설정, 가나 TTS callback 및 원형 audioId 미사용을 포함한다.
- Swift 개인 코어 **26개 통과**(공통 golden과 기존 개인 콘텐츠 설치·진도 보존, 일반 import로 강조 데이터 공개 생성자 검사 포함). SwiftUI/테스트 문법 검사·Xcode 프로젝트 생성 통과. 로컬은 Command Line Tools만 있으므로 iOS 앱 빌드/시뮬레이터 UI는 아래 CI 결과와 구분한다.
- Docker backend/frontend 빌드·재배포와 공개 HTTPS/readiness/Secure cookie 검사 통과. 기능 서명 커밋 `4e2ecbb`을 main 및 작업 브랜치에 푸시했다.

### 공개 웹과 iOS 시뮬레이터

공개 HTTPS 서버 기존 회귀 **9개 통과**: 개인 활용표 표시·재접속, 360/390px 가나·긴 예문·평가 버튼, 문법 해설/강조, 단어장 검색/북마크/제외, 실제 원본 음성 디코딩·재생·Range를 포함한다. 확장 WebKit/iPhone 390px 회귀 **2개 통과**: 개인 食べる의 단어장 재접속·실제 학습 정답 전/후·카드 내부 스크롤과 평가 버튼, 실제 MAX 5단/する/来る의 전체 활용·읽기·어미 강조, 선택한 Supertonic 활용형 음성의 가나 요청/200 WAV/디코딩/비무음 RMS/실제 재생 확인. QA 설정은 finally로 복원했다. 캡처는 개인 디렉터리에만 저장하고 모바일·활용 패널을 직접 확인했다.

확장 음성 테스트 첫 실행은 로컬 HTTP 대상의 Secure cookie로 로그인 대기에 실패했고 공개 HTTPS로 바로잡았다. 이후 Chromium의 로컬 Supertonic 실행 경로에서 서버 응답을 기다리던 테스트가 시간 초과했다. API mock 대신 서버 음성 경로를 사용하는 WebKit/iPhone 모드에서 재검증했다. 이 두 실패를 기능 통과로 집계하지 않는다. 실제 Safari/iPhone 기기 청취를 수행한 것으로 표현하지 않는다.

[첫 Native CI](https://github.com/woo-wook/kanalog/actions/runs/37731460156)는 Android가 통과했으나 iOS 새 활용표의 SwiftUI type-check에서 실패했다. 앱이 강조 데이터의 internal 생성자에 접근하는 문제를 일반 import 테스트로 재현한 뒤 public 생성자를 추가하고 typed helper view로 나눴다. 서명 수정 커밋 `6405cc4`의 [재검증 CI](https://github.com/woo-wook/kanalog/actions/runs/37731850736)에서 Xcode 26.6 앱 빌드와 iOS 시뮬레이터 UI·레이아웃 suite 모두 **통과**했다. 새 합성 개인 する 단어의 UUID 검색→상세 활용/します 읽기→N5 학습→정답 전 표 없음→정답 후 표/읽기와 기존 208자 연습·평가·설정 재실행/320px 읽기 레이아웃을 포함한다. UI 단계는 11분 36초 걸렸으며 제한/검증 조건을 제거하거나 실패를 무시하지 않았다. 공개 CI에는 자체 가나와 합성 fixture만 사용했다. 실제 iPhone/Android 기기 청취 품질·스토어 서명/제출은 이번 작업에서 검증하지 않았다.

```sh
JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home backend/gradlew -p backend ktlintFormat check bootJar
(cd frontend && pnpm exec tsc --noEmit && pnpm lint && pnpm test)
# 저장소 루트에서
native/android/gradlew -p native/android -PverifyPrivateContent=true :core:test ktlintCheck
native/android/gradlew -p native/android -PincludePrivateContent=true :app:assembleDebug :app:assembleDebugAndroidTest
NATIVE_PACKAGE_PATH="$PWD/private-data/native/ios" swift test --package-path native/ios
docker compose build backend frontend
docker compose up -d --no-deps --wait --wait-timeout 90 backend frontend
python3 tools/e2e/check_deployment.py
E2E_BASE_URL=https://kanalog.hanwook.me python3 tools/e2e/run_live.py e2e/verb-conjugation.spec.ts e2e/mobile-study.spec.ts e2e/grammar-layout.spec.ts e2e/notes-layout.spec.ts e2e/audio.spec.ts
```

## 네이티브 오프라인·웹 Material 3 (2026-10-06~07)

### 실제 코드와 데이터

- Android: Kotlin 2.3.21/Compose Material 3 1.4.0, API 26 이상, java-fsrs 1.0.0. Gradle wrapper/checksum·lockfile·ktlint 1.8.0 고정. iOS: SwiftUI/iOS 17 이상, iOS 26 Liquid Glass, 공식 swift-fsrs FSRS 6 revision `4fbaf20184d62f82a9f44f343337c61a2c5483e9` 고정. 두 앱 모두 로그인/서버/DB 컨테이너 없이 로컬 학습·평가·콘텐츠·미디어를 사용한다.
- 실제 개인 패키지 `2.1.2+kana-audio1`: 어휘 9,159·문법 1,078·가나 208 = 앱 노트 10,445개. 음성 20,259개(원본 MAX 20,155 + Supertonic 빌드 시 생성한 가나 104). 전체 파일 해시·크기·참조 검사 통과. Git/공개 CI/웹 Docker 이미지에는 포함하지 않았다.
- 가나 전체 혼합, 정답 숨김·원본 문법 강조, 후리가나·선택적 한글, 로컬 음성/기기 일본어 TTS, 개인 단어·검색·메모·북마크·제외, FSRS·즉시 1회 보강·별도 다음날 알림, 7/30일·고유 카드·연속일을 네이티브에 구현했다. 선택적 콘텐츠 installer와 HTTPS 계약은 학습과 분리한다. 웹 진도 동기화 및 공개 catalog는 현재 없다.
- 웹 Material 3 전환: Android와 같은 청록색 역할 색상, surface/outline/state 토큰, 둥근 버튼·선택 칩, 활성 navigation indicator, 최소 48px 주요 터치 영역, PWA 테마를 적용했다. 웹 백엔드/API/기존 사용자 데이터는 변경하지 않았다.

### 실행한 검증

- BE `check bootJar`: **73개 통과**, ktlint 통과. exporter main 추가로 Spring bootJar가 두 진입점을 추론하지 못하는 실제 빌드 실패를 확인한 뒤 AppKt를 명시해 복구했다. 기존 Kotlin/PostgreSQL HTTP/domain 회귀와 네이티브 export/읽기 golden fixture 포함.
- FE Vitest **82개 통과**, TypeScript·ESLint·Docker production build 통과. 역할 토큰 부재 테스트 RED→GREEN, PWA 색상/기존 인증·읽기·학습 회귀 포함.
- Android 코어 **27개 통과**, 실제 10,445노트·20,259미디어 전수 검증 포함. 공식 평가·전체 상태 재로딩, 키 재전송/충돌·version·일일 한도·자정·다시 보강, 업데이트/원본 owner/빠진 ID 진도 보존, path/hash/schema 손상, 읽기 golden 14+9, 7/30 경계·DST·미래 제외·전체 레벨 복습 count 검증. 신규 토글/통계/복습 회귀는 RED→GREEN 확인.
- Android private APK 및 instrumentation APK 빌드·ktlint 통과. API 36 ARM64 에뮬레이터 UI **4개 통과**: 정답 전 문법 해설 숨김, 힌트 꺼짐, 설정 레이블 토글과 재열기, 복습 checkbox 행 터치. 에뮬레이터 Wi-Fi/data를 끄고 실제 개인 패키지에서 208자 선택→‘다시’ 후 209장으로 한 번 보강→네이티브 음성 이벤트→재시작 시 평가·한글 설정 유지→MAX N5 단어·문법→저장된 전체 FSRS/다음날 알림→실제 기록 화면의 7일 통계 확인. 저장 완료를 기다린 뒤 DB 역할의 로컬 profile을 읽어 평가 4개 증가를 확인했다. 대형 디버그 APK는 약 767MB이며 공개 배포하지 않았다.
- Swift 코어 **23개 모두 통과**, private 전수 설치·N5 단어/문법 평가·재시작·재가져오기 진도 유지 포함(개인 테스트 약 47초). 일반 공개 suite는 22통과+개인 옵션 1skip이다. 원자적 저장 실패, 여러 파일 저장소 경쟁, 세션·평가·전체 FSRS·오답 due와 알림 분리·읽기·owner·손상 입력, 통계 자정/DST/미래 제외 검증 포함. iOS 프로젝트 생성과 SwiftUI 문법 검사도 별도 실행했다.
- Python 패키지 도구 **2개 통과**, 최종 private manifest 검사 통과. 다운로드/서버 구동 없이 기존 offline 변환 결과를 사용했고, 가나 음성 생성용 임시 8091 계산 프로세스는 생성 완료 후 종료했다.
- 공개 주소 `https://kanalog.hanwook.me`에 frontend만 교체했다. backend/voice/공유 PostgreSQL과 볼륨은 유지했고 readiness·HTTPS·Secure cookie 검사 통과.
- 공개 서버 실제 브라우저 회귀 **12개 종류 통과**: Material 360/390/768/1280px의 홈·코스·단어장·설정·통계와 활성 탐색/가로 넘침/48px, 긴 문법과 원본 강조 2종, 가나 참고표 104쌍, 작은 화면 학습 4종, 원본 음성 200/206·디코딩·재생, 단어장 모바일/PC·북마크·제외·검색, 개인 단어 편집·재접속. QA 계정으로 실행하며 본문·캡처는 private-data에 보관했다. 첫 Material 캡처에 로딩 화면이 포함되어 데이터 로딩 완료 대기를 추가했다. Next route announcer의 빈 alert를 API 오류로 취급한 테스트는 실제 `.surface[role=alert]` 오류만 검사하도록 수정한 뒤 통과했다.

### 플랫폼과 제한

로컬 Mac은 Apple Silicon, JDK 21, Android API 36 ARM 에뮬레이터, Command Line Tools Swift 6.1.2다. 전체 Xcode는 로컬에 없으므로 iOS 앱 빌드는 GitHub macOS Xcode 26.6에서 별도로 수행한다. 개인 자료를 CI에 보내지 않으며 CI 앱에는 자체 가나만 들어간다. iOS 앱 컴파일은 통과했다. 화면 테스트에서는 스위치 레이블 중앙 탭, 스크롤 영역, SwiftUI Form의 같은 식별자를 가진 접근성 요소가 여러 개 발견되는 문제를 실제 실패로 확인하고 보완했다. 저장 버튼/확인 문구는 정확한 label과 식별자로 좁혀 단일 접근성 요소를 조회한다. [최종 Native CI 실행](https://github.com/woo-wook/kanalog/actions/runs/37552932050), 소스 커밋 `2bf03e8`, **Android/iOS 모두 통과**. iOS 26.6 시뮬레이터에서 208자 선택→정답 보기→평가→다음 카드→한글 설정 변경·저장→앱 재실행 후 설정 유지와 320px 읽기 레이아웃 테스트가 통과했고, 공개 가나 simulator 앱 아티팩트를 생성했다. 테스트에서 검증 조건을 제거하거나 실패를 무시하지 않았다.

실제 iPhone/Android 기기 청취 품질, App Store/Play Store 제출·서명 IPA, 설치 PWA 실기기 검증은 수행하지 않았다. 일본어 기기 TTS 음성 미설치 때는 안내를 제공한다. 서버에서 콘텐츠/진도를 자동 동기화하는 기능을 구현했다고 표현하지 않는다.

```sh
export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
backend/gradlew -p backend check bootJar
native/android/gradlew -p native/android -PverifyPrivateContent=true :core:test ktlintCheck
native/android/gradlew -p native/android -PincludePrivateContent=true :app:assembleDebug :app:assembleDebugAndroidTest
python3 tools/native-content/android_offline_e2e.py
NATIVE_PACKAGE_PATH="$PWD/private-data/native/ios" swift test --package-path native/ios
native/ios/scripts/build-ios.sh --private --project-only
python3 tools/native-content/verify_pack.py private-data/native/android
python3 -m unittest discover -s tools/native-content -p 'test_*.py'
E2E_BASE_URL=https://kanalog.hanwook.me python3 tools/e2e/run_live.py e2e/material-layout.spec.ts e2e/mobile-study.spec.ts e2e/grammar-layout.spec.ts e2e/kana-reference.spec.ts
E2E_BASE_URL=https://kanalog.hanwook.me python3 tools/e2e/run_live.py e2e/notes-layout.spec.ts e2e/notes-desktop.spec.ts e2e/audio.spec.ts
```


## ktlint 적용 (2026-10-04)

- ktlint-gradle **14.2.0**/ktlint **1.8.0**을 version catalog에 고정했다. ktlint 구성의 도구 의존성은 `backend/gradle.lockfile`로 잠근다. 공식 tag의 MIT LICENSE와 Gradle 9 지원 이력을 확인했다.
- `backend/.editorconfig`에 `ktlint_official`, 4칸 공백, UTF-8/LF와 마지막 줄바꿈을 설정했다. Kotlin main/test 전체와 Gradle Kotlin DSL에 `ktlintFormat`을 적용했다. wildcard import는 명시적 import로 바꾸고 긴 조건문/fixture 문자열을 동일한 값으로 나눴다. baseline, 실패 무시, 규칙 비활성화는 없다.
- `ktlintCheck check bootJar` 성공. **49개 테스트, 실패·오류 0**으로 기존 domain/API/PostgreSQL 회귀를 확인했다. `check --dry-run`으로 check의 ktlint 작업 의존성을 확인한 뒤 `check bootJar` 단독 실행도 성공했다.
- Docker 빌드 문맥에 편집 규칙과 lockfile을 포함하고 backend production 이미지 빌드도 통과했다. Kotlin 포맷과 개발 도구 설정 변경이며 DB migration/재import/운영 데이터 쓰기는 수행하지 않았다.

```sh
JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home backend/gradlew -p backend ktlintFormat --no-daemon
JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home backend/gradlew -p backend ktlintCheck check bootJar --no-daemon
# ktlint 도구의 고정 버전을 바꿀 때만 lock 갱신
JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home backend/gradlew -p backend ktlintCheck --write-locks --no-daemon
```

## 백엔드 DDD 패키지·책임 분리 (2026-10-03)

- 기존 Kotlin/PostgreSQL 기준선 **32개**를 먼저 통과시킨 뒤 기능별 계층 분리, 저장소·외부 연동 포트 추출, 도메인 정책 분리마다 전체 테스트를 실행했다. 최종 **49개**(기존 32 + 계층 5 + 정책 8 + 실제 HTTP 4), 실패/오류 0. JDK 21의 `test bootJar`와 Docker production `bootJar` 빌드가 통과했다. 새 의존성과 DB migration은 없다.
- `LayerDependencyTest`는 domain의 application/infra/presentation·기술 의존, application의 SQL/파일/HTTP/FSRS SDK 의존, presentation의 저장소·외부 구현 의존, infra의 presentation 의존과 트랜잭션 배치를 검사한다. JPA 도메인 매핑은 허용하고 루트 실행 진입점도 검사한다.
- 정책 테스트는 version/due 경계, 개인 단어의 필수 내용, 문법 강조와 제목/앞면 일치, 가나 순서와 104자씩의 목록, 원본 순서·단계 key·어휘 20/문법 5의 코스 편성, 연속 학습일, Byte Range, 음성 옵션, 고정 MAX 버전을 검증한다.
- HTTP 테스트는 독립 PostgreSQL 16 Testcontainers와 실제 랜덤 포트 서버를 사용한다. 로그인/HttpOnly 쿠키/CSRF/Origin/로그아웃, settings와 validation 오류 계약, 다른 계정의 note/session/import/media 접근 거부, 복습 재전송·payload 충돌·stale 409, Range 206/416과 경로 이탈 거부를 확인했다. 복습 로그 insert를 테스트 DB trigger로 실패시켜 먼저 수행한 카드 갱신과 최초 학습 시각이 롤백되고, 같은 idempotency key로 다시 성공함을 확인했다. 운영 DB에는 trigger를 만들지 않았다.
- 운영 Kanalog DB dump를 개인 디렉터리에 권한 0600으로 저장했다. backend만 교체한 직후, 브라우저 테스트가 쓰기 작업을 하기 전 **22개 public 테이블의 행 개수·전체 행 해시가 모두 일치**했다. 카드·노트·미디어·코스·레슨·FSRS 상태·복습 로그·설정·인증 기록과 Flyway 이력을 포함한다. 콘텐츠 재import 없이 기존 media volume과 공유 infra-postgres를 유지했다. frontend와 voice는 재시작하지 않았다.
- `https://kanalog.hanwook.me`의 HTTPS/Secure 쿠키 설정과 backend healthy·readiness UP을 확인했다. 공개 서버 QA 브라우저 회귀 **13종**을 확인했다. 첫 실행은 12개 통과, 로그아웃 케이스는 로그인 후 홈 제목 대기에서 60초 시간 초과로 실패했다. 코드 변경 없이 해당 케이스를 단독 재실행해 7.5초에 통과했다. 원본 MAX 음성 디코딩·재생/200·206/로그아웃 후 401, N5 평가·통계, 가타카나와 섞기 평가·재로그인, 설정 유지, 360/390px 화면, 문법 강조·긴 해설·카드 스크롤, 단어장 검색·북마크·제외, 실제 문법/어휘/개인 단어 합성과 자동재생을 검증했다. 응답이나 오디오를 mock하지 않았고 쓰기 작업은 QA 계정으로만 수행했다. 실제 iPhone/설치 PWA 및 다른 CPU 플랫폼 검증은 이번 구조 변경에서 수행하지 않았다.

```sh
JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home backend/gradlew -p backend test bootJar --no-daemon
docker compose build backend
docker compose up -d --no-deps --wait --wait-timeout 60 backend
python3 tools/e2e/check_deployment.py
E2E_BASE_URL=https://kanalog.hanwook.me python3 tools/e2e/run_live.py e2e/learning.spec.ts e2e/audio.spec.ts e2e/notes-speech.spec.ts e2e/notes-layout.spec.ts e2e/grammar-layout.spec.ts e2e/courses.spec.ts e2e/kana-rating-priority.spec.ts
E2E_BASE_URL=https://kanalog.hanwook.me python3 tools/e2e/run_live.py e2e/learning.spec.ts -g '로그아웃하면'
```

## 문법·단어장 TTS 확장 (2026-10-02)

- 문법 학습의 일본어 앞면/예문을 음성 대상으로 추가했다. 단어장 상세에서는 단어 읽기·가나 글자·문법 예문·단어 예문을 각각 듣는다. 한국어 질문·해설·메모는 합성하지 않으며 선택한 엔진·목소리·속도를 유지한다. 기존 원본 단어 음성도 별도 버튼으로 재생한다. 전체 변환본의 어휘 9,159개·문법 1,078개를 조사했으며 단어 읽기는 최대 12자, 문법 예문은 최대 49자로 서버 500자 제한 안에 있다. 모든 항목을 개별 청취했다는 뜻은 아니다.
- Vitest **71개**, TypeScript·ESLint·Next.js Docker production build 통과. 일본어 선택·한국어 제외·정답 전 허용, Safari 재생 차단 후 같은 파일 재생, 항목 전환/상세 접기/분류 이동/화면 이탈 중지, 취소한 요청의 늦은 결과 무시, 합성 실패 후 재시도, 원본 엔진과 일본어 기기 목소리 선택을 검증했다.
- 공개 도메인에서 iPhone UA WebKit **음성 2개 케이스** 통과. 실제 MAX 문법 예문·단어 읽기·단어 예문과 개인 단어 읽기·예문의 WAV 생성/디코딩/비무음/RMS/재생 시간 증가, 원본 media 200/206, 목소리·0.8배 속도, 상세 접기/분류 변경 중지, 모델/worker 다운로드 없음, 듣기만으로 ReviewLog 집계가 바뀌지 않음을 확인했다. 문법 자동재생의 요청 본문은 실제 앞면과 일치했고 정답 공개 때 음성 재요청 없이 같은 파일을 유지했다. 응답을 mock하지 않았다.
- 추가 **화면 회귀 10개 케이스** 통과: WebKit 360×640·390×740·390×844, Chromium 768×1024·1280×900의 문법/단어장/가나 화면, 원본 강조, 상세 섹션, 개인 단어 저장·수정·재접속, 북마크·학습 제외·검색·페이지네이션, 평가 버튼 유지. 첫 실행에서 한 Chromium 모바일 크기 테스트가 `/login`의 `load` 대기로 60초 시간 초과됐고, 같은 테스트를 수정 없이 재실행해 7.2초에 통과했다. 오류 스냅샷의 개인 본문을 로그에 출력하지 않았다. 캡처는 개인 데이터 디렉터리에 보관하고 실제 화면도 확인했다.
- `https://kanalog.hanwook.me`에 frontend만 재배포했다. HTTPS/Secure 쿠키·backend/voice healthy 확인. DB migration/콘텐츠 재import는 없으며 테스트는 QA 계정에만 수행했다. 실제 iPhone Safari/설치 PWA 청취 품질은 미검증이다. 이번 변경에서 데스크톱 브라우저 합성 엔진 전체 테스트는 재실행하지 않았으며 새 재생 UI의 실제 합성 확인은 모바일 서버 WAV 경로다.

```sh
pnpm -C frontend test
pnpm -C frontend exec tsc --noEmit
pnpm -C frontend lint
docker compose build frontend
docker compose up -d --no-deps frontend
python3 tools/e2e/check_deployment.py
E2E_BASE_URL=https://kanalog.hanwook.me python3 tools/e2e/run_live.py e2e/notes-speech.spec.ts
E2E_BASE_URL=https://kanalog.hanwook.me python3 tools/e2e/run_live.py e2e/notes-layout.spec.ts e2e/notes-desktop.spec.ts e2e/grammar-layout.spec.ts e2e/grammar-desktop.spec.ts e2e/mobile-study.spec.ts
E2E_BASE_URL=https://kanalog.hanwook.me python3 tools/e2e/run_live.py e2e/mobile-study.spec.ts -g 360x640
```

## 단어장 요약·상세 디자인 (2026-10-02)

- 긴 문법 정답 전체를 굵게 표시하던 목록을 문형/단어·읽기·짧은 뜻으로 바꿨다. 제목과 뜻은 최대 두 줄이며 문법 상세에서는 원본 강조 예문·해석·뉘앙스·접속·비교 설명을 구분한다. 단어 상세의 뜻·예문·개인 메모는 줄바꿈을 보존한다. 북마크는 별도 44px 버튼, 학습 제외와 개인 편집은 상세 하단에 표시한다. 가져온 원본의 편집 제한과 출처 미표시를 유지했다.
- 서버 유형 필터(전체/단어/문법/가나)는 검색·총 개수·페이지 수에 동일하게 적용된다. 분류/검색 변경 시 첫 페이지로 이동한다. `kind`, `level`, `grammarFocus`를 기존 노트 API에 추가했고 DB migration은 없다. 개인 단어는 여러 줄 입력을 보존하고 저장 중 중복 제출을 막으며, 신규 저장 후 첫 단어 목록으로 이동한다.
- Kotlin/PostgreSQL **32개**, Vitest **62개**, TypeScript·ESLint·Kotlin/Next.js Docker production build 통과. 노트 조회의 문형/급수/강조 전달·유형 필터·다른 소유자 접근 거부·잘못된 유형 거부, 문법 상세의 정확한 강조 위치, 검색/분류 페이지 초기화, 여러 줄 개인 단어 저장·중복 제출 방지를 검증했다.
- 실제 캡처에서 검색 아이콘과 placeholder가 겹치는 CSS 우선순위 문제를 발견했다. 실제 WebKit 검사에서 검색 입력의 왼쪽 여백이 13.6px로 확인돼 실패한 뒤 40px로 수정했다. 개인 단어 폼에는 16px 입력 글자 크기를 명시했다. 상세 설명과 같은 aria-label을 가진 입력 필드는 브라우저 테스트에서 textbox 역할로 구분했다.
- backend/frontend 갱신 전 DB dump를 권한 0600으로 개인 디렉터리에 보관했다. 갱신 전후 학습 상태·로그·가나 평가·자유 연습 답변·설정·북마크·세션·카드/덱/레슨/미디어 등 19개 표 전체 행 해시 및 노트 본문 해시가 같았다. voice 서비스·원본 미디어·공유 DB 인프라는 유지했다. 이후 검증은 QA 계정에서만 수행하며 북마크/제외 값은 원래 값으로 복구하고 합성 개인 단어는 QA 계정에만 저장한다.
- 최종 공개 서버 브라우저 **5개 케이스** 통과: 모바일 단어장, 태블릿/PC 단어장, 개인 단어 저장·수정·재접속, 긴 문법 학습, `あの` 문형 학습. WebKit **360×640·390×844**, Chromium **768×1024·1280×900**에서 두 줄 요약·22px 제목·44px 북마크·검색 여백 40px·가로 넘침 없음·정확한 원본 강조/전체 설명 보존을 확인했다. QA 문법 99개·가나 208개의 유형별 서버 총계, 20개 페이지 범위·다음 페이지·빈 검색, 실제 북마크/제외 저장과 복구, 개인 단어의 여러 줄 입력·수정·새로고침 후 저장 내용 유지와 16px 폼 글자 크기를 검증했다. 최종 캡처를 시각적으로 확인했고 공개 도메인 HTTPS·Secure 쿠키·backend healthy 검사도 통과했다. 실제 iPhone Safari·설치 PWA 실기기 검증은 미실행이다.

재현 명령:

```sh
cd backend
# 이 Mac의 Homebrew JDK 21 경로. 다른 환경에서는 설치한 JDK 21의 JAVA_HOME 사용.
JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home ./gradlew test --no-daemon
cd ../frontend
pnpm test
pnpm exec tsc --noEmit
pnpm lint
cd ..
E2E_BASE_URL=https://kanalog.hanwook.me python3 tools/e2e/run_live.py e2e/notes-layout.spec.ts e2e/notes-desktop.spec.ts e2e/grammar-layout.spec.ts
python3 tools/e2e/check_deployment.py
```

## 원본 문법 제목·하이라이팅 복원 (2026-10-02)

- 실제 v2.1.2 APKG의 기본 문법 `FrontHTML`에 있던 `_j4y` mark를 확인하고 안전한 텍스트 조각으로 변환했다. 전체 **1,078개**, 그중 N5 **99개** 모두 원본 질문·강조 위치·기존 전체 해설과 일치한다. 강조 미복원 **0개**. 변환 결과 전체 **10,237장/음성 20,157개**, N5 **878장/음성 1,795개**와 모든 미디어 해시도 다시 확인했다.
- 문형 제목·뜻·쓰임·접속 → 강조 예문 → 정답 확인 후 해석·비교 설명 흐름을 구현했다. 문형은 원본에서 강조한 일본어이며 임의의 활용 공식을 생성하지 않는다. 정확한 원본 위치만 강조하므로 같은 글자가 반복되어도 다른 출현에 강조를 붙이지 않는다. 일본어 제목 **28~34px**, 예문 **24px**, 뜻·해석 **20px**, 설명 **18px**다.
- synthetic 변환기 **9개**, Kotlin/PostgreSQL 통합·도메인 **32개**, Vitest **59개** 통과. TypeScript·ESLint·Kotlin/Next.js Docker production build 성공. 원본 mark와 ruby/스크립트 제거, 반복 표현의 특정 출현만 강조, 재import/메타데이터 갱신 후 기존 카드 version 보존, 다른 소유자 갱신 거부, 잘못된 조각 거부 및 기존 저장 내용 보존을 검증했다.
- DB dump를 권한 0600 개인 백업에 저장한 후 메타데이터 전용 CLI로 실제 두 계정 **1,177개**(개인 1,078 + QA 99)를 갱신했다. 갱신 전후 모든 UserCardState·ReviewLog·가나 평가·자유 연습 답변·설정·세션·카드/레슨/덱/미디어 등 19개 표 전체 행 해시와 문법 메타데이터 외 노트 본문 해시가 같았다. 새로운 migration이 없고 미디어·voice 서비스는 유지했다. 브라우저 검사는 이후 QA 계정에만 연습 답변을 추가했다.
- 공개 서버에서 **브라우저 7개 케이스** 통과: 실제 `あの` 제목·강조·쓰임·해석, 긴 문법 모바일/태블릿/PC, 가나 3개 화면 크기, 긴 어휘 카드. WebKit **360×640·390×740·390×844**, Chromium **768×1024·1280×900**에서 API의 원본 강조 조각과 DOM 일치, 원문 전체 보존, 글자 크기·섹션 구분·가로 넘침 없음·카드 내부 스크롤·평가 버튼 유지·다음 카드 스크롤 초기화를 검증했다. 실제 질문/정답/설명 캡처도 시각적으로 확인했다.
- `https://kanalog.hanwook.me`에 backend/frontend 재배포. HTTPS·Secure 쿠키·backend healthy 확인. 실제 iPhone Safari·설치 PWA 실기기 검증은 미실행이다. 원본 덱·변환 본문·개인 스크린샷·QA 비밀번호·백업은 Git/이미지에 포함하지 않았다.

```sh
python3 -m unittest discover -s tools/deck-import -p 'test_*.py' -v
node --experimental-strip-types tools/e2e/check_grammar_content.mjs private-data/converted/all/notes.jsonl
node --experimental-strip-types tools/e2e/check_grammar_content.mjs private-data/converted/n5/notes.jsonl
python3 tools/deck-import/verify_conversion.py private-data/converted/all
python3 tools/deck-import/verify_conversion.py private-data/converted/n5
cd backend
./gradlew test --rerun-tasks --no-daemon
cd ../frontend
pnpm test
pnpm exec tsc --noEmit
pnpm lint
cd ..
E2E_BASE_URL=https://kanalog.hanwook.me python3 tools/e2e/run_live.py e2e/grammar-layout.spec.ts e2e/grammar-desktop.spec.ts e2e/mobile-study.spec.ts
python3 tools/e2e/check_deployment.py
```

## 문법 구조와 큰 글씨 디자인 (2026-10-02)

- 전체 변환본 **문법 1,078개(N5 99개)** 모두 예문→한국어 해석→핵심 표현→뉘앙스→접속→헷갈리는 문형 순서임을 확인했다. 화면에서도 정확한 제목·순서·앞면과의 예문 일치를 검사해 구조화한다. 미확인 구조는 전체 원문을 유지한다. 기존 예문 중복 표시는 제거하고 해석·핵심 표현·세 설명은 별도 제목으로 표시한다.
- 질문 **28~34px**, 해석 **20px**, 핵심 표현 **24px**, 설명 **18px**. 정답 전 질문은 카드 중앙에 배치하고, 핵심 표현은 파란 강조 영역·설명은 번호/굵은 제목/배경/테두리가 있는 섹션으로 구분했다. 기존 모바일 카드 스크롤·고정 평가 버튼·카드 전환 스크롤 초기화를 유지한다.
- Vitest **58개**, TypeScript·ESLint 통과. synthetic 문법으로 섹션 제목/해석/핵심 표현/내용 연결과 미확인 형식의 전체 내용 보존을 확인했다. 검사 코드의 Testing Library 옵션 타입 오류를 수정하고 타입 검사를 다시 통과했다.
- 실제 UI와 동일한 TypeScript 표시 parser로 전체 **1,078개**·N5 **99개**를 검증했다. 구조화 결과를 원본 순서로 다시 결합하면 모든 문단·제목이 일치한다. 검증 도구는 원문을 출력하지 않는다.
- 공개 서버의 실제 QA 계정과 MAX 문법으로 **브라우저 7개 케이스** 통과: 첫 N5 문법 모바일 1개, 긴 문법 모바일 1개·태블릿/PC 1개, 가나 3개 크기·긴 어휘 예문 1개. 모바일 WebKit **360×640·390×740·390×844**, Chromium **768×1024·1280×900**에서 글자 크기·본문 정렬·제목 대비·섹션 배경/테두리·원문 보존·가로 넘침 없음·마지막 문장 스크롤·평가 버튼 위치·다음 카드 scrollTop=0을 확인했다. 질문/정답/설명 영역의 실제 캡처를 개인 디렉터리에 저장하고 시각적으로 확인했다.
- Next.js Docker production build와 frontend 재배포 성공. HTTPS·Secure 쿠키·backend healthy 확인. 백엔드·DB 스키마·원본 콘텐츠·기존 복습 기록은 변경하지 않았다. 실제 iPhone Safari·설치 PWA 실기기 검증은 미실행이다.

```sh
node --experimental-strip-types tools/e2e/check_grammar_content.mjs private-data/converted/all/notes.jsonl
node --experimental-strip-types tools/e2e/check_grammar_content.mjs private-data/converted/n5/notes.jsonl
pnpm -C frontend test
pnpm -C frontend exec tsc --noEmit
pnpm -C frontend lint
docker compose up -d --no-deps --build frontend
E2E_BASE_URL=https://kanalog.hanwook.me python3 tools/e2e/run_live.py e2e/grammar-layout.spec.ts e2e/grammar-desktop.spec.ts e2e/mobile-study.spec.ts
python3 tools/e2e/check_deployment.py
```

## 긴 문법 해설·모바일 배치 개선 (2026-10-02)

- 원본 문법 정답의 줄바꿈을 보존하고 16px 왼쪽 정렬 본문으로 표시한다. 질문은 별도 18~22px 제목이며 가나·어휘의 큰 글자는 유지한다. 내용 없는 설명 패널과 재생할 수 없는 문법의 중복 음성 안내를 제거했다. 카드·세션 전환 시 스크롤을 초기화한다.
- DB에 저장된 개인·QA 계정의 MAX 문법 1,177개에서 원본 해설의 줄바꿈과 `Kind`의 보이지 않는 U+2063 구분 문자를 확인했다. 초기 브라우저 검사는 이 문자 때문에 빈 설명란이 남아 실패했다. 같은 문자의 synthetic fixture로 실패를 재현한 뒤 표시에서만 걸러내고 재실행했다. 원본 DB나 import 내용은 변경하지 않았다.
- Vitest **56개**, TypeScript, ESLint 통과. 원본 문단 보존, 음성 없는 문법의 자동재생 호출 없음, 빈 설명란 없음, 다음 카드 스크롤 초기화를 검증했다. Next.js Docker production build와 frontend 재배포, 공개 HTTPS·Secure 쿠키·backend healthy 확인도 통과했다.
- 실제 N5의 400자 이상 문법 해설로 **모바일 WebKit 360×640·390×740·390×844**, Chromium 태블릿 768×1024·PC 1280×900에서 문단 보존·본문 크기·정렬·가로 넘침 없음·질문 위치를 확인했다. 모바일은 페이지 전체 스크롤 없이 카드 내부에서 마지막 문장을 읽을 수 있고 네 평가 버튼이 하단 탐색 위에 남는다. 스크롤한 답변 제출 뒤 다음 카드의 scrollTop=0도 확인했다. 실제 화면 캡처를 개인 디렉터리에 저장하고 시각적으로 확인했다.
- 새로고침/다음 카드 음성 자동재생 검증도 통과했다. 처음에는 이미 전체 연습을 마친 QA 계정에서 미학습 가나 행을 찾던 이전 검사 조건이 실패했다. 현재 전체 가나 연습 경로와 연습 기록 저장 계약에 맞춰 수정했고, 46자 범위·실제 Supertonic WAV 재생·다음 카드 자동재생·새로고침 후 DB 연습 기록과 로그인 유지·FSRS 통계 불변을 재검증했다.

문법 모바일·데스크톱 2개, 새로고침/자동재생 1개, 가나 3개 크기와 긴 어휘 예문 4개로 **브라우저 7개 케이스** 최종 통과했다. 개인 MAX 원문·화면 캡처·계정 비밀번호는 Git에 포함하지 않는다. 실제 iPhone Safari와 설치 PWA 실기기 검증은 미실행이다. 이번 변경은 프런트만 재배포하며 기존 DB·복습 기록을 유지했다.

```sh
pnpm -C frontend test
pnpm -C frontend exec tsc --noEmit
pnpm -C frontend lint
docker compose up -d --no-deps --build frontend
E2E_BASE_URL=https://kanalog.hanwook.me python3 tools/e2e/run_live.py e2e/grammar-layout.spec.ts e2e/grammar-desktop.spec.ts e2e/refresh-autoplay.spec.ts e2e/mobile-study.spec.ts
python3 tools/e2e/check_deployment.py
```

## 가나 단일 코스·다음 연습 평가 반영 (2026-10-02)

- PostgreSQL 16 Testcontainers/JUnit **31개** 통과. 최근 AGAIN/HARD 우선, AGAIN→EASY 변경 시 뒤로 이동, 혼합·단일 문자 기록 공유, 멱등 재전송 시 횟수 불변, 사용자 분리·범위·제외·FSRS 상태 불변 검증. V8 실제 SQL을 별도 synthetic 스키마에서 실행해 일반/연습 기록 통합 이관과 어휘·타 사용자 기록 제외를 확인했다.
- TypeScript·ESLint·Vitest **53개** 통과. 왕초보에서 두 코스만 표시, 행 링크 제거, 고정 문자 코스의 분류 선택, 홈·재연습의 코스 진입과 평가 저장 설명을 확인했다.
- Kotlin/Next.js Docker production build 및 Compose 재배포 성공. HTTPS·Secure 쿠키·backend healthy, V8 성공 확인. 배포 직전 DB dump를 개인 백업 디렉터리에 저장했다. 배포 전후 UserCardState/ReviewLog 전체 행 해시, 카드/레슨 ID 목록 해시가 일치했다. 이관 건수와 최근 평가도 원본 로그 집계에 일치했다.
- 공개 주소 실제 로그인 후 데스크톱 가타카나 코스와 모바일 WebKit의 히라가나/가타카나 각 기본 46자, 반탁음 혼합 10자, 다시·어려움 우선순위, 쉬움 변경, 재로그인 뒤 단일 코스에서 같은 평가 적용을 확인했다. 360·390px/740px 화면에서 가로 넘침 없음과 네 평가 버튼의 화면 내 배치를 확인했다. 모바일 혼합 10자 완주·인증 WAV HTTP 200·실제 브라우저 재생도 통과했다.
- 전체 분류 208자를 실제 UI로 끝까지 제출하고 세션 재조회·반복·이전 제한 URL·일일 한도 소진 뒤 동일 범위 자유 연습도 재검증해 통과했다.
- 첫 브라우저 배치에서 데스크톱 단축키 숫자를 빠뜨린 버튼 선택자와 이동 완료 전 URL을 저장한 검사 코드가 실패했다. 선택자·이동 대기를 수정한 단독 재실행은 통과했다. N5 회귀 검사도 화면 이동 완료 전 레슨의 보임 여부를 판단해 두 항목이 실패하여 입문 화면·행 렌더링 대기를 추가한 뒤 두 항목도 통과했다. 설정 복원 오류가 원래 실패를 가리지 않도록 검사도 수정했다.

전체 범위 1개, N5·인증·음성·설정·화면 5개, 가나 단일 코스·혼합·평가 반영 3개로 **서로 다른 브라우저 9개 케이스**를 재실행 포함 최종 통과했다.

실제 iPhone와 설치 PWA의 실기기 검증은 미실행이다. 테스트는 전용 QA 계정에만 평가를 추가했다.

```sh
E2E_BASE_URL=https://kanalog.hanwook.me python3 tools/e2e/run_live.py e2e/kana-rating-priority.spec.ts e2e/courses.spec.ts e2e/kana-mix.spec.ts
E2E_BASE_URL=https://kanalog.hanwook.me python3 tools/e2e/run_live.py e2e/kana-complete-range.spec.ts e2e/learning.spec.ts
```

## 가나 분류 선택과 전체 연습 (2026-10-02)

가나 화면에서 장수와 연습 방식 선택을 제거했다. 히라가나/가타카나/둘 다와 기본·탁음·반탁음·요음만 고른다. 클라이언트는 scripts/groups만 전송하고, 서버는 항상 선택한 활성·미제외 문자 전체를 자유 연습으로 저장한다. 이전 링크와 요청의 `size`·`practice`도 범위를 줄이지 않는다.

- PostgreSQL Testcontainers/JUnit **28개** 통과. 신규 한도 소진·미래 복습 카드가 있는 상태에서도 기본 46자/모든 분류 208자 전부 포함, 이전 size=4/practice=false 무시, 기존 FSRS 상태 보존, 소유권·제외·멱등 저장 검증.
- TypeScript·ESLint·Vitest **50개** 통과. 불필요한 두 select 제거, 분류만으로 시작, 범위 없는 시작 차단, 이전 URL 제한값을 API에 전송하지 않음, 완료 후 새 세션 반복 검증.
- Kotlin/Next.js production Docker build와 Compose 배포 성공. 공개 HTTPS·Secure 쿠키·backend healthy 확인. 배포 전후 UserCardState/ReviewLog 행 해시 및 카드/레슨 ID 목록 해시 일치.
- 공개 모바일 WebKit에서 장수/모드 select 없음, 기본 46자, 이전 `size=4&practice=0` 링크도 46자, 모든 분류 208자 끝까지 제출·재조회·반복, 반탁음 혼합 10자와 실제 음성 재생을 확인했다. 기존 모바일 배치·음성 재로드·다음 카드 자동재생 포함 8개 케이스를 검증했다. 첫 일괄 실행은 7개 통과, 360x740 검사는 로그인 시 일반 오류로 실패했다. 해당 검사 단독 재실행에서 로그인 HTTP 200과 배치가 통과했다. 최초 오류의 HTTP 응답을 수집하지 못해 발생 지점은 확정하지 않았다.

실제 iPhone·설치 PWA 실기기 검증은 미실행이다. 공개 모바일 WebKit의 실제 사용자 흐름 검증 명령은 다음과 같다.

```sh
E2E_BASE_URL=https://kanalog.hanwook.me python3 tools/e2e/run_live.py e2e/kana-complete-range.spec.ts e2e/kana-mix.spec.ts e2e/mobile-study.spec.ts e2e/safari-speech.spec.ts e2e/refresh-autoplay.spec.ts
```

## 선택 범위 조기 종료와 빈 큐 수정 (2026-10-02)

실제 개인 계정의 하루 신규 한도 10장을 모두 사용한 상태를 확인했다. 최근 일반 세션에는 0장인 큐도 있었으며 기존 UI는 답변 0회도 완료로 표시했다. 섞기 UI의 기본 모드를 자유 연습으로 변경했고, 예정된 학습·복습은 한도 적용을 명시하여 따로 선택한다. 완료한 레슨 중 복습 시각 미도래는 바로 다시 연습한다. 빈 일반 세션은 서버의 한도·미도래·제외 상태와 다음 복습 시각을 표시하고 같은 범위 자유 연습으로 연결한다. 409 오류는 서버의 실제 메시지와 재조회·연습 버튼을 제공한다.

- PostgreSQL 16 Testcontainers/JUnit 27개 통과: 한도 소진 레슨의 빈 큐 이유·미도래·전체 제외·소유권·같은 레슨 반복·FSRS 기록 불변 포함.
- TypeScript, ESLint, Vitest 50개 통과: 섞기 기본 자유 연습·빈 진입/완료 분리·연습 전환·완료 레슨 링크·다른 탭의 한도 소진 메시지 포함.
- 공개 주소 모바일 WebKit에서 신규 한도가 **4장 남은 상태**로 기본 자유 연습을 선택하고 **전체 208장**을 버튼으로 하나씩 제출했다. 중복 없는 208장, 208회 저장 후 DB 세션 재조회, 같은 전체 범위 재시작, 한도 소진으로 빈 레슨 진입 후 동일 레슨 자유 연습 전환, 가로 넘침 없음, 복습 통계 불변을 확인했다.
- 동일 공개 주소에서 두 문자 체계 반탁음 10장·실제 WAV 재생·반복·통계 불변 검사도 통과했다.
- Kotlin/Next.js Docker production build와 Compose 배포 성공. backend/voice healthy 및 공개 URL·Secure 쿠키 검사를 통과했다. 배포 전후 전체 UserCardState/ReviewLog 행 해시와 카드/레슨 ID 목록 해시가 일치했다. DB migration이나 진도 초기화는 수행하지 않았다.

브라우저 총 **8개 검사 통과(5분)**: 전체 208장, 혼합 반탁음 10장, Safari 음성 반복/재로드, 모바일 가나 3개 크기·긴 MAX 예문, 새로고침/다음 카드 자동재생. 마지막 자동재생 검사는 일반 FSRS 평가와 저장 후 다음 카드까지 확인했다. 실제 iPhone Safari·설치 PWA 실기기 검증은 수행하지 않았다.

```sh
E2E_BASE_URL=https://kanalog.hanwook.me python3 tools/e2e/run_live.py e2e/kana-complete-range.spec.ts e2e/kana-mix.spec.ts e2e/mobile-study.spec.ts e2e/safari-speech.spec.ts e2e/refresh-autoplay.spec.ts
```

## 히라가나 우선·가나 섞어 학습 (2026-10-02)

새 계정의 기본 코스·왕초보 단원은 히라가나 → 가타카나다. 기존 카드·레슨 ID·선택 레슨·학습 기록은 유지한다. 왕초보 화면에서 문자 종류, 기본/탁음/반탁음/요음, 5·10·20·30장/선택 범위 전체를 고른다. 학습·복습은 같은 FSRS 상태로 원래 레슨 진도를 갱신하고, 자유 연습은 서버의 세션 모드와 별도 답변 표를 사용해 복습일·진도·통계를 보존한다.

| 검증 | 이번 실행 결과 |
| --- | --- |
| 백엔드 | JUnit 25개 통과. 히라가나 우선, 섞기 범위·소유권·208개 전체·중복 없음·세션 순서 유지·일일 한도·미래 카드 자유 연습·제외·중복 키 재전송/충돌·다른 키 중복 답변·연습과 FSRS의 키 충돌·FSRS 불변 포함 |
| 프런트엔드 | 타입·lint·Vitest 47개 통과. 모든 범위 조합과 전체 장수, 범위 없는 시작 차단, 선택한 요청 계약, 자유 연습 완료·답변 저장·새 세션 다시 섞기 포함 |
| 실제 모바일 흐름 | 최종 공개 WebKit에서 반탁음 두 문자 체계 10장 연습 완료·DB 답변 재조회·FSRS 통계/첫 연습 불변·다시 섞기·실제 서버 음성 재생·모델 다운로드 없음 확인. 로그인 안내도 히라가나 우선. 기존 모바일 카드 4개·Safari 음성 1개·새로고침/다음 카드 자동재생 1개의 회귀도 통과(브라우저 총 7개 케이스) |
| 모바일 입력 | 공개 WebKit에서 새 select의 실제 높이 19/21px 실패를 확인. 기존 `.field`에 명시적인 48px 높이·appearance·화살표·16px 글자 크기를 적용. 최종 360/390px에서 모든 select ≥44px·가로 넘침 없음 통과 |
| 배포와 보존 | V7 마이그레이션·Kotlin/Next.js Docker build·Compose healthy·공개 HTTPS·Secure 쿠키 검사 성공. 배포 전 DB dump(권한 0600) 보관, 배포 전후 전체 UserCardState/ReviewLog 행 해시 및 카드/레슨 ID 목록 해시 일치 |

초기 단계의 순서·섞기 API·자유 연습·프런트 연동 테스트를 각각 실패시킨 뒤 구현했다. 공개 주소의 Python `check_curriculum_api.py`는 Cloudflare가 403으로 차단하여 이번 실행은 통과로 기록하지 않는다. 공개 WebKit에서 같은 커리큘럼의 히라가나 우선 응답과 학습 흐름을 검증했다. 원문 콘텐츠나 비밀번호는 검증 산출물에 포함하지 않는다. 실제 iPhone·설치 PWA·청취 품질은 이번에도 실기기 검증을 하지 않았다.

```sh
cd backend
JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home ./gradlew test --rerun-tasks --no-daemon
cd ../frontend
pnpm exec tsc --noEmit
pnpm lint
pnpm test
cd ..
docker compose up -d --build
E2E_BASE_URL=https://kanalog.hanwook.me python3 tools/e2e/run_live.py e2e/kana-mix.spec.ts e2e/mobile-study.spec.ts e2e/safari-speech.spec.ts e2e/refresh-autoplay.spec.ts
python3 tools/e2e/check_deployment.py
```

## 모바일 Safari의 반복 모델 다운로드 방지 (2026-10-02)

사용자가 보고한 재생 후 자동 재로드에 대해 코드상의 자동 reload는 없었다. 약 401MB 모델과 브라우저 추론 메모리로 인한 WebKit 프로세스 재시작을 의심하지만 실기기 종료 로그를 확보하지 않아 원인을 확정하지 않는다. iPhone/iPad(데스크톱 UA iPad 포함)는 브라우저 worker를 초기화하지 않고 인증된 자체 서버의 동일 Supertonic 계산 결과 WAV만 받도록 변경했다. Desktop browser mode와 MAX 기본 음성은 유지한다.

| 검증 | 이번 실행 결과 |
| --- | --- |
| 프런트엔드 | 타입 검사·lint·Vitest 45개 통과. iPhone은 worker/model 없이 server route, desktop UA iPad 판별, binary API CSRF/cookie/cache 계약 포함 |
| 백엔드 | JDK 21 전체 JUnit 22개 통과. 실제 HTTP adapter의 WAV 검증·계산 실패·입력 크기 제한 포함 |
| 내부 계산 서비스 | Node 테스트 2개 통과. 입력 제한·같은 WAV 캐시 재사용·동시 추론 429·실패 후 슬롯 복구 |
| 실제 모델 | 동일 고정 revision과 전체 파일 크기/SHA-256 검증 후 Linux arm64 CPU 실행. 로컬 실제 `ア` 합성 122,924 bytes, 1.39초·RMS 0.0468로 비무음 확인. synthetic WAV를 실제 생성 결과로 사용하지 않음 |
| iPhone WebKit | 공개 HTTPS 배포와 QA 계정으로 실제 음성 3회 재생 완료. 의도하지 않은 주 문서 이동 0회, `/tts/supertonic`, `/tts/runtime`, worker 요청 0개. 생성 WAV 각각 1MiB 미만. 직접 새로고침 후 재생 요청 성공·모델 요청 0개·답변 집계 유지 |
| 음성 API 접근 | 같은 실제 테스트에서 Origin만 있고 CSRF 없는 요청 403, 잘못된 목소리 400, 로그아웃 후 정상 Origin 요청 401 확인 |
| 기존 브라우저 흐름 | Chrome 계열 모바일 viewport 360×640/390×844/360×740 가나 3개와 긴 MAX 단어 1개 통과. 새로고침 후 생성 음성·평가 저장·다음 카드 자동재생 1개 통과. WebKit 포함 E2E 총 6개 통과 |
| 배포 | voice/frontend/backend Docker production build 및 Compose 기동 성공. voice/backend healthy, 공개 HTTPS·Secure 쿠키 검사 통과. voice 약 587MiB 사용 관측(2GiB 상한). 기존 PostgreSQL 전용 DB와 개인 미디어 유지, migration 없음 |

초기 WebKit 테스트의 로그아웃 검증은 Origin을 생략해 인증보다 앞선 Origin 검사에서 403을 받았다. 정상 Origin을 명시하고 로그아웃 요청이 끝나 로그인 화면으로 이동한 뒤 미인증 401을 확인하도록 테스트를 수정했다. 최종 voice 재배포 후 WebKit 테스트를 두 번 연속 반복해 모두 통과했다. 실제 iPhone의 재시작 로그·설치 PWA·오디오 청취 품질·장시간 메모리 사용은 확인하지 않았다. iPhone UA/터치/모바일 viewport를 사용하는 실제 Playwright WebKit 검증이며 실기기 검사와 구분한다.

```sh
cd backend
JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home ./gradlew test --rerun-tasks --no-daemon
cd ../frontend
pnpm exec tsc --noEmit
pnpm lint
pnpm test
pnpm exec playwright install webkit
cd ../tools/voice-server
npm test
cd ../..
docker compose up -d --build
E2E_BASE_URL=https://kanalog.hanwook.me python3 tools/e2e/run_live.py e2e/safari-speech.spec.ts e2e/mobile-study.spec.ts e2e/refresh-autoplay.spec.ts
python3 tools/e2e/check_deployment.py
```

## PWA 새로고침과 자동재생 복구 (2026-10-02)

학습 화면은 문서 대신 카드 내부를 스크롤하므로 당겨서 새로고침하는 동작에 의존하지 않도록 모바일 상단·데스크톱 메뉴에 명시적인 새로고침 버튼을 추가했다. 현재 페이지를 완전히 다시 열어 로그인과 서버 데이터를 복원한다. `/api/me`가 일시적인 네트워크 오류로 실패할 때 로그인으로 이동하던 동작은 실패 테스트로 확인했고, 다시 확인 버튼을 제공하도록 수정했다. 실제 401은 로그인으로 이동한다.

자동재생 `play()`가 `NotAllowedError`로 거부된 뒤 준비된 음성을 재사용하는 테스트를 실패시킨 후 수정했다. 카드의 재생 버튼은 이 경우 `자동재생 시작` 또는 수동 듣기의 `준비된 음성 재생`으로 바뀐다. 터치 핸들러에서 즉시 같은 audio 요소의 `play()`를 호출하며 모델 계산을 다시 시작하지 않는다. 카드·version·음성 설정을 기준으로 이미 시도한 자동재생을 구분하여 단순 설정 갱신이나 정답 표시가 같은 카드의 음성을 중복 생성하지 않도록 했다. 이전 카드의 늦은 재생 실패도 다음 카드에 표시하지 않는다.

공개 `/sw.js` 응답은 수정 전 `public, max-age=14400`, 수정 후 `no-cache, no-store, must-revalidate`였다. 앱 시작 때 `updateViaCache: none`과 명시적인 서비스워커 업데이트로 새 코드를 확인한다. 모델의 기존 장기 캐시 설정은 유지한다.

| 검증 | 실제 결과 |
| --- | --- |
| 프런트엔드 | 타입 검사·린트·Vitest 42개 통과. 자동재생 차단·같은 음성 재생·다음 카드·중복 계산 방지, 새로고침, 네트워크 재시도와 401 분리, 서비스워커 갱신 회귀 포함 |
| 실제 새로고침 | 수정 전 공개 배포본에서 버튼 부재로 브라우저 테스트 실패. 재배포 후 390×844에서 버튼 클릭에 따른 문서 재로드·로그인 유지·설정 및 서버 진도 복원 확인 |
| 실제 생성 음성 | 공개 HTTPS 주소와 전용 QA 계정의 가타카나 카드에서 실제 모델로 WAV를 생성하고 오디오 재생 시간이 증가함을 확인. 정답 표시에도 같은 음성 src 유지 |
| 다음 카드 자동재생 | 보통 평가를 저장한 뒤 음성 버튼을 추가로 누르지 않고 다음 카드의 새로운 오디오 재생 시간 증가 확인 |
| 기록 영속성 | QA 답변 횟수 +1 및 다시 새로고침한 뒤 같은 값 유지. 자동재생 설정도 유지. 검증 종료 후 QA 설정을 이전 값으로 복원 |
| 모바일 | 360×640, 390×844, 360×740 가나 및 360×640 실제 N5 단어·오디오 조절의 화면 넘침·버튼 겹침 없음. 브라우저 테스트 총 5개 통과 |
| 배포 | Docker production build·Compose 재배포 성공. 주소·Secure 쿠키·backend healthy 검사 통과. 내장 브라우저에서도 새로고침 버튼으로 설정 화면 복원 확인 |

```sh
cd frontend
pnpm exec tsc --noEmit
pnpm lint
pnpm test
cd ..
docker compose up -d --build frontend
E2E_BASE_URL=https://kanalog.hanwook.me python3 tools/e2e/run_live.py e2e/refresh-autoplay.spec.ts e2e/mobile-study.spec.ts
python3 tools/e2e/check_deployment.py
```

브라우저의 자동재생 정책을 해제하지 않았다. 차단 및 재생 재시도는 단위 테스트에서 제어해 검증했으며 실제 브라우저 흐름은 Chrome 계열 viewport에서 검증했다. 사용자의 기기·설치된 PWA·iOS/Safari 실기기와 청취 품질은 직접 검증하지 않았다. DB 스키마·서버 학습 로직은 변경하지 않았다.

## 모바일 학습 카드와 평가 버튼 (2026-10-01)

모바일 학습 화면은 `100dvh` 안에 상단 헤더·카드·평가·하단 탐색을 배치한다. 정답에서 가나의 로마자와 근사 발음을 카드 내부에 함께 표시하며, 추가 발음 안내와 긴 예문·설명은 카드 안에서 펼쳐 읽는다. 평가는 네 버튼을 한 줄로 제공하고 각 버튼의 높이를 56px로 확보했다. 단어 카드의 개인 한글 보조 표시 설정은 유지한다.

컴포넌트 테스트에서 정답 전 근사 발음 숨김, 정답 후 카드 내부 표시, 카드 밖 평가 영역을 확인했다. 실제 브라우저에서 기본 `.btn` 스타일이 높이를 44px로 덮어쓰는 것을 실패 테스트로 확인하고 학습 버튼 스타일을 수정했다.

| 검증 | 실제 결과 |
| --- | --- |
| 프런트엔드 | 타입 검사·린트·Vitest 37개 통과 |
| 가나 모바일 화면 | 공개 HTTPS 주소의 실제 QA 계정으로 360×640, 390×844, 360×740에서 로그인·레슨 시작·정답·발음 안내 펼치기 확인. 문서 가로/세로 넘침 없음, 평가 영역과 하단 탐색 겹침 없음, 버튼 높이 56px 이상 |
| N5 모바일 화면 | 360×640에서 실제 가져온 단어 정답·추가 설명·기본 음성 조절을 표시한 상태에도 카드와 평가가 화면에 유지됨. 인증된 오디오 readyState ≥ 2 확인 |
| 브라우저 테스트 | `mobile-study.spec.ts` 4개 통과. API·콘텐츠·오디오 mock 없음. 평가 제출 없이 검증하여 학습 기록 변경 없음 |
| 배포 | Compose production build 및 재배포 성공. 공개 주소·Secure 쿠키·backend healthy 검사 통과 |
| 화면 확인 | 390×844 실제 브라우저 스크린샷 확인. 개인 데이터 디렉터리에만 저장 |

```sh
cd frontend
pnpm exec tsc --noEmit
pnpm lint
pnpm test
cd ..
docker compose up -d --build frontend
E2E_BASE_URL=https://kanalog.hanwook.me python3 tools/e2e/run_live.py e2e/mobile-study.spec.ts
python3 tools/e2e/check_deployment.py
```

Chromium 브라우저의 viewport 크기로 검증했으며 실제 휴대폰·iOS/Safari·음질 청취를 검증한 것으로 표시하지 않는다. 긴 카드 내용은 카드 내부 스크롤을 사용한다. 이번 변경은 화면 구성으로 DB 스키마와 학습 저장 로직을 변경하지 않는다.

## 음성 로딩·캐시·출처 표시 수정 (2026-10-01)

공개 도메인에서 모델 파일과 런타임은 접근 가능했고 최초 확인에서는 2.020136초 오디오가 생성됐다. 그러나 새 화면을 배포한 뒤에도 브라우저가 기존 `/tts/worker.js`의 옛 출처 문구를 계속 표시했다. 공개 응답의 `Cache-Control: public, max-age=14400`과 최신 서버 파일의 해시를 비교하여 브라우저가 이전 worker를 재사용하는 배포 문제를 확인했다.

- 빌드가 `worker.<코드 SHA-256 앞 16자리>.js`와 `src/tts-version.ts`를 함께 생성한다. 실제 공개 해시 경로의 파일이 로컬 번들과 일치함을 확인했다.
- 모델을 크기가 확인된 버퍼에 청크 단위로 받고 다운로드 용량·진행을 표시한다. 누락/크기 불일치/HTTP 오류는 추론 전에 차단한다.
- 생성 요청의 타임아웃을 전체 3분에서 마지막 진행 후 3분으로 바꿨다. 다운로드가 진행 중인 상황의 조기 종료를 fake clock 회귀 테스트로 재현한 뒤 수정했다.
- 모델 해시가 포함된 요청만 `public, max-age=31536000, immutable`로 캐시한다. 실제 공개 HTTP 헤더를 확인했다. 개인 콘텐츠/API 캐시 정책은 유지했다.
- 화면의 공급자·덱 이름·출처 문구를 제거하고 `학습 음성 (추천)`·`기본 음성`·`기기 음성`·`목소리`로 표시한다. 단어장의 원본/개인 편집 권한 판단은 유지한다.

수정 후 실제 내장 브라우저에서 공개 도메인의 새 worker가 일반적인 준비 문구를 표시하고, 2.020136초 오디오를 생성·재생 완료했다(currentTime=duration, readyState=4, error 없음). 생성 취소 버튼 이후 취소 안내와 paused 상태를 확인했고, 다시 요청했을 때 같은 길이의 오디오가 생성·재생됐다. 단어장 20개 항목의 출처 라벨이 없어졌고 설정 페이지 이탈 후 오디오 요소가 제거된 것도 확인했다. 실제 N5 학습 카드에서도 1.393197초 오디오의 생성·재생 완료와 출처 미표시를 확인했다. 브라우저 DOM의 실제 오디오 상태를 검사한 결과이며 WAV RMS/청취 품질·실기기 성능을 검증한 것으로 표시하지 않는다.

프런트엔드 36개 테스트, 타입 검사·린트·Docker production build를 통과했다. 백엔드 21개 및 변환기 8개 테스트도 통과했다. Compose로 현재 공개 도메인에 재배포했고 주소·Secure 쿠키·backend health 검사도 통과했다.

## 공개 도메인 로그인 복구 (2026-10-01)

현재 배포 주소는 `https://kanalog.hanwook.me`다. 해당 주소에서는 Codex 브라우저 접근이 허용되었다. 로그인 화면에서 전용 QA 계정으로 실패를 재현했고 `허용되지 않은 요청 출처입니다`가 표시됐다. 실행 중인 백엔드의 `PUBLIC_APP_URL=http://localhost:3200`, `COOKIE_SECURE=false`가 HTTPS 공개 주소와 불일치한 것이 원인이다. 비밀번호 문제가 아니며 Origin 검사를 제거하지 않았다.

`.env`와 Compose/예시 파일의 배포 주소를 `https://kanalog.hanwook.me`, HTTPS 쿠키 설정을 `true`로 맞추고 `docker compose up -d backend`로 컨테이너를 재생성했다. 기존 DB·미디어·계정·복습 기록은 유지했다.

| 검증 | 실제 결과 |
| --- | --- |
| 설정 회귀 검사 | `python3 tools/e2e/check_deployment.py`: 수정 전 주소 불일치로 실패, 수정 후 Compose/실행 컨테이너 주소·Secure 설정·health 모두 통과. 비밀값 출력 없음 |
| 브라우저 로그인 | 공개 도메인 로그인 → 실제 홈 화면 진입. 새로고침 후 로그인 유지 |
| 학습 저장 | 실제 QA N5 카드 정답 확인 → 보통 평가 → 다음 카드(1/20 → 2/20). 오늘 답변 3 → 4 증가 및 재로그인 후 4 유지 |
| MAX 음성 | 인증된 원본 MP3 재생. DOM 오디오 상태 duration/currentTime 1.26712초, readyState 4, error 없음, 재생 종료 확인. 청취 품질이나 새 Supertonic WAV 검증으로 간주하지 않음 |
| 로그아웃 | 로그인 화면 복귀. `/stats` 직접 진입도 로그인 화면으로 이동 |
| 잘못된 비밀번호 | 로그인 오류 안내 표시. 올바른 비밀번호로 재로그인 성공 |
| 커리큘럼 | 공개 도메인의 실제 코스 화면에서 6레벨·QA N5 진도·미확보 급수 표시 확인 |
| API 접근 통제 | 실제 공개 주소에 익명 `/api/me` 401, 외부 Origin 로그인 403 `BAD_ORIGIN` 확인 |
| Backend | JDK 21 `./gradlew test --rerun-tasks --no-daemon`: 21개 통과. `bootJar` 성공 |
| Frontend | 타입 검사·린트 통과. `pnpm test`: 28개 통과 |
| 변환기 | synthetic fixture 단위 테스트 8개 통과 |

브라우저 확인은 내장 브라우저로 수행했다. 별도 Playwright 전체 suite·360/390px·Supertonic 실제 WAV 합성은 이번 로그인 복구 검증에 포함하지 않았다. Python urllib의 공개 도메인 요청은 Cloudflare 403/1010으로 거부되어 그 클라이언트의 API suite를 통과로 표시하지 않았고, 차단을 우회하지 않았다. 공개 도메인의 브라우저와 허용된 curl 요청에서는 위 항목을 실제 확인했다.

```sh
docker compose up -d backend
python3 tools/e2e/check_deployment.py
curl -fsS https://kanalog.hanwook.me/api/health/ready
```

## 이전 레벨별 커리큘럼 변경의 확인

2026-10-01 후속 변경에서 Backend 21개(Builder 7, PostgreSQL 통합 9, FSRS 4, 날짜 1), Frontend 28개 테스트가 통과했다. 프런트 타입 검사·lint, Kotlin/Next.js Docker production build와 Compose 재배포가 성공했다.

`python3 tools/e2e/check_curriculum_api.py`로 현재 서버의 실제 QA 계정 로그인을 사용해 인증 필수, 6레벨 순서, 기존 모든 레슨 ID의 단일 연결, core 집계, 레벨 상세 응답, 없는 키 404를 확인했다. QA 계정은 왕초보 기본 92장·20레슨과 N5 878장·59레슨을 제공하고 N4~N1은 `available=false`다. 전체 개인 데이터의 목차는 `curriculum.md`에 기록했다.

재배포 전후 모든 UserCardState·ReviewLog 전체 행 해시와 카드·레슨 ID 목록 해시가 동일했다. 새로운 migration이나 학습 기록 초기화가 없다. 현재 backend는 healthy이고 readiness는 UP이다.

컴포넌트 테스트에서는 6레벨·현재 레슨·단원 접기/펼치기·완료·데이터 없음·홈의 이어서 학습·세션 완료 후 다음 단계·레벨 통계를 확인했다. 브라우저의 저장된 접근 차단으로 실제 화면 청취·모바일 크기·E2E 재실행은 계속 미확인이다. 기존 E2E는 새로운 레벨 경로와 접힌 단원 구조에 맞게 갱신했으나 통과로 표시하지 않는다. 아래는 이전 Supertonic 변경 시점의 검증 기록이다.

2026-10-01, Apple Silicon 개발 환경과 현재 로컬 Compose 기준이다. 실제 MAX 콘텐츠·음성·QA 비밀번호·백업은 `private-data` 또는 개인 volume에 두고 Git과 이미지에서 제외한다.

## 이번 변경에서 실행한 검증

| 항목 | 결과 |
| --- | --- |
| Backend | JDK 21 `./gradlew test --rerun-tasks --no-daemon` 성공. JUnit 13개 통과: FSRS 4, PostgreSQL 16 Testcontainers persistence 8, 날짜 경계 1 |
| 서버 도메인 검증 | 평가·재전송·payload 충돌·version 경쟁·신규 한도·소유권·코스 순서·제외 카드·재import 진도 유지·음성 설정 영속성/잘못된 엔진 및 목소리 차단 |
| Frontend | `pnpm test` 12개 통과. `pnpm exec tsc --noEmit`, `pnpm lint` 성공. 취소한 음성 요청의 늦은 응답 무시, worker 오류 재시도, 일본어 읽기 선택, 예문 듣기 가능 여부, 코스 추천, 탐색 접근성, 설치 앱 색상, ONNX 런타임 파일 포함 검증 |
| Production build | Compose의 Kotlin `bootJar` 및 Next.js production build 성공. 최신 backend/frontend 이미지 재배포 |
| 변환기 | `python3 -m unittest discover -s tools/deck-import -p 'test_*.py' -v` 8개 통과. ZIP 경로 탈출·누락 필드/미디어·스크립트 제거·미지원 스키마 포함 |
| 실제 MAX 변환 | `verify_conversion.py private-data/converted/n5`: 878장(어휘 779, 문법 99), 음성 1,795개. 전체 변환 10,237장(어휘 9,159, 문법 1,078), 음성 레코드 20,157개. 급수별 수는 `data-sources.md` |
| 실제 재import | 전용 QA 계정의 N5를 관리 CLI로 재import. 카드 건수, UserCardState 전체 행 및 ReviewLog 전체 행의 해시가 실행 전후 동일 |
| Supertonic 모델 | 공식 고정 revision `aafc6e32416a594460b32413efc49d7fe4ce6d46`, 401,276,744 bytes 확보. 다운로드 도구가 파일 크기와 제공된 LFS SHA-256을 확인. 로컬 manifest에 각 파일 해시 기록 |
| ONNX 런타임 수정 | 초기 브라우저 테스트에서 ORT 1.30이 요구하는 `asyncify.mjs/.wasm` 누락으로 초기화 실패. 실패 회귀 테스트를 만든 뒤 worker 번들에서 실제 런타임 이름을 추출해 복사하도록 수정. 회귀 테스트 통과. 재배포 후 worker·해당 mjs/wasm·모델 manifest의 HTTP 200 확인 |
| 현재 서버 | `docker compose config --quiet` 성공. backend healthy, `/api/health/ready` UP, `/login` 200. PostgreSQL 16 `infra-postgres`의 Kanalog 전용 DB/역할 사용, Flyway V1~V6 적용 |
| DB·미디어 복원 | 같은 앱 중단 시점의 DB dump와 media tar를 별도 테스트 DB·volume에 복원. UserCardState·ReviewLog·설정의 전체 행 해시 및 21,950개 실제 미디어 파일 SHA-256 목록 일치. 임시 테스트 대상 제거 |
| 재시작 지속성 | 앱 중단·재시작 뒤 기존 학습 상태·복습 로그·설정 해시 유지 |
| 데이터 분리 | 실제 개인 계정 MAX 10,237장과 QA 계정 N5 878장을 분리. 각 계정에 가타카나 104장·히라가나 104장 생성. 앱 포트 `127.0.0.1:3200`, 개인 미디어 volume 유지 |

## 이전 브라우저 검증과 최종 미실행 범위

권한 설정 변경 전 전용 QA 계정으로 기존 Playwright 학습 흐름 5개와 MAX 오디오 테스트를 통과했다. 로그인·평가 저장·통계·로그아웃 권한·설정 재로그인·360/390px 가로 넘침·MP3 비무음 디코딩·재생 시간 증가·range 206·로그아웃 후 media 401을 확인했다. 해당 결과를 마지막 재배포 뒤 재실행한 것으로 간주하지 않는다.

새 코스 E2E는 복습 우선 큐에서 고유 카드 증가를 잘못 가정해 실패했다. 신규 카드까지 평가하도록 테스트를 수정했으나 최종 재실행은 못 했다. Supertonic 브라우저 E2E 역시 런타임 누락 수정 후 실제 WAV 생성/재생을 다시 확인하지 못했다.

사용자가 전체 접근을 허용한 뒤에도 브라우저 도구는 **저장된 사용자 설정이 `localhost:3200` 접근을 차단한다**고 거부했다. 우회 브라우저나 별도 자동화로 이 차단을 피하지 않았다. 따라서 Supertonic 실제 합성 재생·취소·최종 코스 UI 검증은 미완료다. 모델 확보나 파일 HTTP 200만으로 이를 통과로 표시하지 않는다. 실제 휴대폰·태블릿 청취 품질, iOS/Safari PWA 설치, 다른 CPU 플랫폼은 검증하지 않았다.

## 재현 명령

```sh
cd backend
./gradlew test --rerun-tasks --no-daemon
cd ../frontend
pnpm test
pnpm exec tsc --noEmit
pnpm lint
cd ..
python3 -m unittest discover -s tools/deck-import -p 'test_*.py' -v
docker compose up -d --build
curl -fsS http://localhost:3200/api/health/ready
```

브라우저의 저장된 차단 설정이 해제된 테스트 환경에서는 다음을 실행한다. QA 계정은 무작위 비밀번호를 `private-data/e2e/account.json`에 권한 0600으로 저장하며 공개하지 않는다. provision은 실제 개인 계정의 진도를 바꾸지 않는다.

```sh
python3 tools/e2e/provision.py
python3 tools/e2e/run_live.py
```

코스 테스트는 남은 신규 카드와 일일 한도가 필요하다. QA 계정은 반복 검증을 위해 하루 한도를 100장으로 설정한다. Supertonic 테스트는 실제 모델을 읽어 WAV 비무음·재생 시간 진행·페이지 이탈 정리를 확인한다. 고정 응답이나 mock 오디오를 성공으로 사용하지 않는다.

## 레벨 전체 연습·오답 보강 (2026-10-04)

- Backend `ktlintCheck check bootJar`: 58 tests, 0 failures/errors. PostgreSQL 16 Testcontainers / 실제 HTTP 인증 API 검증 포함. 레슨 밖의 급수·유형 선택, 복습 전용 새 카드 제외, 소유권, 제외 카드, 같은 키 재전송/충돌, 동시 새 카드 한도와 동시 재연습 제출, 즉시 재연습의 FSRS JSON 보존, 다음날 알림 도달 후 공식 스케줄러 재계산, 자정/DST 경계, 빈 큐 안내 재로딩을 검증했다.
- Frontend Vitest: 73 tests 통과. TypeScript / ESLint / Next production build / backend·frontend Docker image build 통과.
- 실제 데이터 보존: 첫 V9 배포 직후 기존 21개 테이블의 기존 컬럼 행 수·해시가 모두 동일했다. QA 요청 전에 비교했으며 백업은 Git에서 제외한 private-data/backups/level-review-20261004에 보관했다.
- 실제 MAX N5 범위는 단어 779장 / 문법 99장임을 인증된 API에서 확인했다. 현재 레슨을 선택하지 않고 급수 전체 세션을 생성했다.
- 첫 새 브라우저 검사에서 optional lessonId 필드 생략을 null로 단정한 assertion을 수정했다. 기존 가나 검사는 새로고침 때 새 POST 세션을 기다리던 부분을 기존 세션 GET 복원 확인으로 변경했다. 제품의 새 복원 동작에 맞춰 재실행 후 통과했다.
- 실물 iPhone Safari·PWA 설치 검사는 이번 변경에서 수행하지 않았다. 모바일 WebKit 자동 검증과 구분한다. 다음날 도달은 Testcontainers에서 시간 조건을 바꿔 검증했으며, 실제 QA 계정에서는 다음날 사용자 시간대 00:00에 알림이 예약되었음을 운영 DB 읽기 전용 쿼리로 확인했다.
- V10 및 완료 후 다음 배치 버튼 최종 배포 직후에는 기존 23개 테이블의 기존 컬럼 행 수·해시가 모두 동일했다. 별도 private-data/backups/level-review-queue-info-20261004 dump를 보관했다.
- 실제 HTTPS 서비스의 최종 모바일 WebKit 새 기능 3개 + 기존 회귀 13개 = 16개 고유 브라우저 흐름을 확인했다. 기존 회귀는 첫 실행에서 12개가 통과하고 가나 새로고침 POST 대기 검사가 timeout이었다. GET 복원 계약으로 수정 후 1개를 재실행해 통과했다. 신규 3개는 N5 전체 범위 / 실제 MAX 다시 평가 및 새로고침 후 재연습·세션 통계 복원 / 한도에 도달한 빈 큐의 안내 복원을 확인했다.
- 최종 Compose backend health / PUBLIC_APP_URL / Secure 쿠키 설정 검증 통과. DB와 음성 서비스를 교체하거나 재시작하지 않고 기존 공유 PostgreSQL의 독립 Kanalog DB에 additive 마이그레이션만 적용했다.

## 2026-10-04~05 후리가나·한글 발음 보조

### 구현 및 실제 데이터

- MAX 2.1.2의 원본 ruby를 typed segment로 복원했다. 지원하는 전체 범위 10,237 노트 중 문법 1,078개와 예문 10,976개에 원본 읽기가 있다. 예문 22개는 원본 ruby가 없어 사전 보조 경로를 사용한다. N5 QA 범위는 878 노트, 문법 99개, 예문 ruby 1,006개/원본 없음 10개다.
- 원본 읽기 → 가나 anchor 정렬 → Kuromoji IPADIC 0.9.0의 순서로 표시한다. 알려진 읽기를 자동 사전 값으로 덮어쓰지 않는다. 유일한 정렬만 세분화하고, 모호한 정렬은 전체 읽기를 보존한다. 단어·문장·문법 제목에 native ruby를 표시하고 원본 강조 위치를 유지한다.
- 한글 보조는 수동 값 우선, 그 외 모라 단위 근사 변환이다. 장음/촉음/요음/ん/조사 발음 테스트를 포함한다. 자동 값을 사람이 모두 검수한 것으로 표시하지 않는다. 가나에도 사용자 설정을 적용한다.
- V11은 `show_furigana` 기본 true 열만 추가했다. 기존 `show_hangul_hint` 기본 false를 유지했다. 사용자별 설정과 재로그인 후 보존을 검증했다.

### 데이터 보존 및 배포

- 갱신 전에 `kanalog` 전용 DB dump를 private-data에 보관했다. 기존 계정 전체 범위 10,237개와 QA 계정 N5 878개에 `refresh-readings`를 실행했다. DB/미디어 원본을 초기화하지 않았다.
- 갱신 전후 기존 23개 테이블의 행 수와 기존 열의 해시를 비교했다. 의도한 `study_note.raw_fields` 메타데이터와 새 설정 열을 제외한 기존 값은 **23/23 동일**했다. 실제 사용자 콘텐츠/카드/예문/음성 ID/updated_at/복습 상태/로그가 보존됐다. 이후 브라우저 검증은 QA 계정의 학습/세션 기록을 의도적으로 추가한다.
- backend/frontend Docker production build 성공. 기존 PostgreSQL과 voice 컨테이너를 유지하며 앱 두 컨테이너를 갱신했다. 최종 로그인 초기화 보강은 frontend만 다시 배포했다. 공용 HTTPS, Secure 쿠키, backend readiness, V11 migration 성공을 확인했다.

### 실행한 검증

- BE: `ktlintFormat` 후 `ktlintCheck check bootJar`, **64 tests / 0 failures**. 실제 PostgreSQL Testcontainers에서 설정 소유권, 읽기 메타데이터 재실행/원문 변경 거부/진도 보존, 기존 FSRS 및 동시성/중복 제출을 확인했다. persisted retry response에 ReadingGuide가 포함되어도 재전송 결과가 동일하다.
- FE: **78 Vitest tests**, TypeScript, ESLint, Docker의 Next production build 성공. ruby와 highlight의 범위 결합, 제목에서 부분 한자 읽기 분할 방지, 설정 OFF/수동 보조 우선, 로그인 SSR에서 초기화 전 입력을 받지 않는 동작을 포함한다.
- Python: **13 synthetic converter tests** 성공. rt가 원문에 섞이지 않고 스크립트/이벤트 HTML을 실행하지 않는지 확인했다. 원본 MAX 본문/음성은 fixture에 없다.
- 실제 HTTPS 브라우저 흐름 **22종을 여러 실행에 걸쳐 확인**했다. 첫 19종 전체 실행은 16종 통과했고, 설정 이름 변경 1건과 기존 QA 복습이 없는 범위를 요구한 2건은 테스트를 수정해 개별 재검증했다. QA 진도를 초기화하지 않고 실제 복습 큐를 처리하도록 했으며 `다시`의 저장 응답을 받은 후 큐를 읽도록 했다. 이후 가나 360×640/390×844/360×740을 검증했다. 첫 접속 로그인 테스트의 간헐적인 지연을 계기로 초기화 전 폼 입력을 방지했고, 최종 배포본의 360×640 가나와 후리가나/한글 보조 두 흐름은 다시 통과했다.
- 설정 두 표시 토글과 재접속, 실제 MAX 단어·예문·문법·제목의 원문/읽기/강조, 360/390px 모바일에서 평가 버튼 유지 및 가로 넘침 없음, 태블릿/PC 표시, 로그인/로그아웃/통계/음성 접근권한/Range/음성 디코딩, 단어장 편집·북마크·제외·합성 음성, 레벨 전체 복습·즉시 재연습·빈 큐 안내를 확인했다.
- 화면 스크린샷은 private-data/e2e에만 저장하고 직접 확인했다. WebKit 모바일 에뮬레이션 및 Chromium 검증이며 실제 iPhone/Safari 기기의 발음 품질·화면 검증은 미실행이다.

로그인 폼은 React의 서버/클라이언트 초기 snapshot을 구분해 준비되기 전에 입력과 제출을 받지 않는다. 이는 처음 접속할 때 초기화 전에 입력된 값이 유실될 수 있는 경로를 막는 보강이며, 관찰된 모든 네트워크 지연의 원인을 이것으로 확정하지 않는다. [React 공식 설명](https://react.dev/reference/react/useSyncExternalStore#adding-support-for-server-rendering)을 확인했다.

## 문법 정답 숨김·한글 발음 복구·가나 참고표 (2026-10-05)

### 변경 및 데이터 보존

- 문법 정답 전 한국어 뜻·쓰임·접속을 제거했다. 일본어 문형·원본 강조·예문으로 회상한 뒤 정답과 해설을 공개한다. 단어장 해설은 그대로 제공한다.
- 원본 ruby 조각 사이의 촉음/비음 문맥과 외래어 장음을 보완했다. 원본 읽기를 사전 값으로 바꾸지 않고 읽기가 없는 한자 범위만 보충한다. 미확인 숫자/약어는 `〔원문〕`과 PARTIAL 안내로 구분한다.
- 실제 개인 변환본 전체에 동일한 ReadingGuideFactory를 적용했다. 어휘 9,159개(전체 변환 9,137 / 일부 22), 문법 1,078개(1,075 / 3), 예문 10,998개(10,994 / 4)에서 발음 보조가 생성됐다. 수정 전 누락은 각각 78 / 161 / 1,067개였고 수정 후 누락은 0이다. 원문 출력·본문 재작성·재import는 없다. 집계 기준은 hangul-hints.md에 기록했다.
- `/courses/kana`는 기존 KanaInventory의 기본 46쌍·탁음 20쌍·반탁음 5쌍·요음 33쌍을 재사용한다. 두 문자를 한 셀에 비교하며 검색·분류 이동·서버 저장된 한글 표시 설정을 따른다. 참고 API GET은 학습 상태를 만들지 않는다.
- 배포 전 kanalog DB 백업을 private-data/backups/grammar-kana-20261005에 보관했다. 앱 갱신 뒤 QA 브라우저 검사 전에 기존 23개 테이블의 모든 열(원본 raw_fields 포함)과 행 수/해시를 비교해 **23/23 동일**을 확인했다. DB와 voice 컨테이너·미디어 volume은 유지했다. 이후 QA 검사는 QA 계정에만 학습/세션 기록을 추가한다.

### 검증 결과

- Backend: `ktlintFormat` → `ktlintCheck check bootJar`, **69 tests / 0 failures / 0 errors**. PostgreSQL 16 Testcontainers, 참고 API 인증/104쌍/GET 무상태, ReadingGuide 상태 JSON 계약, 원본 읽기 보존·미상 범위 보완·조각 경계 비음·조사 장음 경계·외래어 장음·부분 안내 포함.
- Frontend: **81 Vitest tests**, TypeScript, ESLint 통과. 문법 학습 전체 화면의 공개 전후 해설, 원본 강조, 한글 설정·부분/불가 안내, 참고표 검색·한글 설정을 검증했다. CSS 마지막 수정 후에도 전체 81개·타입·린트를 다시 통과했다.
- backend/frontend Docker production build 성공. Apple Silicon arm64 호스트에서 기존 Compose 앱 두 컨테이너를 갱신했다. 검색창 수정은 frontend만 추가 갱신했다.
- 실제 공개 주소에서 Chromium/WebKit **5개 흐름 통과**: 긴 문법의 데스크톱/태블릿, 360/390px 모바일, あの 문형 공개 전후, 104쌍 참고표, 기존 후리가나/한글 설정·단어/예문/문법 표시. 본문/원본 강조를 API와 비교하고 설정을 복원했다.
- 스크린샷 직접 확인으로 검색 아이콘 겹침을 발견했다. CSS 공통 field 규칙으로 실제 왼쪽 padding이 13.6px인 것을 새 브라우저 검사 실패로 재현했고 참고표 전용 padding으로 수정했다. 마지막 frontend 배포 뒤 참고표 전체 브라우저 검사를 다시 통과했다(왼쪽 40px 이상/오른쪽 44px 이상, 360/390/768/1280px 화면·셀 넘침 없음, 검색, 분류 이동, 설정 복원, 로그아웃 후 API 401). 최종 390px 스크린샷도 직접 확인했다.
- 공개 URL readiness/HTTPS/Secure 쿠키 검사를 통과했다. 실제 iPhone/Safari 하드웨어 및 오디오 청취 품질은 이번 변경에서 검사하지 않았다.

재현 명령(비밀번호는 private QA 파일에서만 읽는다):

```sh
JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home backend/gradlew -p backend ktlintCheck check bootJar
pnpm --dir frontend test
pnpm --dir frontend exec tsc --noEmit
pnpm --dir frontend lint
E2E_BASE_URL=https://kanalog.hanwook.me python3 tools/e2e/run_live.py e2e/kana-reference.spec.ts e2e/grammar-layout.spec.ts e2e/grammar-desktop.spec.ts e2e/readings.spec.ts
E2E_BASE_URL=https://kanalog.hanwook.me python3 tools/e2e/check_deployment.py
```
