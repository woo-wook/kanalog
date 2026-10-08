# 동사 활용 전수 검수 — 2026-10-08

## 대상과 결과

개인 MAX 2.1.2 변환본 어휘 9,159개 중 동사 품사 **3,361개 전부**를 읽어 Kotlin 실제 생성 결과를 별도의 Python 규칙표와 대조했다. 원문·음성·개별 GUID 보고서는 `private-data/verb-qa`에만 보관한다.

| 항목 | 수정 전 | 수정 후 |
| --- | ---: | ---: |
| 대상/생성 노트 | 3,361 | 3,361 |
| 생성 활용형 | 70,546 | 70,399 |
| 검사 오류 | 53 | 0 |
| 오류가 있는 고유 노트 | 48 | 0 |
| 누락/미생성 노트 | 0 | 0 |

오류 53건은 노트별 형태 집합·분류·표기 대조 항목 수다. 잘못된 예외 형태를 고치고 초보자용 기본 뜻에 부적절한 147형태를 제외했다. 최종 분류는 **5단 965·1단 491·する 1,902·くる 3**이다. 원본 본문·카드 ID·FSRS 상태·DB schema·콘텐츠 패키지는 바꾸지 않는다.

검사는 원본 GUID 전체 포함/중복 방지, 원본 표기·읽기·품사 보존, 형태 키/그룹, 5단 9개 어미와 예외의 일본어·가나, `stem+suffix`, 기본형 무강조, 읽기 구간의 전체 복원, 한글 보조의 존재/COMPLETE를 확인한다. 직접 작성한 공통 **49개 golden**에서 Kotlin·Android·Swift의 결과를 비교한다.

## 수정 정책과 근거

| 항목 | 적용 정책 | 공식/사전 근거 |
| --- | --- | --- |
| 정규 활용 | 5단 9개 어미·1단·する·来る, 최대 21형태 | [국제교류기금 활용표](https://www.kyozai.jpf.go.jp/kyozai/material/BTS00012/ja/render.do) |
| くれる/呉れる | 명령 `くれ`, 가능·수동·희망·의지·てください 요청 제외: 16형태 | [국제교류기금 설명](https://www.jpf.go.jp/j/project/japanese/teach/tsushin/grammar/201412.html), [NINJAL 동사 핸드북](https://www2.ninjal.ac.jp/verbhandbook/headwords/%E3%81%8F%E3%82%8C%E3%82%8B.html) |
| ある와 복합어 | `ない/なかった`, `気がない`; 일반 예제로 부적절한 10형태 제외: 11형태 | [NINJAL 문법 자료](https://repository.ninjal.ac.jp/record/1862/files/kk_nkss_022.pdf) |
| いる/居る | `いている` 제외: 20형태 | 상태 동사의 기본 의미와 진행형 구분 |
| できる/出来る | 직접 가능·수동·희망·의지·명령·사역·사역 수동·요청·금지 제외: 12형태. `できている`는 완료/결과의 쓰임 | [JPF 가능형 예외](https://www.kyozai.jpf.go.jp/kyozai/material/BTS00063/ja/render.do), [IPAL](https://www2.ninjal.ac.jp/dictionaries/IPALBV/pdf_dir/%E3%81%A7%E3%81%8D%E3%82%8B.pdf) |
| 비의지적인 기본 뜻 | 확인한 표기/읽기 조합에서 의지·명령·가능 제외. 다른 뜻/문맥의 존재까지 부정하지 않음 | [JPF 의지/비의지 동사](https://www.kyozai.jpf.go.jp/kyozai/material/BTS00003/ja/render.do) |
| 分かる/わかる·知る | 가능 제외; 分かる 수동 제외 | [JPF 가능형 예외](https://www.kyozai.jpf.go.jp/kyozai/material/BTS00063/ja/render.do), [NINJAL 分かる](https://www2.ninjal.ac.jp/verbhandbook/headwords/%E5%88%86%E3%81%8B%E3%82%8B.html) |
| 駆ける/かける | 혼합 원본 품사 대신 현대 1단. 그 밖의 미확인 1단/5단 혼합 분류는 거부 | [NINJAL IPAL](https://www2.ninjal.ac.jp/dictionaries/IPALBV/pdf_dir/%E3%81%8B%E3%81%91%E3%82%8B4.pdf) |
| 準ずる/准ずる | 원본 サ변을 안내하고 검증된 현대 동의형 準じる/准じる의 1단 활용 표시 | [準ずる](https://kotobank.jp/word/%E6%BA%96%E3%81%9A%E3%82%8B-529987), [準じる](https://kotobank.jp/word/%E6%BA%96%E3%81%98%E3%82%8B-529969) |
| ゆく | て/た형 읽기 `いって/いった`; 사전형 `ゆく` 유지 | [디지털대사천 行く](https://kotobank.jp/word/%E8%A1%8C%E3%81%8F-431393) |
| なさる 등 존경 동사 | 정중형 어간과 명령 예외, 나머지는 확인된 분류 | [JPF 존경어](https://www.kyozai.jpf.go.jp/kyozai/material/BMA00088/ja/render.do), [디지털대사천 為さる](https://kotobank.jp/word/%E7%82%BA%E3%81%95%E3%82%8B-588647) |
| 思う·拾う의 한글 보조 | 읽기 구간의 모라 경계를 전달해 `오모우/히로우`로 일치 | 기존 KanaAlignment/HangulPronunciation 계약의 공통 회귀 |

## 사전 교차 비교와 한계

Kuromoji IPADIC 0.9.0의 단일 기본형·읽기와 일치한 **1,373노트**에서 분류를 비교했다. 현대 분류/동음 의미가 확인된 예외 4노트는 별도 정책으로 기록했다. 복합어·명사+する 등 **1,988노트**는 단일 사전 기본형과 대응하지 않아 사전 확인 완료로 세지 않는다. 이들도 원본 품사와 독립 정규 활용 규칙으로 전체 형태를 비교했다.

추가로 [NINJAL 기본동사 용법 데이터베이스 2026.02](https://www2.ninjal.ac.jp/basicverbbank/about.html)의 실제 목록과 겹치는 621표제어/655노트를 조사했다. 읽기가 직접 대응하는 형태 8,646개를 비교했으며 비교 자료에 **15개 읽기 차이(11표제어)**가 있었다. `植える`의 ら抜き 가능형, `浮く` 항목의 `浮かぶ` 정중형, 존경/별도 동사 형태처럼 비교 대상이 다른 경우와 규칙표 차이를 구분했다. 다른 자료의 표를 무조건 복사하지 않고 공식 활용표·사전 분류를 기준으로 삼았다. 비교 페이지나 설명·음성은 앱/공개 저장소에 포함하지 않았다.

**0오류는 위 형태·계약·분류 검사의 결과이며, 모든 뜻과 문맥의 자연성을 전문가가 검수했다는 뜻은 아니다.** 활용표는 형태 비교용이다. 주어·의미·상황에 따라 일부 형태가 부적절하거나 별도 구성이 필요할 수 있다. 한글은 근사 보조이며 전수 청취/음성학적 인증이 아니다. 사용자 화면에도 이 차이를 안내한다.

## 재현과 플랫폼 검증

명령은 [검수 도구 README](../tools/verb-audit/README.md), 배포·브라우저·실제 기기/시뮬레이터 결과는 [검증 기록](verification.md)을 따른다. Kotlin 도메인은 Android가 그대로 재사용하고 Swift는 공통 golden으로 동등성을 검사한다. fixture 변경 시 Gradle 테스트 입력이 갱신돼 이전 테스트 결과를 잘못 재사용하지 않는다.
