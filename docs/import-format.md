# JLPT MAX 변환 형식

`tools/deck-import/convert_max.py`는 공식 v2.1.2 APKG의 `collection.anki21` SQLite와 `media` JSON manifest를 읽는 오프라인 변환기다. Python 3.9 이상 표준 라이브러리만 쓴다. 임의 APKG 전체 호환은 제공하지 않는다.

```sh
python3 tools/deck-import/convert_max.py \
  private-data/downloads/JLPT-MAX-Deck-2.1.2.apkg \
  private-data/converted/n5 --scope n5
```

`--scope vocabulary-and-grammar`는 N1~N5의 어휘 인식과 문법 카드를 변환한다. 기본 `n5`는 처음 학습할 N5만 변환한다. 공식 SHA-256을 기본으로 확인한다. `--skip-hash`는 직접 만든 테스트 fixture에만 사용한다. 출력 디렉터리는 개인 저장 영역에 둔다.

공식 릴리스 다운로드와 변환 결과 검증도 별도 명령으로 재현할 수 있다.

```sh
python3 tools/deck-import/download_max.py private-data/downloads
python3 tools/deck-import/verify_conversion.py private-data/converted/n5
```

실제 덱 본문을 포함하지 않는 합성 APKG 회귀 테스트는 다음 명령으로 실행한다.

```sh
python3 -m unittest discover -s tools/deck-import -p 'test_*.py' -v
```

## 출력

- `notes.jsonl`: 한 줄에 앱 카드 하나. 공통 필드는 `schemaVersion`, `sourceVersion`, `sourceNoteId`, `sourceGuid`, `sourceCardId`, `cardDirection`, `deckPath`, `kind`, `level`, `front`, `tags`다.
- 어휘 행: `reading`, `meaning`, `partOfSpeech`, `wordAudio`, `examples` 배열. 각 예문은 `japanese`, `reading`, `korean`, `audio`를 가진다. 현재 `ExamplesRendered`의 ruby를 제거해 일본어 본문과 한국어 해석을 추출하므로 예문 `reading`은 빈 문자열이다.
- 문법 행: `answer`, `grammarKind`, `unitId`. `FrontHTML`과 `BackHTML`은 태그와 스크립트를 제거한 일반 텍스트다. 원본의 복잡한 표 스타일은 보존하지 않는다.
- `media.jsonl`: `name`, 변환 디렉터리 기준 상대 `path` (`media/<name>`), `sha256`, `contentType`. 예전 변환본은 절대 경로를 가질 수 있으므로 검증기는 둘 다 읽는다. DB importer는 `name`을 검사하고 입력 디렉터리의 `media/<name>`에서만 파일을 읽는다.
- `media/`: 참조된 음성 원본. API는 이 경로를 외부에 직접 노출하지 않고 계정 소유권을 확인해야 한다.
- `report.json`: 원본 note/card/media 수, 변환 카드와 하위 덱별 수, 제외 사유별 카드 수, 추출·누락 미디어 수. 원본 본문을 담지 않는다.

DB 반영 시 `sourceGuid`와 `cardDirection`을 소유자·콘텐츠 출처 범위에서 안정적인 키로 사용한다. `sourceCardId`와 원본 덱 경로도 추적용으로 저장한다. 재변환과 재import는 기존 사용자 학습 상태와 ReviewLog를 삭제하거나 초기화하지 않아야 한다. 원본 card ID의 버전 간 불변성은 공식 보장으로 확인되지 않았으므로 GUID와 방향을 주 키로 삼는다. 변환 중 오류가 나면 DB 반영 전에 멈추고, DB import는 별도 서비스가 트랜잭션과 사용자 소유권을 처리한다.

어휘의 `examples` 배열은 순서를 유지해 `note_example`에 저장하고 각 항목의 음성 ID를 연결한다. 카드 API는 모든 예문을 반환한다. 변환 report에 미디어 누락이 있거나 JSONL의 음성 이름이 media map과 일치하지 않으면 import를 실패 처리한다.

## 안전성과 한계

ZIP 엔트리 이름은 한 단계의 안전한 파일명만 허용하고 중복 이름을 거부한다. 압축 파일 2 GB, 전체 해제 3 GB, 개별 항목 500 MB, 항목 50,000개의 제한을 둔다. DB 파일은 임시 디스크에 스트리밍 추출하고 미디어도 한 파일씩 처리한다. 노트 HTML의 스크립트와 원본 카드 템플릿은 실행하지 않는다. 손상된 압축, 다른 note type, 필드 개수 차이, 미디어 누락은 오류 또는 report에 명시한다. 출력에 `report.json`이 생성되기 전까지 완료된 변환으로 취급하지 않는다. 재실행은 같은 출력 파일을 갱신하며 기존 DB 진도에는 직접 접근하지 않는다.
