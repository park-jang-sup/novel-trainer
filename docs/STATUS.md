# STATUS — 여기서 시작한다

★ 이 파일 하나만 읽는다. 세션마다 새 인수인계를 쓰지 않는다 — **이 파일을 덮어쓴다.**
`docs/archive/` 의 인수인계 3~16 · AI심사_설계안 · 10단계_재설계안은 경위다.
필요한 문장은 여기로 끌어온다. 저쪽을 고치지 않는다.

마지막 갱신: 세션 38 · 커밋 `5db46fe` 위

---

## 앱이 지금 할 수 있는 것

```
단계 26 · 문항 153(비활성 13건 포함 — action_turn(at-) 8 + 구성 12 재설계로
밀려난 cc- 4 + ig-ball-envelope 1, 활성 148) · 화면이 붙은 유형 21단계분
(문장 1~12, 구성 11·12·13·14·15·16·17·18·19·20, 도입 1·2·3)
문항 화면 스케일  제목 text-3xl · 원문 상자·입력(Editor·FillBody) text-lg(1.125rem) p-5 · Editor rows 7/16 ·
                컨테이너 max-w-7xl(한 칸 max-w-3xl) · 두 칸 grid [minmax(0,1.4fr) minmax(22rem,1fr)] 왼쪽 우선
가르침 층       코치 캐릭터 먹물이 ✒️ 말풍선(CoachBubble) — 단계 목록: 제목·요약 아래 coach_intro ·
                문항 화면: 지시문 위 coach_line (둘 다 stages, 문장 10 + 도입 1·2·3 + 구성 11·12, '' 면 안 뜸) ·
                지시문 아래 조건 요약 한 줄(summarizeConfig — config 파생) ·
                서술형 게이지 "N문장 · M / 상한자"(모든 텍스트 유형)
                ★ 레거시 stages.intro 컬럼은 남아 있으나 값 전부 '' · 화면은 coach_* 만 씀
학습자 흐름   로그인 → 단계 목록 → 문항 → 제출 → 통과/미달 → (모범답안 있는 문항 통과 시)
             모범답안+자기점검 → '다음 문항 →'(미달 '건너뛰기 →') → … → 다 통과면
             '단계 완료 N/N'+'다음 단계 →', 건너뛴 게 있으면 'N/M · 건너뛴 문항 k개'+첫 링크
★ 모범답안 있는 문항: 10단계 fill 8 (①②) + 문장 1·2·3·4단계 (reduce_adverb 8 · emotion_action 6 ·
  trim_padding 8 · reduce_repeat 8) + 도입 2·3 각 5 + 구성 11 lack 5 + 구성 12 contrast_char
  활성 6(cc-first-pay + 신규 5, 옛 대비형 4는 비활성) + 구성 13 likability 4 +
  구성 15 info_gap 5 + 구성 16 cliffhanger_adv 5 + 구성 18 first_hook 5 +
  문장 12 action_turn 5(재개, 옛 at- 8은 비활성) + 문장 11 cliffhanger 5(신설,
  세션 38), 가·나 blank_key '' ·
  도입 1 start_choose 5 는 reference 를 선택지별 해설로 씀(가·나 아님)
없는 것       도입 4 start_episode(보류 — 보스 문항으로 흡수 예정) · streak·XP·복습·하트·진도 저장 테이블(안 만든다 — submissions 로만 센다)
★ 10단계는 새 skill_key `action_reason`(fill 8). 문장 12 `action_turn`(전투 서사화) 은
  새 bt- 5건 활성(세션 37 재개), 옛 at- 8건은 is_active=false 유지 — 화면의 '준비 중'은 풀렸다
★ 문장 11 `cliffhanger`(절단신공)은 신규 5문항 전부 활성(세션 38) — 화면의 '준비 중'이 풀렸다.
  문장 트랙(1~12) 은 이제 전부 문항이 있다 — 남은 빈 단계는 도입 4(보스 슬롯) 하나뿐
```

## 닫힌 것

```
AI 심판                 세션 13~16. delete · 지목 · 결합(AND·OR·합산) 다 판정선 못 넘음.
                        쓴 돈 $1.73. 나쁨 신호끼리는 더하기만 되고 빼기가 안 된다.
                        ★ 재개 조건(운영 원칙 4): 사람 정답지 36건 + 실제 학습자 답안 50건.
                          그 전에는 문안을 안 쓴다. 어떤 문안도.
                        ★ gate.ts · 하니스 · probe 는 산다. 피드백(코멘트 한 줄) 용도로 붙인다.
                          통과 판정에는 안 쓴다.
                        ★ 예외 — 보스 문항 한정, AI 는 섀도 모드로 먼저 연다
                          (박 님 결정, 세션 32). 판정·코멘트는 보이되 통과에 안 씀.
                          여기 쌓이는 답안·판정 기록이 위 재개 조건의 수집처다.
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
3단계류 자수 상한 = 필수+2       지우기 단계(trim_padding 등)의 maxChars 는 '필수 문장을 원문
                              그대로 남긴 정직한 답 자수 + 2'. 지우기가 고쳐쓰기를 강요하면
                              안 된다 — 세션 23 실사용 발견(정직한 40자 답이 상한 38 에 걸림)
4단계 자수 상한 = 원문 자수 그대로  반복 고치기가 압축을 강요하면 안 된다(세션 23 원칙의 4단계 판).
                              rp- maxChars = 새 원문 countChars(공백 제외). 원문 그대로 내는 꼼수는
                              자수가 아니라 repeatTargets('겹친 말')에서 걸린다. verify 가 불변식으로 문다
조건 요약은 손으로 안 적는다      문항 화면 지시문 아래 한 줄은 summarizeConfig(scoring_config)
                              파생. 상세는 오른쪽 '무엇을 봅니다' 패널. 임계값 숫자는 코드가 학습자
                              말로 옮긴다("42자 이하 · 움직이는 말 3개 이상 …")
한 음절 반복은 repeatTargets 로     형태소 maxRepeat 는 두 음절+만 센다. scoring_config.repeatTargets
                              [{word,max}] — 형태소 아님, 답안 문자열의 낱말 횟수. 검사 key
                              repeatTargets · 라벨 '겹친 말'. 4단계 rp- 8문항에 지정. 새 반복
                              문항은 이걸로 감시 대상을 박는다
repeatTargets 는 부분 문자열을 센다  원문에 대상 낱말을 품은 합성어('우물'·'물동이' 안의 '물')를
                              두려면, 학습자가 그 합성어를 남기고도 한도 안이 되는지 미리 센다.
                              세션 27 후기 실사용 — kongjwi 원문 '물동이' 가 '물' 을 선점해 정직한
                              수정이 어휘 교체를 강요당했다. '항아리' 로 갈아 함정을 걷음(한도는 유지)
AI 는 피드백이지 심판이 아니다     위 재개 조건 전까지
문서는 이 파일 하나              STATUS 를 덮어쓴다. 인수인계를 새로 안 쓴다
인물은 docs/characters.md 가 단일 출처(세션 32 후기)  문항이 인물을 쓰면 원장에서
                              꺼내고, 새 면모를 만들면 원장에도 적는다(왕복 규칙) —
                              문항의 단일 출처가 덤프이듯. verify 가 활성 lack·contrast_char
                              문항의 인물 이름이 원장 헤더에 실재하는지 문다
                              ★ 원장은 재료지 상전이 아니다(세션 32 후기 4) — 문항 퀄리티와
                              충돌하면 인물 배경을 고친다. 왕복 규칙은 이름·문구 정합이지
                              문항이 원장에 맞춰야 한다는 뜻이 아니다(박 님 판정 — 셀라를
                              '동료 견습'에서 '저잣거리 만물상 상인'으로 재설계)
숫자 반복 표현은 안 쓴다(세션 32 후기 4)  "두 번"·"세 번" 류 횟수 세기 문구 전역 금지.
                              말버릇·모범답안 어디에도 쓰지 않는다(박 님 판정)
원문 복사+이름 뚫기는 forbidPassageCopy 로 막는다(세션 32 후기 2)  '무난한 원문' 단계
                              (lack·contrast_char)는 원문을 그대로 옮기고 이름만 붙이면
                              maxChars·forbidWords·requireAny 를 다 통과한다(박 님 실증).
                              scoring_config.forbidPassageCopy: true — 답안(공백 제거)이 원문
                              전체를 부분 문자열로 품으면 fail. gradeLocal 에 원문을 인자로
                              넘겨 판정(config 아님). 적용: lack 5 + contrast_char 활성 6 = 11.
                              ★ remove 계열(원문 일부 유지가 정상)엔 쓰지 마라 — opt-in 전용
fill-smoke@example.com          하니스용 계정. 학습자 답안 수를 셀 때 뺀다
구성 문항 설계 규격 7조(세션 32 후기 3 · 4 · 34)  이후 구성 단계 초안의 공통 결 —
                              여기 하나로 모은다(각 조 출처는 해당 세션의 '끝난 것' 참고).
                              ① 인물 설명은 겉·속의 관계까지 지시문 안에서 푼다
                              ② 과제는 이어쓰기가 원칙(type continue) — 대체(convert)는 능력
                                서술을 줄이거나 서술자의 사실 서술을 지우는 등 뚜렷한 이유가
                                있을 때만
                              ③ 모범답안은 지시문 정보만으로 자립한다 — 함축·원장 내부 언어 금지
                              ④ 이름 강제(requireAny·requireAll)는 그게 과제 본질일 때만 건다
                                (maxChars 100 은 기준일 뿐 고정은 아니다 — 단계 결에 따라
                                120·200 — 16·18)
                              ⑤ 숫자 반복 표현("두 번"·"세 번" 류)은 전역 금지
                              ⑥ 모범답안에 대사 또는 속마음 한 줄은 들리게 한다 — 행동 시연(④)은
                                유지, 서술자 설명 금지(정보 비대칭 계열)와 안 부딪힌다("그는
                                몰랐다"는 서술자가 말하는 것, "잘못 봤겠지"는 인물이 말하는 것
                              ⑦ 원문 상황은 그 장르 독자가 이미 아는 흔한 구도에서 가져온다 —
                                클리셰가 신뢰의 근거다. 장치(격차·손해·대비)를 보여 주려고
                                상황을 짓지 않는다. 오해는 눈앞의 목격이 아니라 간접 증거
                                (전언·물건·SNS)에서 생긴다 — 대다수가 할 행동으로 간다.
                                자가 점검: "이 상황을 설명 없이 한 줄로 말해도 독자가 바로
                                믿는가" · "마지막 문장이 요약인가, 그림인가". 근거: 문항은
                                학습자에게 교본이다 — 억지 상황은 '이렇게 꾸며도 된다'를
                                가르친다(박 님, 세션 34 — ig-ball-envelope 반려가 계기)
                              적용: ⑥·⑦은 ig-friend-text 부터. 구성 11·12·13·15 나머지는
                              전 단계 완성 후 전수 재점검 때 소급(미결 '구성 12 잔여 불만' 참고)
```

## 하는 중

```
(비어 있다)
```

## 다음 — 순서대로. 하나가 verify 에서 물리기 전에 다음을 안 한다

```
1  보스 문항(가칭)      구성 빈 단계 4개(13·15·16·18) + 문장 12 완료(세션 36·37) + 문장 11
                        cliffhanger 완료(세션 38) — 문장 트랙(1~12) 전부 문항 있음. 준비 충실.
                        전 단계를 마친 뒤, 배운 규칙 전부를 걸고 짧은 소설 한 편을 쓰는
                        졸업 문항. 도입 4 start_episode 자리의 확장(미결 참고). 두 층:
                        ① 규칙+자기점검이 통과 판정 ② AI 는 섀도 모드 — 판정·코멘트를
                        보여주되 통과에 안 쓴다. 박 님이 직접 오판을 관찰해 판정 권한
                        부여를 결정. 여기 쌓이는 답안·판정 기록이 원칙 4 재개 조건의
                        수집처다. 과제 범위·규칙 설계·AI 섀도 적용 방식은 착수 시 확정
                        (세션 36 논의 지점 — 아래 미결 '도입 4 start_episode 도 빈 단계다'
                        참고, 아직 세부 결정 안 남).
                        설정 카드형 '다섯 줄 쓰기'(18 설계안 5번, write 유형 없어 보류됐던 것)는
                        이 보스 문항에서 다룬다. 도입 4 start_episode 흡수도 여기서.
```

### 끝난 것 — 세션 38 (문장 11 cliffhanger '절단신공' 신설 · 문장 트랙 완주)

```
경계 확정  문장 11(cliffhanger)과 구성 16(cliffhanger_adv)은 같은 소재(절단 6패턴 —
  IN-04)를 다루지만 결이 갈린다. 11 은 "마지막 한두 줄만" — 패턴 다섯(위기·새
  인물·사건·반전 행동·기대감·관계 암시)을 그 자리에서 시연한다. 16 은 "끊기
  전에 신호를 깐다"(IN-05) — 앞선 서술에 복선을 심고 마지막 줄로 회수하는
  심화. 세션 37 문장 12 재개로 문장/구성 트랙 결이 실제로 갈린다는 게 실증돼
  기초(11)/심화(12→16) 구도에 무게가 실렸다는 관찰(세션 37 미결)이 이번에
  그대로 적용됐다.

원문 A 공유  cf-return-crisis·cf-return-newcomer·cf-return-reversal 3건이 같은
  본문("던전을 닫고 나온 도윤은…")을 그대로 공유한다(문항설계서 4-05 "같은
  본문에 절단 3종") — 같은 장면도 패턴을 뭐로 잡느냐에 따라 마지막 줄이
  달라지는 것을 보여주는 구도. 단계 간 베낌 가드는 '앞 단계' 문장만 보므로
  같은 단계 안 공유는 원래 걸릴 일이 없지만, 설계 의도를 verify 에 명시
  단언으로 박아 실수로 갈라지면 걸리게 했다.

관계 암시 문항 스킨십 제외  cf-doorstep-glance(지호·예린)는 forbidWords 에
  '고백'·'사랑'을 더해 직접 언급을 막는다 — 두 사람 사이가 달라질 조짐을
  '행동 하나'로만 보이게 하고, 고백이나 스킨십으로 감정을 명시하는 손쉬운
  답을 막는다.

규격 6 비강제  이 단계엔 [규격 6](대사·속마음 한 줄) 검사를 안 걸었다(박 님
  결정) — 한두 줄 절단마다 대사/속마음을 요구하면 패턴 자체(행동 하나로
  끝내는 반전 등)와 부딪힌다. verify [문장 11 cliffhanger] 블록에 이 검사가
  아예 없다는 것과 그 이유를 주석으로 남겼다.

반려 경위  견본 초안("닫은 게이트를 재개방 → 새 게이트가 열린다")이 박 님
  반려 — 같은 게이트 재개방은 '새 인물·사건'이 아니라 '같은 일의 반복'으로
  읽힌다는 지적. 확정판(정장 차림 남자의 등장)으로 교체.

신규 5문항  cf-return-crisis(continue, 견본·①위기) · cf-return-newcomer
  (continue·②새 인물·사건) · cf-return-reversal(continue·④반전 행동) ·
  cf-doorstep-glance(continue·⑥관계 암시, 자기 원문) · cf-gym-glow(continue·
  ⑤기대감, 자기 원문). requireAll·requireAny 없는 첫 문장 트랙 단계 — 이름
  지정이 아니라 '패턴'이 과제다. forbidPassageCopy 5건 전부. maxChars 80 ·
  minVerbs 1(짧은 절단은 동사 하나로도 된다). 전부 신규 행 — update SQL
  없이 seed_data.sql insert 로 들어간다.
stages.json  cliffhanger coach_intro·coach_line·self_checks 2줄 채움(title
  '절단신공'·summary '마지막 줄이 다음을 부르게 한다' 유지).
docs/characters.md  '문장 11 인물(간이)' 신설 — 도윤(던전 귀환 헌터, 도입
  트랙 강도윤과 이름만 같다·회귀 설정 없음) · 지호+예린(같은 팀 동료) ·
  시우(등급 정체 헌터, 원장 한시우와 이름만 같다). 문제 먼저 원칙대로 원장
  출발 아님 — 이름 충돌을 박 님이 미리 지적해 별개 인물임을 명시로 적었다.

verify.ts [문장 11 cliffhanger]  활성 5 · continue 5 · auto·choices null·
  difficulty 1·maxChars 80·minVerbs 1 균일 · forbidLabel 동일 · forbidPassageCopy
  5건 · requireAll·requireAny 없음(첫 사례) · doorstep-glance 만 forbidWords
  8개(+고백·사랑), 나머지 4건 6개 · 원문 A 3건 공유 명시 단언(같은 단계 안
  공유는 베낌 가드 예외) · 원문 불변식(5건 전부 무난 — 절단 패턴은 학습자가
  마지막 줄에 얹는 것이지 원문 결함이 아니다, 이 단계가 skill 전체 무난인
  첫 사례) · 원문 그대로 제출 → passageCopy fail 5건 · 모범 10건 pass(실측
  자수·형태소 동사수 kiwipiepy 그대로) · 나쁜 표본 2건 fail(forbidWords 2건·
  passageCopy) + 점검 1건 pass("도윤도 눈을 감았다" — 절단 여부 자체는 규칙
  한계, 자기점검 1이 그 자리라고 주석에 명시) · 숫자 반복 표현 부재 가드 ·
  stages coach·self_checks 대조. [규격 6] 검사는 이 블록에 없음(주석으로
  이유 명시).
  왕복 규칙: nameSkills 에 cliffhanger 추가 — 대표 이름은 instruction 둘째
  문장 머리(m4 "○○은/는")에서 그대로 뽑힌다(도윤·시우), 지호+예린은 새
  정규식 없이 m4 로 '지호'만 잡히지만 characters.md 쪽 "지호+예린(...)"
  항목이 부분 문자열로 대조돼 통과한다.
  [불변식: forbidWords 자기 목록] cliffhanger skill 전체를 예외로 추가(5건
  다 무난 원문)
  [forbidLabel 표시] 58건(53+5) · update-forbid-display.sql 제외 목록에
  cliffhanger 추가 · [가르침 층] COACH_SKILLS 20→21 · [자기점검] withSelfChecks
  +cliffhanger
  ★ 버그 발견·수정(세션 38 자체)  문장 12 action_turn 재개(세션 37)가 활성
  bt- 답안 10건을 새로 만들었는데, 그 이전 세션의 단계 간 베낌 가드 대조원
  풀(당시 마지막 값 93, first_hook 몫)이 그 뒤로 한 번도 bt- 10건을 얹어
  갱신되지 않은 채로 남아 있었다 — 즉 세션 37 자체가 이 갱신을 빠뜨렸다.
  이번에 문장 11 블록을 새로 얹으며 '기존 83+bt 10=93'이라고 잘못 베껴
  쓴 것을 test:scoring 이 "실제=103"으로 즉시 잡아냈다(93 이 아니라 103 이
  맞는 값 — 기존 93[first_hook 까지] + bt 10). 코멘트·기대값을 103 으로
  정정. 세션 37 커밋(5db46fe)엔 애초에 이 대조원 갱신 자체가 없었다는 뜻이라
  ─ 이번 수정이 사실상 세션 37 몫의 누락을 이번에 메운 것이다.
seed_verify.sql  불변식 2 에 cliffhanger 5건 source_key 예외 추가(전부 type
  continue 라 이미 안 걸리지만 문서 대칭을 위해 명시로도 적었다).
검증  tsc 0 · next typegen · test:scoring 5420/0(형태소 서버 켜짐) ·
      check:numbers 0 · gen:seed(문항 148→153·모범답안 219→229) · next build
      통과 · 물기 3건: characters.md 의 '문장 11 인물' 절 전체를 비움 →
      지호(『문지호』부분 문자열)·도윤(『강도윤』)·시우(『한시우』) 는 무관한
      인물과의 우연한 부분 문자열 겹침으로 여전히 pass 하고, 겹침이 없는
      예린만 fail 하는 것을 확인(왕복 규칙의 알려진 부분 문자열 위험이
      실제로 이렇게 작동한다는 실증) — 복원 / 원칙 10 예외에서 cf-return-crisis
      를 빼 자기 forbidWords 불변식 fail 확인 후 복원 / 원문 A 공유 단언은
      cf-return-newcomer 의 source_key 를 임시로 바꿔 3건 일치 단언이 fail
      하는 것을 확인 후 복원(CRLF 바이트 수 5151 유지 확인).
★ DB 절차(박 님)  seed_data.sql(멱등) → seed_check.sql → 브라우저 '절단신공'
  5문항 눈검사. 1·2·3번이 같은 원문으로 뜨는 것은 의도(원문 A 공유) — 버그
  아님. 조건 요약 "80자 이하"만 뜨는지(이름 요구 칩 없음, 이 단계 첫 사례).
```

### 끝난 것 — 세션 37 (문장 12 action_turn '전투 서사화' 재개 · 빈 단계 3개 발견)

```
발견  빈 단계가 3개였다 — 문장 11 cliffhanger(절단신공 기초, 세션 35 발견) ·
  문장 12 action_turn(전투 서사화, 이번 세션 발견) · 도입 4 start_episode
  (세션 36 발견). 순서를 12 → 11 → 보스로 잡았다 — 문장 12 는 문장 트랙
  안이라 도구(requireAll·forbidLabel)가 이미 다 있어 제일 빨리 채울 수
  있었고, 11 은 12(cliffhanger_adv 의 기초 버전)와 겹치는 설계라 12 뒤에
  다시 보는 게 낫고, 보스는 도입 4 를 흡수하는 자리라 마지막이다.

참고 자료  04_전투씬_작법_종합정리(턴제·의도·카드게임식) + 박 님이 준 기성
  작품 3편(무협·현대 격투·판타지) 화면 캡처 45장 — 구조만 참조, 문안 인용
  0건. 04 의 "의성어 과용" 진단은 이번 설계에서 절대 금지가 아니라 자리
  문제로 읽었다 — 의성어 단독 줄 + 다음 줄에 무슨 일인지 서술이면 정상,
  forbid 하지 않는다(실제 작품 45장 관행과 04 진단 사이의 차이). 04 의
  "전투는 중요하지 않다"는 coach 문구에 옮기지 않았다.

경위  견본 bt-spear-range 는 초안("서린이 창을 흘렸는데 창이 팔뚝을 끼워
  다치는" 구도)이 박 님 반려로 "동작 하나에 원인 하나"로 단순화됐다. 박 님
  주의: "동작 하나에 원인·결과 하나"는 절대 명제가 아니라 설득력 기준이다
  — 필요하면 더 복잡한 동작도 쓸 수 있다.

신규 5문항  bt-alley-hook(convert·결함 '강력했다') · bt-spear-range
  (continue, 견본) · bt-orc-axe(continue) · bt-fireball-shield(convert·
  느낌 말 나열 결함) · bt-low-guard(continue). requireAll 두 이름 · forbid
  PassageCopy 5건 전부. forbidWords 는 어간 '강력'(활용형 '강력한' 아님) —
  1번 원문 "강력했다"를 잡기 위해 실측으로 정했다.
stages.json  action_turn coach_intro·coach_line·self_checks 2줄 채움
  (title '전투 서사화' 유지, summary 갱신).
docs/characters.md  '문장 12 인물(간이)' 5쌍 신설(전원 신규, 원장 출발 아님).

verify.ts [문장 12 action_turn]  옛 [10단계 action_turn] 블록(오탐 감시·
  덤프 대조 등)은 손대지 않고 새 블록을 별도로 뒀다. ★ 옛 블록의 덤프 필터
  두 곳이 skill_key 만 보고 있어 실측으로 깨지는 걸 확인 — source_key 접두
  'at-' 로 좁혀 고쳤다(안 그러면 "action_turn 8문항" 카운트가 13이 되고,
  "지시문 두 종" 검사가 신규 5건의 새 지시문까지 섞여 깨진다. deactivate.json
  전수 대조도 활성 bt- 를 비활성 목록에 잘못 넣을 뻔했다). 새 블록: 유형
  continue 3/convert 2 · requireAll 대조 · forbidPassageCopy 5건 · forbidWords
  '강력' 어간 검사 · 원문 불변식(결함 2건 alley-hook·fireball-shield · 무난
  3건 spear-range·orc-axe·low-guard) · [규격 6 불변식] 16·18 전례 재사용 —
  10건 중 3건(orc-axe 나·fireball-shield 나·low-guard 나)은 속마음이 짧고
  급한 문장 리듬(전투의 순간성)으로 들어가 있어 종결형이 '~다.'다. "못
  잡으면 주석으로만" 전례대로 사람이 확인한 예외로 남기고 단언은 나머지
  7건에만 건다 · 모범 10건 pass + 나쁜 표본 5건 fail(형태소 필요 1건은 morph
  서버 있을 때만) + 점검 1건 pass(의성어 단독 줄) · 단계 간 베낌 가드
  93문장(기존 83 + 활성 first_hook 10) · stages coach·self_checks 대조
  왕복 규칙: nameSkills 에 action_turn 추가 — requireAll 이 5건 다 있어 새
  정규식 없이 canon 이 그대로 뽑는다
  [불변식: forbidWords 자기 목록] action_turn(bt-) 무난 3건 예외 추가
  [forbidLabel 표시] 53건(48+5) · [가르침 층] COACH_SKILLS 19→20 ·
  [자기점검] withSelfChecks +action_turn
seed_verify.sql  불변식 2 에 action_turn(bt-) 무난 3건 source_key 예외 추가
검증  tsc 0 · next typegen · test:scoring 5217/0(형태소 서버 켜짐) ·
      check:numbers 0 · gen:seed(문항 143→148·모범답안 209→219) · next build
      통과 · 물기 5건: 옛 [10단계 action_turn] 덤프 필터 두 곳에서 'at-'
      접두 제거 → 카운트·지시문·비활성 목록 대조 fail 재현(각각) / 원칙 10
      예외에서 bt-orc-axe·bt-low-guard 를 빼 자기 forbidWords 불변식 fail /
      [규격 6] styleReviewedBt 비움 → 3건 재현 fail — 전부 확인 후 복원
★ 화면 '준비 중' 확인  app/page.tsx 의 분기가 skill_key 하드코딩이 아니라
  count===0(동적, RLS 와 같은 is_active 가드) 인 것을 코드로 확인 —
  bt- 5건이 활성이 되면 count 가 5 로 바뀌어 자동으로 '준비 중'이 풀린다.
  코드 수정은 필요 없었다.
★ DB 절차(박 님)  seed_data.sql → seed_check.sql → 브라우저 '전투 서사화' —
  '준비 중'이 사라지고 5문항이 뜨는지 · requireAll 칩에 두 이름 · 옛 at-
  문항이 안 보이는지.
```

### 끝난 것 — 세션 36 (구성 18 first_hook '1화 훅' 신설 · 구성 빈 단계 4개 완료)

```
세션 36 정정 v2  구성 18 maxChars 180/150 → 200(5문항 전부), 박 님 실사용 판단 —
  다섯 줄 문항은 답안 여유가 필요하다. seed/update-first-hook-v2.sql. 다른
  config 키·문안은 무변경.

★ 구성 빈 단계 4개 완료 — 구성 13 likability · 15 info_gap · 16 cliffhanger_adv ·
  18 first_hook(세션 33~36). 구성 16 은 DB 반영·브라우저 눈검사 박 님 확인
  완료(세션 35). 구성 13·15 는 이미 지난 세션에 닫힘 확인된 것으로 기록돼 있다.

원칙 갱신
  ★ 원칙 5 강화(박 님): 문제 먼저, 인물은 문제에 맞춰 추가 — 원장에서
    출발하지 않는다. 원장은 규칙·체계가 잡힌 뒤 활용하는 자리다. 이번 5문항의
    이름(카리엘·서준혁·진운·강도윤·하은수)은 도입 간이와 같지만 상황이
    먼저였다 — 간이 5명 승격은 하지 않는다(열린 항목).
  ★ 규격 7 보강: 결함 원문도 결함 하나만 — 가르치려는 결함 외의 군더더기
    (역할 없는 세계 정보)는 넣지 않는다. 학습자는 원문의 나머지를 정상으로 배운다.

발견  도입 4 start_episode(1화 축약)도 문항 0이다 — 문장 11 cliffhanger 와
  같은 유형의 빈 단계. 이번엔 안 건드리고 열린 관찰에 등재만 한다.
  이 저장소에 'write' 유형은 없다(도입 2도 convert). 설계안의 5번 "설정
  카드만 주고 쓰기"는 기존 유형 원칙으로 종합 convert(3요소 0 원문)로 바꿨다
  — 설정 카드형은 보스 문항 몫으로 미룬다.

경위  견본 fh-villainess-mirror(세 왕국 군더더기 원문 → 규격 7 보강 계기) 확인
  → 나머지 4건 일괄 확정. 박 님 반려 경위 넷:
  ① 준혁이 공을 두고 감·약점을 문자로 전송 → 신인에게 그립 알려주기·덕담으로
  ② 진운 문항의 문양 위치·왼손 검객 설정 → 화살 깃·아버지 회상·정보 수집으로
  ③ 도윤 문항의 물 얼룩·던전 순서·주소 단서 → 휴대폰 날짜·흐린 기연으로
  ④ 은수 문항의 울 시간 몰아쓰기·눈매 묘사 → 부은 눈·목 멤·대표가 먼저 알아보고
    멈추는 반응으로

신규 5문항  fh-villainess-mirror(convert, 견본·forbidPassageCopy 없음 — 원문
  어휘 자체가 forbid) · fh-release-ball(convert·결함 '매력 0') ·
  fh-burnt-manor(convert·다짐어 결함) · fh-regress-date(continue·세 줄 이어쓰기·
  maxChars 150) · fh-broken-engagement(convert·결함 '3요소 0'). requireAny 가
  5건 전부에 있다 — 이 저장소에서 이름 강제가 100% 적용된 첫 구성 단계
  (카메라를 반드시 주인공에게 붙인다). forbidLabel 세 갈래(세계5 3건·평가어
  1건·다짐어 1건). 전부 신규 행 — update SQL 없이 seed_data.sql insert.
stages.json  first_hook coach_intro·coach_line·self_checks 2줄 채움
  (title '1화 훅'·summary '다섯 줄 안에 세 요소를 넣는다' 유지).
docs/characters.md  "문제 먼저, 인물은 문제에 맞춰" 를 원칙 줄에 추가. 도입
  트랙 간이 절에 5명 재사용 사실만 각주로 남기고 승격은 안 함.

verify.ts [구성 18 first_hook]  유형 convert 4/continue 1 · maxChars·minVerbs
  문항별(150/3 vs 180/4) · requireAny 5건 전수·requireAll 부재 대조 · forbidLabel
  세 갈래 대조 · '년 전'·'줄은' 부재 검사(4번 "십 년 전" 오검출 회피) · 원문
  불변식(어휘형 결함 2건 villainess-mirror·burnt-manor · 무난·비어휘형 결함
  3건 regress-date·release-ball·broken-engagement) · [규격 6 불변식] 16 것
  재사용 — 10건 중 8건은 잡히고 2건(burnt-manor 나·broken-engagement 나)은
  속마음이 자유간접화법("그는 알고 있었다"·"궁리하다")으로 들어가 있어 문장
  종결형이 그대로 '~다.'다. 16 설계 때 정한 대로 "못 잡으면 주석으로만" —
  이 2건은 사람이 읽고 확인한 예외로 남기고 단언은 나머지 8건에만 건다 ·
  모범 10건 pass + 나쁜 표본 5건 fail + 점검 1건 pass("십 년 전")
  왕복 규칙: nameSkills 에 first_hook 추가 — requireAny 가 5건 다 있어 새
  정규식 없이 canon 이 그대로 뽑는다
  [불변식: forbidWords 자기 목록] first_hook 무난·비어휘형 결함 3건 예외 추가
  [forbidLabel 표시] 48건(43+5) · [가르침 층] COACH_SKILLS 18→19 ·
  [자기점검] withSelfChecks +first_hook · 단계 간 베낌 가드 83문장(기존 73 +
  활성 cliffhanger_adv 10)
seed_verify.sql  불변식 2 에 first_hook 무난·비어휘형 결함 3건 source_key 예외
검증  tsc 0 · next typegen · test:scoring 4946/0(형태소 서버 켜짐) ·
      check:numbers 0 · gen:seed(문항 138→143·모범답안 199→209) · next build
      통과 · 물기 3건: [규격 6] styleReviewed 비움 → 2건 재현 fail 확인 /
      원칙 10 예외에서 fh-release-ball·fh-broken-engagement 를 빼 자기
      forbidWords 불변식 fail 확인 — 둘 다 복원
★ DB 절차(박 님)  seed_data.sql(멱등) → seed_check.sql → 브라우저 '1화 훅'
  5문항(requireAny 칩 5건 · 3번 다짐어 칩) 눈검사.
```

### 끝난 것 — 세션 35 (구성 16 cliffhanger_adv '절단신공 심화' 신설 · 규격 6 전면 적용)

```
★ 구성 13·15 닫힘: DB 절차(update-info-gap-v2.sql → seed_data.sql → seed_check.sql)
  실행 · 박 님 확인 완료(세션 34·35) — 이전 두 항목의 "보고 대기"는 이걸로 닫힌다.

발견  문장 11 'cliffhanger'(절단신공)이 빈 단계(문항 0)였다 — STATUS 는 "문장
  1~11 화면 붙음"으로만 적고 빈 단계 목록(구성 16·18)엔 안 넣어 놓쳤다. 박 님
  결정: 구성 16을 자립형으로 만든다 — IN-05(신호 깔고 끊기)를 한 단계에서
  가르치고 IN-04 6패턴은 재료로만 쓴다. 문장 11을 채울지 16으로 흡수할지는
  별도 결정 — 아래 열린 관찰에 등재, 이번 커밋에서 문장 11 stages 행은 안 건드림.

경위  설계안 승인 → 견본 1건(ca-open-door) 확인 → 나머지 4건 일괄 확정. 박 님
  반려 경위 셋: ① 손전등을 신호로 쓴 초안 삭제 ② 리안 문항 소품을 지팡이에서
  수정구로 교체 ③ 객잔 배경이 오두막 → (빈 오두막은 누군가 쓴다 · 발자국은
  암살자에게 허접하다 · 함정 방에 핏자국을 남기지 않는다는 지적으로) 객잔으로
  회귀. walk-home 도 초안(택시를 잡아 줬다가 중간에 보냄)이 "싸가지없어
  보인다"는 지적으로 반려 — 확정판은 애초에 잡지 않음.

신규 5문항  ca-gate-dinner(convert·forbidPassageCopy 없음 — 원문 자체에 forbid
  어휘 '그때였다'가 있어 통째 제출이 이미 막힌다) · ca-open-door(continue, 견본) ·
  ca-inn-endroom(continue) · ca-crystal-exam(convert·억지6+'몰랐') ·
  ca-walk-home(continue). forbidLabel 5건 전부 동일('서술자가 미리 말해 주거나
  억지로 끊는 표현'). maxChars 120(규격 6 여유분, 박 님 결정 — 대사/속마음
  한 줄이 들어갈 자리). 이름 강제(requireAll·requireAny) 없는 첫 구성 단계.
  전부 신규 행 — update SQL 없이 seed_data.sql insert 로 들어간다.
stages.json  cliffhanger_adv coach_intro·coach_line·self_checks 2줄 채움
  (title '절단신공 심화'·summary '끊기 전에 신호를 깐다' 유지).
docs/characters.md  리안 '상징' 층 신설("마력 측정 수정구가 리안에게만 다르게
  반응한다") + 등장에 ca-crystal-exam. 신규 간이 4명(민재·정우·소하·예진+태오).

verify.ts [구성 16 cliffhanger_adv]  유형 continue 3/convert 2 · forbidLabel
  5건 동일 대조 · forbidWords 크기 대조(crystal-exam 만 7개, 나머지 6개) ·
  '줄은' 부재(15 전례) · 원문 불변식(결함 2건 gate-dinner·crystal-exam ·
  무난 3건 open-door·inn-endroom·walk-home) · [규격 6 불변식] 모범 10건 전부에
  대사(") 또는 속마음 조각(종결형 '~다.'가 아닌 문장)이 있는지 — '첫 문장'
  으로 좁히면 중간 문장에 오는 속마음(gate-dinner·crystal-exam)을 놓쳐서
  '문장 전체'로 느슨하게 잡았고, 10건 전부 이 휴리스틱으로 걸렸다(주석으로
  낮출 필요 없이 실제 단언으로 세웠다) · 모범 10건 pass + 나쁜 표본 6건 fail
  (5건 즉시 · minVerbs 1건은 morph 서버 있을 때만) + 점검 1건 pass('…의
  것이었다') · 단계 간 베낌 가드 73문장(기존 63 + 활성 info_gap 10, ig-ball-
  envelope 는 action_turn 폐기 관례로 미포함) · stages coach·self_checks 대조
  왕복 규칙: nameSkills 에 cliffhanger_adv 추가 · 이름 추출 정규식(m4)을
  "^[^.]*\." 로 첫 문장에 앵커 — 앵커가 없으면 나중 문장의 무관한 명사에
  우연히 걸린다(ca-walk-home 에서 '원문'이 인물로 오탐된 것을 실측으로 확인) ·
  "○○과 △△는" 두 인물 형(m5) 신설 — ca-walk-home(예진+태오) 전용
  [불변식: forbidWords 자기 목록] cliffhanger_adv 무난 3건 예외 추가
  [DEICTIC 누출 감시] 말뭉치 전수 스캔에 corpusReviewed 신설(첫 사례) —
  ca-inn-endroom 지시문의 "몸이 먼저 위험을"이 '저 위'와 부분 문자열로
  겹친다(먼저의 '저' + 공백 + 위험의 '위'). 실제 조망 지시가 아니고
  cliffhanger_adv 는 DEICTIC 을 안 쓰니 채점엔 영향 없음 — 확정 문안이라
  글자를 못 바꿔 스캔에서 뺐다(DEICTIC_REVIEWED_COLLISIONS 와 같은 성격의
  말뭉치판 triage 기록)
  [forbidLabel 표시] 43건(38+5) · [가르침 층] COACH_SKILLS 17→18 ·
  [자기점검] withSelfChecks +cliffhanger_adv
seed_verify.sql  불변식 2 에 cliffhanger_adv 무난 3건 source_key 예외 추가
검증  tsc 0 · next typegen · test:scoring 4700/0(형태소 서버 켜짐) ·
      check:numbers 0 · gen:seed(문항 133→138·모범답안 189→199) · next build
      통과 · 물기 3건: 이름 추출 정규식 앵커 제거 → ca-walk-home '원문' 오탐
      재현 / DEICTIC corpusReviewed 비움 → 말뭉치 검사 fail 재현 / 원칙 10
      예외 목록에서 ca-open-door 를 빼 자기 forbidWords 불변식 fail 확인 —
      셋 다 복원
★ DB 절차(박 님)  seed_data.sql(멱등) → seed_check.sql → 브라우저 '절단신공
  심화' 5문항 눈검사.
```

### 끝난 것 — 세션 34 정정 v2 (ig-ball-envelope 폐기 · ig-friend-text 신설 · 규격 6·7 등재)

```
★ 구성 13·15: 저장소 쪽은 닫혔다. DB 반영·브라우저 눈검사 결과는 여전히 박 님
  보고 대기 — 명시 확인 없음. 꾸며 적지 않고 그대로 남긴다.

ig-ball-envelope 폐기  손등 키스는 유럽 궁정 예법에서 신사가 숙녀에게 하는
  정중한 인사라 이레나가 반응할 이유가 없었고(박 님 지적 · 조사로 확인),
  오빠의 청혼 편지 심부름도 장치(오해 유발)를 위해 지은 억지 구도였다.
  후속 초안(테라스 봉투 · 카페 유리창 목격 · 직접 보낸 사진)도 "눈앞에서 보고
  돌아서는 사람은 드물다 · 오해는 간접 증거(전언·물건·SNS)에서 생긴다"는 지적으로
  반려 — 규격 7조(아래)의 계기가 됐다. is_active=false 로 내림, 모범답안 2행 유지
  (행 삭제 금지 — 10단계 action_turn·구성 12 대비형 선례).

ig-friend-text 신설  친구의 목격 문자 + 인스타 태그 / 차 안 향수 — 오해가 간접
  증거에서 생기는 흔한 구도. 가·나 문안은 박 님이 문장 단위로 확정. 원문·나
  답안에 큰따옴표 대사가 처음 들어갔다(JSON/SQL 이스케이프 확인 완료).
  scoring_config 는 ball-envelope 와 동일(forbidLabel·forbidWords·forbidDisplay·
  forbidPassageCopy 그대로 승계) — order_no 5 재사용.

박 님 재점검  13 likability(4문항)·15 info_gap 의 나머지 9문항 상황을 규격 7조
  기준으로 다시 봤다 — "크게 문제 없음". ig-ball-envelope 만 반려 대상이었다.

규격 등재 — 6·7조 추가('정한 것'의 '구성 문항 설계 규격 7조'에 통합 등재)
  ⑥ 모범답안에 대사 또는 속마음 한 줄은 들리게 — 행동 시연(④) 유지, 서술자
    설명 금지와 안 부딪힌다("그는 몰랐다"=서술자, "잘못 봤겠지"=인물). 적용은
    friend-text 부터, 나머지는 전 단계 완성 후 전수 재점검 때 소급
  ⑦ 원문 상황은 그 장르 독자가 이미 아는 흔한 구도에서 가져온다 — 클리셰가
    신뢰의 근거. 오해는 눈앞의 목격이 아니라 간접 증거(전언·물건·SNS)에서.
    근거: 문항은 학습자에게 교본이다 — 억지 상황은 '이렇게 꾸며도 된다'를 가르친다

seed/dump/{problems,answers,deactivate}.json  ig-ball-envelope → deactivate.json
  추가(문항 133·비활성 13). ig-friend-text 신규 행(order_no 5) + 모범답안 2행.
seed/update-info-gap-v2.sql (신규)  기존 행 폐기는 update, 신규 행은 insert —
  update problems set is_active=false(ball-envelope) + insert(friend-text 문항 +
  모범답안 2행, on conflict do nothing). seed_data.sql 도 같은 델타를 통째로
  재발행한다(멱등) — 이 파일이 박 님이 먼저 돌리는 델타다.
docs/characters.md  '구성 15 인물(간이)'의 이레나·카시안에 "(폐기 —
  ig-ball-envelope 비활성, 세션 34)" 표기(삭제 안 함). 서윤·지훈·지아 간이 추가.

verify.ts [구성 15 info_gap]  활성 5(friend-text 로 교체) · 비활성 1(ball-envelope,
  기존 모범답안 2행 잔존 확인) 단언 추가 · forbidLabel·LEN·나쁜 표본(2건:
  forbidWords 3 + passageCopy·maxChars)·형태소 실측 전부 friend-text 로 교체 ·
  [불변식: forbidWords 자기 목록] 예외를 ball-envelope→friend-text 로 바꾸고,
  이 검사 자체에 비활성 문항 스킵(deadKeys)을 신설 — 폐기된 설계에 더는 이
  불변식을 강제하지 않는다(이후 폐기되는 문항들도 이 스킵을 그대로 탄다) ·
  deactivate.json 전수 단언에 ig-ball-envelope 추가(9→13이 아니라 12→13) ·
  forbidLabel 총계 32→38(활성 5 + 비활성 1 ball-envelope 도 필드가 남아 있어
  카운트에 잡힌다 — 대비형 cc- 4건과 달리 폐기 시 필드를 안 지웠다)
seed_verify.sql  불변식 2 의 source_key 예외를 ball-envelope→friend-text 로
  교체 + p.is_active is not false 필터 신설(TS 쪽과 대칭 — 비활성 문항은 DB
  쪽 이 불변식에서도 빠진다)
검증  tsc 0 · next typegen · test:scoring 4470/0(형태소 서버 켜짐) ·
      check:numbers 0 · gen:seed(문항 132→133·모범답안 187→189·비활성 12→13) ·
      next build 통과 · 물기: deactivate.json 에서 ig-ball-envelope 를 빼고
      재실행 → 활성 카운트·유형 분포·forbidPassageCopy·forbidLabel·모범답안
      행수·자기 forbidWords 불변식 등 8개 단언이 정확히 fail 하는 것을 확인 후 복원
★ DB 절차(박 님)  seed/update-info-gap-v2.sql → seed_check.sql → 브라우저
  '정보 비대칭' 5번이 friend-text 로 뜨고 ball-envelope 가 빠졌는지 · 원문
  상자에서 큰따옴표(인스타 문자 인용)가 안 깨지는지 눈검사.
```

### 끝난 것 — 세션 34 (구성 15 info_gap '정보 비대칭' 신설 · 규격 5조 세 번째 적용)

```
★ 구성 13 likability: 저장소 쪽은 닫혔다(커밋 9fd5051·b2c4437). DB 반영·브라우저
  눈검사 결과는 박 님 보고 대기 — 세션 안에서 "됐어"로 넘어와 명시 확인은 없었다.
  꾸며 적지 않고 그대로 남긴다.

경위  설계안 승인 → 견본 1건(ig-left-cup) 확인 → 나머지 4건 일괄 확정 순서로
      진행(박 님). 5번(ig-ball-envelope, 오해 유예)은 3번(ig-umbrella-walnut,
      헛짚기)과 "해소의 유예"라는 한 줄로 구별돼 별개 문항으로 유지됐다 —
      겹치는 설계처럼 보였지만 하나로 합치지 않았다. ig-gate-wait 는 "숨은
      선의"(영주가 실은 빵을 내려보내거나 열병을 앓아 문을 못 열었다) 초안이 박 님
      반려("당위가 조잡하고 빵의 의미가 없다") → 영주가 실제 악역인 이유
      (평민 견습을 들이면 웃음거리 / 전령의 기를 꺾으려는 의도)로 교체됐다.
      forbidWords 목록에서 '줄은'은 "밧줄은"에 오검출돼 뺐고, '독'은 문자열이면
      독자·독촉·고독에 걸려 forbidLemmas(독/NNG)로 옮겼다. requireAll '하늘'
      누수는 이번 문항(ig-umbrella-walnut)에서 실재 확인 — 고치지 않고 진행.

신규 5문항  ig-gate-wait(convert·forbidPassageCopy 없음 — 원문 유지가 정답
  형태) · ig-left-cup(continue·forbidLemmas 독/NNG, 견본) · ig-umbrella-walnut
  (continue·requireAll 소민·하늘) · ig-cafe-scar(convert·forbid 어휘형 결함 원문은 이것뿐) ·
  ig-ball-envelope(continue). forbidLabel 두 갈래 — 3건 '서술자가 사실을 말해
  주는 표현' / 2건(umbrella·ball) '…말해 주거나 풀어 주는 표현'(오해까지 다룸).
  전부 신규 행 — update SQL 없이 seed_data.sql insert 로 들어간다.
stages.json  info_gap summary·coach_intro·coach_line·self_checks 2줄 채움
  (title '정보 비대칭' 유지). "독자에게 하나를 더 쥐여 주면 답답함이 기대감이 된다"
docs/characters.md  윤소민 등장에 ig-umbrella-walnut 추가. 하늘 등장을
  "(예정)" → "ig-umbrella-walnut(requireAll 누수 실재 확인 — 알려진 한계로
  두고 진행)"으로 확정. 신규 간이 5명(에린·위강·박형사·이레나·카시안).

verify.ts  [구성 15 info_gap] 블록 신설 — 유형 continue 3/convert 2 ·
  forbidPassageCopy 4건(gate-wait 제외, 명시 검사) · forbidLemmas(left-cup만
  독/NNG) · requireAll(umbrella-walnut 만 소민·하늘) · forbidLabel 두 갈래 대조 ·
  '줄은'이 forbidWords·forbidDisplay 어디에도 없음을 5문항 전수로 검사 ·
  원문 불변식(결함 원문은 cafe-scar 하나뿐 — gate-wait 는 결함이 '정보 0'이라
  이 불변식으로는 못 잡는 유형임을 별도로 명시) · 모범 10건 pass(실측
  kiwipiepy 그대로) · 나쁜 표본 7건 fail(forbidWords 6건 즉시 · forbidLemmas
  1건은 morph 서버 있을 때만) · lemma 오검출 점검 2건 pass(고독/독촉/독자적 ·
  밧줄은 섞임) · 하늘 누수 표본 1건을 "현재 pass — 알려진 한계"로 등재(고치는
  날 뒤집을 자리) · 단계 간 베낌 가드 63문장(기존 55 + 활성 likability 8) ·
  숫자 반복 표현 부재 가드 · stages coach·self_checks 대조
  [불변식: forbidWords 자기 목록] info_gap 무난 문항 4건(source_key 단위) 예외
    추가 — left-cup·umbrella-walnut·ball-envelope 는 헛짚기 전 무난한 장면이라,
    gate-wait 는 결함이 forbid 어휘가 아니라 '정보 0'이라(이 검사로는 못 잡음)
  [쓰지 않을 말 표시] forbidLabel 32→37 · update-forbid-display.sql 제외
    목록에 info_gap 추가
  [가르침 층] COACH_SKILLS 16→17 · [자기점검] withSelfChecks +info_gap
  왕복 규칙: nameSkills 에 info_gap 추가 · 이름 추출에 네 번째 정규식 열 —
    지시문의 '둘째 문장' 머리("○○는/은 …", 첫 마침표 뒤)에서 뽑는다
    (gate-wait·left-cup·ball-envelope. cafe-scar 는 기존 "아래 장면을 고쳐
    쓰시오. ○○는" 패턴으로 이미 잡힌다). characters.md 대조를 완전 일치
    에서 부분 문자열 포함으로 넓힘 — ig-umbrella-walnut 의 requireAll이
    '소민'(윤소민의 애칭)만 쓰는 것을 원장 헤더 '윤소민'과 잇기 위해서다
  seed_verify.sql  불변식 2 에 info_gap 무난 문항 4건 source_key 예외
    (ig-left-cup·ig-umbrella-walnut·ig-ball-envelope 는 type continue 라
    이미 안 걸리지만 명시로도 뺐다 · ig-gate-wait 는 type convert 라 이
    예외가 없으면 실제로 걸린다 — 결함 유형이 forbid 어휘가 아니라서 뺐다)
검증  tsc 0 · next typegen · test:scoring 4463/0(형태소 서버 켜짐) ·
      check:numbers 0 · gen:seed(문항 127→132·모범답안 177→187) · next build
      통과 · 물기 3건: characters.md 부분 문자열 대조를 완전 일치로 되돌려
      '소민' 대조 fail 확인 / seed_verify.sql 예외 목록에서 ig-gate-wait 를
      빼 자기 forbidWords 불변식 fail 확인 / ig-left-cup forbidLemmas 를
      config 에서 지워 관련 단언 4건(정확히·표시 대조·나쁜 표본·오검출 점검)
      fail 확인 — 셋 다 복원
★ DB 절차(박 님)  seed_data.sql(멱등) → seed_check.sql → 브라우저 '정보 비대칭'
  5문항 눈검사. problems 에 order_no 컬럼 없음 — 확인 select 에 쓰지 말 것.
```

### 끝난 것 — 세션 33 (구성 13 likability '호감 확보' 신설 · 규격 5조 첫 적용)

```
경위  설계안 승인 → 견본 1건(lk2-broken-sword, 한시우 재사용) 확인 → 나머지 3건
      일괄 확정 순서로 진행(박 님). lk2-deal-credit 은 박 님이 앞선 두 초안
      (무협 표사 공 넘기기 — 설정 논리 파탄)을 반려한 뒤 상황 후보 10개 중
      6번(회사 프레젠테이션)을 고른 것. lk2-night-shift-bill 은 초안 그대로
      확정 — forbid 방향을 반전(평가어9 대신 불행한 태도어)하는 이번 배치의
      유일한 예외.

신규 4문항  lk2-broken-sword(continue·한시우 재사용) · lk2-deal-credit(convert·
  문지호/정유나) · lk2-night-shift-bill(convert·고은재, forbid 방향 반전) ·
  lk2-night-raid(continue·노아/카일, requireAll 2명 — 두 사람이 과제 본질).
  4건 전부 forbidPassageCopy true. lack·contrast 와 달리 4건 모두 원문에
  인물 이름이 이미 있다 — 이름 요구가 아니라 forbidPassageCopy 가 원문
  복사를 막는다. 전부 신규 행 — update SQL 없이 seed_data.sql insert 로
  들어간다.
stages.json  likability summary·coach_intro·coach_line·self_checks 2줄 채움
  (title '호감 확보' 유지). "능력이 아니라 궁할 때 내놓는 것으로 응원받는다"
docs/characters.md  한시우 매력에 한 줄 추가(검을 내주고 돌려받겠다는 말로
  시혜를 지운다) + 등장에 lk2-broken-sword. 신규 간이 4명(문지호·고은재·
  노아·카일) — 재사용되면 9층 규격으로 승격.

verify.ts  [구성 13 likability] 블록 신설 — 유형 continue 2/convert 2 ·
  requireAll(night-raid) · forbid 방향(3건 평가어9 / 1건 반전) · 원문 불변식
  (결함 원문 2건만 자기 forbidWords 에 걸림 · 4건 공통 passageCopy 불변식 —
  4건 모두 원문에 이름이 있어 lack·contrast 의 '원문에 이름 없음' 불변식은
  likability 에 적용하지 않는다) · 모범 8건 pass(실측 kiwipiepy 그대로) · 나쁜 표본
  6건 fail(forbidWords 4건 즉시 · minVerbs 2건은 morph 서버 있을 때만) ·
  단계 간 베낌 가드 55문장(기존 43 + 활성 contrast_char 12) · 숫자 반복
  표현 부재 가드 · stages coach·self_checks 대조
  [불변식: forbidWords 자기 목록] likability 무난 원문 2건(source_key 단위)
    예외 추가 — skill 전체가 아니라 source_key 단위로 좁힌 첫 사례
  [쓰지 않을 말 표시] forbidLabel 28→32 · isScored 에 ㅂ 불규칙(밉다→미워)
    자모 변형 후보 추가(세션 33 첫 실증 — 기존 휴리스틱의 사각) ·
    update-forbid-display.sql 제외 목록에 likability 추가
  [가르침 층] COACH_SKILLS 15→16 · [자기점검] withSelfChecks +likability
  왕복 규칙: nameSkills 에 likability 추가 · 이름 추출 정규식 2종 확장
    ("읽는 사람이 ○○를 응원하고 싶게" · "아래 장면을 고쳐 쓰시오. ○○의
    능력은/○○는") · charHeaders 가 '간이' 절의 한 줄 나열(이름(태그))도
    합쳐 읽게 확장 — 문지호·고은재·노아·카일이 `##` 헤더가 아니어도 통과
  seed_verify.sql  불변식 2 에 likability 무난 원문 2건 source_key 예외
    (night-shift-bill·deal-credit 은 결함 원문이라 계속 걸려야 한다 — 이미
    p.type='convert' 필터로 안 걸리지만 명시로도 뺐다)
검증  tsc 0 · next typegen · test:scoring 4213/0(형태소 서버 켜짐) ·
      check:numbers 0 · gen:seed(문항 123→127·모범답안 169→177) · next build
      통과 · 물기 2건: isScored 의 ㅂ 불규칙 변형 제거 → '밉다' 대조 fail
      확인 후 복원 / lk2-broken-sword forbidPassageCopy 를 false 로 낮춰
      3개 단언(config·불변식·나쁜 표본) fail 확인 후 복원
★ DB 절차(박 님)  seed_data.sql(멱등 insert + stages upsert) → seed_check.sql
  → 브라우저 '호감 확보' 4문항 눈검사. problems 에 order_no 컬럼 없음 —
  확인 select 에 쓰지 말 것.
```

### 끝난 것 — 세션 32 후기 4, 최종 (셀라 재설계·유겸 용병 전환)

```
박 님 판정: "문제 퀄리티가 원장을 이긴다" — 원장 갱신 · 규격 5조

원칙 갱신  characters.md 는 문항의 상전이 아니라 재료다. 문항 퀄리티와 인물
  배경이 충돌하면 인물 쪽을 고친다(왕복 규칙은 정합 규칙이지 원장 우선권이
  아니다). 숫자 반복 표현("두 번"·"세 번" 류)은 전역 금지 — 규격은 이제 5조
  (후기 3 의 4조 + 이 금지)다. 다음 구성 단계 초안에도 적용된다.

cc-junk-dealer 전면 교체 — 유품·견습·리안 연결 제거, 셀라는 저잣거리 만물상 상인
  passage  "고물상이 유품 값을…견습들은…" → "손님이 낡은 은시계 값을…상인은…"
  instruction  '동료 견습'·'유품' 서사를 걷고 "저잣거리에서 만물상을 하는 젊은
    상인"으로. scoring_config 불변(maxChars 100·minVerbs 3·forbidWords
    소중/다정·forbidPassageCopy)
  answers.json  가·나 전면 교체 — 가는 은시계를 닦아 제자리에 눕히는 행동,
    나는 무표정 흥정 + 값표를 안 고치는 행동으로 겉·속 분리(리안 참조·숫자
    반복 문구 제거). 실측 자수 가 74·동사 6 / 나 88·동사 8

cc-night-shift — 유겸 "신참 호위" → "젊은 용병"(상단 호위 의뢰) + 가 재구성
  instruction  직업만 교체, 나머지 문구 불변
  answers.json 가  "더 크게 웃으며" → "머슥하게 따라 웃었다. 그러나 그 웃음에
    반박하듯" — 웃음 자체를 겉으로, 반박하는 행동을 속으로 분리(박 님 두 안
    결합). 나는 불변. 실측 자수 가 75·동사 8(불변)

cc-first-pay  instruction 한 구절만 교체("…밥값부터 제가 내는 신참이다" →
  "…젊은 용병이다") — 나머지 글자 불변. 유겸 직업 통일

docs/characters.md
  서두 원칙 2줄 추가(원장은 재료다 · 숫자 반복 금지)
  셀라 재설계  '동료 견습·실용주의' → '저잣거리 만물상 주인·실용주의'. 속을
    지시문과 같은 문구로("제값을 받아야…믿는다"). 새는 순간·금기·말버릇에서
    리안·"은화 세 닢" 숫자 반복 제거. 등장 cc-junk-dealer 만
  유겸 헤더  '부잣집 출신 신참 호위' → '부잣집 출신 젊은 용병'
  리안 항목은 원래 셀라 참조가 없어 변경 없음(요청 항목이었으나 대조 결과 무해당)

seed/update-contrast-v4.sql (같은 미푸시 흐름이라 파일을 갱신 — v5 새로 안 냄)
  cc-first-pay·cc-night-shift instruction 교체 · cc-junk-dealer 는 passage 도
  같이 교체(활성 cc- 중 유일하게 passage 대입 줄이 붙는다) · 모범답안 6행
  (junk 2 + night 1 은 내용, first-pay·ace-siren·praise·flash 는 이미 후기
  3 값 그대로) 갱신. 멱등 — 후기 3 만 이미 돌렸어도 재실행으로 후기 4 정정까지
  같이 덮인다

verify.ts [구성 12]  실측 자수 표 갱신(night 84→75 · junk 82→84→74/88) ·
  update-contrast-v4.sql 파서에 passage 대입 선택 그룹 추가(정규식 — 지금은
  cc-junk-dealer 한 건만 갖는다) + passage 대조 단언 · "passage 대입은
  cc-junk-dealer 한 건뿐" 단언
검증  tsc 0 · test:scoring 4014/0(형태소 서버 켜짐) · check:numbers 0 ·
      gen:seed · next build 통과 · 물기: v4 SQL 의 cc-junk-dealer passage 를
      옛 문구로 되돌려 새 passage 대조 단언이 fail 하는 것을 확인 후 복원
★ DB(박 님)  update-contrast-v4.sql(갱신본 재실행, 멱등) → seed_data.sql →
  눈검사: ① 셀라·유겸 문항이 낯선 말 없이 읽히는지 ② 셀라 나가 겉·속 분리로
  읽히는지 ③ 기존 4점검(인물 판별·이름 요구 소멸·모범답안 즉독·완료 후 이동
  링크)
```

### 끝난 것 — 세션 32 후기 3 (구성 12 최종 확정 · 박 님 견본 규격)

```
박 님이 직접 수정한 도현 견본이 기준 — 구성 12 활성 6문항 전면 재작성

경위  박 님이 도현(cc-ace-siren) 문항을 직접 고쳐 견본으로 냈다. 원인은 원장
      내부 언어 유출 — 옛 지시문·모범답안이 characters.md 의 함축된 표현을
      그대로 썼다("무너지지 않는 겉" 류). 학습자는 원장을 안 본다. 답안은
      지시문 정보만으로 자립해야 한다.

박 님 견본 규격 4조 — 이후 남는 구성 단계 초안(구성 13 likability · info_gap ·
cliffhanger_adv · first_hook)의 기본 결이다
  ① 인물 설명은 겉·속의 관계까지 지시문 안에서 푼다("친절해 보이지만
     오히려…") — 원장 축약어 그대로 베끼지 않는다
  ② 과제는 "원문을 읽고 다음에 올 장면을 작성" — 대체가 아니라 이어쓰기.
     type 을 convert → continue 로 전환(채점 경로는 완전히 같다 — default
     분기가 type 을 안 본다)
  ③ 모범답안은 지시문 정보만으로 읽고 바로 이해된다 — 함축·원장 내부 언어 금지
  ④ 이름 강제(requireAny·requireAll)는 그게 과제 본질일 때만 건다 — 겉·속을
     한 인물 안에서 보이는 갭 문항(4건)은 이름 강제가 필요 없다. 갈라 세우기
     (cc-flash-crowd)·대비(cc-first-pay)처럼 "누구와 누구"가 과제 자체인
     문항만 유지한다

seed/dump/problems.json + seed/update-contrast-v4.sql  활성 cc- 6건
  공통  type convert → continue. 나머지 config(maxChars 100·minVerbs 3·
        forbidPassageCopy true) 불변
  갭 4건(cc-praise-callout·cc-ace-siren·cc-night-shift·cc-junk-dealer)
        requireAny 삭제 — 검사가 자수·동사·금지어(forbidWords)·원문복사 4개로
        준다. 두 칸 화면은 forbidWords 가 있어 그대로 유지
  cc-flash-crowd  requireAny ["한시우","시우"] 유지(갈라 세우기가 본질)
  cc-first-pay    requireAll ["조평","유겸"] 유지(대비가 본질)
  instruction 6건 전면 교체 — 박 님 문안 그대로(글자 하나 안 바꿈)

seed/dump/answers.json  12행 교체(박 님 확정판, first-pay 2행은 기존과 동일)
  실측 자수 가 95·71·84·82·84·96 / 나 80·96·82·84·81·86(순서: praise·ace·
  night·junk·flash·first-pay) · 동사 가 10·6·8·7·5·10 / 나 8·9·7·8·9·10 ·
  forbid 0 · 원문 통짜 미포함

docs/characters.md  도현 겉·속 문구를 박 님 판과 정합(왕복 규칙) —
  "친절해 보이지만 오히려 아무도 곁을 주지 못한다" · "목석 같은 행동도
  무너진다"로 손질

verify.ts [구성 12]  전면 갱신
  type continue 단언(6건) · 갭 4건 requireAny·requireAll 부재 단언 ·
  flash-crowd requireAny · first-pay requireAll 유지 단언 · 실측 자수·동사
  갱신 · 원문 불변식 — names가 빈 배열(갭 4건)이면 이름·reqKey 단언은
  건너뛰고 forbidPassageCopy 하나로 원문 그대로 제출을 막는다는 것만 문다 ·
  뚫기 물기는 이름 검사 유무와 무관하게 성립(원문(+이름) → passageCopy
  fail — 주석으로 명시) · 왕복 규칙 이름 추출을 requireAll/requireAny 부재
  시 instruction 의 "○○의 겉과 속을 한 장면에" 머리말에서 뽑도록 확장 ·
  update-contrast-v4.sql ↔ 덤프 대조(type 필드 포함)
★ DB 절차(박 님)  update-contrast-v3.sql(이미 실행됨) → update-contrast-v4.sql →
  seed_data.sql → seed_check.sql → 브라우저 '입체 캐릭터':
  ① 지시문에서 인물이 판별되는지 — "그래서 뭐라는지"가 이제 없는지
  ② 조건 요약에서 이름 요구가 갭 4건에서 사라졌는지
  ③ 모범답안이 읽고 바로 이해되는지 — 이번 판정 기준

정정 합본 v2 — 도현 문항 3곳 + 완료 후 이동 링크 (박 님 지시, 같은 커밋)
  도현 문장 정정  cc-ace-siren instruction "오히려 아무도 곁을 주지 못하는"
    → "쉽게 곁을 주지 않는"(뒤의 "마음을 준 사람은 몇 없고"와 모순이었다).
    가 "몸은 이미 차 쪽으로 돌아 있었다" → "차가 있는 방향으로 가고 있었다".
    나 "엘리베이터만 타던 사람이" → "엘리베이터만 고집하던 사람이".
    닿는 곳: problems.json·answers.json·update-contrast-v4.sql·characters.md
    (도현 겉 문구도 같은 구절로) · verify.ts LEN 표(ace 71→75·96→98)
    실측 자수 가 75·동사 7(형태소 서버 확인) / 나 98·동사 9(불변)
  완료 후 이동 링크(학습 동선 문제, 표시 손질 아님)  단계를 전부 통과한
    문항 화면에 '다음 단계 →'만 뜨고 단계 내 다른 문항으로 가는 길이
    없었다(박 님 발견). lib/train-nav.ts 에 cycleNextProblemKey 신설 —
    nextProblemKey 와 같은 ordered() 정렬 재사용, 통과 여부 무관하게 순서상
    다음(마지막이면 첫 문항으로 순회). 새 상태 관리 없음. TrainClient.tsx
    단계 완료 분기에 '다음 문항 →'(cycleKey)를 '다음 단계 →' 위에 추가
    표시. page.tsx 데이터 전달 불필요(loop.stageProblems 로 충분)
  verify.ts  [학습 루프: 단계 완료 후 훑어보기] 신설 — 중간·경계·마지막
    순회·방어(없는 key·빈 목록)·문항 하나뿐 + 물기(순회 로직을 빼면
    마지막 다음이 null 이 되는 것과 대조)
  검증  tsc 0 · test:scoring 4012/0(형태소 서버 켜짐) · check:numbers 0 ·
        gen:seed · next build 통과 · 물기: cc-ace-siren instruction 만 옛
        문구로 되돌려 v4 SQL 대조·seed_data 대조 2건 fail 확인 후 복원
★ DB(박 님) 추가 확인  ④ 완료된 단계의 문항에서 "다음 문항"과 "다음 단계"가
  둘 다 뜨는지
```

### 끝난 것 — 세션 32 후기 2 (구성 12 전면 재구성 · 원문 복사 차단)

```
박 님이 학습자로 완주하며 판정 2건 — 60자 압축을 100자 시연형으로 · 뚫기 구멍 봉함

① 모범답안 전부 미달        60자 2문장 압축은 겉·속 두 층이 퍼즐이 돼 "뭘 알려주는지
                          모르겠다". 100자 3~4문장 시연형으로 교체 — 겉 행동 → 전환 →
                          속이 새는 행동이 순서대로 읽히게. answers.json 활성 cc- 12행 교체
                          실측 자수 가 98·88·89·92·88·96 / 나 87·96·83·89·90·86 ·
                          동사 가 10·7·10·8·5·10 / 나 8·7·7·9·9·10
  problems.json  활성 cc- 6건 maxChars 60→100 · minVerbs 2→3 · forbidPassageCopy:true ·
                 instruction 2건 재작성(cc-ace-siren '겉과 속을 한 장면에' · cc-first-pay
                 '대비시키시오' — 페어). stages.json contrast_char summary
                 "상반된 인물을 나란히 세운다" → "겉과 속을 한 장면에 담는다"

② 원문 복사 + 이름 뚫기 실증  "원문 그대로 + 이름" 이 활성 6문항 전부 통과(무난 원문 단계의
                          구멍 — lack 5건도 동일). forbidPassageCopy 신설(정한 것에 등재).
  types.ts       forbidPassageCopy?: boolean — 답안(공백 제거)이 원문 전체를 부분
                 문자열로 품으면 fail. remove 계열 금지 주석
  local.ts       gradeLocal 서명에 passage?: string 선택 인자(config 아님). default
                 케이스에 key 'passageCopy' · label '원문 그대로 옮김' · gating ·
                 fail detail '원문을 고치지 않고 그대로 냈다'
  index.ts       combine 5번째 인자 passage → gradeLocal 로 전달
  summary.ts     forbidPassageCopy 면 '원문 그대로 내지 않기' 조각 추가
  route.ts       .select 에 passage 추가 · combine(…, problem.passage)
  TrainClient    criteriaChecks 가 problem.passage 를 gradeLocal 에 넘김(두 칸 기준 목록)
  problems.json  lk- 5건 forbidPassageCopy:true 추가(나머지 불변)
  seed/update-contrast-v3.sql (신규)  활성 cc- 6(instruction+cfg) · lk- 5(cfg) ·
                 활성 cc- 모범답안 12행. v2 는 이미 실행됨(비활성 4건)

verify  [구성 12] 실측 자수·config 단언(100·3·forbidPassageCopy true)·lk- 5건도
        forbidPassageCopy true · 뚫기 물기 11문항(cc 6 + lk 5 — 원문+이름 gradeLocal →
        passageCopy fail · 요구 검사는 pass) · update-contrast-v3.sql ↔ 덤프(jsonb·글자)
        [forbidPassageCopy] 유닛 블록(뚫기 fail · 통짜 포함 fail · 정상 pass · passage
        미지정 시 검사 없음 · combine 전달 · summary · route/TrainClient 배선)
검증    tsc 0 · test:scoring 4016/0(형태소 서버) · check:numbers 0 · gen:seed 무변화 ·
        next build 통과 · 물기: local.ts passageCopy 분기 무력화 → 뚫기 물기 11 + 유닛 4 fail 확인 후 복원
★ DB 절차(박 님)  seed/update-contrast-v3.sql → seed_data.sql(멱등) → seed_check.sql →
  브라우저 구성 12:
  ① 어제의 뚫기 답(원문 그대로 + 이름) 재제출 → '원문 그대로 옮김' 미달
  ② 조건 요약에 "100자 이하 · 움직이는 말 3개 이상 · … · 원문 그대로 내지 않기"
  ③ 모범답안이 겉 → 속 순서로 읽히는지 — 이번 교체의 핵심
```

### 끝난 것 — 세션 32 후기 (구성 12 재설계)

```
'대비 캐릭터' → '입체 캐릭터' — 박 님 판정: 라벨→층위
  경위   박 님이 학습자로 완주하며 판정 — 옛 문항은 인물이 한 줄 라벨이라
         "결과만 있고 배움이 없다". 겉과 속의 갭이 이 단계의 진짜 기술이다.
  docs/characters.md (신설)  인물의 단일 출처 — 문항이 인물을 쓰면 여기서 꺼내고,
         새 면모를 만들면 여기에도 적는다(왕복 규칙, 정한 것에 등재). 인물 10명
         (김하준·서담·윤소민·하늘·조평·유겸·한시우·도현·리안·셀라) + 도입 트랙 간이 7명.
         docs/README.md 목록에 추가
  비활성 4건  cc-report-credit·cc-street-night·cc-raid-reward·cc-relic-box → is_active
         false (action_turn 선례). 행 삭제 안 함 — 제출 이력 보존. cc-first-pay 는
         활성 유지(조평·유겸 프로필 정합 최고). deactivate.json 이 단일 출처
         (action_turn 8 + 이 4건 = 12) · seed/update-contrast-v2.sql(신규, 박 님 델타)
  신규 5건  갭 4(cc-praise-callout 서담·cc-ace-siren 도현·cc-night-shift 유겸·
         cc-junk-dealer 셀라 — forbidLabel '속마음을 직접 말하는 표현' · requireAny ·
         difficulty 1) + 군중 1(cc-flash-crowd 한시우 — forbid 없음 · requireAny ·
         difficulty 2). 원문은 결함 없는 무난한 장면 — 원문 그대로는 요구 검사가 막는다
  answers.json  활성 12행(신규 5×2 + first-pay 2, 비활성 4건 8행은 그대로 보존)
         실측 자수 가 44·47·42·43·43 / 나 41·44·42·46·44 · 동사 가 5·4·4·4·3 / 나 4·3·5·5·4
  stages.json    title '입체 캐릭터' · coach_intro(사람은 한 겹이 아니다)·coach_line
         ('겉 하나, 새는 속 하나!') · self_checks 2줄(겉·속 / 페어)
  verify [구성 12]  전면 재작성 — 활성 6·비활성 4 분리 · 갭/군중/first-pay 규격 각각 ·
         원문 불변식(이름 없음·forbid 없음·요구 검사 fail) · 단계 간 베낌 가드 43문장
         (도입 1 정답 5 + 도입 2·3 모범 20 + lack 모범 10 + 비활성 cc- 모범 8, 비활성도
         여전히 베끼면 안 되는 문장) · characters.md 왕복 규칙 대조(활성 lack·contrast_char
         인물 이름이 원장 헤더에 실재) · [불변식: forbidWords 자기 목록]·seed_verify.sql
         불변식 2 에 contrast_char 예외 추가(lack 과 같은 자리) · deactivate.json 단언 갱신
         (action_turn 8 + cc- 4) · [쓰지 않을 말 표시] forbidLabel 24→28
  검증   tsc 0 · test:scoring 3959/0(형태소 서버) · check:numbers 0 · gen:seed 무변화 · next build 통과
  ★ DB 절차(박 님): seed/update-contrast-v2.sql(비활성 4건) → seed_data.sql(신규 5 +
    stages 갱신, 멱등) → seed_check.sql → 브라우저 '입체 캐릭터':
    ① 제목·새 코치 말풍선 ② 문항 6개만 보이는지(옛 4개 사라짐)
    ③ 갭 문항에서 속마음 단어("불안했다" 류) → '쓰지 않을 말' 미달
    ④ 통과 → 새 모범답안 + 자기점검 2줄
    ⑤ 다섯 페어의 소개 두 줄이 대비를 쓰기에 충분한 정보인지 — 이번 재설계의 심장
```

### 끝난 것 — 세션 32

```
구성 12 contrast_char '대비 캐릭터' 5문항 — convert · requireAll 신설
  설계   페어 대비(3-05) — 같은 장면에서 두 인물이 서로 다르게 반응하게. lack 의 다섯
         인물을 재사용하고 상대역 5명 신설(서담·하늘·유겸·도현·셀라). 원문은 이름 없이
         '두 사람'만 담아 똑같이 움직인다 → 원문 그대로 제출은 requireAll(두 이름)이 막는다
  requireAll 신설  요구 검사의 복수형 — 나열된 낱말이 전부 있어야 통과. types(requireAll?)·
         local(key 'requireAll'·label '모두 넣을 말'·gating·fail detail 에 빠진 것만)·
         summary("'A' · 'B' 모두 넣기"). 테스트 3종 + 요약 케이스
  problems.json  cc- 5건 (convert · auto · order_no 1~5 · maxChars 60 · minVerbs 2 ·
         requireAll 2개. requireAny·forbid 없음)
  answers.json   reference 10행 (가·나 · blank_key '')
         실측 자수 가 42·40·38·41·40 / 나 40·40·36·41·37 · 동사 가 4·5·3·4·3 / 나 4·4·5·4·3
  stages.json    contrast_char coach_intro(옆에 반대쪽 사람을 세운다)·coach_line·self_checks 1건
  '헌 검집' 의도 재사용  cc-first-pay 나가 lk-guard-dawn 나의 버릇(헌 검집)을 낱말로 재사용 —
         문장 베낌 아님. 단계 간 베낌 가드는 문장째만 보므로 통과
  verify [구성 12 contrast_char]  5문항 형태·scoring_config(requireAll 정확히 2·requireAny 혼용
         금지) · 원문 불변식(두 이름 없음 · 원문 그대로 → requireAll fail) · 모범답안 10행 실측·
         두 이름 포함·베낌 아님 · 단계 간 베낌 가드 35문장(도입 1 정답 5 + 도입 2·3 모범 20 +
         lack 모범 10) · 형태소 동사 ≥ 2 · requireAll 물기('하늘' 누수 pass 를 알려진 한계로 명시)
         + [requireAll] 유닛 블록 · COACH_SKILLS 14→15 · [자기점검] +contrast_char
  검증   tsc 0 · test:scoring 3845/0(형태소 서버) · check:numbers 0 · gen:seed 무변화 · next build 통과
  ★ DB 반영·눈검사(박 님): seed_data.sql(cc- 5·reference 10 신규 insert + stages do update, 멱등)
    → seed_check.sql → 브라우저 '대비 캐릭터':
    ① 조건 요약에 "'김하준' · '서담' 모두 넣기" 뜨는지
    ② 한 인물만 쓴 답 제출 → '모두 넣을 말' 미달에 빠진 이름이 표시되는지
    ③ 통과 → 모범답안 가·나 + 자기점검("반응을 서로 바꿔 놓으면 어색해?")
    ④ 대비 없이 두 이름만 박은 답이 통과하는 건 알려진 한계 — 자기점검이 그 자리
    ⑤ 다섯 페어의 소개 두 줄이 대비를 쓰기에 충분한 정보인지
```

### 끝난 것 — 세션 31

```
구성 11 lack '결핍 부여' 5문항 — convert · 구성 트랙 첫 신설 · 코드 0줄
  설계   2단계(emotion_action)의 캐릭터 버전 — 순간 감정이 아니라 지속 상태(결핍)를
         버릇으로 새어 나오게. 5종 결핍(인정·애정·가난·열등·그리움) × 새 인물 5명
         (김하준·윤소민·조평·한시우·리안). 근거: 문항설계서 5-05 · 02 CH-04 · 정리본 20-4
  원문 구조  이름 없이 직함·상황만 담은 무난한 장면(결함 없음) — 원문 그대로 제출은
         forbidWords 가 아니라 requireAny(주인공 이름)가 막는다(도입 3 구조)
  problems.json  lk- 5건 (convert · auto · order_no 1~5 · maxChars 60 · minVerbs 2 ·
         forbidLabel(문항별 상이)·forbidWords·forbidDisplay · requireAny)
  answers.json   reference 10행 (가·나 · blank_key '')
         실측 자수 가 40·40·37·39·36 / 나 43·42·36·39·39 · 동사 가 4·5·5·2·2 / 나 5·5·5·2·3
  stages.json    lack coach_intro(사람을 만든다·버릇으로 새게)·coach_line·self_checks 1건
  verify [구성 11 lack]  5문항 형태·scoring_config(forbidLabel 문항별 상이) · 원문 불변식
         (이름 없음 · forbidWords 없음 · 원문 그대로 → requireAny fail) · 모범답안 10행 실측·
         forbid 0·requireAny·베낌 아님 · 단계 간 베낌 가드 25문장(도입 1 정답 5 + 도입 2·3 모범 20) ·
         형태소 동사 ≥ 2(서버 있을 때) · 코치·자기점검
         + COACH_SKILLS 13→14 · [쓰지 않을 말 표시] forbidLabel 19→24 · [자기점검] +lack
         + [불변식: forbidWords 자기 목록] · seed_verify.sql 불변식 2 에서 lack 제외
           (무난 장면이 원문 — 이 불변식 대상 아님)
  검증   tsc 0 · test:scoring 3699/0(형태소 서버) · check:numbers 0 · gen:seed 무변화
  ★ DB 반영·눈검사(박 님): seed_data.sql(lk- 5·reference 10 신규 insert + stages do update, 멱등)
    → seed_check.sql → 브라우저:
    ① 구성 트랙 '결핍 부여' 링크 생김 · 코치 말풍선(구성 트랙 첫 코치)
    ② 원문 그대로 제출 → '반드시 넣을 말' 미달
    ③ 결핍 단어 직접 쓴 답("한시우는 동기가 부러웠다" 류) → '쓰지 않을 말' 미달
    ④ 직접 통과 → 모범답안 가·나 + 자기점검 · 두 칸 화면(scoring key 4개)
    ⑤ 다섯 결핍이 학습자 눈에 서로 달라 보이는지 — 같은 문제의 반복으로 느껴지면
       그게 다음 처리 대상

  후기 — lack 모범답안 4행 교체 (박 님 실사용 판정, 원칙 3)
  판정 1  lk-desk-nine 가가 인정욕구가 아니라 '눈치보기'로 읽힘 — 결핍 표출은 눈치가
          아니라 전시·과시다(은근한 업적 나열, 남 깎고 자기 올리기). 새 가: 회식에서
          "그거 사실 제가 그린 그림이라고" 슬쩍 얹기
  판정 2  lk-cafe-wait 가·나, lk-board-rank 나는 박 님이 직접 쓴 답이 더 좋음 —
          박 님 실사용 답안의 모범답안화 두 번째 사례(세션 28 magpie 이후)
  다듬은 곳  맞춤법(만지작 거렸다→만지작거렸다 · 3번이였다→세 번이었다) · 했다체
          (돌려 보다→돌려 보았다) · 시점(제 얼굴→얼굴, 3인칭 서술에 1인칭 혼입 방지 —
          9단계 pov_lock 정합) · desk 가 후보에서 "세 번째" 삭제
  answers.json  reference 4행 content (행 추가·삭제 없음). 나머지 6행 불변
  seed/update-lack-refs.sql (신규)  기존 행이라 update (원칙 7)
  verify  실측 자수 갱신 가 47·48·37·39·36 / 나 43·56·36·46·39 · 동사 가 6·4·5·2·2 /
          나 5·6·5·3·3 · update-lack-refs.sql ↔ 덤프 4행 글자까지 대조
  ★ DB 반영·눈검사(박 님): seed/update-lack-refs.sql → 브라우저에서 lk-desk-nine ·
    lk-cafe-wait · lk-board-rank 통과 후 모범답안 가·나가 새 문구로 뜨는지. 특히
    김하준 가가 이제 '전시하는 인정욕구'로 읽히는지
```

### 끝난 것 — 세션 30

```
도입 3 start_extend '도입 잇기' 5문항 — continue 유형 첫 사용 · 코드 0줄
  설계   구성 C(전이 확인용): 지문 이어받기 3 + 새 지문 2. 도입 1 의 '거시 서술' 오답을
         글자까지 이어받아(hunter·sword·vow), 학습자가 세상 설명 뒤에 주인공을 무대에
         올린다. 새 지문 2 는 신작 — 새 인물 에스텔(로판)·서준혁(야구).
  축     금지가 아니라 요구 — requireAny(주인공 이름) + minVerbs 1(움직임). forbid 계열 없음.
  problems.json  se- 5건 append (continue · auto · order_no 1~5 · maxChars 60 · minVerbs 1 · requireAny)
  answers.json   reference 10행 (가·나 · blank_key '')
                 실측 자수 가 42·39·35·43·40 / 나 40·31·34·35·40 · 동사 가 4·2·2·4·2 / 나 1·3·2·3·3
  stages.json    start_extend coach_intro(세 문장 안에 착지)·coach_line·self_checks 1건
  verify [도입 3 start_extend]  5문항 형태·scoring_config · 지문 이어받기 대조(3건) · 새 지문 신작(2건) ·
         불변식(지문에 이름 없음 · 지문 그대로 → requireAny fail) · 모범답안 10행 실측 자수·requireAny·
         베낌 아님 · 단계 간 베낌 가드(도입 1 정답 5 + 도입 2 모범 10 = 15문장 부분 문자열 아님) ·
         형태소 동사 ≥ 1(서버 있을 때) · 코치·자기점검
         + COACH_SKILLS 12→13 · withSelfChecks +start_extend
  검증   tsc 0 · test:scoring 3512/0(형태소 서버) · check:numbers 0 · gen:seed 무변화
  ★ DB 반영·눈검사(박 님): seed_data.sql(se- 5·reference 10 신규 insert + stages do update, 멱등)
    → seed_check.sql → 브라우저:
    ① 도입 트랙에서 '도입 잇기' 링크 생김 · 코치 말풍선(목록 intro · 문항 line)
    ② 이름 없는 이어쓰기 제출 → '반드시 넣을 말' 미달
    ③ 직접 이어 써서 통과 → 모범답안 가·나 + 자기점검
    ④ 한 칸 화면(scoring key 3개 — 두 칸 아님) · 조건 요약
       ("60자 이하 · 움직이는 말 1개 이상 · '강도윤' 또는 '도윤' 넣기" 류)
    ⑤ 새 인물 2건(에스텔·서준혁) 지시문·지문이 어색하지 않은지 — 처음 보는 인물이
       소개 한 문장으로 충분한지가 이번 눈검사의 핵심
```

### 끝난 것 — 세션 29

```
도입 2 start_write '첫 문장 쓰기' 5문항 — convert · requireAny 첫 사용
  설계   passage 는 도입 1(start_choose)의 '추상 분위기' 오답을 글자까지 이어받는다. 학습자는
         그 문장을 주인공이 보고·듣고·만지는 것으로 다시 쓴다. 원문 그대로 제출은
         forbidWords(분위기어) + requireAny(주인공 이름) 두 겹으로 막힌다.
  problems.json  sw- 5건 append (convert · auto · choices null · order_no 1~5 · difficulty 1).
                 scoring_config: maxChars 60 · minVerbs 1 · forbidLabel '분위기를 직접 말하는 표현' ·
                 forbidWords(공통 기운·느낌·분위기 + 문항별 불길/스산/서글/긴장·형언) ·
                 forbidDisplay · requireAny(강도윤·도윤 / 진운 / 하은수·은수 / 카리엘 / 이재하·재하)
  answers.json   reference 10행 (sw-당 ord 1 가 / 2 나 · blank_key '')
                 실측 자수(공백만 제외·구두점 포함): 가 41·37·34·32·37 / 나 37·28·37·25·36
                 실측 동사: 4·3·4·3·4·3·3·2·3·2. 전 행 forbidWords 적중 0 · requireAny 충족 ·
                 60자 이내 · passage 베낌 아님 · 도입 1 정답 문장 베낌 아님
  stages.json    start_write coach_intro(분위기는 보여줘)·coach_line·self_checks 1건
  verify [도입 2 start_write]  5문항 형태·scoring_config · passage 이어받기 대조(글자까지) ·
         불변식(원문 그대로 → forbidWords fail + requireAny fail) · 모범답안 10행 실측 자수·
         forbidWords 0·requireAny 포함·베낌 아님 · 단계 간 베낌 방어(sc- 정답 문장 부분 문자열 아님) ·
         형태소 동사 ≥ 1(서버 있을 때) · 코치·자기점검
         + COACH_SKILLS 11→12 · [쓰지 않을 말 표시] forbidLabel 14→19(emotion 6+sensory 8+start_write 5)
  검증   tsc 0 · test:scoring 3297/0(형태소 서버) · check:numbers 0 · gen:seed 무변화
  ★ DB 반영·눈검사 절차(박 님): seed_data.sql(problems 5·reference 10 신규 insert + stages
    coach·self_checks do update — 멱등) → seed_check.sql → 브라우저:
    ① 도입 트랙에서 '첫 문장 쓰기'가 준비 중에서 풀려 링크가 생겼는지
    ② 단계 목록 coach_intro 말풍선 · 문항 화면 coach_line
    ③ 아무 문항에서 원문 그대로 제출 → '쓰지 않을 말' + '반드시 넣을 말' 두 검사가 미달로
       잡히는지 (밑줄은 fail 검사만)
    ④ 직접 고쳐 통과 → 모범답안 가·나 + 자기점검 한 줄
    ⑤ 두 칸 화면(scoring key 4개↑) — 오른쪽에 "분위기를 직접 말하는 표현 · 예: …" 범주 줄 +
       조건 요약 한 줄("60자 이하 · 움직이는 말 1개 이상 · '강도윤' 또는 '도윤' 넣기" 류)

세션 29 후기 — 도입 2 실사용 발견 4건 (박 님 완주)
  발견 1  지시문 오독 — splitInstruction 이 첫 문장을 제목으로 떼는데 그게 인물 소개라
          "위 문장은"이 제목을 가리키는 걸로 읽혔다.
     처리  instruction 5건 재작성 — 첫 문장을 과제형("○○의 1화 첫 문장을 쓰시오."),
          지시 대상을 "아래 … 잘못된 첫 문장" 으로 명명. seed/update-start-write.sql
  발견 2  원문 상자 라벨 '원문' 이 수정 과제로 읽힘.
     처리  TrainClient passageLabel — skill_key 'start_write' 면 '잘못된 첫 문장'.
          page.tsx 가 stages.skill_key 를 내려줌(문항엔 skill_key 없음). 지시문 낱말과 일치
  발견 3  무관 내용 통과 — "줄넘기 하면 재미있어 하는 이재하 친구" 통과. 이름+동사만 맞추면
          뚫린다. → 수정 아님, 보류. 9단계 실측 '내용 통째 교체' 계열. 내용 판정은 AI 몫,
          자기점검이 그 자리. 박 님 뚫기 답안은 AI 재개 때 나쁜 표본 자산. (아래 미결)
  발견 4  '기류'·'오라' 미검출 — 분위기 우회어.
     처리  forbidWords +5(기류·아우라·기색·낌새·기미) · forbidLemmas 신설 ["오라/NNG"]
          (aura 는 NNG, 명령형 '돌아오라'·'이리 오라' 는 VV — kiwi 실측, lemma 로만 잡음) ·
          forbidDisplay +6. 모범답안 10건 오탐 0 · 뚫기 답안 이중 검출 · 충돌 2문 안 걸림
  coach_intro  "이번엔 네가 직접 써." → "이번엔 직접 써 보자!" (박 님 문구)
  seed/update-start-write.sql (신규)  problems 5건 instruction + scoring_config jsonb 통째
    (기존 행이라 update — 원칙 7 · v2 선례). coach_intro 는 seed_data do update.
  verify  scoring_config 확장 단언 · instruction 규격("…의 1화 첫 문장을 쓰시오." 시작 ·
    "잘못된 첫 문장" 포함 · "위 문장" 미포함) · 물기(기류/오라 fail · 돌아오라/이리 오라 pass) ·
    update SQL ↔ 덤프 jsonb · isScored '오라'↔'오라/NNG' · 화면 배선(passageLabel·skillKey)
  검증  tsc 0 · test:scoring 3372/0(형태소 서버) · check:numbers 0 · gen:seed 무변화
  ★ DB 반영·눈검사(박 님): seed/update-start-write.sql → seed_data.sql(coach_intro do update, 멱등)
    → seed_check.sql → 브라우저 도입 2에서
    ① 제목이 "○○의 1화 첫 문장을 쓰시오." · 원문 상자 라벨 '잘못된 첫 문장'
    ② 코치 말풍선 "이번엔 직접 써 보자!"
    ③ '기류' 또는 '오라' 넣은 답 제출 → '쓰지 않을 말' 미달
    ④ 기존 통과 정상 답(반지 문장 류)이 여전히 통과
  후기 2  update SQL 꼬리 확인 select 가 p.order_no 참조로 42703 실패(update·commit 뒤라
    데이터는 반영됨). problems 에 order_no 컬럼 없음 — 덤프의 order_no 는 gen-seed 시드
    순서용 덤프 전용 필드. 57행 order by 를 difficulty·source_key 로. verify 는 SQL 을
    실행 안 해 로컬에서 못 잡는 종류 — seed/*.sql 텍스트에 'p.order_no' 없음 가드 추가
```

### 끝난 것 — 세션 28

```
도입 1 start_choose '첫 문장 고르기' 5문항 — 도입 트랙 첫 문항
  근거   작법 문서의 카메라 앵글 원칙(1화는 주인공에게서 시작) · 구체 이미지 원칙 ·
         거시 서술 지양 · [IN-01] 다섯 줄의 승부(★★★, 교차검증)
  설계   정답 = 주인공이 구체적 사물을 상대로 행동하는 문장. 오답 3종 고정(거시 서술 ·
         타인물 앵글 · 추상 분위기). 5장르(modern·martial·romance·fantasy×2)
  problems.json  choice 5건 · passage null · scoring_config {} · order_no 1 · start_choose 연결
  answers.json   answers[] 에 choice 5건 (index 1·2·0·3·1)
  stages.json    start_choose coach_intro(다섯 줄의 승부·카메라 붙이기)·coach_line
  verify [도입 1 start_choose]  5문항 존재·choice·choices 4개·config {} · answers index 0..3 ·
         combine 정답/오답 판정 · 표면 지표 물기(정답 자수가 5문항 모두 최장/최단 아님 ·
         index 한 값에 3회 초과 안 몰림) · 코치 블록을 11단계(문장 10 + start_choose)로 갱신
  검증   tsc 0 · test:scoring · check:numbers 0 · gen:seed 무변화
  ★ DB 반영·절차(박 님): seed_data.sql(신규 행 insert) → seed_check.sql(갱신된 기대값) →
    브라우저 도입 트랙에서 ① 단계가 "준비 중"에서 풀려 링크가 생겼는지 ② 5문항 목록 ③ 한
    문항 정답/오답 제출 양쪽 판정 ④ 코치 말풍선

choice 해설 층 — 오답 때 이유가 없다는 실사용 요청 (세션 28 둘째)
  reference_answers 재활용: source_key sc-* · ord = 선택지 번호(1~4) · blank_key '' · content = 해설.
  RLS "reference after submit"이 제출(통과 무관) 기준이라 오답 뒤에도 읽힘 — 스키마·정책 변경 없음.
  answers.json  reference 에 20행 (5문항 × ord 1~4)
  ChoiceExplain.tsx (신규)  오답: 고른 선택지 해설 한 줄만(정답·다른 해설 감춤, 재도전 여지).
    정답: 4개 전부 + 정답 표식. 캡션 choice 전용("각 문장이 통하는지, 왜 안 통하는지.")
  TrainClient  type==='choice' 분기 — SelfCheck(가/나) 경로와 분리. 제출 순간 선택지를
    해설 대상으로 고정 — 오답 뒤 다른 것 눌러도 안 흔들림
  verify [도입 1 해설]  20행 완비·비어있지 않음·blank_key '' · 교차 물기(정답 ord 해설엔 결함
    지적 패턴 없음, 오답 ord 셋엔 있음 — FLAW=없·아직·못·아니·설명·역사서·'가 있다') · 화면 배선
  ★ DB 반영·절차(박 님): seed_data.sql(reference 20행 신규 insert) → seed_check.sql → 브라우저
    도입 1에서 ① 오답 제출 → 고른 것의 해설 한 줄만 ② 정답 제출 → 4개 해설 전부 + 정답 표시
    ③ 가/나 문항(4단계 등)이 안 깨졌는지

  세션 28 셋째 — 오답 해설 미표시 버그 수정 (실사용 재현)
  원인   오답 렌더가 'submittedChoice !== null' 게이트에 막혀 있었다. submittedChoice 는
         setResult 뒤 async 연속부에서 setSubmittedChoice 로만 갱신돼, 결과가 뜨는 첫 렌더
         에는 아직 null → ChoiceExplain 이 안 그려졌다. (API·RLS 는 정상 — 오답에도
         reference 4행이 온다. 로컬에서 /api/grade 실호출로 확인.)
  수정   선택지 번호를 별도 상태 대신 result 객체 안에(submittedChoiceIndex) 실어 한 번의
         setResult 로 원자화. 게이트는 result.submittedChoiceIndex != null. setSubmittedChoice 제거.
  verify [도입 1 해설]  배선 물기 보강 — 원자적 탑재(submittedChoiceIndex: choiceIndex)·게이트에
         pass 조건 없음·별도 상태 부재. 되살리면(옛 분리 상태) 3건 fail 확인.
  ★ 눈확인(박 님): 도입 1 오답 제출 → 고른 선택지 해설 한 줄이 뜨는지
```

### 끝난 것 — 세션 27

```
4단계 reduce_repeat 원문·모범답안 전면 교체 (실사용: 원문 8건이 "일부러 어색한 문장" 판정)
  problems.json  rp- 8건 passage 를 원작 전래동화(저작권 소멸)의 장면·대사로 다시 씀. 반복 결함
                 (repeatTargets 초과)은 훈련 목적상 유지. maxChars = 새 원문 countChars(공백 제외)
                 그대로 (45→88·35→64·46→86·34→68·38→85·44→101·40→91·41→83)
  rp-siblings-rope  repeatTargets '밧줄' → '동아줄'·'오누이'(원작 어휘) · instruction "동아줄이
                 튼튼하다는 것은 남길 것" 으로 교체
  answers.json   reference rp- 16행 content 를 새 원문에 맞춰 다시 씀 (가 69·51·69·58·81·84·77·62 /
                 나 46·50·60·51·60·58·56·56 — 전부 새 maxChars 안, repeatTargets 한도 안)
  seed/update-reduce-repeat-v2.sql  problems 8건(passage·instruction·scoring_config jsonb 통째로)
                 + reference_answers 16행 content. seed_data 는 기존 행을 안 고쳐서(insert where not
                 exists · on conflict do nothing) 덤프에서 뽑아 update 로 낸다. v2 하나만 돌리면 됨
                 (세션 26 update-reduce-repeat.sql 안 돌렸어도 — v2 가 scoring_config 통째로 실음)
  verify [4단계]  불변식 maxChars == countChars(새 원문) · 원문 8건 그대로 제출은 '겹친 말' fail
                 (초과 낱말·횟수까지: 도끼6·박5·바다5·물6·다리5·간4·동아줄4·방망이4 + 산신령2>1·
                 흥부2>1·심청3>2·콩쥐3>2·토끼4>2·오누이3>2·도깨비2>1) · 모범답안 16행 자수·베낌·
                 repeatTargets 한도·형태소(서버 있을 때) · siblings 밧줄 없음/동아줄·오누이 있음 ·
                 v2 SQL ↔ 덤프 대조 · 물기: 옛 passage 8개 fragment 가 덤프에 안 남음
  검증  tsc 0 · test:scoring (형태소 서버 띄우고) · check:numbers 0 · gen:seed 무변화

kongjwi 합성어 함정 제거 — 물동이 → 항아리 (세션 27 후기, 실사용 발견)
  실사용: 원문 '우물'+'물동이' 가 부분 문자열로 '물' 2회를 선점 → 맨 '물' 반복만 고쳐서는
  통과 불가(정직한 수정이 어휘 교체를 강요당함). 마지막 문장 물동이→항아리. 한도(물 2회)는
  그대로 — 올리면 한 음절 '물' 구멍이 다시 열린다. 자수 68 동일이라 scoring_config 안 건드림.
  problems.json  rp-kongjwi-jar passage 만 (물 6회→5회 · 콩쥐 3회 · 68자)
  answers.json   rp-kongjwi-jar ord 1(가) content 만 (물 1회 · 58자). ord 2 나는 그대로
  seed/update-reduce-repeat-v3.sql (신규)  v2 는 이미 DB 실행됨 — passage 1건 + reference 1행만
  verify  원문 물기 물 6→5 대조 · '물동이' 없다 가드 · 학습자 경로('우물' 살린 정직한 답)가
          repeatTargets 통과 단언 · v2+v3 최종상태 ↔ 덤프 대조(v3 가 v2 위에 덮음)
  ★ DB 반영·절차(박 님): (v2 는 이미 실행) seed/update-reduce-repeat-v3.sql → seed_data.sql(멱등)
    → seed_check.sql → 브라우저 4단계에서 ① 새 원문(항아리)이 뜨는지 ② 원문 그대로 붙여넣기가
    '겹친 말' 미달인지 ③ '우물' 을 살린 정직한 수정이 통과하는지 ④ 완주

magpie 가 를 박 님 실제 통과 답안으로 교체 — 학습자 답이 모범답안을 이긴 첫 사례
  문장 연결 압축('놓았고, … 이어졌다') + 대사 귀속 명시('직녀를 향해 내달렸다'). 원문·
  scoring_config·나는 그대로. 새 가 80자(≤ maxChars 85) · 5문장 · 다리 2회 · 지문 베낌 아님.
  answers.json  rp-magpie-bridge ord 1(가) content 만
  seed/update-reduce-repeat-v4.sql (신규)  v3 까지 DB 실행됨 — reference 1행만
  verify  update SQL 대조를 v2+v3+v4 최종상태로 · v4 는 magpie reference 1행만(passage·cfg 무변)
  ★ DB 반영·절차(박 님): (v2·v3 는 이미 실행) seed/update-reduce-repeat-v4.sql → seed_data.sql(멱등)
    → seed_check.sql → 브라우저 4단계 magpie 통과 화면에서 새 가가 뜨는지
```

### 끝난 것 — 세션 26

```
repeatTargets — 한 음절 반복을 규칙으로 잡는다 (4단계 실사용 확인, 구멍이 실제로 샜다)
  types       ScoringConfig.repeatTargets?: {word,max}[]. 형태소 아님 — 답안 문자열의 낱말 횟수
  local       default(remove/convert) 케이스에 검사 추가. key repeatTargets · 라벨 '겹친 말' ·
              rule "{word} {max}회까지" · evidence "{word} {count}회" · gating. countOccurrences 헬퍼
  marks.ts    repeatTargets 를 mk-mark 로 · evidence 의 " N회" 접미 벗김(maxRepeat 와 같이)
  summary     "특정 낱말 반복 제한(도끼·나무꾼·산신령)" 한 조각 추가
  page.tsx    NON_SCORING_KEYS 에 repeatTargets — 4단계(remove 3키)가 3단계와 갈려 두 칸 안 되게
  problems.json  rp- 8문항에 repeatTargets 지정 (axe-gold 도끼2·나무꾼2·산신령1 등)
  seed/update-reduce-repeat.sql  scoring_config 8건 (덤프에서 뽑음)
  화면 병합    mergeRepeatChecks(index.ts) — maxRepeat('반복 어휘')+repeatTargets('겹친 말')를 한 행
              '같은 말 반복'으로(채점은 둘 그대로). 상태 나쁜 쪽 · 칩 합집합 · rule '같은 말 2회까지'.
              TrainClient displayChecks·criteriaChecks 둘 다 이 병합을 거친다(mergeForbidChecks 옆)
  verify [4단계]  모범답안 16건이 repeatTargets 한도 안(직접 + combine) · 원문 8건이 걸린다('겹친 말') ·
                 update SQL 덤프 대조 · 병합 행 하나·상태·칩 합집합 · summarizeConfig repeatTargets 케이스
  ★ 모범답안 16건은 이 한도로 실측 통과(0 초과) 확인 후 진행
  ★ DB 반영: seed/update-reduce-repeat.sql → seed_check
  ★ 절차(박 님): update-reduce-repeat.sql → seed_check → 4단계에서 '물'×4 답안이 미달로 잡히는지

4단계 reduce_repeat 모범답안 16 + self_checks (3단계와 같은 절차)
  answers.json   reference[] 에 rp-* 8문항 × ord 1 가 / 2 나 = 16행 · blank_key ''
  stages.json    reduce_repeat self_checks ["같은 말이 두 번 넘게 안 나와? 소리 내서 읽어 봐!"]
  verify.ts      [4단계 reduce_repeat: 모범답안 대조] — 16행 · 가·나 두 세트 · 자수 ≤ maxChars ·
                 지문 베낌 아님 · 형태소 규칙(동사·반복≤2)은 서버 있을 때만 ·
                 물기: 원문 8건 그대로는 미달 + 여럿(≥5)은 maxRepeat 로도 걸린다
                 ★ 형태소 서버의 maxRepeat 는 두 음절+만 센다 — 한 음절 반복(박·물·간)은 자수로 걸림
  ★ DB 반영: reference 16행 새 insert(on conflict do nothing) · self_checks do update →
    seed_data.sql 재실행이면 된다(멱등). update 파일 불필요.
  ★ 절차(박 님): seed_data.sql → seed_check.sql → 브라우저에서 4단계 완주
    (코치 말풍선·조건 요약이 이 단계에서도 도는지 곁눈)
```

### 끝난 것 — 세션 24

```
문항 화면 가르침 층 — 실사용에서 나온 넷 (+ 코치 캐릭터)
가  코치 캐릭터 먹물이 ✒️ — seed_schema stages.coach_intro·coach_line (text not null default '').
    레거시 intro 컬럼은 남기되 stages.json 값 전부 ''. stages.json 문장 트랙 10단계 coach_intro
    (반말 코치 톤)·coach_line(한 줄 구호). gen-seed upsert(do update). 컴포넌트 CoachBubble
    (✒️ + 말풍선 카드 + 왼쪽 꼬리, text '' 면 null). 단계 목록: 요약 아래 coach_intro ·
    문항 화면: 지시문 위 coach_line
나  3단계 지시문 규격 재작성 8건 — 공통부(남길 것: 사건 / 지울 것: 설명·잉여 / 문장째 지우기만)
    + 문항별 조항(axe·heungbu·kongjwi·goblin 넷만). seed/update-trim-padding.sql 갱신.
    verify: 공통부로 시작 · '문장째' 있음 · 조항 넷/공통부만 넷
다  조건 요약 한 줄 — lib/scoring/summary.ts summarizeConfig(cfg) → "42자 이하 · 움직이는 말
    3개 이상 · 같은 말 반복 2회까지". page.tsx 가 만들어 configSummary prop 으로, TrainClient 가
    지시문 아래에. 임계값 숫자는 클라이언트로 안 감(요약 문자열만).
라  서술형 게이지에 문장 수 — "N문장 · M / 상한자". RuleGauge 만 maxChars 게이트, 문장·자수
    줄은 그 밖(상한 없는 문항도 뜸). fill 은 칸마다 이미 있음.
verify [가르침 층] — coach_intro·coach_line 10단계·트랙 · intro 전부 '' · CoachBubble null 조건 ·
    seed_schema/seed_data · summarizeConfig 5케이스 + 실 문항 93건 안 터짐 · 화면 배선
  ★ DB 반영: seed_schema(coach_intro·coach_line 컬럼) → seed_data(coach upsert · do update) →
    seed/update-trim-padding.sql(3단계 지시문) → seed_check
  ★ 눈확인(박 님): /train/3 목록의 말풍선 · 문항 화면 지시문 위 코치 한 줄 ·
    3단계 새 지시문+요약 한 줄 · 게이지 문장 수
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
    오른쪽 칸 최소 24rem(grid-cols [minmax(0,1fr) minmax(24rem,1.3fr)]) · 규칙 글씨 본문 급 ·
    행 min-height 3.5rem · py-4 · space-y-4 · 라벨 font-medium. CheckRow(제출 후)도 같은 값
    (제출 전후 밀도 동일). local.ts forbidWords 검사 + index.ts mergeForbidChecks
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

세션 23 (같이 커밋): 문항 화면 스케일업(위 '앱이…' 참조) · '무엇을 봅니다' 행 밀도(min-h 3.5rem·py-4·
  font-medium, CheckRow 동일) · RuleText 2줄 고정(visibility) · 3단계 trim_padding 모범답안 16 + self_checks
  trim_padding: answers.json reference 16행(8문항×가·나·blank_key '') · stages.json self_checks
    ["지운 문장 중에 이야기가 잃은 것이 있는가"] · verify [3단계 trim_padding: 모범답안 대조]
    (자수·베낌·가나 두 세트 + ★ 문장 수 < 원문 문장 수 + 형태소는 서버 있을 때만)
  ★ DB 반영: reference 16행 새 insert(on conflict do nothing) · self_checks do update →
    seed_data.sql 재실행이면 된다(멱등). update 파일 불필요.

  3단계 maxChars 재조정 + 지시문 (세션 23 후기 — 실사용 발견)
    problems.json  maxChars 6건(axe 38→42·heungbu 35→41·simcheong 35→39·kongjwi 35→38·
                   rabbit 33→36·goblin 37→45. gyeonu 35·siblings 38 유지) · 지시문 8건에
                   "새로 쓰지 말고, 원문에서 지우기만 하십시오." 추가
    seed/update-trim-padding.sql  scoring_config + instruction 8건 (덤프에서 뽑음)
    verify  정직한 답 8건이 자수 통과 · 상한 = 정직한 답 자수 + 2 · 조임(정직한 답 + 군더더기
            한 문장 > 상한) · 물기(옛 값이면 6건이 샌다) · 지시문·update SQL 대조
  ★ 절차(박 님): seed_data.sql(모범답안·self_checks) + seed/update-trim-padding.sql(maxChars·지시문)
    → seed_check.sql → 옛 40자 답 재제출해 통과 확인 → 3단계 완주
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
rabbit 난도 관찰            4단계 최중량(간·토끼 각 4회 + minVerbs 5). 박 님(초보 기준)이 어렵다고
                           느꼈으나 통과는 함 — 낯선 학습자 3~5명 실사용에서 이탈이 몰리면
                           그때 완화(minVerbs 5→3 등)를 연다
'남길 것' 조항은 어겨도 통과   지시문의 보존 요구("동아줄이 튼튼하다는 것은 남길 것" 등)를
                           검사할 규칙이 없다 — 오누이 실사용에서 '튼튼한' 빼고 통과 확인.
                           반복·자수 검사와 무관한 별개 구멍. 자기점검이 그 자리.
                           규칙화하려면 requireAny 류(답안에 특정 낱말 존재 요구) — 지금은 안 연다
★ 형태소 서버              지금 로컬뿐(scoring-server, 상태 확인 참조). 안 떠 있으면 6단계 46문항이
                          통과 불가(pending). 배포 시 이것도 같이 올린다(Cloud Run 이든 뭐든) —
                          .env 의 SCORING_SERVER_URL·SCORING_SERVER_SECRET 을 그쪽으로 맞춘다
도입 4 start_episode        AI 심사 전이라 보류(세션 5 근거). 재개 시 fill 4칸(핵심 재미→캐릭터→
                            상황→첫 대사) 축소안 검토. 도입 2·3 을 먼저 채운다
choice 해설 소급             기존 choice 8문항(부사 예외 4 · 궤도 이탈 4) 해설 소급 — 도입 1 방식
                            확정 후. ChoiceExplain·reference 재활용은 그대로 쓰면 된다
choice 오답 해설 범위(하나 vs 전부)  현행은 고른 것 하나만. 낯선 학습자 3~5명 실사용에서 오답 후
                            재시도가 '생각한 재선택'인지 '순서대로 누르기'인지 submissions 간격·
                            패턴으로 판정 — 후자가 다수면 전부 공개로 전환
at-left-feint fill 재료      상황 본문 · 빈칸 위치 · 모범답안 3건. 재설계안 7-5 목록 열둘을 먼저
                            읽고 짠다. 그때 3×3(장르 셋씩)이 찬다
ar-left-feeler 모범답안       재설계안 7-7 에 가·나·다가 없다. stage2 가 보여줄 것이 없다
fill 지시문 예시 접기         단계에서 첫 문항만 예시를 펼치고 뒤 문항에선 접는다(길다)
'fill' 표기                  화면의 유형 표시 'fill' 을 '빈칸 채우기' 로
'continue' 표기               유형 표기 'continue' 영문 노출 — 'fill' 표기 계열. 한꺼번에 손본다
fill minChars 8 은 코드 기본값  feint 시드 때 blanks 마다 minChars 를 명시하고 `?? 8` 기본값을 뺀다
fill 은 인물·사물을 안 본다     덕수 답이 세연 문항을 통과한다. 자기점검이 그 자리. 규칙으로 잡으려면
                            blanks 에 requireAny 정도 — 지금은 안 한다
모범답안 베낌은 통과한다        본 뒤 그대로 붙이면 forbidCopyOfFixedLines 를 안 탄다. reference_answers
                            줄도 베낌 검사에 넣을 수 있다(서버가 이미 읽는다). 학습 루프 뒤
단계 간 베낌(도입 1 정답 → 도입 2 답안)  같은 계열 — 도입 1 정답 문장을 그대로 옮겨 적으면 도입 2 를
                            통과한다(채팅 실측 5/5). 규칙으로 안 막는다(좋은 문장 필사도 학습은
                            학습). 낯선 학습자 실사용 때 submissions 로 관찰. verify 는 모범답안이
                            그 문장을 안 베끼게만 문다
무관 내용 통과(도입 2 사례)   '줄넘기 하면 재미있어 하는 이재하 친구' 가 통과 — 이름+동사만 맞추면
                            뚫린다. 9단계 실측 '내용 통째 교체' 계열. 내용 판정은 AI 몫,
                            자기점검이 그 자리. 박 님 뚫기 답안은 AI 재개 때 나쁜 표본 자산
도입 3(start_extend) 지문 재출력 뚫기  continue 유형도 지문을 그대로 재출력하고 이름만
                            더하면 requireAny·minVerbs 를 통과할 여지 — 세션 32 후기 2 의
                            lack·contrast 구멍과 같은 계열. forbidPassageCopy 를 아직 안
                            붙였다(이어쓰기는 앞 문장 일부 유지가 정상일 수 있어 판단 보류).
                            낯선 학습자 실사용 관찰 후 판단
requireAny/requireAll '하늘' 누수  일반명사와 부분 문자열이 겹치는 이름('하늘'=sky)은 인물을
                            안 쓰고 하늘(sky)만 써도 요구 검사가 충족으로 본다(includes).
                            규칙으로 안 막는다(조이면 좋은 답안이 먼저 걸린다) — 내용 판정은
                            AI 몫. ★ 실재 확인(세션 34) — ig-umbrella-walnut(requireAll
                            소민·하늘)의 표본 "저녁 하늘이 붉게 물들었다…"가 인물 하늘 없이
                            pass 하는 것을 verify 픽스처로 등재. 고칠지·어떻게 고칠지(lemma
                            NNP 요구 등)는 박 님 결정 대기 — 지금은 알려진 한계로 두고 진행
자모 낱자 검사(후보)         완성형 아닌 낱자(ㄱ-ㅎ·ㅏ-ㅣ)가 답안에 있으면 fail — 형태소 불필요·
                            오탐 여지 낮음. 장난·오타 답안 일부를 잡는다. 신규 규칙이라 박 님
                            승인 뒤 연다
seed_data 는 갱신을 안 한다    문항 insert 가 `where not exists` 라 기존 행을 안 고친다. 덤프의
                            passage·scoring_config 를 바꾸면 seed_data 만으로는 DB 에 안 들어간다 —
                            DB update 를 따로 돌리고 seed_check 를 실제로 돌려 대조가 통과하는지 본다
action_turn 옛 것 삭제        옛 단계(order_no 12) · convert 8건 · action-turn.ts 픽스처 · verify 블록 여섯 —
                            재설계안 11-5 픽스처 갈아엎기 때 한꺼번에 지운다
combo-report 감시(세션 16 7-1)  ·  503 로그  ·  UTC 하루 경계  ·  30자와 문형
경계 표본 36건 본문(자리 배치는 버림, L 정의는 산다)
구성 12 잔여 불만(언어화 전)   박 님이 아직 마음에 안 드는 데가 있으나 정확히
                              짚기 어려움 — 전 단계 완성 후 전수 재점검 때 다시
                              본다. 규격 5조 이후의 문항들과 비교하면 정체가
                              드러날 수 있다
verify 왕복 규칙의 characters.md 대조가 부분 문자열 포함으로 넓어짐(세션 34)
                              완전 일치 대신 charHeaders.has(nm) || 부분 문자열
                              포함으로 판정 — '소민'(윤소민 애칭)을 잡으려던
                              것인데, 짧은 이름이 다른 헤더·간이 인물 이름에
                              우연히 포함되면 실제로는 다른 사람인데 원장에
                              있다고 오통과할 여지가 생겼다. 지금은 인물 수가
                              적어 충돌이 없다 — 인물이 늘면 다시 볼 것
★ 문장 11 cliffhanger(절단신공) 빈 단계 — 세션 38 완료. 마지막 줄만 다루는
                              기초(절단 5패턴), 신호 까는 건 구성 16 cliffhanger_adv
                              (심화) 몫으로 경계를 확정했다. 닫힘.
도입 4 start_episode 이 빈 단계다(세션 36 발견)  문항 0 — 보스 문항(다음 1)이
                              이 자리를 흡수한다. 구성 18 first_hook 설계 때
                              발견했으나 그땐 안 건드렸다. 보스 문항 설계 때
                              과제 범위·규칙+자기점검·AI 섀도 적용 방식을
                              한꺼번에 확정할 것
도입 트랙 간이 5명이 두 번째로 재사용됨(세션 36)  카리엘·서준혁·진운·강도윤·
                              하은수가 구성 18 first_hook 에 다시 쓰였다(첫
                              등장은 도입 1~3). 원칙 5(문제 먼저)에 따라 이번에도
                              승격은 안 했다 — 같은 인물이 세 번째 재사용되는
                              날 승격 기준을 박 님과 다시 볼 것
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
