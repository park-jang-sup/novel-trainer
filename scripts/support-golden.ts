/**
 * 결정타 빌드업 섀도 골든셋 하네스 — **게이트의 하니스 경로(C)** 를 탄다.
 * scripts/ai-probe.ts 와 같은 마개·예비쓰기 관례를 그대로 재사용한다
 * (세션 40) — 하니스가 게이트를 안 타면 그게 세션 6 §12 가 막으려던 'B' 다.
 *
 * 재는 것: 골든셋 판정이 문체가 아니라 빌드업(support)·느낌어(tell·tell-v2)·
 * 절단 신호(signal)·힌트를 재는가. 다섯은 서로 다른 프롬프트라 **모드가
 * 다르다** — support 는 `--only`(A·B·C 조합)로, tell 은 `--only=D`, 힌트는
 * `--hint` 로 고른다. `--mode=signal`(--only=C 전용)·`--mode=tell2`
 * (--only=D 전용, 세션 47)는 같은 --only 값 안에서 다른 프롬프트로 간다.
 *
 *   set A  data/probe/ch10_decisive.json 의 9쌍(1인칭). good → 'buildup' 기대,
 *          nak → 'none' 기대. nak 은 good 의 정보 줄만 위치 제공형으로 바꾼
 *          통제 짝이라, 판정이 문체가 아니라 근거 유무를 재는지 가른다.
 *   set B  bt- 모범답안 10건(3인칭·good, 답안 덤프에서) + data/probe/set_b_nak.json
 *          의 nak 5건(good 의 근거 문장만 위치 제공형으로 바꾼 통제 짝, id 로
 *          bt- 5건과 짝 맞춤) + 같은 파일의 no_beat 5건(세션 41 후속 2 — bt-
 *          문항 원문 그대로. 상황 설명만 있고 아무도 수를 두지 않은 글) →
 *          good 'buildup' · nak 'none' · no_beat 'no_beat' 기대.
 *          ★ B-03(bt-orc-axe)·B-05(bt-low-guard)는 note 로 비통제 표시가 있다
 *            (근거가 자리형 · nak 결정타 문장 주어가 good 과 다름) — 결과 출력에
 *            함께 낸다. 뒤집힘·미검출이 나오면 프롬프트보다 이 표시를 먼저 본다.
 *   set C  data/probe/set_c_cliff.json(세션 45) — 구성 16 cliffhanger_adv(ca-)
 *          5문항. good 은 answers.json 의 가·나(set B 와 같은 방식) · nak 은
 *          같은 파일의 통제 짝 5건 · emotion 은 ca-walk-home 의 감정형 신호
 *          변형 1건(good/nak 과 따로 센다, standoff 와 같은 자리 — 기대 없이
 *          분포만). set A 와 같은 자리라 --domain 값을 그대로 탄다(set B 처럼
 *          battle 로 강제하지 않는다) — ca- 는 전투가 아니라서 --only C 는
 *          --domain=general 과 함께 쓴다(박 님 지시).
 *   set D  data/probe/set_d_tell.json(세션 45) — **support 가 아니라 tell
 *          프롬프트**로 잰다. good(=show 기대)은 bt- 모범 10건(answers.json,
 *          set B 의 good 과 같은 답안을 재사용) · tell 표본 6건(D-1~D-6, 그중
 *          D-4·D-6 은 경계 표본이라 기대 없이 분포만). `--only=D` 로 고른다 —
 *          A·B·C 와 동시에 못 쓴다(다른 프롬프트라 한 실행에서 안 섞는다).
 *   signal `--only=C --mode=signal`(세션 47) — 구성 16 ca- 전용, **support 가
 *          아니라 signal 프롬프트**로 잰다. good 은 answers.json 의 가·나
 *          (set C good 과 같은 방식) · nak 은 set_c_cliff.json 의 통제 짝 5건
 *          → good 'signal' · nak 'no_signal' 기대. emotion(ca-walk-home)·
 *          bare_emotion(ca-gate-dinner)은 good/nak 과 따로 센다(기대 없이
 *          분포만). 뒤집힘은 support 의 뒤집힘 열과 안 섞는다 — "잰 관계가
 *          다르다"(support 는 '필요' 관계, signal 은 '기대' 관계).
 *   tell-v2 `--only=D --mode=tell2`(세션 47, gating 후보) — tell 이 아니라
 *          **tell-v2 프롬프트**(답안 전체 판정)로 잰다. good(false 기대)·
 *          하드 6·경계 2 는 tell 과 같은 표본을 재사용한다. **추가 열**:
 *          tell_only 로 잡힌 표본 중 그 문항 forbidWords 가 이미 잡는
 *          것의 비율(겹침) · 안 겹치는 표본 목록.
 *   힌트   `--hint` — set B nak·no_beat 표본 10건(5+5)에 힌트 프롬프트를
 *          바로 부른다(support 재판정 없이 — 이미 근거가 없다고 아는 표본
 *          이라 비용 절약). source_quote 원문 실재율·insert_before 유효율만
 *          집계한다(둘 다 100% 기대) — --only 와 무관한 별도 모드다. 세션 47
 *          부터 **힌트 v3**(few-shot·비계 용어/메타 지시 금지)를 부른다 —
 *          v2 는 route.ts 도 이 하니스도 더는 안 부른다(코드는 보존).
 *
 * 각 답안 5회 반복(흔들림을 재려면 5회가 최소다 — gemini.ts 의 THINKING_LEVEL
 * 주석과 같은 이유). **캐시는 기본 우회한다** — 캐시를 쓰면 5회가 사실 1회가
 * 된다. --use-cache 를 줘야 ai_shadow_cache 를 본다(실제 캐시 배선 자체를
 * 검증하고 싶을 때만).
 *
 * 이 하니스는 verifySupportJudgment·verifyTellJudgment·verifyHintJudgment 를
 * **재시도 없이 원본 그대로** 잰다 — route.ts 의 재시도는 프로덕션 판정을
 * 세우는 것이고, 여기는 흔들림 자체(같은 답안 반복이 얼마나 갈리는지)를
 * 재는 자리라 스무딩하면 안 된다.
 *
 * ```bash
 * npx tsx scripts/support-golden.ts --dry                      # DB·네트워크 없이 프롬프트 한 건
 * npx tsx scripts/support-golden.ts --check                    # 마개와 쓰기만 재고 멈춘다
 * npx tsx scripts/support-golden.ts                             # set A·B 5회 실행(기본)
 * npx tsx scripts/support-golden.ts --reps=1 --cap=20            # 값싸게 한 번만 훑어본다
 * npx tsx scripts/support-golden.ts --domain=general --only=A    # set A 만 v4 로 재측정(세션 43)
 * npx tsx scripts/support-golden.ts --domain=general --only=C    # set C(세션 45)
 * npx tsx scripts/support-golden.ts --only=C --mode=signal        # signal 골든(세션 47)
 * npx tsx scripts/support-golden.ts --only=D                     # tell 골든(세션 45)
 * npx tsx scripts/support-golden.ts --only=D --mode=tell2         # tell-v2 골든(세션 47)
 * npx tsx scripts/support-golden.ts --hint                       # 힌트 v3 골든(세션 47부터 v3)
 * ```
 *
 * 인자: `--reps`(반복 횟수, 기본 5) · `--cap`(이 실행의 자기 상한) · `--model` ·
 *       `--out` · `--dry` · `--check` · `--use-cache` ·
 *       `--domain`(battle 기본 | general, 세션 43) · `--only`(A·B·C 의 조합
 *       또는 D, 기본 AB) · `--mode`(signal | tell2, 세션 47 — --only=C · D
 *       전용) · `--hint`(세션 45, 부울)
 *       ★ `--domain general` 을 줘도 **set B(bt-)는 항상 battle 이다** — 코드가
 *         set 으로 강제한다(사람이 --only 를 깜빡해도 bt- 캐시 키가 안 바뀐다).
 *         set C 는 강제하지 않는다 — set A 와 같은 자리.
 * 환경: `GEMINI_API_KEY` · `GEMINI_THINKING_LEVEL` · `AI_PROBE_USER_ID`(필요하면)
 *
 * ★ `--conditions=react-server` 가 필요하다(package.json 이 npm script 로 준다).
 *   gemini.ts·flags.ts 가 `server-only` 를 문다 — 여기는 서버 하니스다.
 */
import './load-env'
import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { readFileSync } from 'node:fs'
import { judgeHintV3With, judgeSignalWith, judgeSupportWith, judgeTellV2With, judgeTellWith, type HintV2Outcome, type SignalOutcome, type SupportOutcome, type TellOutcome, type TellV2Outcome } from '../lib/ai/observe'
import {
  buildHintPromptV3,
  buildSignalPrompt,
  buildSupportPrompt,
  buildTellPrompt,
  buildTellPromptV2,
  verifyHintV3,
  verifySignalJudgment,
  verifySupportJudgment,
  verifyTellJudgment,
  verifyTellV2Judgment,
  PROMPT_VERSION_HINT_V3,
  PROMPT_VERSION_SIGNAL,
  PROMPT_VERSION_SUPPORT,
  PROMPT_VERSION_SUPPORT_GENERAL,
  PROMPT_VERSION_TELL,
  PROMPT_VERSION_TELL_V2,
  type HintV2Verdict,
  type SignalVerdict,
  type SupportDomain,
  type SupportVerdict,
  type TellV2Verdict,
  type TellVerdict,
} from '../lib/ai/prompt'
import { resolveHintMaterial } from '../lib/ai/hint-text'
import { callGemini, DEFAULT_MODEL, THINKING_LEVEL } from '../lib/ai/gemini'
import { checkGateBeforeQuota, checkRunBudget } from '../lib/ai/gate'
import { countTodayRows, logPgError, readFlags, sumSpendTodayUsd } from '../lib/ai/flags'
import { createAdminClient } from '../lib/supabase/admin'
import { PRICES, PROMO_ENDS } from '../lib/ai/pricing'

interface Ch10Item {
  id: string
  gold: {
    good_answer: string
    nak_answer: string
    payoff_line: string
    beat_line: string
  }
}

interface RefRow {
  source_key: string
  ord: number
  blank_key: string
  content: string
}

interface Case {
  set: 'A' | 'B' | 'C'
  itemId: string // ch10 item id 또는 bt-/ca- source_key(:ord)
  // standoff·emotion(세션 42·45) — 대치형 정당 답안(결정타 없이 끝나되
  // 빌드업은 있음) · 감정형 신호 변형. good/nak/no_beat 와 **따로 센다**
  // (summarize) — 이 갈래들은 판정선이 아직 미정이라, 다른 셋의 집계에
  // 섞으면 오탐·미검출 수가 흐려진다. real_none(세션 49) — 박 님 실사용
  // 표본(bt-alley-hook). 기대 verdict('none')는 있지만 good/nak 과는 다른
  // 자리라 안 섞는다 — 어긋남만 별도 줄로 낸다.
  kind: 'good' | 'nak' | 'no_beat' | 'standoff' | 'emotion' | 'real_none'
  text: string
  // set B/C nak·no_beat·standoff·emotion·real_none 전용. 통제 짝이 불완전
  // 하다는 표시(data/probe/*.json 의 gold.note). 결과 출력에 함께 낸다 —
  // 없으면 해석이 미검출·뒤집힘을 프롬프트 결함으로 잘못 읽는다.
  note?: string
}

interface SetBNakItem {
  id: string
  gold: {
    good_answer: string
    nak_answer: string
    // 세션 41 후속 2. bt- 문항 원문(passage) 그대로 — 결정타 자체가 없는 글.
    no_beat_answer: string
    // 세션 42 — 자리만. 대치형 정당 답안(결정타 없이 끝나되 빌드업은 있음).
    // 문안은 박 님 확정 후 채운다 — 있는 항목만 loadCases() 가 케이스로 싣는다.
    standoff_answer?: string
    // 세션 49 — 박 님 실사용 답안(AI 가 맞게 판정한 자산, 회귀 검사용).
    // bt-alley-hook 만. 기대 verdict 'none'. note 와 별개 필드다 — note 는
    // nak_answer 의 구성 사유라 real_none_answer 에 그대로 물려주면 뜻이 안 맞는다.
    real_none_answer?: string
    real_none_note?: string
    payoff_line: string
    beat_line: string
    note?: string
  }
}

interface SetCItem {
  id: string
  gold: {
    // 세션 48 — nak_answer 가 신호를 어떻게 지웠는지의 갈래(position·blank·
    // reaction·baseline_removed). nak kind별 미검출 집계에 쓴다.
    nak_kind?: string
    nak_answer: string
    // ca-walk-home 만. good/nak 과 따로 센다(kind 'emotion').
    emotion_good_answer?: string
    // ca-gate-dinner 만(세션 47). good/nak/emotion 과 따로 센다(kind 'bare_emotion').
    bare_emotion_answer?: string
    // ca-gate-dinner 만(세션 49) — 박 님 실사용 답안(AI 가 맞게 판정한 자산,
    // 회귀 검사용). 기대 verdict 'no_signal'. good/nak/emotion/bare_emotion
    // 과 따로 센다(kind 'real_no_signal'). note 와 별개 필드다(nak_answer 의
    // 구성 사유와 뜻이 다르다).
    real_no_signal_answer?: string
    real_no_signal_note?: string
    payoff_line: string
    beat_line: string
    note?: string
  }
}

interface SetDItem {
  id: string
  source_key: string
  expected: 'tell' | null // null = 경계 표본, 분포만
  tell_answer: string
  tell_line: string
  note?: string
}

/**
 * ch10 항목에 합성 problem_id 를 붙인다 — RFC4122 v5(namespace + name 의
 * sha1). uuid 패키지가 저장소에 없어(package.json 확인) 손으로 잰다. 이
 * 값은 DB 행을 안 가리킨다 — 하니스 결과 파일 안에서 항목을 안정적으로
 * 가리키는 이름표일 뿐이다(캐시 키에도 안 쓴다 — 캐시는 기본 우회다).
 */
const NAMESPACE = 'a1b2c3d4-0000-5000-8000-6e6f76656c74' // 고정. 바꾸면 이전 결과 파일과 이름표가 갈린다
function uuidv5(name: string, namespace: string): string {
  const nsBytes = Buffer.from(namespace.replace(/-/g, ''), 'hex')
  const hash = createHash('sha1').update(Buffer.concat([nsBytes, Buffer.from(name, 'utf8')])).digest()
  const bytes = Buffer.from(hash.subarray(0, 16))
  bytes[6] = (bytes[6] & 0x0f) | 0x50
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = bytes.toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
void uuidv5 // ch10 항목은 결과 파일 안 이름표로 id 를 그대로 쓴다 — 지금은 실행에 안 쓰인다. 자리만 유지한다.

const root = path.join(__dirname, '..')

function loadAnswersJson(): { reference?: RefRow[] } {
  return JSON.parse(
    readFileSync(path.join(root, 'seed', 'dump', 'answers.json'), 'utf8').replace(/^﻿/, '')
  ) as { reference?: RefRow[] }
}

function loadSetBNak(): { items: SetBNakItem[] } {
  return JSON.parse(
    readFileSync(path.join(root, 'data', 'probe', 'set_b_nak.json'), 'utf8').replace(/^﻿/, '')
  ) as { items: SetBNakItem[] }
}

function loadCases(): Case[] {
  const ch10 = JSON.parse(
    readFileSync(path.join(root, 'data', 'probe', 'ch10_decisive.json'), 'utf8').replace(/^﻿/, '')
  ) as { items: Ch10Item[] }

  const out: Case[] = []
  for (const item of ch10.items) {
    out.push({ set: 'A', itemId: item.id, kind: 'good', text: item.gold.good_answer })
    out.push({ set: 'A', itemId: item.id, kind: 'nak', text: item.gold.nak_answer })
  }

  const answers = loadAnswersJson()
  const bt = (answers.reference ?? []).filter((r) => r.source_key.startsWith('bt-'))
  for (const r of bt) {
    out.push({ set: 'B', itemId: `${r.source_key}:${r.ord}`, kind: 'good', text: r.content })
  }

  // set B nak(세션 41) — id(bt- source_key)로 위 good 10건과 짝을 맞춘다.
  // itemId 는 good 과 달리 ord 가 없다 — good 은 가·나 두 세트지만 nak 은
  // 세트당 하나뿐이라 ord 를 붙일 자리가 없다(뒤집힘 집계는 kind 로 이미
  // good/nak 을 가르므로 itemId 꼴이 달라도 안 섞인다).
  const nakData = loadSetBNak()
  for (const item of nakData.items) {
    out.push({
      set: 'B', itemId: item.id, kind: 'nak', text: item.gold.nak_answer,
      note: item.gold.note?.trim() || undefined,
    })
  }

  // set B no_beat(세션 41 후속 2) — 같은 파일, 같은 id 짝. bt- 문항 원문
  // 그대로다 — 결정타가 아예 없는 글에 대해 프롬프트가 정직하게 null 을
  // 내는지 잰다. note 는 nak 과 같은 값을 그대로 물려준다(같은 항목 성격 표시).
  for (const item of nakData.items) {
    out.push({
      set: 'B', itemId: item.id, kind: 'no_beat', text: item.gold.no_beat_answer,
      note: item.gold.note?.trim() || undefined,
    })
  }

  // set B standoff(세션 42/43) — bt-spear-range 1건만 문안이 있다(나머지는
  // 자리만) — 있는 항목만 싣는다.
  for (const item of nakData.items) {
    if (!item.gold.standoff_answer) continue
    out.push({
      set: 'B', itemId: item.id, kind: 'standoff', text: item.gold.standoff_answer,
      note: item.gold.note?.trim() || undefined,
    })
  }

  // set B 실사용 표본(세션 49) — bt-alley-hook 1건만 있다. 기대 verdict
  // 'none' — good/nak 과 안 섞는다(summarize 가 별도 어긋남 줄로 낸다).
  for (const item of nakData.items) {
    if (!item.gold.real_none_answer) continue
    out.push({
      set: 'B', itemId: item.id, kind: 'real_none', text: item.gold.real_none_answer,
      note: item.gold.real_none_note?.trim() || undefined,
    })
  }

  // set C(ca-, 세션 45) — good 은 answers.json 에서 직접(가·나, set B 와 같은
  // 방식) · nak·emotion 은 set_c_cliff.json.
  const ca = (answers.reference ?? []).filter((r) => r.source_key.startsWith('ca-'))
  for (const r of ca) {
    out.push({ set: 'C', itemId: `${r.source_key}:${r.ord}`, kind: 'good', text: r.content })
  }
  const setCData = JSON.parse(
    readFileSync(path.join(root, 'data', 'probe', 'set_c_cliff.json'), 'utf8').replace(/^﻿/, '')
  ) as { items: SetCItem[] }
  for (const item of setCData.items) {
    out.push({
      set: 'C', itemId: item.id, kind: 'nak', text: item.gold.nak_answer,
      note: item.gold.note?.trim() || undefined,
    })
    if (item.gold.emotion_good_answer) {
      out.push({
        set: 'C', itemId: item.id, kind: 'emotion', text: item.gold.emotion_good_answer,
        note: item.gold.note?.trim() || undefined,
      })
    }
  }

  return out
}

/** signal 골든(세션 47) 표본 — 구성 16 ca- 5문항. support 케이스와 형태가
 *  달라 loadCases() 에 안 섞는다 — 프롬프트 자체가 다르다(judgeSignalWith).
 *  good 은 answers.json 의 가·나(set C 의 good 과 같은 방식) · nak·emotion·
 *  bare_emotion 은 set_c_cliff.json. */
interface SignalCase {
  id: string
  // 'good_excluded'(세션 48) — meta.excluded_good 에 실린 대조형 good. 판정선
  // 집계(good 오탐)에서 뺀다 — 기록만 한다. 'real_no_signal'(세션 49) —
  // 박 님 실사용 표본. 기대 verdict 'no_signal' — good/nak 과 안 섞지만
  // 어긋남은 낸다(standoff·emotion 과 다른 자리 — 세션 49 real_none 과 같다).
  kind: 'good' | 'nak' | 'emotion' | 'bare_emotion' | 'good_excluded' | 'real_no_signal'
  text: string
  note?: string
  // nak 전용(세션 48) — set_c_cliff.json 의 gold.nak_kind.
  nakKind?: string
}

function loadSignalCases(): SignalCase[] {
  const out: SignalCase[] = []
  const answers = loadAnswersJson()
  const setCData = JSON.parse(
    readFileSync(path.join(root, 'data', 'probe', 'set_c_cliff.json'), 'utf8').replace(/^﻿/, '')
  ) as { meta: { excluded_good?: string[] }; items: SetCItem[] }
  const excludedGood = new Set(setCData.meta.excluded_good ?? [])

  const ca = (answers.reference ?? []).filter((r) => r.source_key.startsWith('ca-'))
  for (const r of ca) {
    const id = `${r.source_key}:${r.ord}`
    out.push({ id, kind: excludedGood.has(id) ? 'good_excluded' : 'good', text: r.content })
  }
  for (const item of setCData.items) {
    out.push({ id: item.id, kind: 'nak', text: item.gold.nak_answer, note: item.gold.note?.trim() || undefined, nakKind: item.gold.nak_kind })
    if (item.gold.emotion_good_answer) {
      out.push({ id: item.id, kind: 'emotion', text: item.gold.emotion_good_answer, note: item.gold.note?.trim() || undefined })
    }
    if (item.gold.bare_emotion_answer) {
      out.push({ id: item.id, kind: 'bare_emotion', text: item.gold.bare_emotion_answer, note: item.gold.note?.trim() || undefined })
    }
    if (item.gold.real_no_signal_answer) {
      out.push({ id: item.id, kind: 'real_no_signal', text: item.gold.real_no_signal_answer, note: item.gold.real_no_signal_note?.trim() || undefined })
    }
  }
  return out
}

/** set D(tell 골든, 세션 45) 표본. support 케이스와 형태가 달라 loadCases()
 *  에 안 섞는다 — 프롬프트 자체가 다르다(judgeTellWith). */
interface TellCase {
  id: string
  kind: 'show_good' | 'tell_sample'
  expected: 'show' | 'tell' | null // null = 경계 표본, 분포만
  text: string
  // 세션 47 — tell-v2 겹침 집계(forbidWords)에 필요. show_good 은 id 의
  // ':ord' 앞부분, tell_sample 은 SetDItem.source_key.
  sourceKey: string
  note?: string
}

function loadTellCases(): TellCase[] {
  const out: TellCase[] = []
  const answers = loadAnswersJson()
  const bt = (answers.reference ?? []).filter((r) => r.source_key.startsWith('bt-'))
  for (const r of bt) {
    out.push({ id: `${r.source_key}:${r.ord}`, kind: 'show_good', expected: 'show', text: r.content, sourceKey: r.source_key })
  }
  const setD = JSON.parse(
    readFileSync(path.join(root, 'data', 'probe', 'set_d_tell.json'), 'utf8').replace(/^﻿/, '')
  ) as { items: SetDItem[] }
  for (const item of setD.items) {
    out.push({
      id: item.id, kind: 'tell_sample', expected: item.expected, text: item.tell_answer,
      sourceKey: item.source_key, note: item.note?.trim() || undefined,
    })
  }
  return out
}

/** 힌트 v2 골든(세션 45 배선 · 세션 46 부터 v2 호출) 표본 — set B nak·no_beat
 *  10건. passage 는 같은 항목의 no_beat_answer(=bt- 문항 원문 그대로, meta
 *  주석 참고)를 그대로 쓴다. nak → support 기대 verdict 'none' · no_beat →
 *  'no_beat' — v2 프롬프트가 verdict 설명 문구를 골라 쓰는 데 필요하다
 *  (support 를 다시 부르지 않는다 — 이미 근거가 없다고 아는 표본이라
 *  비용 절약, 세션 45 설계 그대로).
 */
interface HintCase {
  id: string
  kind: 'nak' | 'no_beat'
  verdict: HintV2Verdict
  text: string
  passage: string
  person: string
  opponent: string
  material: string
}

interface BtProblemMeta {
  requireAll?: string[]
  ai_hint_material?: string
  forbidWords?: string[]
}

function loadBtMeta(): Map<string, BtProblemMeta> {
  const problems = JSON.parse(
    readFileSync(path.join(root, 'seed', 'dump', 'problems.json'), 'utf8').replace(/^﻿/, '')
  ) as { source_key: string; scoring_config: BtProblemMeta }[]
  const out = new Map<string, BtProblemMeta>()
  for (const p of problems) {
    if (!p.source_key.startsWith('bt-')) continue
    out.set(p.source_key, p.scoring_config)
  }
  return out
}

function loadHintCases(): HintCase[] {
  const nakData = loadSetBNak()
  const meta = loadBtMeta()
  const out: HintCase[] = []
  for (const item of nakData.items) {
    const m = meta.get(item.id)
    if (!m?.requireAll || m.requireAll.length < 2) continue
    const material = resolveHintMaterial(
      { ai_hint_material: m.ai_hint_material, forbidWords: m.forbidWords },
      item.gold.no_beat_answer
    )
    if (!material) continue
    const [person, opponent] = m.requireAll
    out.push({
      id: item.id, kind: 'nak', verdict: 'none', text: item.gold.nak_answer,
      passage: item.gold.no_beat_answer, person, opponent, material,
    })
    out.push({
      id: item.id, kind: 'no_beat', verdict: 'no_beat', text: item.gold.no_beat_answer,
      passage: item.gold.no_beat_answer, person, opponent, material,
    })
  }
  return out
}

const arg = (name: string, fallback: string) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback
const flag = (name: string) => process.argv.includes(`--${name}`)

/** ai-probe.ts 의 preflightWrite 와 같다 — 돈이 나가기 전에 쓰기 권한을 먼저 잰다. */
async function preflightWrite(): Promise<boolean> {
  const admin = createAdminClient()
  const before = await countTodayRows()
  if (before === null) {
    console.error('★ ai_usage_log 를 못 읽는다. 지출 상한이 설 수 없다.')
    return false
  }
  const { error } = await admin.from('ai_usage_log').insert({
    user_id: process.env.AI_PROBE_USER_ID ?? null,
    submission_id: null,
    model: 'preflight',
    input_tokens: 0,
    cached_tokens: 0,
    output_tokens: 0,
    cost_usd: 0,
  })
  if (error) {
    console.error('★ ai_usage_log 에 못 적는다. 호출하기 전에 멈춘다.')
    logPgError('ai_usage_log insert', error)
    return false
  }
  const after = await countTodayRows()
  if (after === null || after !== before + 1) {
    console.error(`★ 넣은 행이 오늘 합계에 안 잡힌다 (${before} → ${after}). 상한이 못 선다.`)
    return false
  }
  console.log(`예비 검사 통과 — 오늘 행 ${before} → ${after}`)
  return true
}

/** ai_usage_log 에 호출 비용을 적는다. 세 모드(support·tell·hint) 가 다 쓴다. */
async function logUsage(
  admin: ReturnType<typeof createAdminClient>,
  outcome: { usage: { inputTokens: number; cachedTokens: number; outputTokens: number } | null; costUsd: number | null; model: string }
): Promise<boolean> {
  if (!outcome.usage) return true
  const { error } = await admin.from('ai_usage_log').insert({
    user_id: process.env.AI_PROBE_USER_ID ?? null,
    submission_id: null,
    model: outcome.model,
    input_tokens: outcome.usage.inputTokens,
    cached_tokens: outcome.usage.cachedTokens,
    output_tokens: outcome.usage.outputTokens,
    cost_usd: outcome.costUsd,
  })
  if (error) {
    console.error('\n★ ai_usage_log 에 못 적었다 — 멈춘다.')
    logPgError('ai_usage_log insert', error)
    return false
  }
  return true
}

interface RunResult {
  set: 'A' | 'B' | 'C'
  itemId: string
  kind: 'good' | 'nak' | 'no_beat' | 'standoff' | 'emotion' | 'real_none'
  rep: number
  verdict: SupportVerdict | 'call_failed' | 'not_json' | 'bad_shape'
  fromCache: boolean
  costUsd: number | null
  /** 'battle' | 'general' (세션 43). set B 는 항상 'battle'. */
  domain: SupportDomain
}

async function main() {
  const dry = flag('dry')
  const check = flag('check')
  const useCache = flag('use-cache')
  const hintMode = flag('hint')
  const reps = Number(arg('reps', '5'))
  const model = arg('model', DEFAULT_MODEL)

  // ★ ai-probe.ts 의 --prompt 와 같은 함정 — `arg()` 는 `--name=value` 꼴만
  //   읽는다. 공백 꼴(`--domain general`)은 조용히 기본값으로 떨어져 **엉뚱한
  //   도메인을 재고도 모른다.** 그래서 공백 꼴을 먼저 막는다.
  if (process.argv.includes('--domain')) {
    console.error('★ --domain 은 등호로 쓴다: --domain=general')
    console.error('  공백 꼴은 조용히 battle 로 떨어진다. 그러면 무엇을 쟀는지 모른다.')
    process.exit(1)
  }
  if (process.argv.includes('--only')) {
    console.error('★ --only 는 등호로 쓴다: --only=A')
    console.error('  공백 꼴은 조용히 AB(전체)로 떨어진다.')
    process.exit(1)
  }

  // 도메인 일반화(세션 43). set B(bt-)는 --domain 값과 무관하게 **항상 battle**
  // 이다 — domainFor 가 강제한다. set C(ca-, 세션 45)는 set A 와 같은 자리라
  // --domain 값을 그대로 탄다.
  const domainArg = arg('domain', 'battle')
  if (domainArg !== 'battle' && domainArg !== 'general') {
    console.error(`★ --domain 은 battle · general 뿐이다. 받은 것: ${domainArg}`)
    process.exit(1)
  }
  const domainFor = (c: Case): SupportDomain => (c.set === 'B' ? 'battle' : (domainArg as SupportDomain))
  const promptVersionFor = (domain: SupportDomain) => (domain === 'general' ? PROMPT_VERSION_SUPPORT_GENERAL : PROMPT_VERSION_SUPPORT)

  const only = arg('only', 'AB')
  // tell 모드(세션 45) — support 가 아니라 완전히 다른 프롬프트라 A·B·C 와
  // 동시에 못 켠다. --only=D 하나로만 고른다.
  const tellMode = only === 'D'
  if (!tellMode && (!/^[ABC]+$/.test(only) || new Set(only).size !== only.length)) {
    console.error(`★ --only 는 A·B·C 의 조합(예: A, AB, ABC) 또는 D(tell 전용) 뿐이다. 받은 것: ${only}`)
    process.exit(1)
  }
  if (hintMode && (tellMode || only !== 'AB')) {
    console.error('★ --hint 는 --only 와 같이 안 쓴다 — 힌트 표본은 set B nak·no_beat 10건으로 고정이다.')
    process.exit(1)
  }

  // --mode(세션 47) — 같은 --only 값 안에서 다른 프롬프트를 고른다.
  // signal 은 --only=C 전용(구성 16 ca-), tell2 는 --only=D 전용이다.
  if (process.argv.includes('--mode')) {
    console.error('★ --mode 는 등호로 쓴다: --mode=signal')
    process.exit(1)
  }
  const modeArg = arg('mode', '')
  if (modeArg && modeArg !== 'signal' && modeArg !== 'tell2') {
    console.error(`★ --mode 는 signal · tell2 뿐이다. 받은 것: ${modeArg}`)
    process.exit(1)
  }
  const signalMode = modeArg === 'signal'
  const tell2Mode = modeArg === 'tell2'
  if (signalMode && only !== 'C') {
    console.error('★ --mode=signal 은 --only=C 와 함께만 쓴다.')
    process.exit(1)
  }
  if (tell2Mode && !tellMode) {
    console.error('★ --mode=tell2 는 --only=D 와 함께만 쓴다.')
    process.exit(1)
  }

  const out = arg(
    'out',
    hintMode
      ? `data/probe/hint-golden-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.json`
      : signalMode
        ? `data/probe/signal-golden-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.json`
        : tell2Mode
          ? `data/probe/tell2-golden-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.json`
          : tellMode
            ? `data/probe/tell-golden-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.json`
            : `data/probe/support-golden-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.json`
  )

  if (!PRICES[model]) console.log('★ 단가표에 없는 모델이다. 비용이 null 로 나간다 — pricing.ts 에 넣어라')
  else console.log(`★ 단가는 프로모다. ${PROMO_ENDS} 이후 두 배 — pricing.ts`)

  // ── --dry: DB·Gemini 없이 프롬프트 한 건만 본다. 모드마다 다른 프롬프트. ──
  if (dry) {
    if (hintMode) {
      const cs = loadHintCases()
      const c = cs[0]
      console.log(`\n--- 힌트 v3 프롬프트 한 건 (${c.id}/${c.kind}, verdict=${c.verdict}) ---`)
      console.log(buildHintPromptV3(c.text, c.material, c.person, c.opponent, c.verdict))
    } else if (signalMode) {
      const cs = loadSignalCases()
      const c = cs[0]
      console.log(`\n--- signal 프롬프트 한 건 (${c.id}/${c.kind}) ---`)
      console.log(buildSignalPrompt(c.text))
    } else if (tell2Mode) {
      const cs = loadTellCases()
      const c = cs[0]
      console.log(`\n--- tell-v2 프롬프트 한 건 (${c.id}/${c.kind}) ---`)
      console.log(buildTellPromptV2(c.text))
    } else if (tellMode) {
      const cs = loadTellCases()
      const c = cs[0]
      console.log(`\n--- tell 프롬프트 한 건 (${c.id}/${c.kind}) ---`)
      console.log(buildTellPrompt(c.text))
    } else {
      const cases = loadCases().filter((c) => only.includes(c.set))
      const c = cases[0]
      console.log(`\n--- 프롬프트 한 건 (${c.set}/${c.itemId}/${c.kind}, domain=${domainFor(c)}) ---`)
      console.log(buildSupportPrompt(c.text, domainFor(c)))
    }
    console.log('\n--dry 다. DB 도 Gemini 도 안 탔다. 마개까지 재려면 --check 다.')
    return
  }

  const need = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
  const missing = need.filter((k) => !process.env[k])
  console.log('\nenv  ' + [...need, 'GEMINI_API_KEY'].map((k) => `${k}=${process.env[k] ? '있음' : '없음'}`).join(' · '))
  if (missing.length > 0) {
    console.error(`★ DB 자격이 없다: ${missing.join(' · ')}. --dry 로 보든가 .env.local 을 채워라.`)
    process.exit(1)
  }
  if (!process.env.GEMINI_API_KEY) {
    console.log('키 없음 — 실행 안 함')
    process.exit(0)
  }

  const flags = await readFlags()
  console.log(`\nflags  kill_switch=${flags.killSwitch} cap=${flags.dailySpendCapUsd}`)
  if (!(await preflightWrite())) process.exit(1)

  const gate = checkGateBeforeQuota({
    hasApiKey: true,
    killSwitch: flags.killSwitch,
    dailySpendCapUsd: flags.dailySpendCapUsd,
    spentTodayUsd: await sumSpendTodayUsd(),
  })
  console.log(gate.allow ? '마개 통과 — 부를 수 있다' : `막혔다 [${gate.rule}] ${gate.detail}`)
  if (check) {
    console.log('\n--check 다. Gemini 는 안 불렀다.')
    return
  }
  if (!gate.allow) process.exit(1)

  const admin = createAdminClient()

  if (hintMode) {
    await runHintGolden(admin, flags, reps, model, out)
    return
  }
  if (signalMode) {
    await runSignalGolden(admin, flags, reps, model, out)
    return
  }
  if (tell2Mode) {
    await runTell2Golden(admin, flags, reps, model, out)
    return
  }
  if (tellMode) {
    await runTellGolden(admin, flags, reps, model, out)
    return
  }
  await runSupportGolden(admin, flags, reps, model, out, only, domainArg, domainFor, promptVersionFor)
}

/**
 * 재료 복사 경보(세션 49 4-A). **폐기 사유가 아니다** — verifyHintV3 는 안
 * 건드린다. 재료를 두껍게 준 결정(spear-range 두 줄)이 #30형(수를 그냥
 * 주는 것)을 부르는지 수치로 보려는 계기일 뿐, 판단은 박 님이 본문을
 * 읽고 한다.
 *
 * 재료를 줄 단위(\n)로 쪼개 각 줄에서 6자 창을 밀며, 힌트 본문(「」 인용은
 * 답안 인용이라 빼고, 공백은 정규화)에 그 6자 부분 문자열이 있으면 복사로
 * 본다.
 */
function detectMaterialCopy(hintText: string, material: string): boolean {
  const hintNorm = hintText.replace(/「[^」]*」/g, '').replace(/\s+/g, '')
  for (const line of material.split('\n')) {
    const lineNorm = line.replace(/\s+/g, '')
    for (let i = 0; i + 6 <= lineNorm.length; i++) {
      if (hintNorm.includes(lineNorm.slice(i, i + 6))) return true
    }
  }
  return false
}

// ── 힌트 골든(세션 45) ────────────────────────────────────────────────
async function runHintGolden(
  admin: ReturnType<typeof createAdminClient>,
  flags: Awaited<ReturnType<typeof readFlags>>,
  reps: number,
  model: string,
  out: string
) {
  const cases = loadHintCases()
  const totalCalls = cases.length * reps
  const runCap = Number(arg('cap', String(totalCalls)))
  console.log(`\n힌트 v3 표본 ${cases.length}건(nak 5 · no_beat 5) · 반복 ${reps}회 · 모델 ${model} · 이 실행 상한 ${runCap}회`)
  console.log('★ 힌트 본문을 그대로 출력한다 — 박 님이 직접 읽고 거른다(통과율은 참고 수치일 뿐).')

  const results: { id: string; kind: 'nak' | 'no_beat'; rep: number; ok: boolean; reasons: string[]; text: string | null; costUsd: number | null; unwrapped: boolean | 'malformed_json' | null; materialCopy: boolean }[] = []
  let calls = 0

  outer: for (const c of cases) {
    for (let rep = 1; rep <= reps; rep++) {
      const spent = await sumSpendTodayUsd()
      const pre = checkGateBeforeQuota({ hasApiKey: true, killSwitch: flags.killSwitch, dailySpendCapUsd: flags.dailySpendCapUsd, spentTodayUsd: spent })
      if (!pre.allow) { console.log(`\n막혔다 [${pre.rule}] ${pre.detail} — ${calls}회에서 멈춘다`); break outer }
      const budget = checkRunBudget(calls, runCap)
      if (!budget.allow) { console.log(`\n막혔다 [${budget.rule}] ${budget.detail}`); break outer }

      const outcome: HintV2Outcome = await judgeHintV3With(callGemini, c.text.trim(), c.material, c.person, c.opponent, c.verdict, model)
      calls++
      if (!(await logUsage(admin, outcome))) break outer

      let ok = false
      let reasons: string[] = []
      let text: string | null = null
      let materialCopy = false
      if (!outcome.ok || !outcome.text) {
        reasons = [outcome.error ?? 'call_failed']
      } else {
        text = outcome.text
        const check = verifyHintV3(outcome.text, c.text.trim())
        ok = check.ok
        reasons = check.reasons
        materialCopy = detectMaterialCopy(outcome.text, c.material)
      }
      const unwrapped = outcome.unwrapped ?? null
      results.push({ id: c.id, kind: c.kind, rep, ok, reasons, text, costUsd: outcome.costUsd, unwrapped, materialCopy })
      const tags = [unwrapped === true ? '벗김' : null, unwrapped === 'malformed_json' ? '깨진 껍데기' : null, materialCopy ? '재료 복사' : null].filter(Boolean)
      console.log(`${String(calls).padStart(3)} ${c.id}/${c.kind} rep${rep} [verdict=${c.verdict}]  ${ok ? '통과' : `폐기(${reasons.join(', ')})`}${tags.length > 0 ? ` [${tags.join(', ')}]` : ''}  $${outcome.costUsd ?? '-'}`)
      console.log(`     ${text ?? '(응답 없음)'}`)

      if (!outcome.ok && outcome.error === 'call_failed' && calls === 1) {
        console.log('\n★ 첫 호출부터 못 나갔다. 설정 문제다 — 뒤를 안 돌린다.')
        break outer
      }
    }
  }

  const passRate = results.length > 0 ? results.filter((r) => r.ok).length / results.length : null
  const cost = results.reduce((s, r) => s + (r.costUsd ?? 0), 0)
  console.log(`\n[힌트 v3] ${results.length}회 · 통과율 ${passRate === null ? '-' : (passRate * 100).toFixed(1) + '%'} · 비용 $${cost.toFixed(6)}`)

  // 세션 49 — JSON 껍데기 벗기기 실측(폐기 사유 아님, 보이게만 한다).
  const unwrappedCount = results.filter((r) => r.unwrapped === true).length
  const malformedCount = results.filter((r) => r.unwrapped === 'malformed_json').length
  console.log(`껍데기 벗김 ${unwrappedCount}/${results.length} · 깨진 껍데기 ${malformedCount}/${results.length}`)

  // 세션 49 4-A — 재료 복사 경보(폐기 사유 아님, 계기(計器)일 뿐).
  const copyRows = results.filter((r) => r.materialCopy)
  const copyByItem = new Map<string, number>()
  for (const r of copyRows) copyByItem.set(r.id, (copyByItem.get(r.id) ?? 0) + 1)
  const copyDetail = [...copyByItem.entries()].map(([id, n]) => `${id} ${n}`).join(' · ') || '없음'
  console.log(`재료 복사 ${copyRows.length}/${results.length}(${copyDetail})`)

  console.log('판정선(STATUS): 통과율은 참고일 뿐 — 박 님이 위 본문을 읽고 hint_visible 을 켤지 정한다.')

  writeFileSync(out, JSON.stringify({ model, reps, promptVersion: PROMPT_VERSION_HINT_V3, results, passRate, cost, unwrappedCount, malformedCount, materialCopyCount: copyRows.length }, null, 2))
  console.log(`결과를 ${out} 에 적었다.`)
}

// ── signal 골든(세션 47) ─────────────────────────────────────────────
async function runSignalGolden(
  admin: ReturnType<typeof createAdminClient>,
  flags: Awaited<ReturnType<typeof readFlags>>,
  reps: number,
  model: string,
  out: string
) {
  const cases = loadSignalCases()
  const totalCalls = cases.length * reps
  const runCap = Number(arg('cap', String(totalCalls)))
  const good = cases.filter((c) => c.kind === 'good')
  const nak = cases.filter((c) => c.kind === 'nak')
  const emotion = cases.filter((c) => c.kind === 'emotion')
  const bareEmotion = cases.filter((c) => c.kind === 'bare_emotion')
  const goodExcluded = cases.filter((c) => c.kind === 'good_excluded')
  const realNoSignal = cases.filter((c) => c.kind === 'real_no_signal')
  console.log(
    `\nset C(signal) good(signal 기대) ${good.length} · nak(no_signal 기대) ${nak.length} · ` +
      `emotion ${emotion.length}(판정선 미정 — 분포만) · bare_emotion ${bareEmotion.length}(판정선 미정 — 분포만) · ` +
      `good_excluded ${goodExcluded.length}(대조형 — 집계 밖, 기록만) · ` +
      `real_no_signal(no_signal 기대) ${realNoSignal.length}(박 님 실사용) · ` +
      `반복 ${reps}회 · 모델 ${model} · 이 실행 상한 ${runCap}회`
  )
  for (const c of [...nak, ...emotion, ...bareEmotion, ...goodExcluded, ...realNoSignal]) {
    if (c.note) console.log(`  ★ '${c.id}/${c.kind}': ${c.note}`)
  }

  const results: { id: string; kind: SignalCase['kind']; rep: number; verdict: SignalVerdict | 'call_failed' | 'not_json' | 'bad_shape'; costUsd: number | null; nakKind?: string }[] = []
  let calls = 0

  outer: for (const c of cases) {
    for (let rep = 1; rep <= reps; rep++) {
      const spent = await sumSpendTodayUsd()
      const pre = checkGateBeforeQuota({ hasApiKey: true, killSwitch: flags.killSwitch, dailySpendCapUsd: flags.dailySpendCapUsd, spentTodayUsd: spent })
      if (!pre.allow) { console.log(`\n막혔다 [${pre.rule}] ${pre.detail} — ${calls}회에서 멈춘다`); break outer }
      const budget = checkRunBudget(calls, runCap)
      if (!budget.allow) { console.log(`\n막혔다 [${budget.rule}] ${budget.detail}`); break outer }

      const outcome: SignalOutcome = await judgeSignalWith(callGemini, c.text.trim(), model)
      calls++
      if (!(await logUsage(admin, outcome))) break outer

      let verdict: (typeof results)[number]['verdict']
      if (!outcome.ok || !outcome.observation) {
        verdict = (outcome.error ?? 'call_failed') as (typeof results)[number]['verdict']
      } else {
        verdict = verifySignalJudgment(c.text.trim(), outcome.observation).verdict
      }
      results.push({ id: c.id, kind: c.kind, rep, verdict, costUsd: outcome.costUsd, nakKind: c.nakKind })
      console.log(`${String(calls).padStart(3)} ${c.id}/${c.kind} rep${rep}  ${verdict}  $${outcome.costUsd ?? '-'}`)

      if (outcome.error === 'call_failed' && calls === 1) {
        console.log('\n★ 첫 호출부터 못 나갔다. 설정 문제다 — 뒤를 안 돌린다.')
        break outer
      }
    }
  }

  const goodRows = results.filter((r) => r.kind === 'good')
  const goodFalsePos = goodRows.filter((r) => r.verdict !== 'signal').length
  const nakRows = results.filter((r) => r.kind === 'nak')
  const nakMissed = nakRows.filter((r) => r.verdict === 'signal').length
  const cost = results.reduce((s, r) => s + (r.costUsd ?? 0), 0)
  const realNoSignalRows = results.filter((r) => r.kind === 'real_no_signal')
  const realNoSignalMismatch = realNoSignalRows.filter((r) => r.verdict !== 'no_signal').length
  console.log(`\n[set C signal] good ${goodRows.length}건 오탐 ${goodFalsePos} · nak ${nakRows.length}건 미검출 ${nakMissed}` +
    (realNoSignalRows.length > 0 ? ` · real_no_signal ${realNoSignalRows.length}건 어긋남 ${realNoSignalMismatch}` : '') +
    ` · 비용 $${cost.toFixed(6)}`)

  // nak kind별 미검출(세션 48) — position·blank·reaction·baseline_removed.
  const nakKinds = ['position', 'blank', 'reaction', 'baseline_removed'] as const
  const nakMissedByKind: Record<string, { missed: number; total: number }> = {}
  for (const k of nakKinds) {
    const rows = nakRows.filter((r) => r.nakKind === k)
    nakMissedByKind[k] = { missed: rows.filter((r) => r.verdict === 'signal').length, total: rows.length }
  }
  console.log(
    'nak kind별 미검출: ' +
      nakKinds.map((k) => `${k} ${nakMissedByKind[k].missed}/${nakMissedByKind[k].total}`).join(' · ')
  )

  // self_state 미검출(세션 48) — emotion·bare_emotion 은 판정선 미정이지만,
  // verdict==='signal' 이면 "신호가 있다"고 잡은 것이라 여기서는 '미검출'
  // 이라는 이름을 안 쓴다는 세션 지시대로 아래 줄에 '미검출' 로 낸다(속마음·
  // 자각을 signal 로 잡으면 세션 48 의 신호 정의를 벗어난다는 뜻이라 오검출에
  // 가깝지만, 지시 문구를 그대로 따른다).
  const selfStateMissed: Record<string, { missed: number; total: number }> = {}
  for (const k of ['emotion', 'bare_emotion'] as const) {
    const rows = results.filter((r) => r.kind === k)
    selfStateMissed[k] = { missed: rows.filter((r) => r.verdict === 'signal').length, total: rows.length }
  }
  console.log(
    'self_state 미검출: ' +
      (['emotion', 'bare_emotion'] as const).map((k) => `${k} ${selfStateMissed[k].missed}/${selfStateMissed[k].total}`).join(' · ')
  )

  // good_excluded 분포(세션 48, 대조형 — 집계 밖. 기록만).
  const excludedRows = results.filter((r) => r.kind === 'good_excluded')
  const excludedByItem = new Map<string, typeof results>()
  for (const r of excludedRows) excludedByItem.set(r.id, [...(excludedByItem.get(r.id) ?? []), r])
  const excludedDist: Record<string, Record<string, number>> = {}
  for (const [id, list] of excludedByItem) {
    const counts: Record<string, number> = {}
    for (const r of list) counts[r.verdict] = (counts[r.verdict] ?? 0) + 1
    excludedDist[id] = counts
    const distStr = Object.entries(counts).map(([v, n]) => `${v} ${n}`).join(' · ')
    console.log(`good_excluded(대조형, 집계 밖): ${id} — ${distStr}`)
  }

  // real_no_signal 항목별 어긋남(세션 49, 박 님 실사용 표본).
  for (const r of realNoSignalRows.length > 0 ? [...new Set(realNoSignalRows.map((r) => r.id))] : []) {
    const list = realNoSignalRows.filter((row) => row.id === r)
    const itemMismatch = list.filter((row) => row.verdict !== 'no_signal').length
    const note = realNoSignal.find((c) => c.id === r)?.note
    console.log(`    real_no_signal '${r}': ${itemMismatch}/${list.length}회 no_signal 아님(어긋남)${note ? ` — ★ ${note}` : ''}`)
  }

  // 뒤집힘 — support-golden 과 같은 정의(같은 id+kind 의 reps 결과가 다 같지
  // 않으면 1건). set A/B/C 의 buildup 뒤집힘과 **같은 열에 안 섞는다**(세션
  // 47 지시 1-4 — 잰 관계가 다르다: support 는 '필요' 관계, signal 은 '기대'
  // 관계다) — signal 전용 결과 파일에만 별도로 낸다.
  const byItem = new Map<string, typeof results>()
  for (const r of results) {
    const k = `${r.id}:${r.kind}`
    byItem.set(k, [...(byItem.get(k) ?? []), r])
  }
  let flips = 0
  for (const list of byItem.values()) {
    if (new Set(list.map((r) => r.verdict)).size > 1) flips++
  }
  console.log(`뒤집힘(항목) ${flips}/${byItem.size} — signal 전용 열(support 의 뒤집힘과 안 섞는다)`)

  for (const kind of ['emotion', 'bare_emotion'] as const) {
    for (const [k, list] of byItem) {
      if (!k.endsWith(`:${kind}`)) continue
      const counts = new Map<string, number>()
      for (const r of list) counts.set(r.verdict, (counts.get(r.verdict) ?? 0) + 1)
      const dist = [...counts.entries()].map(([v, n]) => `${v} ${n}`).join(' · ')
      console.log(`    ${kind} '${k.slice(0, -(kind.length + 1))}': ${list.length}회 분포 — ${dist}`)
    }
  }

  writeFileSync(out, JSON.stringify({
    model, reps, promptVersion: PROMPT_VERSION_SIGNAL, results,
    goodFalsePos, nakMissed, flips, cost,
    nakMissedByKind, selfStateMissed, excludedDist,
    realNoSignal: realNoSignalRows.length, realNoSignalMismatch,
  }, null, 2))
  console.log(`결과를 ${out} 에 적었다.`)
  console.log('판정선(STATUS): good 오탐 0 · nak 미검출 0 · self_state 미검출 0 이면 구성 16(ca-) signal 실사용 확장. 판정선은 박 님이 정한다.')
}

// ── tell-v2 골든(세션 47, gating 후보) ─────────────────────────────────
async function runTell2Golden(
  admin: ReturnType<typeof createAdminClient>,
  flags: Awaited<ReturnType<typeof readFlags>>,
  reps: number,
  model: string,
  out: string
) {
  const cases = loadTellCases()
  const meta = loadBtMeta()
  const totalCalls = cases.length * reps
  const runCap = Number(arg('cap', String(totalCalls)))
  const showGood = cases.filter((c) => c.kind === 'show_good')
  const tellSamples = cases.filter((c) => c.kind === 'tell_sample')
  console.log(`\nset D(tell-v2) good(false 기대) ${showGood.length} · tell 표본 ${tellSamples.length}(경계 포함) · 반복 ${reps}회 · 모델 ${model} · 이 실행 상한 ${runCap}회`)
  for (const c of tellSamples) {
    if (c.expected === null && c.note) console.log(`  ★ ${c.id}(경계 표본): ${c.note}`)
  }

  const results: { id: string; kind: TellCase['kind']; expected: TellCase['expected']; rep: number; verdict: TellV2Verdict | 'call_failed' | 'not_json' | 'bad_shape'; overlap: boolean | null; costUsd: number | null }[] = []
  let calls = 0

  outer: for (const c of cases) {
    for (let rep = 1; rep <= reps; rep++) {
      const spent = await sumSpendTodayUsd()
      const pre = checkGateBeforeQuota({ hasApiKey: true, killSwitch: flags.killSwitch, dailySpendCapUsd: flags.dailySpendCapUsd, spentTodayUsd: spent })
      if (!pre.allow) { console.log(`\n막혔다 [${pre.rule}] ${pre.detail} — ${calls}회에서 멈춘다`); break outer }
      const budget = checkRunBudget(calls, runCap)
      if (!budget.allow) { console.log(`\n막혔다 [${budget.rule}] ${budget.detail}`); break outer }

      const outcome: TellV2Outcome = await judgeTellV2With(callGemini, c.text.trim(), model)
      calls++
      if (!(await logUsage(admin, outcome))) break outer

      let verdict: (typeof results)[number]['verdict']
      let overlap: boolean | null = null
      if (!outcome.ok || !outcome.observation) {
        verdict = (outcome.error ?? 'call_failed') as (typeof results)[number]['verdict']
      } else {
        verdict = verifyTellV2Judgment(c.text.trim(), outcome.observation).verdict
        if (verdict === 'tell_only') {
          // 겹침 — 이 문항의 forbidWords 가 답안 전체에서 이미 잡는가(세션
          // 47 2-2). AI 승격이 아니라 forbidWords 확장으로 될 자리인지 가른다.
          const forbidWords = meta.get(c.sourceKey)?.forbidWords ?? []
          overlap = forbidWords.some((w) => c.text.includes(w))
        }
      }
      results.push({ id: c.id, kind: c.kind, expected: c.expected, rep, verdict, overlap, costUsd: outcome.costUsd })
      console.log(`${String(calls).padStart(3)} ${c.id}/${c.kind} rep${rep}  ${verdict}${overlap !== null ? ` (forbidWords 겹침=${overlap})` : ''}  $${outcome.costUsd ?? '-'}`)

      if (outcome.error === 'call_failed' && calls === 1) {
        console.log('\n★ 첫 호출부터 못 나갔다. 설정 문제다 — 뒤를 안 돌린다.')
        break outer
      }
    }
  }

  const showRows = results.filter((r) => r.kind === 'show_good')
  const showFalsePos = showRows.filter((r) => r.verdict !== 'not_tell_only').length
  const hardRows = results.filter((r) => r.kind === 'tell_sample' && r.expected === 'tell')
  const hardMissed = hardRows.filter((r) => r.verdict !== 'tell_only').length
  const boundaryRows = results.filter((r) => r.kind === 'tell_sample' && r.expected === null)
  const cost = results.reduce((s, r) => s + (r.costUsd ?? 0), 0)
  console.log(`\n[set D tell-v2] good(false) ${showRows.length}건 오탐 ${showFalsePos} · tell 표본(하드) ${hardRows.length}건 미검출 ${hardMissed} · 경계 ${boundaryRows.length}건(분포만) · 비용 $${cost.toFixed(6)}`)

  // 겹침 집계(세션 47 2-2) — tell_only 로 잡힌 표본 중 forbidWords 가 이미
  // 잡는 것의 비율 · 안 겹치는 표본 목록(그게 tell-v2 의 값 — STATUS 판정선).
  const caught = results.filter((r) => r.verdict === 'tell_only')
  const overlapping = caught.filter((r) => r.overlap === true)
  const nonOverlapping = caught.filter((r) => r.overlap === false)
  console.log(
    `겹침 — tell_only ${caught.length}건 중 forbidWords 겹침 ${overlapping.length}건(${caught.length > 0 ? ((overlapping.length / caught.length) * 100).toFixed(1) : '-'}%) · ` +
      `안 겹침 ${nonOverlapping.length}건`
  )
  if (nonOverlapping.length > 0) {
    const byId = new Map<string, number>()
    for (const r of nonOverlapping) byId.set(r.id, (byId.get(r.id) ?? 0) + 1)
    console.log('  안 겹치는 표본(그게 tell-v2 의 값 — gating 검토 대상):')
    for (const [id, n] of byId) console.log(`    ${id}: ${n}회`)
  }

  const byId2 = new Map<string, typeof boundaryRows>()
  for (const r of boundaryRows) byId2.set(r.id, [...(byId2.get(r.id) ?? []), r])
  for (const [id, list] of byId2) {
    const counts = new Map<string, number>()
    for (const r of list) counts.set(r.verdict, (counts.get(r.verdict) ?? 0) + 1)
    const dist = [...counts.entries()].map(([v, n]) => `${v} ${n}`).join(' · ')
    console.log(`    경계 '${id}': ${list.length}회 분포 — ${dist}`)
  }

  writeFileSync(out, JSON.stringify({
    model, reps, promptVersion: PROMPT_VERSION_TELL_V2, results,
    showFalsePos, hardMissed, overlapCount: overlapping.length, nonOverlapCount: nonOverlapping.length, cost,
  }, null, 2))
  console.log(`결과를 ${out} 에 적었다.`)
  console.log('판정선(STATUS): 겹침이 대부분이면 forbidWords 확장, 안 겹치는 게 있으면 그 목록으로 gating 여부를 정한다.')
}

// ── tell 골든(세션 45) ────────────────────────────────────────────────
async function runTellGolden(
  admin: ReturnType<typeof createAdminClient>,
  flags: Awaited<ReturnType<typeof readFlags>>,
  reps: number,
  model: string,
  out: string
) {
  const cases = loadTellCases()
  const totalCalls = cases.length * reps
  const runCap = Number(arg('cap', String(totalCalls)))
  const showGood = cases.filter((c) => c.kind === 'show_good')
  const tellSamples = cases.filter((c) => c.kind === 'tell_sample')
  console.log(`\nset D(tell) good(show 기대) ${showGood.length} · tell 표본 ${tellSamples.length}(경계 포함) · 반복 ${reps}회 · 모델 ${model} · 이 실행 상한 ${runCap}회`)
  for (const c of tellSamples) {
    if (c.expected === null && c.note) console.log(`  ★ ${c.id}(경계 표본): ${c.note}`)
  }

  const results: { id: string; kind: TellCase['kind']; expected: TellCase['expected']; rep: number; verdict: TellVerdict | 'call_failed' | 'not_json' | 'bad_shape'; costUsd: number | null }[] = []
  let calls = 0

  outer: for (const c of cases) {
    for (let rep = 1; rep <= reps; rep++) {
      const spent = await sumSpendTodayUsd()
      const pre = checkGateBeforeQuota({ hasApiKey: true, killSwitch: flags.killSwitch, dailySpendCapUsd: flags.dailySpendCapUsd, spentTodayUsd: spent })
      if (!pre.allow) { console.log(`\n막혔다 [${pre.rule}] ${pre.detail} — ${calls}회에서 멈춘다`); break outer }
      const budget = checkRunBudget(calls, runCap)
      if (!budget.allow) { console.log(`\n막혔다 [${budget.rule}] ${budget.detail}`); break outer }

      const outcome: TellOutcome = await judgeTellWith(callGemini, c.text.trim(), model)
      calls++
      if (!(await logUsage(admin, outcome))) break outer

      let verdict: (typeof results)[number]['verdict']
      if (!outcome.ok || !outcome.observation) {
        verdict = (outcome.error ?? 'call_failed') as (typeof results)[number]['verdict']
      } else {
        verdict = verifyTellJudgment(c.text.trim(), outcome.observation).verdict
      }
      results.push({ id: c.id, kind: c.kind, expected: c.expected, rep, verdict, costUsd: outcome.costUsd })
      console.log(`${String(calls).padStart(3)} ${c.id}/${c.kind} rep${rep}  ${verdict}  $${outcome.costUsd ?? '-'}`)

      if (outcome.error === 'call_failed' && calls === 1) {
        console.log('\n★ 첫 호출부터 못 나갔다. 설정 문제다 — 뒤를 안 돌린다.')
        break outer
      }
    }
  }

  const showRows = results.filter((r) => r.kind === 'show_good')
  const showFalsePos = showRows.filter((r) => r.verdict !== 'show').length
  const hardRows = results.filter((r) => r.kind === 'tell_sample' && r.expected === 'tell')
  const hardMissed = hardRows.filter((r) => r.verdict !== 'tell').length
  const boundaryRows = results.filter((r) => r.kind === 'tell_sample' && r.expected === null)
  const cost = results.reduce((s, r) => s + (r.costUsd ?? 0), 0)
  console.log(`\n[set D] good(show) ${showRows.length}건 오탐 ${showFalsePos} · tell 표본(하드) ${hardRows.length}건 미검출 ${hardMissed} · 경계 ${boundaryRows.length}건(판정선 미정 — 분포만) · 비용 $${cost.toFixed(6)}`)

  const byId = new Map<string, typeof boundaryRows>()
  for (const r of boundaryRows) byId.set(r.id, [...(byId.get(r.id) ?? []), r])
  for (const [id, list] of byId) {
    const counts = new Map<string, number>()
    for (const r of list) counts.set(r.verdict, (counts.get(r.verdict) ?? 0) + 1)
    const dist = [...counts.entries()].map(([v, n]) => `${v} ${n}`).join(' · ')
    console.log(`    경계 '${id}': ${list.length}회 분포 — ${dist}`)
  }

  writeFileSync(out, JSON.stringify({ model, reps, promptVersion: PROMPT_VERSION_TELL, results, showFalsePos, hardMissed, cost }, null, 2))
  console.log(`결과를 ${out} 에 적었다.`)
  console.log('판정선(STATUS): good(show) 오탐 0 이고 하드 표본 미검출 0 이면 bt- 5건 tell 실사용으로.')
}

// ── support 골든(set A·B·C) ──────────────────────────────────────────
async function runSupportGolden(
  admin: ReturnType<typeof createAdminClient>,
  flags: Awaited<ReturnType<typeof readFlags>>,
  reps: number,
  model: string,
  out: string,
  only: string,
  domainArg: string,
  domainFor: (c: Case) => SupportDomain,
  promptVersionFor: (domain: SupportDomain) => string
) {
  const useCache = flag('use-cache')
  const cases = loadCases().filter((c) => only.includes(c.set))
  const setA = cases.filter((c) => c.set === 'A')
  const setB = cases.filter((c) => c.set === 'B')
  const setC = cases.filter((c) => c.set === 'C')
  const totalCalls = cases.length * reps
  const runCap = Number(arg('cap', String(totalCalls)))

  const countOf = (list: Case[], kind: Case['kind']) => list.filter((c) => c.kind === kind).length
  console.log(
    `set A(ch10) good ${countOf(setA, 'good')} · nak ${countOf(setA, 'nak')} · ` +
      `set B(bt-) good ${countOf(setB, 'good')} · nak ${countOf(setB, 'nak')} · no_beat ${countOf(setB, 'no_beat')} · ` +
      `set C(ca-) good ${countOf(setC, 'good')} · nak ${countOf(setC, 'nak')} · emotion ${countOf(setC, 'emotion')} · ` +
      `반복 ${reps}회 · 모델 ${model} · thinking ${THINKING_LEVEL}`
  )
  console.log(`도메인 set A=${setA.length > 0 ? domainArg : '-'} · set B=battle(고정) · set C=${setC.length > 0 ? domainArg : '-'} · --only ${only}`)
  console.log(`캐시 ${useCache ? '사용(--use-cache)' : '우회(기본)'} · 이 실행 상한 ${runCap}회`)
  // set B/C nak/no_beat 의 비통제 표시(note) — 결과를 읽기 전에 먼저 보여 둔다.
  for (const c of [...setB, ...setC]) {
    if (c.kind === 'nak' && c.note) console.log(`  ★ set ${c.set} '${c.itemId}' (통제 짝 표시): ${c.note}`)
  }

  const results: RunResult[] = []
  let calls = 0

  outer: for (const c of cases) {
    for (let rep = 1; rep <= reps; rep++) {
      const spent = await sumSpendTodayUsd()
      const pre = checkGateBeforeQuota({
        hasApiKey: true, killSwitch: flags.killSwitch,
        dailySpendCapUsd: flags.dailySpendCapUsd, spentTodayUsd: spent,
      })
      if (!pre.allow) {
        console.log(`\n막혔다 [${pre.rule}] ${pre.detail} — ${calls}회에서 멈춘다`)
        break outer
      }
      const budget = checkRunBudget(calls, runCap)
      if (!budget.allow) {
        console.log(`\n막혔다 [${budget.rule}] ${budget.detail}`)
        break outer
      }

      const normalized = c.text.trim()
      const domain = domainFor(c)
      const promptVersion = promptVersionFor(domain)
      let fromCache = false
      let outcome: SupportOutcome | null = null
      let cachedVerdict: SupportVerdict | null = null

      if (useCache) {
        const hash = createHash('sha256').update(`${normalized} ${c.itemId} ${promptVersion} ${model}`).digest('hex')
        const { data } = await admin.from('ai_shadow_cache').select('verdict').eq('hash', hash).maybeSingle()
        if (data) {
          fromCache = true
          cachedVerdict = data.verdict as SupportVerdict
        }
      }

      let verdict: RunResult['verdict']
      let costUsd: number | null = null

      if (fromCache && cachedVerdict) {
        verdict = cachedVerdict
      } else {
        outcome = await judgeSupportWith(callGemini, normalized, model, domain)
        calls++
        costUsd = outcome.costUsd
        if (!(await logUsage(admin, outcome))) break outer

        if (!outcome.ok || !outcome.observation) {
          verdict = (outcome.error ?? 'call_failed') as RunResult['verdict']
        } else {
          verdict = verifySupportJudgment(normalized, outcome.observation).verdict
        }
      }

      results.push({ set: c.set, itemId: c.itemId, kind: c.kind, rep, verdict, fromCache, costUsd, domain })
      console.log(
        `${String(calls).padStart(3)} ${c.set}/${c.itemId}/${c.kind} rep${rep} [${domain}]  ` +
          `${verdict}${fromCache ? ' (캐시)' : ''}  $${costUsd ?? '-'}`
      )

      if (!fromCache && outcome && outcome.error === 'call_failed' && calls === 1) {
        console.log('\n★ 첫 호출부터 못 나갔다. 설정 문제다 — 뒤를 안 돌린다.')
        break outer
      }
    }
  }

  // ── 집계. set A·B·C 분리 ──────────────────────────────────────────
  function summarize(set: 'A' | 'B' | 'C') {
    const rows = results.filter((r) => r.set === set)
    const good = rows.filter((r) => r.kind === 'good')
    const nak = rows.filter((r) => r.kind === 'nak')
    const noBeat = rows.filter((r) => r.kind === 'no_beat')
    // standoff·emotion(세션 42·45) — good/nak/no_beat 와 따로 센다. 판정선이
    // 아직 없어(박 님 확정 전) "미검출" 수는 안 낸다 — 건수·분포만 보여준다.
    const standoff = rows.filter((r) => r.kind === 'standoff')
    const emotion = rows.filter((r) => r.kind === 'emotion')
    // real_none(세션 49) — 박 님 실사용 표본. standoff·emotion 과 달리 기대
    // verdict('none')가 있다 — good/nak 과는 안 섞지만 "어긋남"은 낸다.
    const realNone = rows.filter((r) => r.kind === 'real_none')
    const falsePos = good.filter((r) => r.verdict !== 'buildup').length // 오탐: good인데 buildup 아님(no_beat 로 잘못 빠지는 것도 포함)
    const missed = nak.filter((r) => r.verdict === 'buildup').length // 미검출: nak인데 buildup
    // no_beat 미검출: 결정타가 없는 글인데 'no_beat' 가 아닌 다른 판정이 나온 것(세션 41 후속 2).
    const noBeatMissed = noBeat.filter((r) => r.verdict !== 'no_beat').length
    const realNoneMismatch = realNone.filter((r) => r.verdict !== 'none').length
    const mismatch = rows.filter((r) => r.verdict === 'beat_mismatch' || r.verdict === 'quote_mismatch').length
    const cost = rows.reduce((s, r) => s + (r.costUsd ?? 0), 0)

    // 뒤집힘: 같은 itemId+kind 의 reps 결과가 다 같지 않으면 1건
    const byItem = new Map<string, RunResult[]>()
    for (const r of rows) {
      const k = `${r.itemId}:${r.kind}`
      const list = byItem.get(k) ?? []
      list.push(r)
      byItem.set(k, list)
    }
    let flips = 0
    for (const list of byItem.values()) {
      const verdicts = new Set(list.map((r) => r.verdict))
      if (verdicts.size > 1) flips++
    }

    console.log(`\n[set ${set}] good ${good.length}건 오탐 ${falsePos} · nak ${nak.length}건 미검출 ${missed}` +
      (noBeat.length > 0 ? ` · no_beat ${noBeat.length}건 미검출 ${noBeatMissed}` : '') +
      (standoff.length > 0 ? ` · standoff ${standoff.length}건(판정선 미정 — 건수만)` : '') +
      (emotion.length > 0 ? ` · emotion ${emotion.length}건(판정선 미정 — 건수만)` : '') +
      (realNone.length > 0 ? ` · real_none ${realNone.length}건 어긋남 ${realNoneMismatch}` : '') +
      ` · beat/quote 불일치 ${mismatch} · 뒤집힘(항목) ${flips}/${byItem.size} · 비용 $${cost.toFixed(6)}`)

    // set B/C nak/no_beat/standoff/emotion 은 항목별 미검출·note·분포를
    // 결과 옆에 낸다 — 비통제 표시가 없으면 미검출·뒤집힘을 프롬프트
    // 결함으로 잘못 읽는다.
    if (set === 'B' || set === 'C') {
      const nakCasesById = new Map(cases.filter((c) => c.set === set && c.kind === 'nak').map((c) => [c.itemId, c]))
      for (const [k, list] of byItem) {
        if (!k.endsWith(':nak')) continue
        const itemId = k.slice(0, -':nak'.length)
        const itemMissed = list.filter((r) => r.verdict === 'buildup').length
        const note = nakCasesById.get(itemId)?.note
        console.log(`    nak '${itemId}': ${itemMissed}/${list.length}회 buildup(미검출)${note ? ` — ★ ${note}` : ''}`)
      }
    }
    if (set === 'B') {
      for (const [k, list] of byItem) {
        if (!k.endsWith(':no_beat')) continue
        const itemId = k.slice(0, -':no_beat'.length)
        const itemMissed = list.filter((r) => r.verdict !== 'no_beat').length
        console.log(`    no_beat '${itemId}': ${itemMissed}/${list.length}회 no_beat 아님(미검출)`)
      }
      // standoff(세션 42/43) — 기대 verdict 가 없다. "미검출" 수 대신 5회의
      // verdict 분포를 그대로 낸다 — no_beat 가 몇 회인지가 박 님의 판단 재료다.
      const standoffCasesById = new Map(cases.filter((c) => c.set === 'B' && c.kind === 'standoff').map((c) => [c.itemId, c]))
      for (const [k, list] of byItem) {
        if (!k.endsWith(':standoff')) continue
        const itemId = k.slice(0, -':standoff'.length)
        const counts = new Map<string, number>()
        for (const r of list) counts.set(r.verdict, (counts.get(r.verdict) ?? 0) + 1)
        const dist = [...counts.entries()].map(([v, n]) => `${v} ${n}`).join(' · ')
        const note = standoffCasesById.get(itemId)?.note
        console.log(`    standoff '${itemId}': ${list.length}회 분포 — ${dist}${note ? ` — ★ ${note}` : ''}`)
      }
      // real_none(세션 49) — 기대 verdict 'none'. no_beat 와 같은 자리로
      // "어긋남"(none 아님) 수를 낸다.
      const realNoneCasesById = new Map(cases.filter((c) => c.set === 'B' && c.kind === 'real_none').map((c) => [c.itemId, c]))
      for (const [k, list] of byItem) {
        if (!k.endsWith(':real_none')) continue
        const itemId = k.slice(0, -':real_none'.length)
        const itemMismatch = list.filter((r) => r.verdict !== 'none').length
        const note = realNoneCasesById.get(itemId)?.note
        console.log(`    real_none '${itemId}': ${itemMismatch}/${list.length}회 none 아님(어긋남)${note ? ` — ★ ${note}` : ''}`)
      }
    }
    if (set === 'C') {
      // emotion(세션 45) — ca-walk-home 하나뿐. 기대 verdict 없음, 분포만.
      const emotionCasesById = new Map(cases.filter((c) => c.set === 'C' && c.kind === 'emotion').map((c) => [c.itemId, c]))
      for (const [k, list] of byItem) {
        if (!k.endsWith(':emotion')) continue
        const itemId = k.slice(0, -':emotion'.length)
        const counts = new Map<string, number>()
        for (const r of list) counts.set(r.verdict, (counts.get(r.verdict) ?? 0) + 1)
        const dist = [...counts.entries()].map(([v, n]) => `${v} ${n}`).join(' · ')
        const note = emotionCasesById.get(itemId)?.note
        console.log(`    emotion '${itemId}': ${list.length}회 분포 — ${dist}${note ? ` — ★ ${note}` : ''}`)
      }
    }
    return { set, good: good.length, falsePos, nak: nak.length, missed, noBeat: noBeat.length, noBeatMissed, standoff: standoff.length, emotion: emotion.length, realNone: realNone.length, realNoneMismatch, mismatch, flips, itemCount: byItem.size, cost }
  }
  const summaryA = setA.length > 0 ? summarize('A') : null
  const summaryB = setB.length > 0 ? summarize('B') : null
  const summaryC = setC.length > 0 ? summarize('C') : null

  // promptVersion 은 이제 domain 마다 다르다(세션 43) — 결과 파일엔 실행에
  // 실제로 쓰인 조합을 둘 다 적는다. results 의 각 행은 domain 을 따로 갖는다.
  writeFileSync(out, JSON.stringify({
    model, reps, only,
    promptVersionBattle: PROMPT_VERSION_SUPPORT,
    promptVersionGeneral: PROMPT_VERSION_SUPPORT_GENERAL,
    domainArg,
    results, summaryA, summaryB, summaryC,
  }, null, 2))
  console.log(`\n결과를 ${out} 에 적었다.`)
  console.log('판정선(STATUS): set A·B·C 오탐 0 이고 미검출이 낮으면 → 다음 세션 실사용/확장 결정.')
  console.log('집합끼리 갈리면 문체를 재는 것 — 프롬프트 재검토.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
