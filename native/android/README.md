# Kanalog Android

Kotlin JVM 코어와 Compose Material 3 앱이다. 서버 로그인 없이 기기 내부의 `profile.json`과 해시로 이름 붙인 음성 파일을 사용한다. 기본 빌드는 공개 가나 208장만 포함한다. MAX 본문과 음성을 포함하려면 로컬 개인 빌드를 선택한다.

```sh
export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
./gradlew :core:test :app:assembleDebug :app:assembleDebugAndroidTest ktlintCheck
./gradlew :app:connectedDebugAndroidTest
./gradlew -PincludePrivateContent=true :app:assembleDebug
./gradlew -PverifyPrivateContent=true :core:test
```

`local.properties`의 `sdk.dir` 또는 `ANDROID_HOME`으로 Android SDK를 지정한다. APK는 `app/build/outputs/apk/debug/app-debug.apk`에 만들어지며 Git에서 제외된다. `includePrivateContent`의 기본값은 false다. 개인 APK에는 private-data의 본문·음성이 들어가므로 공개 배포에 사용하지 않는다.

앱의 학습 탭에서 가나 문자·분류 전체 또는 JLPT 레벨의 단어·문법을 선택한다. 정답 공개 후 네 가지 평가 중 하나를 누르면 원자적 로컬 저장이 성공한 뒤 다음 카드로 이동한다. 가나에는 일일 한도를 적용하지 않는다. 단어와 문법은 복습을 먼저 내보내고 하루 새 카드 수를 시간대별로 계산한다. 새 카드 예약은 단일 저장소 안의 세션 간 중복 배정을 막고 평가 시 한도를 다시 확인한다. 오답은 세션 끝에서 한 번 재연습하며 FSRS 상태를 변경하지 않는 별도 기록으로 남긴다.

설정에서 후리가나·정답 전 힌트·한글 보조·자동 음성·일일 한도(0~100)·시간대를 저장한다. 검색은 북마크와 유형 필터, 개인 단어 추가·편집을 지원하며 상세 화면에서 북마크·제외·메모를 저장한다. 가나표와 통계도 기기에서 동작한다.

콘텐츠 가져오기는 Android 폴더 선택기를 사용한다. 폴더 안의 `manifest.json`은 `personal-content.json` 또는 `content.json`, `media/<sha256>.<확장자>` 각각의 크기와 SHA256을 기록해야 한다. JSON 64MiB, manifest 8MiB, 개별 파일 64MiB, 60,000개 파일, 총 4GiB 한도를 검증한다. 모든 노트와 참조 미디어를 검증한 후 콘텐츠를 적용하며 같은 ID의 진도와 사라진 ID의 기록을 보존한다. 실패 시 활성 콘텐츠와 진도는 유지된다. 해시가 다른 새 음성의 임시 복사가 남아도 활성 기록에는 연결되지 않는다.

노트의 소유 패키지는 `notePackages`에 저장한다. 다른 패키지가 기존 ID나 보관된 ID를 차지하는 것을 거부한다. `personal:` ID는 로컬 개인 단어만 사용하며 가져오기로 교체할 수 없다. 내장 가나와 문자·종류·분류가 같은 항목은 개인 패키지에서 음성만 추가할 수 있고 원래 소유권·본문·학습 기록을 유지한다. 같은 패키지의 새 버전에서 빠진 카드는 검색과 학습에서 비활성화하지만 진도·평가·소유권을 보관하므로 다시 포함되면 이어서 학습한다.

저장소는 프로세스당 하나의 `DeviceProfile` 인스턴스를 활동 재생성 후에도 공유하고 메서드를 직렬화한다. 임시 JSON을 fsync 후 원자적으로 교체하며 성공 응답을 평가 영수증에 보존한다. 여러 프로세스나 별도의 저장소 인스턴스로 동일 파일을 동시에 쓰는 사용법은 지원하지 않는다. 네트워크 전송 구현과 INTERNET 권한은 이번 앱에 포함하지 않으며 다운로드는 후속 선택 기능이다.

원본 음성이 없을 때는 네트워크가 필요 없는 일본어 TTS voice만 선택한다. 그런 voice가 설치되지 않은 기기는 음성 설치 안내를 표시한다. 앱은 기기 설정에서 일본어 오프라인 음성을 별도로 설치해야 할 수 있다.

FSRS는 `java-fsrs/1.0.0`을 사용하고 fuzz를 끈다. 전체 FSRS JSON과 공식 due를 보존하며 다음 날 오답 알림은 별도 `nextDayReminder`에 저장한다. 다음 카드 평가 전에는 고정 요청 key와 카드 version을 확인한다. 코어 테스트와 Android instrumentation 테스트는 서로 다른 검증이다. 기기 없는 환경의 APK 컴파일 성공을 UI 테스트 실행 성공으로 표현하지 않는다.

개인 단어의 읽기는 서버의 순수 Kotlin `ReadingGuide.kt`와 `HangulPronunciation.kt` 두 원본을 빌드 시 선택하여 재사용한다. 서버 실행·데이터베이스·네트워크 의존성은 포함하지 않는다. 입력한 가나와 본문을 정렬할 수 있을 때만 후리가나와 한글 보조를 생성하며 알 수 없는 읽기를 추정하지 않는다. 공유 `reading-fixtures.json`의 한글 14개와 정렬 9개를 코어 테스트에서 확인한다. Gradle wrapper SHA256과 해결된 코어·앱의 전이 의존성 lockfile도 고정한다.
