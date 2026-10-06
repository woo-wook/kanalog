# 독립 실행 네이티브 앱

## 목표와 결정

Android는 Kotlin/Compose Material 3, iOS는 Swift/SwiftUI로 작성한다. iOS 26 이상에서는 시스템 TabView/NavigationStack 및 주요 동작에 Liquid Glass를 적용하고 이전 버전에서는 표준 시스템 재질을 사용한다. 본문 전체를 반투명하게 만들지 않는다.

서버 로그인 없이 기기 로컬 프로필로 가나, 단어, 문법을 연습한다. 콘텐츠와 상태는 분리하며 평가 저장 완료 후에만 다음 카드로 이동한다. 원본 문법 강조, 후리가나, 선택적인 한글 보조, 일본어 음성, 북마크/제외, 검색, 통계, 설정을 제공한다. 기본 가나는 코드 소유 콘텐츠이며 실제 MAX는 개인 패키지로 따로 준비한다.

## 패키지 계약 v1

JSON UTF-8: `{schemaVersion:1, packageId, version, notes:[...]}`. 최대 64MiB, 30,000 notes. 노트는 `{id,kind,level,group,front,reading,meaning,grammarFocus,readingGuide,examples,audio}`. `kind`는 hiragana/katakana/vocabulary/grammar. 가나 group은 basic/voiced/semiVoiced/yoon, 급수는 N5..N1 또는 null. `id`는 원본 GUID + 방향을 포함하며 버전에 따라 바꾸지 않는다. 모든 선택적 문자열/객체는 null 또는 생략 가능하다.

`grammarFocus`, `readingGuide`, `examples`의 읽기 구조는 기존 웹 API와 같다. 예문은 `{japanese,reading,korean,readingGuide,audio}`. audio는 `media/<SHA256>.<확장자>` 상대 경로이며 HTTP URL/절대 경로/../를 허용하지 않는다. 본문 HTML이나 원본 template JS를 실행하지 않는다. 부속 manifest는 전체 JSON 및 미디어의 SHA256/크기를 기록한다.

패키지 적용은 전체 검증 후 원자적으로 수행한다. 동일 packageId/version/id 재적용은 중복을 만들지 않는다. 콘텐츠 업데이트는 동일 id의 FSRS, 평가 기록, 메모, 북마크/제외 상태를 보존한다. 빠진 항목의 기록도 삭제하지 않는다.

## 로컬 학습

- 기기별 상태와 설정을 Application Support/내부 앱 파일에 저장한다. JSON 상태를 원자적으로 교체해 콘텐츠 변경과 평가 로그를 함께 확정한다. 읽기와 쓰기는 단일 저장소 인스턴스에서 직렬화한다.
- FSRS는 재사용 라이브러리로 기기에서 계산한다. Android java-fsrs 1.0.0, Swift swift-fsrs의 검토한 commit을 고정한다. 난수/fuzz를 끄고 시간은 테스트에 주입한다. 라이브러리별 전체 상태 JSON과 scheduler 버전을 저장한다.
- 새 카드 기본 10장/일, timezone Asia/Seoul. 복습을 우선하고 급수/유형을 사용자가 선택한다. 가나는 한도 없이 선택한 분류 전체를 섞으며 어려운 평가를 다음 연습의 우선순위에 반영한다.
- 답변마다 고정 key와 카드 version을 확인한다. 같은 key/내용은 이전 성공 반환, 다른 내용은 충돌. 저장 실패는 다음 화면으로 진행하지 않는다.
- 틀린 카드는 세션 끝에서 즉시 한 번 더 연습한다. 같은 평가를 무한히 추가하지 않는다. 일반 복습은 공식 FSRS due, 즉시 연습은 별도 보강 기록으로 분리한다.

## 선택적 다운로드 경계

ContentPackageInstaller는 로컬 파일을 검증/적용하며 네트워크를 알지 못한다. 향후 catalog API는 packageId/version/schemaVersion/bytes/sha256/인증된 download URL을 제공한다. 클라이언트 DownloadTransport는 HTTPS로 임시 파일을 내려받아 크기·해시를 확인한 뒤 동일 installer에 전달한다. 다운로드·검증이 실패해도 현재 콘텐츠와 진도는 그대로 유지한다. 시작·학습·설정 저장에는 서버를 호출하지 않는다. progress sync는 별도 후속 범위다.

## 환경 검증

현재 Mac에는 전체 Xcode 및 Android SDK가 없었다. Android 도구를 별도 SDK 디렉터리에 준비한다. Swift 코어는 macOS에서 실행 검증하며 iOS UI 빌드/시뮬레이터는 전체 Xcode 확인 후 수행한다. App Store/Play Store 등록, 개발자 계정 생성, 서명키 생성·배포는 이번 작업에 포함하지 않는다.

## 공식 근거

- https://developer.android.com/jetpack/androidx/releases/compose-material3
- https://developer.apple.com/documentation/swiftui/applying-liquid-glass-to-custom-views
- https://github.com/open-spaced-repetition/java-fsrs
- https://github.com/open-spaced-repetition/swift-fsrs
