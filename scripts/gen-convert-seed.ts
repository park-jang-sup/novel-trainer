// convert 문항 시드 SQL을 픽스처에서 생성한다.
//
// 실행: npm run gen:seed > seed_convert.sql
//
// 왜 생성하는가:
//   forbidWords를 SQL에 손으로 쓰면 불변식을 검사할 방법이 없다.
//   활용형 누락이 실제로 두 번 있었다 ("화가 났다"에 '화났'이 없었고,
//   "그리웠다"에 '그리워'가 걸리지 않았다).
//
// 왜 passage와 instruction까지 쓰는가:
//   불변식이 검사하는 것은 픽스처의 passage가 픽스처의 forbidWords에 걸리는가다.
//   scoring_config만 갱신하면, 지문을 픽스처에서 고쳤을 때
//   테스트는 새 지문 기준으로 통과하는데 DB에는 옛 지문이 남는다.
//   그러면 DB의 지문은 forbidWords에 안 걸리고, 테스트는 100건 통과하는데
//   프로덕션만 뚫려 있는 상태가 된다. 셋을 한 트랜잭션에서 함께 쓴다.

import { CONVERT_SEEDS } from '../lib/scoring/fixtures/convert-seeds'

const q = (s: string) => `'${s.replace(/'/g, "''")}'`

const out: string[] = [
  '-- 자동 생성 파일. 직접 고치지 말 것.',
  '-- 원본: lib/scoring/fixtures/convert-seeds.ts',
  '-- 재생성: npm run gen:seed > seed_convert.sql',
  '--',
  '-- 적용 순서: seed_patch_01 → seed_patch_02 → 이 파일',
  '-- 적용 전에 npm run test:scoring 이 통과해야 한다.',
  '',
  'begin;',
  '',
  '-- source_key: 지문에서 독립한 안정 식별자.',
  '-- 지문을 고쳐도 매칭이 깨지지 않게 한다.',
  'alter table problems add column if not exists source_key text;',
  'create unique index if not exists problems_source_key_uniq',
  '  on problems (source_key) where source_key is not null;',
  '',
  '-- 최초 1회 백필. 이미 값이 있으면 건드리지 않는다.',
]

// 백필은 현재 DB에 남아 있는 지문 기준으로 한 번만 수행한다.
const BACKFILL: Record<string, string> = {
  'sim-cheong-fear': '심청은 두려웠다',
  'heungbu-joy': '흥부는 기뻤다',
  'kongjwi-grief': '콩쥐는 서러웠다',
  'dragon-king-anger': '용왕은 화가 났다',
  'woodcutter-shame': '나무꾼은 부끄러웠다',
  'gyeonu-longing': '견우는 그리웠다',
}
for (const [key, needle] of Object.entries(BACKFILL)) {
  out.push(
    `update problems set source_key = ${q(key)}`,
    ` where type = 'convert' and source_key is null`,
    `   and passage like ${q('%' + needle + '%')};`
  )
}
out.push('')

for (const s of CONVERT_SEEDS) {
  const cfg = JSON.stringify({
    maxChars: s.maxChars,
    maxAdverbs: s.maxAdverbs,
    maxModifiers: s.maxModifiers,
    minVerbs: s.minVerbs,
    forbidWords: s.forbidWords,
  })
  out.push(
    `-- ${s.key}`,
    'update problems set',
    `      instruction    = ${q(s.instruction)},`,
    `      passage        = ${q(s.passage)},`,
    `      scoring_config = ${q(cfg)}::jsonb,`,
    `      genre_tag      = ${q(s.genre)},`,
    `      difficulty     = ${s.difficulty}`,
    ` where source_key = ${q(s.key)};`,
    ''
  )
}

// 적용 결과를 DB 안에서 검증한다. 깨지면 커밋되지 않는다.
out.push(
  '-- 백필과 갱신이 실제로 걸렸는지, 불변식이 지켜지는지 확인한다.',
  'do $$',
  'declare v_missing text; v_bad text;',
  'begin',
  "  select string_agg(k, ', ') into v_missing",
  `  from unnest(array[${CONVERT_SEEDS.map((s) => q(s.key)).join(', ')}]) k`,
  '  where not exists (select 1 from problems p where p.source_key = k);',
  '  if v_missing is not null then',
  "    raise exception '[시드] source_key 백필 실패: %. 지문이 예상과 다를 수 있다', v_missing;",
  '  end if;',
  '',
  '  -- 지문이 자기 forbidWords에 걸리지 않으면 지문 복사 제출이 통과한다',
  '  select string_agg(p.source_key, \', \') into v_bad',
  '    from problems p',
  "   where p.type = 'convert'",
  "     and p.scoring_config ? 'forbidWords'",
  '     and not exists (',
  '       select 1',
  "         from jsonb_array_elements_text(p.scoring_config->'forbidWords') w",
  "        where p.passage like '%' || w || '%'",
  '     );',
  '  if v_bad is not null then',
  "    raise exception '[시드] 지문이 자기 forbidWords에 걸리지 않음: %', v_bad;",
  '  end if;',
  '',
  "  raise notice '시드 적용 및 불변식 확인 완료';",
  'end $$;',
  '',
  'commit;',
  ''
)

console.log(out.join('\n'))
