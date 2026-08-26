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

// Postgres의 md5(text)와 같은 해시가 나와야 한다 — 둘 다 UTF-8 바이트를 본다.
function md5Hex(value: string): string {
  return createHash('md5').update(value, 'utf8').digest('hex')
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

// 다음에 무엇을 할지 사람이 보는 자리에 뜬다. 그리고 이 notice가 안 뜨면
// 파일이 끝까지 안 돈 것이다 — stages만 들어가고 문항이 통째로 빠졌을 때
// (붙여넣다 잘린 seed_data.sql) 이 줄이 있었으면 즉시 알았다.
out.push(
  "do $$ begin raise notice '완료. 이제 seed_check.sql 을 돌려라 (덤프 ↔ DB 대조).'; end $$;",
  ''
)

const sql = out.join('\n')
writeFileSync(path.join(ROOT, 'seed_data.sql'), sql, 'utf8')

console.log(
  `seed_data.sql 생성 완료 — 단계 ${stagesSorted.length}개, ` +
    `문항 ${problemsSorted.length}개, 정답 ${answersSorted.length}개, ` +
    `골든셋 ${goldenSorted.length}개`
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
  '  select count(*) into v_cnt from expect;',
  "  raise notice '덤프 ↔ DB 대조 통과. 문항 % 개', v_cnt;",
  'end $$;',
  '',
  'drop table expect;',
  ''
)

const checkSql = checkOut.join('\n')
writeFileSync(path.join(ROOT, 'seed_check.sql'), checkSql, 'utf8')

console.log(
  `seed_check.sql 생성 완료 — 문항 ${problemsSorted.length}개, ` +
    `${(Buffer.byteLength(checkSql, 'utf8') / 1024).toFixed(1)}KB`
)
