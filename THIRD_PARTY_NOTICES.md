# 외부 코드·글꼴·콘텐츠 고지

Kanalog 자체 소스 코드의 공개 라이선스는 아직 정하지 않았다. 아래 고지는 각 외부 구성 요소의 권리와 배포 범위를 구분한다.

## 앱 코드 의존성

| 구성 요소 | 용도 | 확인한 조건 |
| --- | --- | --- |
| [java-fsrs 1.0.0](https://github.com/open-spaced-repetition/java-fsrs) | 서버의 복습 간격 계산 | MIT. [저작권 및 라이선스 전문](docs/licenses/java-fsrs-MIT.txt) 포함 |
| [Kotlin](https://github.com/JetBrains/kotlin), [Spring Boot](https://github.com/spring-projects/spring-boot), [Next.js](https://github.com/vercel/next.js), [React](https://github.com/facebook/react), [TanStack Query](https://github.com/TanStack/query), [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss) | 앱 실행·UI | 각 배포물의 원래 라이선스 적용. 정확한 버전은 `backend/gradle/libs.versions.toml`, `backend/build.gradle.kts`, `frontend/pnpm-lock.yaml` 참조 |
| [ktlint 1.8.0](https://github.com/ktlint/ktlint/releases/tag/1.8.0), [ktlint-gradle 14.2.0](https://github.com/JLLeitschuh/ktlint-gradle/releases/tag/v14.2.0) | 개발 시 Kotlin 형식 검사·자동 포맷 | 각 고정 tag의 [ktlint MIT](https://github.com/ktlint/ktlint/blob/1.8.0/LICENSE), [plugin MIT](https://github.com/JLLeitschuh/ktlint-gradle/blob/v14.2.0/LICENSE.txt) 확인. 버전은 catalog, formatter 의존성은 `backend/gradle.lockfile`로 고정 |
| [PostgreSQL](https://www.postgresql.org/about/licence/) | 개인 데이터 DB | PostgreSQL License. Compose 이미지와 앱 코드는 별개 |
| [Supertonic web helper](https://github.com/supertone-oss-archive/supertonic/tree/1e9799e964ea4c0dad7cde993b65c3c813a7b373) | 브라우저·내부 서버 음성 계산 | MIT. 수정한 helper와 원래 LICENSE를 `frontend/src/vendor/supertonic`에 포함 |
| [ONNX Runtime Web/Node 1.30.0](https://github.com/microsoft/onnxruntime), [esbuild 0.28.2](https://github.com/evanw/esbuild) | 음성 모델 실행·worker 빌드 | 설치한 패키지의 MIT 조건 확인. 버전은 각 lockfile로 고정. Node Runtime 전문은 `tools/voice-server/licenses/onnxruntime-LICENSE`에 포함 |

Supertonic 3 모델은 코드 helper와 별개다. 공식 모델 저장소 `supertone-oss-archive/supertonic-3`의 고정 revision `aafc6e32416a594460b32413efc49d7fe4ce6d46`을 개인 서버에 다운로드한다. 모델은 OpenRAIL-M이며 Git과 배포 이미지에 포함하지 않는다. 모델의 개별 해시는 개인 디렉터리의 다운로드 manifest에 기록한다.

Anki 및 AnkiWeb의 AGPL 엔진 코드는 사용하지 않는다. APKG 변환기는 Python 표준 라이브러리와 이 프로젝트의 자체 코드만 사용한다.

## 글꼴과 아이콘

`frontend/app/fonts/PretendardVariable.woff2`는 Dutchlog 프런트엔드 골격에서 복사한 Pretendard 파일이다. 원본과 SHA-256이 동일하다: `9599f12fd42fc0bce1cd50b47a0c022e108d7aa64dd0d1bb0ed44f3282d900b4`. Pretendard 및 구성 글꼴의 저작권과 예약 글꼴 이름, SIL Open Font License 1.1 전문은 [동봉한 OFL](frontend/app/fonts/OFL.txt)에 있다. [공식 Pretendard 저장소](https://github.com/orioncactus/pretendard/blob/main/LICENSE)에서 조건을 확인했다. 앱 아이콘은 이 저장소에서 만든 단순 도형과 문자다.

## JLPT MAX 덱·데이터·음성

개인 사용자는 [JLPT MAX 공식 릴리스](https://github.com/truthyblue/jlpt-max-deck/releases/tag/v2.1.2)에서 APKG를 직접 다운로드한다. [공식 NOTICE](https://github.com/truthyblue/jlpt-max-deck/blob/main/NOTICE)는 공식 릴리스의 개인 학습용 다운로드·사용을 허용하며, 덱 전체·추출 데이터·생성 음성의 미러링, 판매, 재포장 또는 재배포 권한을 주지 않는다. 소프트웨어의 AGPL 조건이 덱 콘텐츠에 자동으로 적용되는 것도 아니다.

덱의 일부 필드는 [EDRDG JMdict](https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project)에서 유래하며 별도 저작권 및 CC BY-SA 4.0 조건이 있다. 공식 NOTICE는 포함된 MP3가 AivisSpeech 1.2.0의 まい 모델로 생성되었고 모델 조건이 ACML 1.0이라고 밝힌다. 이를 원어민 녹음으로 표시하지 않는다. 이 저장소와 Docker 이미지에는 APKG, 추출된 학습 본문, MP3를 포함하지 않는다. 세부 출처와 실제 파일 해시는 [데이터 출처](docs/data-sources.md)에 기록했다.
