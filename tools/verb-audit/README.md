# 동사 활용 전수 검수 도구

MAX 원본은 `private-data`에서만 읽는다. Kotlin의 실제 도메인 생성기로 스트리밍 JSONL을 내보내고, 별도로 작성한 Python 정규 활용표로 비교한다. Spring·DB를 시작하거나 학습 상태를 변경하지 않는다.

```sh
./backend/gradlew -p backend verbAuditExport \
  -PverbInput=../private-data/converted/all/notes.jsonl \
  -PverbOutput=../private-data/verb-qa/forms-after.jsonl
python3 tools/verb-audit/audit.py \
  --input private-data/verb-qa/forms-after.jsonl \
  --notes private-data/converted/all/notes.jsonl \
  --report private-data/verb-qa/audit-after.json
python3 -m unittest discover -s tools/verb-audit -p 'test_*.py'
```

입력은 `sourceGuid/front/reading/partOfSpeech/conjugation/dictionary`다. dictionary는 Kuromoji의 실제 known/baseForm/conjugationType/reading/품사 정보이며 단일 기본형·읽기가 일치한 항목만 분류 대조에 사용한다. 원본 manifest를 대조해 빠진 노트와 중복 GUID도 거부한다.

모든 형태의 키·그룹·표기·가나·강조 구간·읽기 구간 복원·한글 존재/COMPLETE, 5단 9개 어미와 확인된 예외를 검사한다. 사전 분류가 대응하지 않는 복합어는 대응 완료로 세지 않는다. `semanticReviewNotes`는 기본 뜻의 비의지성 정책을 적용한 노트 수이며 오류 수나 전문가 검수 완료 수가 아니다. 형태가 맞아도 문맥의 자연성이나 한글 보조의 음성학적 정확성을 자동 보증하지 않는다.

내보내기와 보고서는 `private-data` 아래에만 저장한다. 출력에는 건수만 기록한다. 원본 본문·미디어·사전 페이지는 코드/공개 fixture에 포함하지 않는다. 테스트 5개와 공통 golden 49개는 직접 작성한 합성 예제다.

독립 규칙의 근거 및 최신 수치는 [전수 검수 결과](../../docs/verb-conjugation-review.md)를 참조한다.
