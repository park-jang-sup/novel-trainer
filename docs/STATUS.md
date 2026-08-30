# STATUS — 여기서 시작한다

★ 이 파일 하나만 읽는다. 세션마다 새 인수인계를 쓰지 않는다 — **이 파일을 덮어쓴다.**
`docs/archive/` 의 인수인계 3~16 · AI심사_설계안 · 10단계_재설계안은 경위다.
필요한 문장은 여기로 끌어온다. 저쪽을 고치지 않는다.

마지막 갱신: 세션 18 · 커밋 `cd349bd` 위

---

## 앱이 지금 할 수 있는 것

```
단계 26 · 문항 93 (fill 8 추가) · 화면이 붙은 유형 11단계분 (문장 1~11, 구성 14·17·19·20)
학습자 흐름   로그인 → 단계 목록 → 문항 → 제출 → 규칙 통과/미달 → (fill 통과 시) 모범답안 + 자기점검 → 끝
없는 것       다음 문항 이동 · 단계 완료 화면 · 도입 트랙 전부
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
1  학습 루프             다음 문항 자동 이동 · 단계 완료 화면. 10단계가 첫 손님
2  빈 단계 채우기         도입 4단계 → 구성 빈 6단계 → 절단신공. 단계당 4~6. 기존 유형만
```

★ fill 화면은 브라우저 눈검사가 남았다 — 박 님이 직접 본다. API·SSR 로는 확인함(아래).

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

fill 화면 + 자기점검 (재설계안 11-2 4번 · 세션 18)
  route.ts     zod 에 blanks · submissions.content 에 '① …\n② …' 이어 붙여 저장 · fill 이면
               제출 뒤 reference_answers 를 읽어 응답에 실어 준다(RLS 가 방금 넣은 제출을 본다)
  page.tsx     publicConfig 에 blanks(key·label·글자수·문장수·optional) 만 보낸다. fixedLines 는 안 보냄
  TrainClient  fill 분기 — 지문 대신 FillBody, 통과 시 SelfCheck
  FillBody     [상황]/[복선]/[결정타] 머리와 본문을 fillPassageParts 로 가른다. 본문은 고정 줄과
               입력칸(①②)이 번갈아. 칸마다 문장·글자 수 표시
  SelfCheck    모범답안을 ord(가·나·다)로 묶어 보여주고 체크 둘(채점 아님)
  목록 라벨      fillSituation — [상황] 머리표를 뗀 첫 문장
  ★ 확인함: SSR 렌더(머리·라벨·placeholder) · POST /api/grade {blanks} → pass + reference 4행 ·
    실패 다섯(② 비움·대괄호·고정줄 베낌·61자·구두점만) 다 fail · ① 비움(optional) → pass ·
    종결부호 없는 8자+ → pass(꼬리 규칙)
  ★ 안 함: 브라우저 눈검사 — playwright 시스템 라이브러리(sudo)를 안 깔기로 함. 박 님이 화면을 직접 본다

구두점만 넣은 제출을 막았다 (세션 18 후기 — 빠졌던 다섯째 병)
  countSentences  종결부호로 조각낸 뒤 글자(한글·영문·숫자) 든 조각만 센다.
                  '.' '...' '?!' '…' → 0. 종결부호 없는 꼬리는 글자 있으면 1 (규칙 유지)
  fill minChars   b.minChars 가 없으면 기본 8자. 글자만 센다(countLetters — 구두점·공백 제외).
                  rule 에 '8자 이상' 이 나간다
  verify          {①:'.',②:'.'} → sentences·minChars 넷 다 fail · {②:'...'} → fail ·
                  종결부호 없는 8자+ → pass. 병 넣어 무는 것 봄(되돌리면 9건 샌다)
  ★ DB 는 안 건드렸다 — 시드 blanks 에 minChars 가 없어 기본값 8 이 그대로 선다
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
