# 공개 앱 다운로드 게시

`/download`는 웹 로그인 없이 열린다. `/downloads/<검사된 SHA 앞 12자리 파일명>.apk`는 공개 가나 빌드만 제공한다. 계정/개인 덱/미디어 API와 분리된 파일 배포이며 Next.js에 학습 백엔드를 추가하지 않는다.

## Android

이전에 개인 콘텐츠로 빌드한 적이 있다면 Android incremental APK가 제거한 ZIP 데이터의 물리적 잔여 바이트를 남길 수 있다. **앱 build를 clean한 후** 공개 APK를 빌드한다. 기기에 설치하거나 기기 진도를 지우는 명령이 아니다.

```sh
export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
native/android/gradlew -p native/android -PincludePrivateContent=false :app:clean :app:assembleDebug
python3 tools/app-downloads/publish.py \
  --apk native/android/app/build/outputs/apk/debug/app-debug.apk \
  --build-tools "$ANDROID_HOME/build-tools/36.0.0" \
  --output public-downloads
python3 -m unittest discover -s tools/app-downloads -p 'test_*.py'
docker compose up -d --no-deps frontend
```

`ANDROID_HOME`은 설치된 SDK 경로이며 이 Mac은 `/Users/doyle/Library/Android/sdk`를 사용한다. 게시 도구는 APK 크기 제한, ZIP 경로/중복/asset allowlist, 공개 저장소 fixture와의 바이트 일치, 가나 208자, apksigner 서명, 실제 package/minSDK/version/debuggable을 확인한다. 새 해시 파일을 만들고 `manifest.json`을 원자적으로 교체한다. APK와 manifest는 Git/이미지에서 제외되는 `public-downloads`에 둔다. 개인 APK·MAX·음성·진도·키를 이 폴더에 넣지 않는다.

페이지는 서버의 `APP_DOWNLOAD_ROOT` manifest와 실제 파일 크기를 확인한다. 없거나 손상되면 다운로드 버튼 대신 준비 상태를 표시한다. 공개 다운로드는 현재 manifest의 APK만 허용하며 다른 파일과 symlink는 거부한다. HEAD, 단일 byte Range와 파일명 해시의 immutable cache를 지원한다. volume은 `/app/downloads`에 read-only로 연결한다. `pnpm dev`는 기본으로 `../public-downloads`를 읽는다.

현재 APK는 Android 8.0(API26) 이상, 개발용 debug 서명이며 기본 가나만 포함한다. 어휘/문법은 사용자가 자신의 콘텐츠 패키지를 가져온다. 앱 기록은 기기 로컬이며 웹 기록과 동기화되지 않는다. Play Store용 릴리스/사용자 서명키는 이번 기능에서 만들지 않는다.

## iOS와 웹

실제 설치 가능한 서명 IPA/TestFlight/App Store 경로가 없으므로 iOS는 준비 상태로 보여준다. 시뮬레이터 빌드를 설치 파일이라고 표시하지 않는다. Safari에서 웹 로그인 후 홈 화면에 추가하는 경로를 안내한다. iOS 서명 배포를 진행할 때 이 페이지에 실제 배포 경로를 추가한다.

공식 참고: [Next Route Handler](https://nextjs.org/docs/app/api-reference/file-conventions/route), [Android 서명](https://developer.android.com/studio/publish/app-signing), [Apple 웹앱 안내](https://support.apple.com/ko-kr/guide/iphone/iph42ab2f3a7/ios).
