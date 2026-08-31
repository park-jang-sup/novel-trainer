# STATUS — 여기서 시작한다

★ 이 파일 하나만 읽는다. 세션마다 새 인수인계를 쓰지 않는다 — **이 파일을 덮어쓴다.**
`docs/archive/` 의 인수인계 3~16 · AI심사_설계안 · 10단계_재설계안은 경위다.
필요한 문장은 여기로 끌어온다. 저쪽을 고치지 않는다.

마지막 갱신: 세션 19 · 커밋 `81913cc` 위

---

## 앱이 지금 할 수 있는 것

```
단계 26 · 문항 93 (fill 8 추가) · 화면이 붙은 유형 11단계분 (문장 1~11, 구성 14·17·19·20)
학습자 흐름   로그인 → 단계 목록 → 문항 → 제출 → 통과/미달 → (모범답안 있는 문항 통과 시)
             모범답안+자기점검 → '다음 문항 →'(미달 '건너뛰기 →') → … → 다 통과면
             '단계 완료 N/N'+'다음 단계 →', 건너뛴 게 있으면 'N/M · 건너뛴 문항 k개'+첫 링크
★ 모범답안 있는 문항: 10단계 fill 8 (①②) + 1단계 reduce_adverb 8 (가·나, blank_key '')
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

### 끝난 것 — 세션 19

```
모범답안·자기점검을 fill 밖으로 (재설계안 11-2 · 채팅 지시)
  seed_schema   stages.self_checks text[] not null default '{}'
  stages.json   self_checks 26단계분. reduce_adverb 한 줄 · action_reason 두 줄(옛 SelfCheck
                QUESTIONS 를 이리로) · 나머지 []
  gen-seed      sqlTextArray 헬퍼. stages insert + do update 에 self_checks
  answers.json  reference[] 에 rm-* 16행 (8문항 × ord 1 가 / 2 나 · blank_key '')
  seed_verify   (10) 을 넓힘 — fill 은 실재 빈칸, 비-fill 은 blank_key '' 여야 한다 (case 분기)
  route.ts      reference_answers 를 유형 안 가리고 읽어 응답에 싣는다(RLS 가 제출 여부로 막음)
  page.tsx      현재 단계의 self_checks 를 TrainClient 로
  TrainClient   통과 + reference 있으면(fill 아니어도) 모범답안 + SelfCheck. selfChecks prop
  SelfCheck     selfChecks prop 으로 문구를 받는다. 빈 배열이면 '스스로 확인' 칸 없음.
                blank_key '' 면 표식 span 을 안 그린다
  verify.ts     [1단계 reduce_adverb: 모범답안 대조] — 16행 · blank_key '' · 가·나 두 세트 ·
                자수 ≤ maxChars · 지문 베낌 아님 · 물기(원문 내면 자수 초과 미달).
                형태소 규칙(부사·관형·동사·반복)은 로컬 서버 떠 있을 때만 도는 선택 검사 —
                없으면 morphSkipped 로 세어 최종 줄에 "형태소 검사 N건 건너뜀(서버 없음)"
                [자기점검 self_checks: 시드 ↔ 화면] — 시드·SelfCheck·seed_data·seed_schema 대조
                action_reason 블록: refs 를 action_reason source_key 로 필터(비-fill 이 안 섞이게)
  ★ 형태소 서버 띄우고 test:scoring → 2137 통과 / 0 실패 (16 형태소 검사 다 물림).
    서버 없이 → 2121 통과 / 0 실패 / 형태소 16건 건너뜀 표시.
  ★ 대시보드 적용 완료 · 눈검사 완료(박 님): 1단계 통과 화면에 모범답안 가·나 + 자기점검 +
    '다음 문항 →'. 원문 그대로 제출 시 부사 7개가 칩으로 뜸.
  ★ 1단계 모범답안 16건은 잠정 통과다. 화면에서 풀며 고칠 수 있다 — 고치면 answers.json 수정 +
    DB update + seed_check 재실행이 절차다(seed_data 의 reference insert 는 on conflict do
    nothing 이라 기존 행을 안 고친다. self_checks 는 do update 라 재시드로 갱신됨).
```

### 끝난 것 — 세션 18 (요약, 이제 '앱이 지금 할 수 있는 것' 에 들어감)

```
fill 유형·시드·화면      10단계 action_reason fill 8 (①②, bell-rope 만 ①②③). types·local·index,
                        seed_schema 의 reference_answers 테이블 + RLS('제출한 뒤에만'), FillBody·SelfCheck.
                        옛 action_turn 8 은 is_active=false. ★ ar-left-feeler 는 모범답안 없음(미결)
구두점만 제출 막음        countSentences 종결부호 조각 중 글자 든 것만. fill 분량 최대·최소 다 countLetters,
                        b.minChars 없으면 기본 8
학습 루프               lib/train-nav 순수 셋(nextProblemKey·nextStageId·stageProgress). TrainClient 결과
                        아래 링크 하나. nextStageId 가 action_reason 다음 → 구성 14 off_track
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
