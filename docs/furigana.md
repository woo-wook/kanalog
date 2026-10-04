# 후리가나와 읽기 보조

## 표시 정책

- 설정의 **한자 위에 후리가나 표시**는 기본 켜짐이다. **한글 발음 보조 표시**는 기본 꺼짐이며 가나·단어·문법·예문·단어장 모두에 적용된다.
- **정답 전에도 읽기 힌트 표시**가 꺼져 있으면 단어 카드의 후리가나와 한글 보조는 힌트 또는 정답 확인 뒤 표시한다. 문법 예문은 읽기 시험이 아니라 문형 설명이므로 처음부터 선택한 보조를 표시한다.
- 후리가나를 꺼도 원본 단어의 전체 가나 읽기는 기존 읽기 줄에서 확인할 수 있다. 한글 보조는 아래 별도 패널에 표시한다. 자동 값은 `근사 발음 · 자동`, 직접 입력한 값은 `근사 발음`이다.
- 세 설정 모두 사용자별 서버 DB에 저장된다. 새 기기에서도 적용되며 공개 캐시나 localStorage에 개인 콘텐츠를 저장하지 않는다.

## 읽기 우선순위와 한계

1. MAX 원본 ruby의 base/reading을 typed segment로 보존한다. segment base를 합친 값이 원본 문장과 정확히 같은 경우에만 사용한다. 원본 HTML/템플릿은 실행하지 않는다.
2. 단어에 전체 읽기가 있으면 가나/오쿠리가나를 anchor로 한자 묶음의 읽기를 정렬한다. 메모이제이션으로 가능한 경로를 최대 두 개 찾는다. 유일한 경로만 세분화하며 모호한 경로는 알려진 단어 전체 읽기를 유지한다. 한자 한 글자씩 임의 배분하지 않는다. 표기와 읽기가 맞지 않으면 ruby를 생성하지 않고 원본 전체 읽기를 별도 줄에 유지한다. 길이 및 연산 예산으로 병적인 입력을 제한한다.
3. 원본 읽기가 없는 문장/개인 항목은 **Kuromoji IPADIC 0.9.0**의 형태소 읽기로 보조한다. 자동 사전 읽기는 이름·다의어·숫자·신조어에서 틀릴 수 있다. 읽기 미상 토큰은 ruby를 붙이지 않는다. 알려진 원본 읽기를 사전 값으로 대체하지 않는다.
4. 각 segment를 브라우저의 native `<ruby>/<rt>`로 렌더링한다. 원본 문법 강조 위치와 ruby의 base 위치를 별도로 계산해 강조를 보존한다. 문법 제목도 강조 범위에 온전히 포함된 원본 ruby 묶음만 표시하며, 부분 한자 묶음의 읽기를 임의로 나누지 않는다. 모바일 한 줄에 넣기 어려운 8글자 초과 묶음은 ruby를 생략한다. 원본 전체 읽기가 있는 단어는 별도 가나 읽기 줄에서 확인할 수 있다. 읽기 길이에 따라 rt 크기를 제한해 주변 글자와 겹침을 줄인다.

이 방식은 모든 한자별 읽기의 정답을 추정하는 알고리즘이 아니다. 알려진 읽기/원본 표기를 우선하며 불확실한 분할을 피하는 방식이다. 자동 한글 보조도 정확한 음성이나 악센트를 대신하지 않는다.

## 실제 원본 복원 (2026-10-04)

공식 2.1.2 APKG의 기존 SHA-256 검증 후 collection만 읽었다. 기존 변환 JSONL의 원문이 같은지 확인하고 메타데이터를 추가했다. 원문/음성은 Git과 이미지에 포함하지 않는다.

| 범위 | 노트 | 문법 ruby 복원 | 예문 ruby 복원 | 원본 ruby 없는 예문 |
|---|---:|---:|---:|---:|
| 전체 기존 지원 범위 | 10,237 | 1,078 | 10,976 | 22 |
| N5 QA 범위 | 878 | 99 | 1,006 | 10 |

예문의 원본 가나 읽기는 과거 plain-text 변환에서 제거되었으므로 원본 ruby 메타데이터로 복원했다. 원본이 없는 항목은 사전 기반 읽기를 사용하며 모든 항목의 자동 읽기를 사람이 검수했다고 주장하지 않는다. API `ReadingGuide.source`는 `ORIGINAL / READING / DICTIONARY / NONE`을 구분한다. `hangulSource`는 `MANUAL / APPROXIMATE`이다.

## 메타데이터 갱신

DB 및 변환 JSONL을 백업한 후 기존 계정의 실제 import 범위와 일치하는 디렉터리를 사용한다.

```sh
python3 tools/deck-import/enrich_readings.py \
  private-data/downloads/JLPT-MAX-Deck-2.1.2.apkg private-data/converted/all

docker compose run --rm --no-deps -T backend \
  --spring.main.web-application-type=none \
  --app.cli=refresh-readings --app.email=YOUR_EMAIL \
  --app.input-dir=/app/import/all
```

APKG의 실제 경로를 지정한다. N5만 import한 계정에는 변환/갱신 모두 `n5`를 사용한다. APKG 스트리밍 checksum, ZIP 제한/경로 검증, 원본 GUID와 원문 일치를 확인한다. 변환은 마지막에 JSONL을 원자적으로 교체하며 미디어를 다시 추출하지 않는다. Kotlin 명령은 소유자/출처/버전/원문/예문/음성 참조를 검사하고 한 트랜잭션으로 `raw_fields`만 갱신한다. 카드/노트/예문/음성 ID, 본문, updated_at, 복습 상태 및 로그는 수정하지 않는다. 같은 명령을 재실행해도 동일한 메타데이터가 유지된다. 향후 신규 변환은 `convert_max.py`에서 처음부터 ruby를 보존한다.

## 근거 및 의존성

- [HTML Standard ruby](https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-ruby-element)
- [Kuromoji 공식 저장소와 API](https://github.com/atilika/kuromoji/tree/0.9.0): JVM 내부의 사전 처리만 사용한다. 별도 외부 API 비용은 없다.
- 코드 Apache-2.0과 IPADIC 사전 고지는 `backend/src/main/resources/META-INF/licenses/kuromoji`에 보존되어 JAR에도 포함된다. 런타임 의존성은 Gradle lockfile로 고정한다.
