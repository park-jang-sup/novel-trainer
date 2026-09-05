# novel-trainer 언어 관문 + AI 심사 도입 지시서

★ 방향 문서다. **실행 문서가 아니다** — 실제로 무엇을 했는지는 STATUS.md 세션 40
"끝난 것"을 봐라. 이 문서는 박 님이 준 원안 그대로 보관한다(경위 보존).

작성 근거: 저장소를 클론해 `seed/dump/problems.json`(157문항)과 `lib/scoring/local.ts`를 실측한 결과.
전투 결정타 드릴(action_turn)을 뚫기 답안으로 채점했을 때 요소만 마지막 줄에 박은 답안·
음절 뭉치(헛소리) 답안이 모두 8/8 통과함을 확인. 이 지시서는 그 두 구멍을 순서대로 막는다.

핵심 원칙 (기존 저장소 원칙 유지):
- 규칙은 '아님'을 잘 잰다. '좋음'은 못 잰다. 좋음 판정만 AI에 넘긴다.
- 자동 검증 못 거는 문항은 만들지 않는다. AI 판정에도 결정적 검사 하나를 건다(인용 검증).
- 서버/AI 없을 때는 통과로 위장하지 말고 pending 으로 떨어뜨린다.

작업은 4단계. 각 단계는 독립적으로 커밋·배포 가능. 1→2→3→4 순서 권장.
★ 실제 순서는 1→3→4→2 로 갔다(형태소 서버 배포는 이번 커밋에 안 묶었다) — 세션 40 STATUS 참고.

================================================================
## 단계 1: 언어 관문 (형태소 서버 불필요, 가장 먼저·가장 값쌈)
================================================================

목적: "이것이 한국어 문장인가"를 재는 층이 지금 전혀 없다. 음절 뭉치(예:
"뷇뷀롭 얼잫붑")에 요소 낱말만 박으면 모든 자유서술 문항을 통과한다. 이 검사
하나로 127개 자유서술 문항 전부에서 헛소리가 막힌다. 형태소 분석 불필요.

### 1-1. lib/scoring/local.ts 에 함수 추가
`gradeLocal`(또는 로컬 검사를 모으는 함수) 안, 다른 검사들과 같은 자리에 추가.
파일 1행 주석("형태소 분석이 필요 없는 검사만 둔다")과 부합하므로 여기가 맞다.

```typescript
// 언어 관문: 음절 뭉치·낱자모·괄호 밖 자음연속 영문을 잡는다.
// KS X 1001(euc-kr 2350자) 밖 음절 + 낱자모(ㄱ~ㅣ) + 모음 없는 소문자 연속을 센다.
// 형태소 불필요. 의성어 독립 줄(^[가-힣]{1,7}[-!]+$)은 제외한다.
function gibberishScore(text: string): { count: number; samples: string[] } {
  const lines = text.split('\n')
  let count = 0
  const samples: string[] = []
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    // 의성어 독립 줄 제외
    if (/^[가-힣]{1,7}[-!]+$/.test(line.replace(/["""'']/g, ''))) continue
    for (const ch of line) {
      // 낱자모 (완성형 아닌 자모)
      if (ch >= 'ㄱ' && ch <= 'ㅣ') { count++; if (samples.length < 5) samples.push(ch); continue }
      // KS X 1001 밖 음절: euc-kr 인코딩 불가한 완성형 한글
      if (ch >= '가' && ch <= '힣') {
        try {
          // Node 환경: Buffer 로 euc-kr 인코딩 시도. iconv-lite 없으면 아래 폴백 사용.
          const code = ch.charCodeAt(0)
          // 폴백: 흔치 않은 음절 조합 근사. 정확히 하려면 iconv-lite 도입 권장.
          // 여기서는 '완성형이지만 사용빈도 0에 가까운' 판정을 서버로 미루고,
          // 낱자모·영문만 로컬에서 결정적으로 잡는다(아래 주석 참고).
        } catch { count++; if (samples.length < 5) samples.push(ch) }
      }
    }
    // 괄호 밖 모음 없는 소문자 연속(asdf, qwer). 대문자 약어(UFC,VS)는 제외.
    const words = line.match(/[a-z]{2,}/g) || []
    for (const w of words) {
      if (!/[aeiou]/.test(w)) { count += w.length; if (samples.length < 5) samples.push(w) }
    }
  }
  return { count, samples }
}
```

주의: KS X 1001 밖 음절 판정은 브라우저/Node 기본 API로는 정확히 안 된다.
두 선택지:
- (권장) `iconv-lite` 를 dev 아닌 런타임 의존성으로 추가하고, 음절마다
  `iconv.encode(ch,'euc-kr')` 실패 여부로 판정. package.json 에 추가.
- (당장) 낱자모·영문 자음연속만 로컬에서 잡고, 음절 뭉치 판정은 단계 2의
  형태소 서버로 미룬다(서버가 문장 점수 하한을 함께 잰다). 이 경우 단계 1은
  낱자모·영문만 막고, 음절 헛소리는 단계 2에서 막힌다.

★ 실행 결과(세션 40): KS X 1001 밖 음절 판정 코드는 위 스니펫 그대로 두면
  빈 껍데기다(try 블록 안에 실제로 판정하는 코드가 없다 — code 변수만 읽고
  버린다). 실행 문서(AI채점_1차_섀도_세션40.md, 이 문서 곁의 정정 지시)는
  이 코드를 **넣지 않는다** — 소문자 3자 이상 연속 규칙(2자 연속은 화이트리스트가
  아니라 길이로 제외)만 넣고, 음절 뭉치는 형태소 서버 몫으로 명시적으로 미룬다.

### 1-2. 검사를 checks 에 추가
```typescript
// 자유서술형(convert/continue/remove/count)에만 적용. choice/order/fill 제외.
if (['convert','continue','remove','count'].includes(problem.type)) {
  const gib = gibberishScore(text)
  const GIB_MAX = 2  // 오타 1~2개는 허용. 프로 원고 실측 기준 0건이었음
  checks.push({
    key: 'language_gate',
    label: '한국어 문장',
    status: gib.count <= GIB_MAX ? 'pass' : 'fail',
    detail: gib.count <= GIB_MAX ? '정상' : `이상 글자 ${gib.count}개`,
    rule: '음절 뭉치·낱자모가 아닌 한국어',
    evidence: gib.samples,
    gating: true,
  })
}
```

### 1-3. 검증 (반드시 실행)
아래 답안들이 기대대로 나오는지 test:scoring 또는 임시 스크립트로 확인:
- "뷇뷀롭 얼잫붑 움직였다\n..." → language_gate FAIL
- "다현 움직여 창문 달린다 보인다 의자" (낱말 나열, 정상 음절) → language_gate PASS
  (낱말 나열은 이 관문이 아니라 AI가 잡는다. 여기서 잡으면 오탐)
- 정상 답안 여러 개 → 전부 PASS (오탐 0 확인이 핵심)
- 프로 원고 문장(의성어 "콰아앙!" 포함) → PASS
GIB_MAX 임계는 정상 답안에서 오탐이 나면 올린다. 오탐 0이 최우선.

================================================================
## 단계 2: 형태소 서버 배포 (pending → 실제 판정)
================================================================

목적: 44문항이 형태소 필요(부사·수식어·고유명사·반복). 지금 pendingMorphChecks
로 '대기'만 뜬다. 서버를 올려 실제 판정으로 바꾼다. 음절 뭉치 판정도 여기서
문장 점수 하한으로 함께 잡는다(단계 1의 폴백을 택했을 경우).

### 2-1. scoring-server 배포
- `scoring-server/` 디렉터리에 Kiwi 기반 파이썬 서버가 있다. 확인 후 Cloud Run 배포.
- lib/scoring/remote.ts 가 이 서버를 호출한다. 환경변수(서버 URL) 설정.
- 배포 전: 로컬에서 `uvicorn` 등으로 띄우고 remote.ts 가 붙는지 확인.

### 2-2. 문장 점수 하한 추가 (음절 뭉치의 결정적 판정)
서버 응답에 Kiwi analyze 점수를 글자 수로 나눈 값을 넣고, 답안 4문장 창 집계가
임계 아래면 fail. 임계 -6.0 (프로 원고 8편 실측: 최저 창 -5.33, 헛소리 섞임 -6.23).
이름·분야 용어는 add_user_word 로 등록 후 재측정(등록 안 하면 정상 답안이 오탐).

### 2-3. 검증
- 형태소 필요 44문항이 pending → pass/fail 로 바뀌는지
- 음절 헛소리가 문장 점수 하한에서 fail 되는지
- 프로 원고 문장(이름 등록 후)이 pass 되는지

★ 실행 결과(세션 40): 이번 커밋에 안 묶었다. "하지 않는 것"에 명시.

================================================================
## 단계 3: 낱말 강제 완화 + AI 심사 (결정타 빌드업)
================================================================

목적: action_turn 8문항이 `requireInLastLine: ["왼발 페인트"]` 로 특정 낱말을
마지막 줄에 강제한다. 이 때문에 (1) 그 낱말만 박으면 통과하고 (2) 억지로 넣으면
문장이 이상해진다. 낱말 위치 강제를 풀고, "마지막 승부 줄이 앞의 정보 줄을
이용하는가"를 AI 가 판정한다.

### 3-1. requireInLastLine 을 경고로 낮춤
★★ **폐기 — at- 8 비활성.** 이 절이 가리키는 옛 action_turn 8문항(at- 접두)은
  세션 18(재설계안 11-4)에서 이미 is_active=false 로 내려갔다(deactivate.json).
  세션 37이 같은 skill_key 에 새 bt- 5문항을 활성으로 얹으며 재개했는데, bt- 는
  처음부터 requireInLastLine 이 아니라 requireAll(이름 존재만 봄) 을 쓴다 —
  "완화"할 대상 자체가 없다. 그래서 이 절은 **실행하지 않는다**(세션 40 STATUS
  "하지 않는 것" 1행). 아래 원안 텍스트는 경위로만 남긴다.

action_turn 문항의 scoring_config 에서 `requireInLastLine` 을 제거하거나,
gating:false 로 낮춘다(진도를 막지 않음). `requireAny`(요소가 답안 어딘가 있음)는
남겨도 된다 — 위치가 아니라 존재만 보므로 문장이 안 이상해진다.
※ seed 를 고치는 것이므로 seed/dump/problems.json 수정 후 재적용. DB 직접 반영은
   기존 절차(psql) 따른다. 학습자 데이터가 붙기 전이 고치기 가장 싼 시점.

### 3-2. AI 판정 함수 (lib/ai/ 에 추가)
lib/ai/ 에 이미 GeminiCall/observeWith 구조가 있다. 그 위에 판정 함수를 얹는다.
질문은 딱 하나. 점수·피드백·고쳐쓰기 금지.

프롬프트(문항별 scoring_config.ai_judge 에 넣거나 코드 상수로):
```
아래는 4줄짜리 전투 장면이다. 마지막 줄(승부 줄)이 성립하려면 반드시 있어야 하는
앞 줄이 있는가?

'있어야 하는 줄'이란: 그 줄이 없으면 마지막 줄이 왜 통하는지 알 수 없게 되는 줄.
상대의 버릇·약점·패턴, 자리의 상태, 인물의 내력, 상대가 세운 논리 중 하나를
'알게 해 주는' 줄이다.

'있어야 하는 줄'이 아닌 것: 앞 줄이 뒤 줄을 시간이나 자리로 '가능하게'만 한 줄.
"피했으니 틈이 났다", "굴렀으니 닿았다" 같은 것. 이런 것은 어느 싸움에나 있고,
마지막 줄이 '왜 그 결정타여야 하는지'를 대지 못한다.

시험: 그 앞 줄을 "그럴 틈이 났다"처럼 아무것도 알려주지 않는 줄로 바꿔 본다.
마지막 줄이 그래도 같은 결정타로 읽히면 그 줄은 근거가 아니다.

답을 JSON 으로만 낸다:
{"support_line": <1~4 중 하나 또는 null>, "quote": "<그 줄을 답안에서 그대로 인용>"}
```

thinkingLevel 은 low 로 고정(기존 세션 실증: high 는 비용 9.4배·값 안 나아짐·형식 오류).

★ 실행 결과(세션 40): 문안이 4줄 고정 지문형(옛 action_turn)이 아니라 자유
  서술 답안(문장 수가 문항마다 다른 bt-)에 맞게 다시 짜였다 — 프롬프트 버전
  `support-v2`(beat_line·support_line·quote 셋), lib/ai/prompt.ts 참고. 아래
  3-3·3-4·3-5 는 뜻은 그대로 실행됐고, 형태(4줄 인덱스 → 문장 배열 인덱스)만 갈렸다.

### 3-3. 인용 검증 (AI 출력에 거는 결정적 검사)
AI 가 낸 quote 가 답안 안에 실제로 있는지 문자열로 확인. 없으면 그 판정 폐기.
support_line 이 null 이면 → 빌드업 없음 → 경고. support_line 이 유효하고 quote 가
답안에 있고 마지막 줄보다 앞이면 → 빌드업 있음 → pass.

```typescript
function verifyAiJudgment(answer: string, judgment: {support_line: number|null, quote: string}) {
  if (judgment.support_line === null) return { ok: false, reason: '빌드업 없음' }
  const lines = answer.split('\n').filter(l => l.trim())
  const quoteInAnswer = lines.some(l => l.includes(judgment.quote))
  if (!quoteInAnswer) return { ok: null, reason: '인용 불일치 — 판정 폐기' } // 재시도
  const idx = lines.findIndex(l => l.includes(judgment.quote))
  const isBeforeLast = idx < lines.length - 1
  return { ok: isBeforeLast, reason: isBeforeLast ? '빌드업 있음' : '마지막 줄이 곧 근거' }
}
```

### 3-4. 경고 층으로 시작
AI 판정은 처음엔 진도를 막지 않는다(gating:false). 화면에 "이 답안은 결정타 앞에
준비가 부족해 보입니다" 정도로만 표시. 골든셋 일치율(단계 4)이 기준을 넘은 뒤
gating 을 켠다.

### 3-5. 킬스위치·한도
- AI 호출 실패(429/503)는 재시도(기존 lib/ai/retry.ts).
- API 키 없거나 한도 초과 시 pending 으로 떨어뜨린다(통과 위장 금지).
- 판정 캐시: hash(답안 + 문항 + 프롬프트버전 + 모델) → 판정. 같은 답안은 재호출 안 함.

================================================================
## 단계 4: 골든셋으로 AI 검증
================================================================

목적: AI 심사가 뚫기(요소만 박기·낱낱 나열)를 실제로 거르는지 수로 잰다.
첨부 파일 ch10_decisive.json 이 이 척도다(문체 통제된 good/nak 짝 9개).

### 4-1. ch10_decisive.json 을 data/probe/ 에 둔다
각 item.gold 에 good_answer(pass 기대) · nak_answer(fail 기대)가 있다.
nak 은 good 의 정보 줄만 "틈이 났다"류로 바꾼 통제 짝이라, AI 가 문체가 아니라
빌드업을 재는지 가른다.

### 4-2. 골든셋 하네스 스크립트 (scripts/ 에 추가)
```
각 item 에 대해:
  good_answer 를 3-2 프롬프트로 AI 판정 → support_line 이 non-null 이어야 함 (pass 기대)
  nak_answer  를 3-2 프롬프트로 AI 판정 → support_line 이 null 이어야 함 (fail 기대)
5회 반복. 집계:
  오탐 = good 인데 null 로 나온 수
  미검출 = nak 인데 non-null 로 나온 수
  뒤집힘 = 같은 답안 5회 중 판정 불일치
```

### 4-3. 판정선
- 오탐(good→null)이 0에 가깝고 미검출(nak→non-null)이 낮으면 gating 을 켠다.
- 오탐이 나면 프롬프트를 조이지 말고, 그 good 답안이 정말 빌드업이 있는지 사람이 본다.
- 미검출이 나면 그 nak 이 어떤 유형인지 본다(cracked-ice 처럼 요소가 '자리'라
  낱낱도 성립하는 경우는 프롬프트가 아니라 지문을 고친다).

================================================================
## 요약: 무엇을 언제
================================================================
단계 1  언어 관문         서버·AI 불필요. 헛소리 즉시 차단. 127문항 적용. 오늘 가능
단계 2  형태소 서버        44문항 pending 해제 + 음절 하한. Cloud Run 배포
단계 3  낱말완화 + AI심사   action_turn 8문항. requireInLastLine 완화 + AI 1질문 + 인용검증. 경고 층
단계 4  골든셋 검증        ch10_decisive.json 으로 오탐·미검출 측정. 통과하면 gating on

손대지 않는 것: 부사·반복·수식어·대사비율·개행·문장수 검사(약 100문항). 규칙이 잘 잡는다.

각 단계 후 test:scoring 회귀 검사를 돌려 기존 문항이 안 깨지는지 확인할 것.
