// seed/dump/*.json (단계·문항의 단일 출처)에서 seed_data.sql을 생성한다.
//
// 실행: npm run gen:seed
// 적용 순서: seed_schema.sql → seed_data.sql(이 파일이 만든다) → seed_verify.sql
//
// 왜 JSON이 단일 출처인가:
//   문항과 단계를 DB에서 직접 만들다 보니 저장소(seed_all.sql)와 DB가
//   갈라졌다 — adverb_exception 단계가 DB에만 있고, 그 뒤 단계들의
//   order_no 도 하나씩 밀렸다. seed/dump/*.json은 그 DB를 그대로 뽑은
//   것이고, 사람이 이 JSON을 손으로 고치지 않는다. 여기서는 그것을
//   그대로 SQL로 옮기기만 한다.
//
// 왜 파일에 직접 쓰는가 (stdout 리다이렉트를 쓰지 않는가):
//   `npm run gen:seed > seed_convert.sql` 로 만들던 시절, npm 자체 배너가
//   출력 1~4행에 섞여 들어가 psql에서 문법 오류가 났다. writeFileSync로
//   스크립트가 파일을 직접 쓰면 npm의 stdout이 파일에 섞일 여지가 없다.

import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

interface DumpStage {
  title: string
  track: string
  is_free: boolean
  summary: string
  order_no: number
  skill_key: string
}

interface DumpProblem {
  type: string
  choices: string[] | null
  passage: string | null
  order_no: number
  tone_tag: string | null
  genre_tag: string | null
  skill_key: string
  difficulty: number
  source_key: string
  source_tag: string | null
  instruction: string
  scoring_mode: string
  scoring_config: Record<string, unknown>
}

interface DumpAnswer {
  source_key: string
  answer: Record<string, unknown>
}

interface DumpGolden {
  note: string | null
  content: string
  expected: boolean
  source_key: string
}

interface DumpAnswers {
  golden: DumpGolden[]
  answers: DumpAnswer[]
}

const ROOT = path.join(__dirname, '..')

// Node는 BOM을 자동으로 제거하지 않는다. JSON.parse가 BOM 앞에서 죽는다.
function readJson<T>(relPath: string): T {
  const raw = readFileSync(path.join(ROOT, relPath), 'utf8').replace(/^\uFEFF/, '')
  return JSON.parse(raw) as T
}

// 문자열 리터럴을 만드는 유일한 통로. 지문에 작은따옴표가 들어 있다
// (예: instruction의 '흥부는 기뻤다'). 직접 문자열을 이어붙이지 않고
// 전부 이 함수를 통과시켜 작은따옴표를 두 번 쓰는 방식으로 이스케이프한다.
function sqlStr(value: string | null | undefined): string {
  if (value === null || value === undefined) return 'null'
  return `'${value.replace(/'/g, "''")}'`
}

// jsonb 컬럼도 같은 헬퍼로 이스케이프한 뒤 ::jsonb를 붙인다.
function sqlJsonb(value: unknown): string {
  if (value === null || value === undefined) return 'null'
  return `${sqlStr(JSON.stringify(value))}::jsonb`
}

function sqlBool(value: boolean): string {
  return value ? 'true' : 'false'
}

function sqlInt(value: number): string {
  if (!Number.isInteger(value)) {
    throw new Error(`정수가 아닌 값을 SQL 정수 자리에 쓰려고 했다: ${value}`)
  }
  return String(value)
}

const stages = readJson<DumpStage[]>('seed/dump/stages.json')
const problems = readJson<DumpProblem[]>('seed/dump/problems.json')
const { golden, answers } = readJson<DumpAnswers>('seed/dump/answers.json')

// 트랙 순서는 원래 손으로 쓰던 목록(sentence → structure → start)을 그대로
// 따른다. order_no만으로는 트랙 간 순서를 알 수 없다 — sentence와 start는
// 둘 다 1부터 시작한다.
const TRACK_ORDER = ['sentence', 'structure', 'start']
const stagesSorted = [...stages].sort(
  (a, b) =>
    TRACK_ORDER.indexOf(a.track) - TRACK_ORDER.indexOf(b.track) ||
    a.order_no - b.order_no
)

// 출력 순서는 order_no, difficulty, source_key 순. 실행 순서와는 무관하지만
// (source_key로 매칭하므로 순서가 결과를 바꾸지 않는다) diff를 읽을 수 있어야 한다.
const problemsSorted = [...problems].sort(
  (a, b) =>
    a.order_no - b.order_no ||
    a.difficulty - b.difficulty ||
    a.source_key.localeCompare(b.source_key)
)

// 정답·골든셋도 같은 기준으로 정렬한다. 두 파일에는 order_no/difficulty가
// 없으므로 문항 쪽에서 가져온다.
const rankBySourceKey = new Map(
  problemsSorted.map((p, i) => [p.source_key, i])
)
function bySourceKeyRank<T extends { source_key: string }>(a: T, b: T): number {
  const ra = rankBySourceKey.get(a.source_key) ?? Infinity
  const rb = rankBySourceKey.get(b.source_key) ?? Infinity
  return ra - rb || a.source_key.localeCompare(b.source_key)
}
const answersSorted = [...answers].sort(bySourceKeyRank)
const goldenSorted = [...golden].sort(bySourceKeyRank)

const out: string[] = []

out.push(
  '-- 자동 생성 파일. 직접 고치지 말 것.',
  '-- 원본: seed/dump/*.json',
  '-- 재생성: npm run gen:seed',
  '--',
  '-- 적용 순서: seed_schema.sql → 이 파일 → seed_verify.sql',
  '--',
  '-- 재실행해도 안전하다. delete 문은 없다.',
  '-- 문항은 source_key로, 단계는 skill_key로 매칭한다. stages.id는 여기',
  '-- 박아 넣지 않는다. id와 order_no는 일치하지 않고, 재구축하면 id가',
  '-- 달라진다.',
  '',
  'begin;',
  '',
  '-- ── 단계 ────────────────────────────────────────────────────────────',
  '--',
  '-- (track, order_no)에 유니크 제약이 걸려 있다. 이 시드가 밀어 올리는',
  '-- 값(예: sensory가 5에서 6으로)을 한 번에 최종값으로 갱신하면, 아직',
  '-- 갱신되지 않은 다른 행이 지금 들고 있는 order_no와 충돌할 수 있다.',
  '-- 그래서 먼저 대상 행 전부를 order_no+1000으로 밀어 비켜 두고,',
  '-- 그다음에야 각 행을 최종 값으로 내린다.',
  '--',
  '-- on conflict (skill_key) do nothing을 쓰지 않는다 — 그러면 이미 있는',
  '-- 행의 order_no가 갱신되지 않아 지금과 같은 격차가 그대로 남는다.',
  '',
  'update stages set order_no = order_no + 1000',
  ` where skill_key in (${stagesSorted.map((s) => sqlStr(s.skill_key)).join(', ')});`,
  ''
)

for (const s of stagesSorted) {
  out.push(
    'insert into stages (track, order_no, title, skill_key, summary, is_free)',
    `values (${sqlStr(s.track)}, ${sqlInt(s.order_no)}, ${sqlStr(s.title)}, ${sqlStr(s.skill_key)},`,
    `        ${sqlStr(s.summary)}, ${sqlBool(s.is_free)})`,
    'on conflict (skill_key) do update set',
    '  track = excluded.track,',
    '  order_no = excluded.order_no,',
    '  title = excluded.title,',
    '  summary = excluded.summary,',
    '  is_free = excluded.is_free;',
    ''
  )
}

out.push('-- ── 문항 ────────────────────────────────────────────────────────────', '')

for (const p of problemsSorted) {
  out.push(`-- ${p.source_key} (order_no ${p.order_no}, difficulty ${p.difficulty})`)
  out.push(
    'insert into problems',
    '  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,',
    '   source_tag, genre_tag, tone_tag, difficulty, source_key)',
    'select',
    `  (select id from stages where skill_key = ${sqlStr(p.skill_key)}),`,
    `  ${sqlStr(p.type)}, ${sqlStr(p.scoring_mode)}, ${sqlStr(p.instruction)},`,
    `  ${sqlStr(p.passage)}, ${sqlJsonb(p.choices)}, ${sqlJsonb(p.scoring_config)},`,
    `  ${sqlStr(p.source_tag)}, ${sqlStr(p.genre_tag)}, ${sqlStr(p.tone_tag)},`,
    `  ${sqlInt(p.difficulty)}, ${sqlStr(p.source_key)}`,
    `where not exists (select 1 from problems p where p.source_key = ${sqlStr(p.source_key)});`,
    ''
  )
}

out.push('-- ── 정답 ────────────────────────────────────────────────────────────', '')

for (const a of answersSorted) {
  out.push(
    `-- ${a.source_key}`,
    'insert into problem_answers (problem_id, answer)',
    'select p.id, ' + sqlJsonb(a.answer),
    'from problems p',
    `where p.source_key = ${sqlStr(a.source_key)}`,
    'on conflict (problem_id) do nothing;',
    ''
  )
}

out.push('-- ── 골든셋 ──────────────────────────────────────────────────────────', '')

for (const g of goldenSorted) {
  out.push(
    `-- ${g.source_key}: ${g.note ?? ''}`,
    'insert into golden_cases (problem_id, content, expected, note)',
    `select p.id, ${sqlStr(g.content)}, ${sqlBool(g.expected)}, ${sqlStr(g.note)}`,
    'from problems p',
    `where p.source_key = ${sqlStr(g.source_key)}`,
    '  and not exists (',
    '    select 1 from golden_cases gc',
    `     where gc.problem_id = p.id and gc.content = ${sqlStr(g.content)}`,
    '  );',
    ''
  )
}

out.push('commit;', '')

const sql = out.join('\n')
writeFileSync(path.join(ROOT, 'seed_data.sql'), sql, 'utf8')

console.log(
  `seed_data.sql 생성 완료 — 단계 ${stagesSorted.length}개, ` +
    `문항 ${problemsSorted.length}개, 정답 ${answersSorted.length}개, ` +
    `골든셋 ${goldenSorted.length}개`
)
