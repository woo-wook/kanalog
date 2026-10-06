# Kanalog iOS

SwiftUI iPhone/iPad 앱과 Foundation 기반 `KanalogCore` Swift Package입니다. iOS 17 이상을 지원합니다. iOS 26/Xcode 26(Swift 6.2)에서는 시스템 탐색/탭의 Liquid Glass와 주요 버튼의 `glassEffect`를 사용합니다. 이전 OS는 시스템 재질과 표준 버튼을 사용합니다.

학습, 검색, 설정, 개인 단어, 북마크/제외/메모, 진도, 통계, 발음은 서버 없이 동작합니다. 자료·진도를 Application Support에 원자적으로 저장합니다. 파일 잠금으로 여러 저장소 인스턴스의 평가를 직렬화합니다. 저장 실패 시 화면은 같은 카드를 유지합니다. 공식 swift-fsrs revision `4fbaf20184d62f82a9f44f343337c61a2c5483e9`의 FSRS 6 기본 가중치와 단기 학습을 사용하며 fuzz는 끕니다.

## 실행한 검증

```sh
swift test --package-path native/ios
swiftc -parse native/ios/App/*.swift native/ios/UITests/*.swift
xcodegen generate --spec native/ios/project.yml --project native/ios
```

Swift 코어 테스트 실행, SwiftUI 소스의 문법 검사, Xcode 프로젝트 생성은 별개입니다. 현재 환경은 Command Line Tools Swift 6.1.2이며 전체 Xcode/iOS SDK가 없어 iOS 앱 빌드, 시뮬레이터 UI 테스트 및 실제 재생은 실행하지 못했습니다.

## 전체 Xcode가 있는 Mac

XcodeGen 2.46.0을 설치하고 다음 명령을 실행합니다.

```sh
native/ios/scripts/build-ios.sh
xcodebuild -project native/ios/Kanalog.xcodeproj -scheme Kanalog \
  -destination 'platform=iOS Simulator,name=iPhone 17' \
  -derivedDataPath native/ios/DerivedData CODE_SIGNING_ALLOWED=NO test
```

사용 가능한 기기 이름은 `xcrun simctl list devices available`에서 확인합니다. 실제 기기 실행은 Xcode에서 해당 개발자 계정과 팀을 선택해야 합니다. 배포 서명키/개발자 계정은 이 저장소에 생성하지 않습니다.

## 개인 자료

기본 빌드에는 공개 가나 208자만 포함됩니다. `native/ios/scripts/build-ios.sh --private` 또는 `INCLUDE_PRIVATE_CONTENT=1`로 명시적으로 선택하면 빌드 스크립트가 `private-data/native/ios` 개인 패키지를 Git 제외 `Resources/PersonalAssets` 폴더에 준비합니다. 다른 폴더는 `NATIVE_PRIVATE_PACKAGE=/absolute/package/path`로 지정합니다. 앱 설정에서 manifest/JSON/media를 가진 폴더를 직접 가져올 수도 있습니다.

기본 가나의 같은 ID에 원본·개인 일본어 음성을 덧씌워도 연습 상태를 보존합니다. 원본 문법 강조·후리가나·한글 보조는 공통 패키지의 안전한 문자열 모델로 렌더링하며 HTML/JS는 실행하지 않습니다. 정답 공개 전 문법의 한국어 뜻과 해설은 숨깁니다.

개인 패키지 전체 검증은 아래처럼 명시적으로 실행합니다. 테스트는 임시 기기 저장소에만 설치하고 끝난 뒤 지웁니다. 원본 텍스트를 출력하지 않습니다.

```sh
NATIVE_PACKAGE_PATH="$PWD/private-data/native/ios" swift test --package-path native/ios
```

패키지 JSON/미디어 파일 각각 최대 64MiB, manifest 최대 8MiB/60,000 파일, 전체 미디어 포함 최대 4GiB를 허용합니다. schema/type/ID/경로/심볼릭 링크/해시/크기를 검증한 뒤 콘텐츠와 진도를 한 번에 저장합니다. 제거된 콘텐츠의 기존 평가/메모/북마크는 보존합니다. 선택적 HTTPS 다운로드 경계는 학습 코드와 분리되어 있습니다. 현재 공개 catalog나 자동 진도 동기화는 구현하지 않습니다.

공식 API: [Liquid Glass](https://developer.apple.com/documentation/swiftui/applying-liquid-glass-to-custom-views), [AVSpeechSynthesizer](https://developer.apple.com/documentation/avfaudio/avspeechsynthesizer), [swift-fsrs](https://github.com/open-spaced-repetition/swift-fsrs).
