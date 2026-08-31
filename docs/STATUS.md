# STATUS — 여기서 시작한다

★ 이 파일 하나만 읽는다. 세션마다 새 인수인계를 쓰지 않는다 — **이 파일을 덮어쓴다.**
`docs/archive/` 의 인수인계 3~16 · AI심사_설계안 · 10단계_재설계안은 경위다.
필요한 문장은 여기로 끌어온다. 저쪽을 고치지 않는다.

마지막 갱신: 세션 22 · 커밋 `31a83a8` 위

---

## 앱이 지금 할 수 있는 것

```
단계 26 · 문항 93 (fill 8 추가) · 화면이 붙은 유형 11단계분 (문장 1~11, 구성 14·17·19·20)
학습자 흐름   로그인 → 단계 목록 → 문항 → 제출 → 통과/미달 → (모범답안 있는 문항 통과 시)
             모범답안+자기점검 → '다음 문항 →'(미달 '건너뛰기 →') → … → 다 통과면
             '단계 완료 N/N'+'다음 단계 →', 건너뛴 게 있으면 'N/M · 건너뛴 문항 k개'+첫 링크
★ 모범답안 있는 문항: 10단계 fill 8 (①②) + 1단계 reduce_adverb 8 · 2단계 emotion_action 6 (가·나, blank_key '')
없는 것       도입 트랙 전부 · streak·XP·복습·하트·진도 저장 테이블(안 만든다 — submissions 로만 센다)
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
stage2 는 자기점검이다           모범답안 2~3건 + 체크. AI 아님. 사람 아님. reference_answers 테이블
자기점검 문구는 단계마다 다르다   stages.self_checks(text[]). reduce_adverb 한 줄 · action_reason 두 줄 ·
                              나머지 빈 배열(칸이 안 뜨고 모범답안만). SelfCheck.tsx 하드코딩 걷음
채점 근거 밑줄은 fail 만 친다     통과·확인중 검사의 evidence 는 본문에서 뺀다 — 밑줄이 남으면
                              학습자가 "아직 틀렸다"로 읽는다(실사용). 근거는 검사 목록 칩으로만.
                              buildMarks 는 components/train/marks.ts(순수, verify 가 문다)
'쓰지 않을 말'은 범주로 보인다    scoring_config.forbidLabel(범주 한 줄)+forbidDisplay(기본형 묶음)
                              가 있으면 규칙 줄이 그것 + '예: …'(펼치면 전체). 채점(forbidWords·
                              forbidLemmas)은 안 바뀜. 없으면 forbidWords 목록 그대로. 문구에
                              '기계' 얘기 안 씀. verify 가 표시↔채점 대응을 문다(NFD 어간 비교)
원문은 희화화하지 않는다          부사 3~4개의 그럴듯한 문장이면 걷어내기 훈련은 성립한다. 더하기
                              빼기 수준으로 낮추지 않는다(세션 20, 실사용 판단)
reference_answers 는 저장소에 둔다  제출 뒤 학습자에게 보이는 것이라 비밀이 아니다. 세션 3 2-5 의
                              '모범답안 저장소 금지'는 problem_answers(채점 정답)·골든에만 적용된다.
                              비-fill 모범답안은 blank_key '' · ord 로만 세트(가·나…)를 가른다
단계 이름                       `동작에 이유 넣기` (skill_key action_reason)
fill 분량은 글자만 센다          countLetters — 한글·영문·숫자만. 최대·최소 한 수로. 구두점·공백은 0
AI 는 피드백이지 심판이 아니다     위 재개 조건 전까지
문서는 이 파일 하나              STATUS 를 덮어쓴다. 인수인계를 새로 안 쓴다
fill-smoke@example.com          하니스용 계정. 학습자 답안 수를 셀 때 뺀다
```

## 하는 중

```
(비어 있다)
```

## 다음 — 순서대로. 하나가 verify 에서 물리기 전에 다음을 안 한다

```
1  빈 단계 채우기         도입 4단계 → 구성 빈 6단계 → 절단신공. 단계당 4~6. 기존 유형만
```

### 끝난 것 — 세션 22

```
'쓰지 않을 말' 개선 — 채점(forbidWords)은 한 글자도 안 바꿈, 표시만
가  세로 라벨 버그: '무엇을 봅니다'·CheckRow 라벨을 whitespace-nowrap + flex-shrink-0,
    긴 규칙 텍스트만 오른쪽 min-w-0 칸에서 줄바꿈.
나  scoring_config 표시 전용 필드 둘 — forbidLabel(범주 한 줄) · forbidDisplay(기본형 배열).
    있으면 RuleText 가: 기본 펼침(useState(true)) — 1줄 범주 + '접기', 2줄 기본형 전체
    (옅은 색·keep-all). 접으면 1줄 + '전체 보기' — 2줄째는 visibility:hidden 으로 자리만
    남긴다(행 높이 늘 펼친 크기 · 아래 행 안 밀림). '무엇을 봅니다'와 CheckRow 가 공유
    (fail 때 걸린 단어 칩은 별도). forbidLabel 없으면 rule 한 줄. '무엇을 봅니다' 패널은
    오른쪽 칸 최소 24rem(grid-cols [minmax(0,1fr) minmax(24rem,1.3fr)]) · 규칙 글씨 본문 급.
    local.ts forbidWords 검사 + index.ts mergeForbidChecks
    (sensory 는 forbidWords+forbidLemmas 병합)가 rule/examples 를 싣는다.
    page.tsx NON_SCORING_KEYS 에 두 필드 추가 — sensory 가 두 칸으로 안 넘어가게.
다  2단계 emotion_action 6 + 6단계 sensory 8 덤프에 채움. 범주는 지시문 결에 맞춤
    (감정별 '기쁨/두려움/분노/서러움/그리움/부끄러움을 직접 말하는 표현' · 6단계 '눈에 기대는 표현').
verify  [쓰지 않을 말 표시] — 14문항 · forbidDisplay 의 각 기본형이 forbidWords/forbidLemmas 에
    실재(NFD 어간 비교) · 물기('억울하다'는 안 잡힘 확인) · forbidLabel 없으면 옛 rule 그대로 ·
    combine 이 rule=forbidLabel·examples=forbidDisplay · sensory 병합본 유지 ·
    update SQL 이 덤프와 jsonb 로 같다 · RuleText/CheckRow/TrainClient 배선
  ★ scoring_config 바뀜 → DB 반영은 seed/update-forbid-display.sql (덤프에서 뽑은 update 14건) → seed_check
  ★ 눈확인(박 님): /train/2/dragon-king-anger 제출 전 — 라벨 가로 정상 + 범주 한 줄 + 예 몇 개 + 펼침
```

### 끝난 것 — 세션 21

```
2단계 emotion_action 모범답안 12 + self_checks (1단계와 같은 절차)
  answers.json   reference[] 에 6문항 × ord 1 가 / 2 나 = 12행 · blank_key ''
  stages.json    emotion_action self_checks ["이 동작만 보고도 무슨 감정인지 남이 맞힐 수 있는가"]
  verify.ts      [2단계 emotion_action: 모범답안 대조] — 12행 · 가·나 두 세트 · 자수 ≤ maxChars ·
                 지문 베낌 아님 · 금지어(forbidWords) 미포함(형태소 없이 문자열) ·
                 물기(지문은 감정어에 걸린다) · 형태소 규칙은 서버 있을 때만(pushRefMorphCheck)
                 self_checks 블록에 emotion_action 한 줄 단언 추가
  refactor       scoringServer·morphAnalyze·pushRefMorphCheck 를 모듈 스코프로 — 1·2단계가 공유
  ★ scoring_config·problems.json 은 안 건드림. emotion_action 은 convert 유형(hybrid)
  ★ DB 반영: reference 12행은 새 insert(on conflict do nothing), self_checks 는 do update —
    seed_data.sql 재실행이면 된다(멱등). update 파일 불필요.
  ★ 절차(박 님): seed_data.sql → seed_check.sql → 브라우저 2단계 한 문항 통과 화면
```

### 끝난 것 — 세션 20 (요약)

```
가  채점 근거 하이라이트는 fail 검사만 (marks.ts 로 뗌, status!=='fail' 이면 밑줄 제외)
    ★ 눈검사: 밑줄 규칙만 승인. 통과 화면에서 실제로 사라지는지는 다음 눈검사 때
나  1단계 원문 여덟을 박 님 판으로 (희화화 완화). seed/update-reduce-adverb-passages.sql 로 DB 반영.
    verify: 원문 8건이 다 maxChars 초과 · update SQL 이 덤프와 글자까지 같다
```

### 끝난 것 — 세션 19 (요약, 대시보드 적용 · 눈검사 완료)

```
모범답안·자기점검을 fill 밖으로 (재설계안 11-2)
  seed_schema   stages.self_checks text[] not null default '{}'
  화면          route.ts 가 유형 안 가리고 reference_answers 를 읽고(RLS 가 제출 여부로 막음),
                TrainClient 는 통과 + reference 있으면 모범답안 + SelfCheck. SelfCheck 는
                stages.self_checks 를 prop 으로 받는다(하드코딩 걷음). blank_key '' 면 표식 없음
  seed_verify   (10) 을 case 로 넓힘 — fill 은 실재 빈칸, 비-fill 은 blank_key ''
  ★ 1단계 모범답안 16건은 잠정 통과. 고치려면 answers.json + seed_data.sql 재실행(reference
    insert 는 on conflict do nothing 이라 기존 행 안 고침 — 값 바꾸려면 별도 update 필요) + seed_check
```

★ 주 단위 기준 하나 — **학습자가 새로 할 수 있게 된 것**이 없는 주는 실패다.

## 미결 — 급하지 않다. 위가 끝나기 전엔 안 연다

```
★ 형태소 서버              지금 로컬뿐(scoring-server, 상태 확인 참조). 안 떠 있으면 6단계 46문항이
                          통과 불가(pending). 배포 시 이것도 같이 올린다(Cloud Run 이든 뭐든) —
                          .env 의 SCORING_SERVER_URL·SCORING_SERVER_SECRET 을 그쪽으로 맞춘다
at-left-feint fill 재료      상황 본문 · 빈칸 위치 · 모범답안 3건. 재설계안 7-5 목록 열둘을 먼저
                            읽고 짠다. 그때 3×3(장르 셋씩)이 찬다
ar-left-feeler 모범답안       재설계안 7-7 에 가·나·다가 없다. stage2 가 보여줄 것이 없다
fill 지시문 예시 접기         단계에서 첫 문항만 예시를 펼치고 뒤 문항에선 접는다(길다)
'fill' 표기                  화면의 유형 표시 'fill' 을 '빈칸 채우기' 로
fill minChars 8 은 코드 기본값  feint 시드 때 blanks 마다 minChars 를 명시하고 `?? 8` 기본값을 뺀다
fill 은 인물·사물을 안 본다     덕수 답이 세연 문항을 통과한다. 자기점검이 그 자리. 규칙으로 잡으려면
                            blanks 에 requireAny 정도 — 지금은 안 한다
모범답안 베낌은 통과한다        본 뒤 그대로 붙이면 forbidCopyOfFixedLines 를 안 탄다. reference_answers
                            줄도 베낌 검사에 넣을 수 있다(서버가 이미 읽는다). 학습 루프 뒤
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
# 형태소 서버 — 별도 터미널. 안 떠 있으면 6단계 46문항이 pending 이다.
cd scoring-server && source .venv/bin/activate && SCORING_SECRET=dev uvicorn main:app --port 8000

npx next typegen && npx tsc --noEmit     # 0건
npm run test:scoring | tail -1           # 0 실패만 본다
npm run check:numbers | tail -1          # 낡은 수 0건
npm run gen:seed                         # 아무 파일도 안 바뀌어야 한다
```
