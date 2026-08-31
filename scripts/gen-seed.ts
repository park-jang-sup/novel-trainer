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
import { createHash } from 'node:crypto'
import path from 'node:path'
import { sqlStr, countRawNewlinesInStrings } from '../lib/seed-sql'
import { deriveFillParts, fillMarkerMismatch } from '../lib/scoring/fill'

interface DumpStage {
  title: string
  track: string
  is_free: boolean
  summary: string
  order_no: number
  skill_key: string
  // stage2 자기점검 문구(재설계안 11-2). 단계마다 다르다 — reduce_adverb 는
  // 한 줄, action_reason 은 두 줄, 나머지는 빈 배열(자기점검 칸이 안 뜬다).
  self_checks: string[]
  // 단계 도입문. (레거시) 남기되 값은 전부 '' — 화면은 coach_* 를 쓴다.
  intro: string
  // 코치 캐릭터 말풍선. coach_intro 는 단계 목록, coach_line 은 문항 화면.
  // 문장 트랙 10단계만 채우고 나머지는 ''.
  coach_intro: string
  coach_line: string
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

// fill 문항의 모범답안. problem_answers 가 아니다 — 채점 정답이 아니라
// stage2 자기점검이 화면에 보여줄 것이다(재설계안 11-2 4번). ord 는 답안
// 세트 번호(7-10-2 의 가·나·다 = 1·2·3), 한 세트 안에서 빈칸마다 한 줄.
interface DumpReference {
  source_key: string
  ord: number
  blank_key: string
  content: string
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
  reference?: DumpReference[]
}

interface DumpDeactivate {
  note: string
  source_keys: string[]
}

const ROOT = path.join(__dirname, '..')

// Node는 BOM을 자동으로 제거하지 않는다. JSON.parse가 BOM 앞에서 죽는다.
function readJson<T>(relPath: string): T {
  const raw = readFileSync(path.join(ROOT, relPath), 'utf8').replace(/^\uFEFF/, '')
  return JSON.parse(raw) as T
}

// 문자열 리터럴은 전부 lib/seed-sql.ts 의 sqlStr 을 통과시킨다.

// jsonb 컬럼도 같은 헬퍼로 이스케이프한 뒤 ::jsonb를 붙인다.
function sqlJsonb(value: unknown): string {
  if (value === null || value === undefined) return 'null'
  return `${sqlStr(JSON.stringify(value))}::jsonb`
}

function sqlBool(value: boolean): string {
  return value ? 'true' : 'false'
}

// text[] 리터럴. 빈 배열도 명시적으로 타입을 붙인다 — array[] 만으로는
// Postgres 가 타입을 못 정해 do update 에서 죽는다.
function sqlTextArray(items: string[]): string {
  if (items.length === 0) return 'array[]::text[]'
  return `array[${items.map(sqlStr).join(', ')}]::text[]`
}

function sqlInt(value: number): string {
  if (!Number.isInteger(value)) {
    throw new Error(`정수가 아닌 값을 SQL 정수 자리에 쓰려고 했다: ${value}`)
  }
  return String(value)
}

// Postgres의 md5(text)와 같은 해시가 나와야 한다 — 둘 다 UTF-8 바이트를 본다.
function md5Hex(value: string): string {
  return createHash('md5').update(value, 'utf8').digest('hex')
}

// 오염된 파일은 아예 쓰지 않는다. 나가서 붙여 넣힌 뒤에 아는 것보다 낫다.
function assertNoRawNewlines(name: string, sql: string): void {
  const { count, lines } = countRawNewlinesInStrings(sql)
  if (count > 0) {
    throw new Error(
      `${name}: 문자열 리터럴 안에 실제 줄바꿈이 ${count}개 있다 ` +
        `(행 ${lines.slice(0, 10).join(', ')}${lines.length > 10 ? ' …' : ''}). ` +
        'sqlStr 을 거치지 않고 문자열을 이어붙인 자리가 있다.'
    )
  }
}

const stages = readJson<DumpStage[]>('seed/dump/stages.json')
const problems = readJson<DumpProblem[]>('seed/dump/problems.json')
const { golden, answers, reference = [] } = readJson<DumpAnswers>('seed/dump/answers.json')
const deactivate = readJson<DumpDeactivate>('seed/dump/deactivate.json')

// ── fill: scoring_config.fixedLines 를 passage 에서 만든다 ────────────────
//
// fixedLines 는 시드 JSON 에 손으로 적지 않는다(재설계안 11-3). passage 의
// 힌트 줄([상황] 등)도 빈칸 표식(①②)도 아닌 줄이 fixedLines 다. 여기서
// 한 번 주입하면 seed_data.sql 과 seed_check.sql 의 expect 가 같은 값을 본다.
for (const p of problems) {
  if (p.type !== 'fill') continue
  const blanks = (p.scoring_config.blanks ?? []) as { key: string }[]
  const keys = blanks.map((b) => b.key)
  if ('fixedLines' in p.scoring_config) {
    throw new Error(
      `fill 문항 ${p.source_key}: fixedLines 를 JSON 에 손으로 적지 마라 — gen-seed 가 passage 에서 만든다`
    )
  }
  const mismatch = fillMarkerMismatch(p.passage ?? '', keys)
  if (mismatch) {
    throw new Error(`fill 문항 ${p.source_key}: 빈칸과 passage 표식이 안 맞는다 — ${mismatch}`)
  }
  const { fixedLines } = deriveFillParts(p.passage ?? '')
  if (fixedLines.length < 2) {
    throw new Error(`fill 문항 ${p.source_key}: 고정 줄이 ${fixedLines.length}개뿐이다`)
  }
  p.scoring_config = { ...p.scoring_config, fixedLines }
}

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
const referenceSorted = [...reference].sort(
  (a, b) => bySourceKeyRank(a, b) || a.ord - b.ord || a.blank_key.localeCompare(b.blank_key)
)

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
  '--',
  '-- 마지막 문장이 select인 것은 의도다. Supabase 편집기가 NOTICE를',
  '-- 안 띄워서, raise notice로 끝내면 "통과"와 "파일이 잘려 안 돌았다"가',
  "-- 둘 다 'Success. No rows returned'로 보인다. 행이 나오면 끝까지 돈 것이다.",
  '-- 이 select 뒤에 다른 문장을 두지 마라 — 편집기는 마지막 결과만 보여준다.',
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
    'insert into stages',
    '  (track, order_no, title, skill_key, summary, is_free, self_checks, intro, coach_intro, coach_line)',
    `values (${sqlStr(s.track)}, ${sqlInt(s.order_no)}, ${sqlStr(s.title)}, ${sqlStr(s.skill_key)},`,
    `        ${sqlStr(s.summary)}, ${sqlBool(s.is_free)}, ${sqlTextArray(s.self_checks)}, ${sqlStr(s.intro)},`,
    `        ${sqlStr(s.coach_intro)}, ${sqlStr(s.coach_line)})`,
    'on conflict (skill_key) do update set',
    '  track = excluded.track,',
    '  order_no = excluded.order_no,',
    '  title = excluded.title,',
    '  summary = excluded.summary,',
    '  is_free = excluded.is_free,',
    '  self_checks = excluded.self_checks,',
    '  intro = excluded.intro,',
    '  coach_intro = excluded.coach_intro,',
    '  coach_line = excluded.coach_line;',
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

out.push(
  '-- ── fill 모범답안 ──────────────────────────────────────────────────',
  '--',
  '-- problem_answers 가 아니다 — 채점 정답이 아니라 stage2 자기점검이',
  '-- 화면에 보여줄 것이다(재설계안 11-2 4번). RLS 는 seed_schema.sql 이',
  '-- 건다: 그 문항에 제출 기록이 있는 학습자만 읽는다.',
  ''
)
for (const r of referenceSorted) {
  out.push(
    `-- ${r.source_key} ord ${r.ord} ${r.blank_key}`,
    'insert into reference_answers (problem_id, ord, blank_key, content)',
    `select p.id, ${sqlInt(r.ord)}, ${sqlStr(r.blank_key)}, ${sqlStr(r.content)}`,
    'from problems p',
    `where p.source_key = ${sqlStr(r.source_key)}`,
    'on conflict (problem_id, ord, blank_key) do nothing;',
    ''
  )
}

out.push(
  '-- ── 비활성 ─────────────────────────────────────────────────────────',
  `-- ${deactivate.note}`,
  ''
)
if (deactivate.source_keys.length > 0) {
  out.push(
    'update problems set is_active = false',
    ` where source_key in (${deactivate.source_keys.map((k) => sqlStr(k)).join(', ')});`,
    ''
  )
}

out.push('commit;', '')

// 다음에 무엇을 할지 사람이 보는 자리에 뜬다. Supabase 편집기는 NOTICE를
// 안 띄우므로 select로 낸다 — 행이 나오면 commit;까지 끝까지 돈 것이다.
// commit; 뒤에 둔다. 트랜잭션 안이면 롤백 시 이 결과 자체가 사라진다.
out.push(
  "select '시드 적용 완료. 다음: seed_check.sql' as 결과,",
  '       (select count(*) from problems) as 문항수,',
  '       (select count(*) from stages) as 단계수;',
  ''
)

const sql = out.join('\n')
assertNoRawNewlines('seed_data.sql', sql)
writeFileSync(path.join(ROOT, 'seed_data.sql'), sql, 'utf8')

console.log(
  `seed_data.sql 생성 완료 — 단계 ${stagesSorted.length}개, ` +
    `문항 ${problemsSorted.length}개, 정답 ${answersSorted.length}개, ` +
    `골든셋 ${goldenSorted.length}개, 모범답안 ${referenceSorted.length}행, ` +
    `비활성 ${deactivate.source_keys.length}건`
)

// ── seed_check.sql: 덤프 ↔ DB 대조 ────────────────────────────────────
//
// 같은 덤프(problemsSorted)에서 만드므로 seed_data.sql과 갈릴 수 없다.
// 지시문/원문을 md5+길이로, scoring_config를 jsonb로 대조한다. 저장소
// 사본끼리(test:scoring)는 이미 맞춰 봤다 — 이건 그 사본이 DB에 실제로
// 들어갔는지를 잰다.
const checkOut: string[] = []

checkOut.push(
  '-- 자동 생성 파일. 직접 고치지 말 것.',
  '-- 원본: seed/dump/problems.json',
  '-- 재생성: npm run gen:seed',
  '--',
  '-- 적용 순서: seed_schema.sql → seed_data.sql → 이 파일 → seed_verify.sql',
  '--',
  '-- 이 파일은 덤프와 DB를 대조한다. seed_verify.sql은 DB 안에서 닫힌',
  '-- 불변식을 잰다 — 다른 일이라 파일을 나눈다.',
  '-- 아무것도 바꾸지 않는다.',
  '--',
  '-- md5만으로는 "다르다"만 알고 무엇이 다른지 모른다. 길이가 함께 있으면',
  '-- 214 vs 206처럼 CRLF 오염이 즉시 드러난다. 이번 세션에 그것 때문에',
  '-- 한참 걸렸다.',
  '--',
  '-- scoring_config는 md5를 쓰지 않는다. jsonb끼리 is distinct from으로',
  '-- 비교한다 — 키 순서와 공백이 무관해진다. md5를 쓰려면 양쪽이 똑같은',
  '-- 정규화 문자열을 만들어야 하는데 배열 표기(["a", "b"] vs ["a","b"])',
  '-- 에서 갈려 거짓 경보가 난다.',
  '--',
  '-- expect는 CTE가 아니라 임시 테이블이다. CTE는 그것이 붙은 statement',
  '-- 하나에만 유효해서, 검사 넷을 한 do 블록 안에서 나눠 적으려면 매번',
  `-- ${problemsSorted.length}행짜리 values를 다시 적어야 한다. 임시 테이블로 한 번만 채운다.`,
  '--',
  '-- 마지막 문장이 select인 것은 의도다. Supabase 편집기가 NOTICE를',
  '-- 안 띄워서, raise notice로 끝내면 "통과"와 "파일이 잘려 안 돌았다"가',
  "-- 둘 다 'Success. No rows returned'로 보인다. 행이 나오면 끝까지 돈 것이다.",
  '-- 이 select 뒤에 다른 문장을 두지 마라 — 편집기는 마지막 결과만 보여준다.',
  '-- do 블록 안의 raise notice는 지우지 않는다. psql로 돌리는 사람에게는',
  '-- 그쪽이 보인다.',
  '--',
  "-- Supabase 편집기가 'destructive / RLS 없는 테이블' 경고를 띄운다.",
  '-- Run without RLS를 누르면 된다. drop 대상은 이 파일이 만든 임시 테이블',
  '-- 뿐이고, temporary table은 pg_temp에 있어 anon·authenticated가 볼 수',
  '-- 없다. Run and enable RLS는 임시 테이블에 RLS를 걸려다 검사가 엉뚱하게',
  '-- 죽을 수 있으니 누르지 마라.',
  ''
)

checkOut.push(
  'drop table if exists expect;',
  '',
  'create temporary table expect (',
  '  source_key text,',
  '  instr_md5 text,',
  '  instr_len int,',
  '  pass_md5 text,',
  '  pass_len int,',
  '  cfg jsonb',
  ');',
  '',
  'insert into expect (source_key, instr_md5, instr_len, pass_md5, pass_len, cfg) values'
)

// passage가 null인 문항은 pass_md5·pass_len도 null이어야 한다 — coalesce로
// 빈 문자열을 씌우면 "null인 것"과 "빈 문자열인 것"이 구분 안 된다.
const expectRows = problemsSorted.map((p) => {
  const instrMd5 = sqlStr(md5Hex(p.instruction))
  const instrLen = sqlInt(p.instruction.length)
  const passMd5 = p.passage === null ? 'null' : sqlStr(md5Hex(p.passage))
  const passLen = p.passage === null ? 'null' : sqlInt(p.passage.length)
  const cfg = sqlJsonb(p.scoring_config)
  return `  (${sqlStr(p.source_key)}, ${instrMd5}, ${instrLen}, ${passMd5}, ${passLen}, ${cfg})`
})
checkOut.push(expectRows.join(',\n') + ';', '')

checkOut.push(
  'do $$',
  'declare v_bad text; v_cnt int;',
  'begin',
  '  -- (1) 덤프에는 있는데 DB에 없는 문항.',
  "  select string_agg(e.source_key, ', ') into v_bad",
  '    from expect e',
  '   where not exists (select 1 from problems p where p.source_key = e.source_key);',
  '  if v_bad is not null then',
  "    raise exception '[대조] 덤프에는 있는데 DB에 없음: %', v_bad;",
  '  end if;',
  '',
  '  -- (2) DB에는 있는데 덤프에 없는 문항. expect는 덤프에서 왔으니',
  '  --     반대 방향은 problems 쪽에서 따로 훑어야 한다.',
  "  select string_agg(p.source_key, ', ') into v_bad",
  '    from problems p',
  '   where p.source_key is not null',
  '     and not exists (select 1 from expect e where e.source_key = p.source_key);',
  '  if v_bad is not null then',
  "    raise exception '[대조] DB에는 있는데 덤프에 없음: %', v_bad;",
  '  end if;',
  '',
  '  -- (3) instruction/passage가 어긋난 문항. 어느 필드인지와 길이를 함께',
  '  --     낸다 — 214 vs 206처럼 CRLF 오염이 여기서 드러난다. md5가',
  '  --     is distinct from이므로 한쪽만 null이어도(passage 유무가 갈려도)',
  '  --     정확히 잡힌다.',
  '  select string_agg(',
  "           p.source_key || '(' || array_to_string(array_remove(array[",
  "             case when md5(p.instruction) is distinct from e.instr_md5",
  "                  then 'instruction ' || e.instr_len || '→' || length(p.instruction) end,",
  "             case when md5(p.passage) is distinct from e.pass_md5",
  "                  then 'passage ' || coalesce(e.pass_len::text, 'null') || '→' ||",
  "                       coalesce(length(p.passage)::text, 'null') end",
  "           ], null), ', ') || ')', ', '",
  '         ) into v_bad',
  '    from problems p',
  '    join expect e on e.source_key = p.source_key',
  '   where md5(p.instruction) is distinct from e.instr_md5',
  '      or md5(p.passage) is distinct from e.pass_md5;',
  '  if v_bad is not null then',
  "    raise exception '[대조] instruction/passage 가 어긋남: %', v_bad;",
  '  end if;',
  '',
  '  -- (4) scoring_config가 어긋난 문항.',
  "  select string_agg(p.source_key, ', ') into v_bad",
  '    from problems p',
  '    join expect e on e.source_key = p.source_key',
  '   where p.scoring_config is distinct from e.cfg;',
  '  if v_bad is not null then',
  "    raise exception '[대조] scoring_config 가 어긋남: %', v_bad;",
  '  end if;',
  '',
  '  -- (5) fill 문항: scoring_config.blanks 의 모든 key 가 passage 에 제 줄로',
  '  --     있어야 한다. 빈칸과 지문 표식이 갈리면 화면이 못 그린다(재설계안 11-5).',
  "  select string_agg(p.source_key || ' (' || k.key || ')', ', ') into v_bad",
  '    from problems p',
  '    cross join lateral jsonb_to_recordset(',
  "           coalesce(p.scoring_config->'blanks', '[]'::jsonb)) as k(key text)",
  "   where p.type = 'fill'",
  "     and strpos(E'\\n' || p.passage || E'\\n', E'\\n' || k.key || E'\\n') = 0;",
  '  if v_bad is not null then',
  "    raise exception '[대조 5] fill blanks 키가 지문에 줄로 없음: %', v_bad;",
  '  end if;',
  '',
  '  -- (5b) fill 문항: 지문의 표식 줄(①②③ …만 있는 줄) 수가 blanks 개수와 같아야',
  '  --      한다. (5)와 함께면 선언한 key 가 지문에 딱 그만큼 있다는 뜻이 된다.',
  '  select string_agg(',
  "           p.source_key || ' (표식 ' || m.n || ' / 빈칸 ' ||",
  "           jsonb_array_length(coalesce(p.scoring_config->'blanks', '[]'::jsonb)) || ')', ', '",
  '         ) into v_bad',
  '    from problems p',
  '    cross join lateral (',
  "           select count(*) filter (where trim(line) ~ '^[①-⑳]$') as n",
  "             from regexp_split_to_table(coalesce(p.passage, ''), E'\\n') as line",
  '         ) m',
  "   where p.type = 'fill'",
  "     and m.n <> jsonb_array_length(coalesce(p.scoring_config->'blanks', '[]'::jsonb));",
  '  if v_bad is not null then',
  "    raise exception '[대조 5b] fill 표식 줄 수 ≠ 빈칸 수: %', v_bad;",
  '  end if;',
  '',
  '  -- (6) reference_answers 에 SELECT 정책이 있어야 한다. 없으면 모범답안이',
  '  --     제출 전 학습자에게 새거나(정책 없이 GRANT 만) 0행으로만 온다.',
  '  if not exists (',
  '    select 1 from pg_policies',
  "     where schemaname = 'public' and tablename = 'reference_answers' and cmd = 'SELECT'",
  '  ) then',
  "    raise exception '[대조 6] reference_answers 에 SELECT 정책이 없다';",
  '  end if;',
  '',
  '  select count(*) into v_cnt from expect;',
  "  raise notice '덤프 ↔ DB 대조 통과. 문항 % 개', v_cnt;",
  'end $$;',
  '',
  'drop table expect;',
  '',
  "select '덤프 ↔ DB 대조 통과' as 결과, count(*) as 문항수 from problems;",
  ''
)

const checkSql = checkOut.join('\n')
assertNoRawNewlines('seed_check.sql', checkSql)
writeFileSync(path.join(ROOT, 'seed_check.sql'), checkSql, 'utf8')

console.log(
  `seed_check.sql 생성 완료 — 문항 ${problemsSorted.length}개, ` +
    `${(Buffer.byteLength(checkSql, 'utf8') / 1024).toFixed(1)}KB`
)
