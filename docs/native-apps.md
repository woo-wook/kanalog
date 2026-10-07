# 독립 실행 네이티브 앱

## 목표와 결정

Android는 Kotlin/Compose Material 3, iOS는 Swift/SwiftUI로 작성한다. iOS 26 이상에서는 시스템 TabView/NavigationStack 및 주요 동작에 Liquid Glass를 적용하고 이전 버전에서는 표준 시스템 재질을 사용한다. 본문 전체를 반투명하게 만들지 않는다.

서버 로그인 없이 기기 로컬 프로필로 가나, 단어, 문법을 연습한다. 콘텐츠 식별자와 개인 학습 상태의 책임을 분리하며 평가 저장 완료 후에만 다음 카드로 이동한다. 원본 문법 강조, 후리가나, 선택적인 한글 보조, 일본어 음성, 북마크/제외, 검색, 통계, 설정을 제공한다. 기본 가나는 코드 소유 콘텐츠이며 실제 MAX는 개인 패키지로 따로 준비한다.

## 패키지 계약 v1

JSON UTF-8: `{schemaVersion:1, packageId, version, notes:[...]}`. 최대 64MiB, 30,000 notes. 노트는 `{id,kind,level,group,front,reading,meaning,grammarFocus,readingGuide,examples,audio}`. `kind`는 hiragana/katakana/vocabulary/grammar. 가나 group은 basic/voiced/semiVoiced/yoon, 급수는 N5..N1 또는 null. `id`는 원본 GUID + 방향을 포함하며 버전에 따라 바꾸지 않는다. 모든 선택적 문자열/객체는 null 또는 생략 가능하다.

`grammarFocus`, `readingGuide`, `examples`의 읽기 구조는 기존 웹 API와 같다. 예문은 `{japanese,reading,korean,readingGuide,audio}`. audio는 `media/<SHA256>.<확장자>` 상대 경로이며 HTTP URL/절대 경로/../를 허용하지 않는다. 본문 HTML이나 원본 template JS를 실행하지 않는다. 부속 manifest는 전체 JSON 및 미디어의 SHA256/크기를 기록한다.

패키지 적용은 전체 검증 후 원자적으로 수행한다. 동일 packageId/version/id 재적용은 중복을 만들지 않는다. 콘텐츠 업데이트는 동일 id의 FSRS, 평가 기록, 메모, 북마크/제외 상태를 보존한다. 빠진 항목의 기록도 삭제하지 않는다.

## 로컬 학습

- 기기별 상태와 설정을 Application Support/내부 앱 파일에 저장한다. JSON 상태를 원자적으로 교체해 콘텐츠 변경과 평가 로그를 함께 확정한다. Android는 프로세스 단일 인스턴스에서 직렬화하고, Swift는 파일 잠금과 재로딩으로 여러 인스턴스의 충돌을 처리한다. 로컬 profile JSON에는 콘텐츠와 상태를 함께 원자적으로 기록한다.
- FSRS는 재사용 라이브러리로 기기에서 계산한다. Android java-fsrs 1.0.0, Swift swift-fsrs revision `4fbaf20184d62f82a9f44f343337c61a2c5483e9`을 고정한다. 난수/fuzz를 끄고 시간은 테스트에 주입한다. 라이브러리별 전체 상태 JSON과 scheduler 버전을 저장한다.
- 새 카드 기본 10장/일, timezone Asia/Seoul. 복습을 우선하고 급수/유형을 사용자가 선택한다. 가나는 한도 없이 선택한 분류 전체를 섞으며 어려운 평가를 다음 연습의 우선순위에 반영한다.
- 답변마다 고정 key와 카드 version을 확인한다. 같은 key/내용은 이전 성공 반환, 다른 내용은 충돌. 저장 실패는 다음 화면으로 진행하지 않는다.
- 틀린 카드는 세션 끝에서 즉시 한 번 더 연습한다. 같은 평가를 무한히 추가하지 않는다. 일반 복습은 공식 FSRS due, 즉시 연습은 별도 보강 기록으로 분리한다. 첫 오답의 다음날 알림은 `nextDayReminder`로 보관하며 공식 due를 덮어쓰지 않는다.

## 선택적 다운로드 경계

ContentPackageInstaller는 로컬 파일을 검증/적용하며 네트워크를 알지 못한다. 향후 catalog API는 packageId/version/schemaVersion/bytes/sha256/인증된 download URL을 제공한다. 클라이언트 DownloadTransport는 HTTPS로 임시 파일을 내려받아 크기·해시를 확인한 뒤 동일 installer에 전달한다. 다운로드·검증이 실패해도 현재 콘텐츠와 진도는 그대로 유지한다. 시작·학습·설정 저장에는 서버를 호출하지 않는다. progress sync는 별도 후속 범위다.

## 환경 검증

시작할 때 Mac에는 Android SDK와 전체 Xcode가 없었다. Android SDK/API 36 ARM 에뮬레이터를 준비해 APK와 실제 오프라인 흐름을 검증했다. 로컬 Swift 6.1.2 코어 테스트와 GitHub macOS Xcode 26.6 앱 빌드는 별도로 검증했다. iOS 시뮬레이터 UI 결과는 `docs/verification.md`에 기록하며 로컬 Mac의 iOS 실행에는 여전히 전체 Xcode가 필요하다. App Store/Play Store 등록, 개발자 계정 생성, 서명키 생성·배포는 이번 작업에 포함하지 않는다.

## 공식 근거

- https://developer.android.com/jetpack/androidx/releases/compose-material3
- https://developer.apple.com/documentation/swiftui/applying-liquid-glass-to-custom-views
- https://github.com/open-spaced-repetition/java-fsrs
- https://github.com/open-spaced-repetition/swift-fsrs


## 실제 개인 패키지

MAX 2.1.2의 지원하는 어휘 9,159개·문법 1,078개와 자체 가나 208개를 준비했다. 앱 노트 10,445개, 음성 20,259개(원본 MAX 20,155개 + 미리 생성한 가나 104개), 패키지 버전 `2.1.2+kana-audio1`이다. 가타카나는 같은 가나 발음을 재사용한다. 패키지 용량은 약 796MB로, Git/공개 CI에는 포함하지 않는다.

전체 원본 20,650 notes/38,967 cards와 앱 노트 수는 다르다. 실전 문제·다른 원본 카드 방향의 완전 재현은 포함하지 않는다. 미디어와 원본 읽기·문법 강조를 보존한 지원 항목만 사용하며 세부 집계는 `docs/data-sources.md`를 따른다.

기본 공개 빌드에는 자체 가나만 들어간다. 개인 빌드에서 명시적으로 MAX 패키지를 포함하거나 설정의 폴더 가져오기를 사용한다. 최초 개인 패키지 검증은 파일이 많아 시간이 걸리며, 이후 앱 재시작은 설치된 로컬 자료를 재사용한다. 서버가 꺼져도 기록과 음성 파일은 남는다.

## 빌드·내려받기 경계

```sh
# 저장소 루트. 기존 offline APKG 변환 결과를 재사용한다.
export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
backend/gradlew -p backend nativeExport
python3 tools/native-content/build_pack.py --kana-audio-dir private-data/native/kana-audio
python3 tools/native-content/verify_pack.py private-data/native/android

# 공개 가나 빌드 / 개인 빌드는 명시적으로 선택
native/android/gradlew -p native/android :core:test ktlintCheck :app:assembleDebug
native/android/gradlew -p native/android -PincludePrivateContent=true :app:assembleDebug
native/ios/scripts/build-ios.sh --private
```

가나 WAV 생성은 빌드 때만 기존 로컬 Supertonic 계산기를 사용한다. `tools/native-content/build_kana_audio.py --port 8091` 실행 전에 `tools/voice-server`에서 `PORT=8091 HOST=127.0.0.1 node app.mjs`를 기동한다. 앱 런타임에는 이 프로세스나 ONNX 모델을 넣지 않는다. 원본 음성이 없는 개인 입력은 설치된 일본어 기기 음성을 선택하며 음성 미설치 상태를 안내한다.

향후 catalog 예시:

```json
{"packageId":"licensed-japanese-n5","version":"1","schemaVersion":1,"manifestUrl":"https://example.invalid/packages/n5/manifest.json","bytes":1234,"sha256":"<64 hex>"}
```

manifest는 각 파일의 상대 경로·크기·SHA256을 제공한다. 인증 헤더/다운로드 URL은 전송 계층에만 두고 로컬 학습 저장소에 넘기지 않는다. Swift에는 HTTPS 임시 다운로드 구현이 있으며 Android는 전송 인터페이스와 로컬 installer를 준비했다. Android INTERNET 권한과 HTTP 구현은 미래 다운로드 기능을 켤 때 추가한다. 현재 서버 catalog/API 및 웹 진도 동기화는 제공하지 않는다.

## 공통 읽기와 화면 원칙

Android는 서버의 순수 Kotlin 가나 정렬·한글 근사 변환만 빌드 시 복사하여 사용한다. Spring·DB를 가져오지 않는다. Swift 포트와 웹/서버는 동일한 한글 14개·읽기 정렬 9개 golden fixture를 통과해야 한다. 모호한 한자 읽기는 억지로 ruby를 만들지 않는다.

웹과 Android는 청록색 Material 3 역할 색상, tonal surface, 둥근 버튼과 선택 표시를 사용한다. iOS는 같은 기능과 콘텐츠를 SwiftUI 탐색·폼·iOS 26 Liquid Glass로 표현한다. 앞으로 변경 시 세 플랫폼과 공통 fixture를 함께 확인한다.
