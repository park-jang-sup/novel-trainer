# lib/setting — 설정집 × 설정검사 (1단계 골격)

설계: `docs/설정집_설정검사_통합설계_v1.md`. 이 폴더는 그 문서의 §5-1(입력 파이프라인)과 §6-3 ①(전이 없는 상태 변화)의 첫 구현이다.
novel-trainer 규칙을 따른다: 빈 결과를 통과로 읽지 않는다. 검사를 세우면 물기 시험을 붙인다.

## 파일

| 파일 | 역할 | 네트워크 |
|---|---|---|
| `schema.ts` | 추출 결과 계약(zod v4). LLM 이 내는 `ExtractionRaw`(값은 문자열만) 와 서버가 위치를 붙인 `Extraction`. `.describe()` 가 모델에게 가는 필드 설명이다(z.toJSONSchema 가 싣는다 — TS 주석은 안 간다) | 없음 |
| `attributes.ts` | 속성 정규화층. 원문 `attribute` ↔ 검사용 `attribute_key`, 카디널리티(single/set), 값 숫자화, 엄격 `sameValue` | 없음 |
| `prompts/extract.ko.md` | 추출 프롬프트. 구체 이름·값 예시 없음(베끼기 방지). `{{ }}` 는 서버가 채움 | — |
| `locate.ts` | `surface` → 원고 위치. 정확 일치 → 공백 접기 → 3단계(공백 전부 제거 + 곱은따옴표→곧은따옴표 + …→..., 위치 매핑 유지). 셋 다 정확 일치이고 유사 일치는 없다. 못 찾으면 폐기(`dropped`). 개체의 first_mention 만은 name → aliases 정확 일치로 한 번 더 대체하고 `first_mention_fallback` 으로 센다. 원칙 6의 문지기 | 없음 |
| `conflicts.ts` | 검사 ①(전이 없는 변화) + ①′(전이 뒤 옛 값 재등장). 위치는 (회차, 오프셋). 입력 순서 무관 | 없음 |
| `conflicts.test.ts` | 물기 시험 32건 — 골격 10 + 리뷰 탐침 P1~P7 + 정규화·시간 + locate 3단계 P8 + first_mention 대체 P9 + 관계→상태 P10 | 없음 |
| `golden.ts` | 골든의 zod 계약(strict). 키 오타가 "조건 없음" 으로 조용히 통과하지 않게 로드 시 `safeParse`. `excluded_info`·`category_info`·`unanchored_ratio_info` 는 정보(실패 아님), `surface_contains_any` 는 후보 중 하나 | 없음 |
| `store.ts` | 저장소 물질화 규칙. 술어가 동의어표에 있고 객체가 사람이 아닌 관계는 상태로도 만든다(김태진 -소속-> 베나토르 ⇒ 김태진.소속=베나토르). verify 의 buildStore 와 나중 저장소 어댑터가 같이 쓴다 | 없음 |
| `verify.ts` | 1·2화 골든 대조 + 결정성 대조 | 없음 |
| `fixtures/prelim_ep1.txt`, `prelim_ep2.txt` | 원고 1·2화. 대회 레포 `public/samples/` 에서 **복사**(BOM 제거). 대회 레포는 읽기만 했고 쓰지 않는다 | — |
| `fixtures/prelim_ep1-2.golden.json` | 골든. required / forbidden / caps | — |
| `fixtures/prelim_ep{1,2}.hand.json` | 손 추출본(locate 거침). `make-hand-fixtures.ts` 가 만든다. 62/0 재현용 | — |
| `make-hand-fixtures.ts` | 손 추출본 생성 + 환각 근거 폐기 확인 | 없음 |

폐기 사유는 `dropped.reason` 에 남는다: `surface_not_found`(근거가 원고에 없음) / `orphan_ref`(폐기된 개체를 가리킴). 스키마 밖 필드는 `safeParse` 가 버리므로 세는 값은 전부 스키마 안에 둔다.

추출 호출 스크립트는 `scripts/extract-setting.ts`(ai-probe 와 같은 하니스 경로 C. 이 픽스처에 대해서는 `{{branches}}` 로 작품 설정 `main / pre_regression` 을 넘긴다 — 모델이 갈래 id 를 짓지 않는다. 원응답은 `fixtures/raw/` 에 남긴다).

아직 없는 것: lexicon 대조(같은 이름/별칭 → 같은 개체; 지금은 verify 안의 단순 매핑), 저장소 어댑터(관찰/정본 분리, 설계 §4-2 개정), 검사 ②③④, 작품별 속성 별칭 UI.

저장소 원칙 (리뷰 F): **`conflicts` 테이블을 두지 않는다.** 카드는 관찰·사건·결정의 순수 함수이고 `dismiss_key` 가 멱등키다. 저장하면 결정 뒤에 낡은 카드가 남는다. 관찰(원고 출처, 점, 불변)과 정본(작가 소유, 구간)은 테이블을 나눈다.

## 흐름

```
원고 텍스트 ──▶ extract.ko.md + z.toJSONSchema(ExtractionRaw) ──▶ LLM ──▶ ExtractionRaw
           ──▶ locateAll(text, raw) ──▶ Extraction (+dropped)
           ──▶ 저장소에 observed 로 누적
           ──▶ detectStateChangeWithoutEvent(states, events, decisions) ──▶ 카드
```

## 실행

```bash
npm run test:setting                                        # 아래 둘을 이어서
npx tsx lib/setting/conflicts.test.ts                       # 32 / 0
npx tsx lib/setting/make-hand-fixtures.ts                   # 손 추출본 재생성
npx tsx lib/setting/verify.ts lib/setting/fixtures/prelim_ep1.hand.json lib/setting/fixtures/prelim_ep2.hand.json   # 61 / 0 (4인자로 같은 파일을 두 번 주면 결정성 1건이 붙어 62 / 0)
npx tsx lib/setting/verify.ts <ep1> <ep2> <ep1_run2> <ep2_run2>   # + 결정성(required 통과 집합 + 카드 키 집합. 개체·상태 대칭차는 info)
npm run setting:extract -- --rescore                        # fixtures/raw/*.raw.json → locate → verify. 호출 0회. 코드·골든을 고친 뒤 재채점
npm run setting:extract -- --dump                           # llm.json 의 정해진 자리(유진혁 스킬·마강혁·김수정·excluded·events·relations)를 뽑아 본다
```

`*.hand.json` 은 locate 를 거친 Extraction. 손으로 만든 최소 추출본으로 verify 61/0(+결정성 1 = 62/0), 카드 정확히 2건(나이 19→22, 스킬 쾌속→질풍), 정밀도 100%, 상한 5종 통과, coverage 전부 0 을 확인했다(2026-09-22, 리뷰 반영 후). 이 추출본은 1화 `스킬`/2화 `보유 스킬`, 값 `"스물두 살"` 처럼 정규화층을 일부러 지나게 만들었다. 이것은 **골든과 검사기가 서로 맞는다는 확인**이지 LLM 추출이 된다는 확인이 아니다. 다음 세션의 일은 실제 추출 결과를 여기에 태우는 것이다.

## 1단계 완료 기준 (설계 §11)

- 실제 LLM 추출 → `verify.ts` 실패 0
- 같은 입력 2회 → 결정성 통과
- `dropped` 0 이 아니어도 되지만, 골든 required 항목이 dropped 로 빠지면 프롬프트 문제
- 검출기 #0 기준선(심은 오류 2건 중 0건) 옆에 새 숫자를 적는다
