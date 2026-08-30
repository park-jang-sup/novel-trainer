# STATUS — 여기서 시작한다

★ 이 파일 하나만 읽는다. 세션마다 새 인수인계를 쓰지 않는다 — **이 파일을 덮어쓴다.**
`docs/archive/` 의 인수인계 3~16 · AI심사_설계안 · 10단계_재설계안은 경위다.
필요한 문장은 여기로 끌어온다. 저쪽을 고치지 않는다.

마지막 갱신: 세션 18 · 커밋 `d42dd1f` 위

---

## 앱이 지금 할 수 있는 것

```
단계 26 · 문항 93 (fill 8 추가) · 화면이 붙은 유형 10단계분 (문장 1~9·11, 구성 14·17·19·20)
학습자 흐름   로그인 → 단계 목록 → 문항 → 제출 → 규칙 통과/미달 → 끝
없는 것       fill 화면(고정 줄 사이 입력칸) · 모범답안 보기 · 다음 문항 이동 · 단계 완료 화면 · 도입 트랙 전부
★ 10단계는 새 skill_key `action_reason`(fill 8). 옛 `action_turn`(convert 8)은 is_active=false — 화면에 '준비 중'
```

## 닫힌 것

```
AI 심판                 세션 13~16. delete · 지목 · 결합(AND·OR·합산) 다 판정선 못 넘음.
                        쓴 돈 $1.73. 나쁨 신호끼리는 더하기만 되고 빼기가 안 된다.
                        ★ 재개 조건: 사람 정답지 36건 + 실제 학습자 답안 50건.
                          그 전에는 문안을 안 쓴다. 어떤 문안도.
                        ★ gate.ts · 하니스 · probe 는 산다. 피드백(코멘트 한 줄) 용도로 붙인다.
                          통과 판정에는 안 쓴다.
10단계 자유 4줄 문항      빈칸안으로 대체. 재설계안 11장.
```

## 정한 것

```
10단계는 빈칸(fill) 문항이다     재설계안 11장. 지문 여덟(feint 뺌) · ①② (bell-rope 만 ①②③)
stage2 는 자기점검이다           모범답안 2~3건 + 체크 둘. AI 아님. 사람 아님. reference_answers 테이블
단계 이름                       `동작에 이유 넣기` (skill_key action_reason)
AI 는 피드백이지 심판이 아니다     위 재개 조건 전까지
문서는 이 파일 하나              STATUS 를 덮어쓴다. 인수인계를 새로 안 쓴다
```

## 하는 중

```
(비어 있다)
```

## 다음 — 순서대로. 하나가 verify 에서 물리기 전에 다음을 안 한다

```
1  fill 화면 + 자기점검    고정 줄 사이 입력칸 · 제출 뒤 모범답안 · 체크 둘
                        ★ 제출은 {blanks:{'①':…,'②':…}} 꼴. grade/route 가 아직 안 받는다
                        ★ 모범답안은 reference_answers 테이블 — 제출한 뒤에만 RLS 로 보인다. ord = 가·나·다
2  학습 루프             다음 문항 자동 이동 · 단계 완료 화면
3  빈 단계 채우기         도입 4단계 → 구성 빈 6단계 → 절단신공. 단계당 4~6. 기존 유형만
```

### 끝난 것 — 세션 18

```
fill 유형 (재설계안 11-3)   lib/scoring/types · local · index · verify
  types      ProblemType 'fill' · BlankSpec · cfg.blanks/fixedLines/forbidCopyOfFixedLines · Submission.blanks
  local      case 'fill' — 빈칸마다 채움·분량·문장수·고정줄베낌, 전체에 forbidWords. countSentences(종결부호)
  verify     물기 시험 넷 다 물림 (빈칸 비움 · 고정 줄 베낌 · 61자 · 대괄호)

fill 여덟 시드 (재설계안 11-5 · 7-6·7-7·7-10-2)   ★ DB 적용 완료 · seed_check 통과
  stages     새 skill_key `action_reason` order_no 10 · 옛 action_turn 은 12 로 밀림
  problems   ar-broken-gate·left-draw·cracked-ice·left-feeler·dragon-jaw·dull-blade·bell-rope·wind-gate
             ★ at-left-feint 은 뺐다 (재설계안에 fill 재료가 없다 — 미결 참조)
  answers.json  reference[] 39행 (7-10-2 가·나·다). ★ ar-left-feeler 는 모범답안이 없다 (재설계안 7-7 에 없음)
  gen-seed   fixedLines 를 passage 에서 파생(lib/scoring/fill.ts, 손으로 안 적는다) · reference_answers insert ·
             옛 at-* 8건 update is_active=false (seed/dump/deactivate.json)
  seed_schema  reference_answers 테이블 + RLS('제출한 뒤에만')
  seed_check   (5)(5b) fill 빈칸↔지문 표식 일치 · (6) reference_answers SELECT 정책 있음
  seed_verify  (10) 모범답안이 실재하는 빈칸만 가리킨다
  verify.ts    action_reason fill 시드 대조 블록 — fixedLines 파생·모범답안이 제 규칙 지킴·물기 넷
  ★ bell-rope 만 빈칸 셋·maxSentences 3 (반응 빈칸이 길다). 나머지 둘·2.
  ★ 화면·grade/route 는 안 건드렸다 (다음 1)
```

★ 주 단위 기준 하나 — **학습자가 새로 할 수 있게 된 것**이 없는 주는 실패다.

## 미결 — 급하지 않다. 위가 끝나기 전엔 안 연다

```
at-left-feint fill 재료      상황 본문 · 빈칸 위치 · 모범답안 3건. 재설계안 7-5 목록 열둘을 먼저
                            읽고 짠다. 그때 3×3(장르 셋씩)이 찬다
ar-left-feeler 모범답안       재설계안 7-7 에 가·나·다가 없다. stage2 가 보여줄 것이 없다
seed_data 는 갱신을 안 한다    문항 insert 가 `where not exists` 라 기존 행을 안 고친다. 덤프의
                            passage·scoring_config 를 바꾸면 seed_data 만으로는 DB 에 안 들어간다 —
                            DB update 를 따로 돌리고 seed_check 를 실제로 돌려 대조가 통과하는지 본다
action_turn 옛 것 삭제        옛 단계(order_no 12) · convert 8건 · action-turn.ts 픽스처 · verify 블록 여섯 —
                            재설계안 11-5 픽스처 갈아엎기 때 한꺼번에 지운다
combo-report 감시(세션 16 7-1)  ·  503 로그  ·  UTC 하루 경계  ·  30자와 문형
경계 표본 36건 본문(자리 배치는 버림, L 정의는 산다)
```

## 상태 확인

```bash
npx next typegen && npx tsc --noEmit     # 0건
npm run test:scoring | tail -1           # 0 실패만 본다
npm run check:numbers | tail -1          # 낡은 수 0건
npm run gen:seed                         # 아무 파일도 안 바뀌어야 한다
```
