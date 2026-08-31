-- 자동 생성 파일. 직접 고치지 말 것.
-- 원본: seed/dump/*.json
-- 재생성: npm run gen:seed
--
-- 적용 순서: seed_schema.sql → 이 파일 → seed_verify.sql
--
-- 재실행해도 안전하다. delete 문은 없다.
-- 문항은 source_key로, 단계는 skill_key로 매칭한다. stages.id는 여기
-- 박아 넣지 않는다. id와 order_no는 일치하지 않고, 재구축하면 id가
-- 달라진다.
--
-- 마지막 문장이 select인 것은 의도다. Supabase 편집기가 NOTICE를
-- 안 띄워서, raise notice로 끝내면 "통과"와 "파일이 잘려 안 돌았다"가
-- 둘 다 'Success. No rows returned'로 보인다. 행이 나오면 끝까지 돈 것이다.
-- 이 select 뒤에 다른 문장을 두지 마라 — 편집기는 마지막 결과만 보여준다.

begin;

-- ── 단계 ────────────────────────────────────────────────────────────
--
-- (track, order_no)에 유니크 제약이 걸려 있다. 이 시드가 밀어 올리는
-- 값(예: sensory가 5에서 6으로)을 한 번에 최종값으로 갱신하면, 아직
-- 갱신되지 않은 다른 행이 지금 들고 있는 order_no와 충돌할 수 있다.
-- 그래서 먼저 대상 행 전부를 order_no+1000으로 밀어 비켜 두고,
-- 그다음에야 각 행을 최종 값으로 내린다.
--
-- on conflict (skill_key) do nothing을 쓰지 않는다 — 그러면 이미 있는
-- 행의 order_no가 갱신되지 않아 지금과 같은 격차가 그대로 남는다.

update stages set order_no = order_no + 1000
 where skill_key in ('reduce_adverb', 'emotion_action', 'trim_padding', 'reduce_repeat', 'adverb_exception', 'sensory', 'rhythm', 'dialogue_ratio', 'pov_lock', 'action_reason', 'cliffhanger', 'action_turn', 'lack', 'contrast_char', 'likability', 'off_track', 'info_gap', 'cliffhanger_adv', 'reverse_design', 'first_hook', 'genre_coinage', 'branch_estimate', 'start_choose', 'start_write', 'start_extend', 'start_episode');

insert into stages (track, order_no, title, skill_key, summary, is_free, self_checks)
values ('sentence', 1, '부사 줄이기', 'reduce_adverb',
        '꾸미는 말을 걷어내고 동작으로 대신한다', true, array['부사가 하던 일을 동작이 하고 있는가']::text[])
on conflict (skill_key) do update set
  track = excluded.track,
  order_no = excluded.order_no,
  title = excluded.title,
  summary = excluded.summary,
  is_free = excluded.is_free,
  self_checks = excluded.self_checks;

insert into stages (track, order_no, title, skill_key, summary, is_free, self_checks)
values ('sentence', 2, '감정을 동작으로', 'emotion_action',
        '감정을 서술하지 않고 몸으로 드러낸다', true, array['이 동작만 보고도 무슨 감정인지 남이 맞힐 수 있는가']::text[])
on conflict (skill_key) do update set
  track = excluded.track,
  order_no = excluded.order_no,
  title = excluded.title,
  summary = excluded.summary,
  is_free = excluded.is_free,
  self_checks = excluded.self_checks;

insert into stages (track, order_no, title, skill_key, summary, is_free, self_checks)
values ('sentence', 3, '군더더기 빼기', 'trim_padding',
        '없어도 되는 문장을 알아본다', true, array['지운 문장 중에 이야기가 잃은 것이 있는가']::text[])
on conflict (skill_key) do update set
  track = excluded.track,
  order_no = excluded.order_no,
  title = excluded.title,
  summary = excluded.summary,
  is_free = excluded.is_free,
  self_checks = excluded.self_checks;

insert into stages (track, order_no, title, skill_key, summary, is_free, self_checks)
values ('sentence', 4, '반복 표현 제거', 'reduce_repeat',
        '같은 말이 겹치는 것을 알아챈다', true, array[]::text[])
on conflict (skill_key) do update set
  track = excluded.track,
  order_no = excluded.order_no,
  title = excluded.title,
  summary = excluded.summary,
  is_free = excluded.is_free,
  self_checks = excluded.self_checks;

insert into stages (track, order_no, title, skill_key, summary, is_free, self_checks)
values ('sentence', 5, '부사를 쓸 자리', 'adverb_exception',
        '부사를 언제 써도 되는지 안다', true, array[]::text[])
on conflict (skill_key) do update set
  track = excluded.track,
  order_no = excluded.order_no,
  title = excluded.title,
  summary = excluded.summary,
  is_free = excluded.is_free,
  self_checks = excluded.self_checks;

insert into stages (track, order_no, title, skill_key, summary, is_free, self_checks)
values ('sentence', 6, '감각 묘사', 'sensory',
        '한 장면에서 두 가지 이상의 감각을 쓴다', true, array[]::text[])
on conflict (skill_key) do update set
  track = excluded.track,
  order_no = excluded.order_no,
  title = excluded.title,
  summary = excluded.summary,
  is_free = excluded.is_free,
  self_checks = excluded.self_checks;

insert into stages (track, order_no, title, skill_key, summary, is_free, self_checks)
values ('sentence', 7, '문장 리듬', 'rhythm',
        '문단을 끊어 읽는 속도를 만든다', true, array[]::text[])
on conflict (skill_key) do update set
  track = excluded.track,
  order_no = excluded.order_no,
  title = excluded.title,
  summary = excluded.summary,
  is_free = excluded.is_free,
  self_checks = excluded.self_checks;

insert into stages (track, order_no, title, skill_key, summary, is_free, self_checks)
values ('sentence', 8, '대사와 독백', 'dialogue_ratio',
        '대화 사이에 속마음을 끼워 넣는다', true, array[]::text[])
on conflict (skill_key) do update set
  track = excluded.track,
  order_no = excluded.order_no,
  title = excluded.title,
  summary = excluded.summary,
  is_free = excluded.is_free,
  self_checks = excluded.self_checks;

insert into stages (track, order_no, title, skill_key, summary, is_free, self_checks)
values ('sentence', 9, '시점 고정', 'pov_lock',
        '한 인물의 눈에 보이는 것만 쓴다', true, array[]::text[])
on conflict (skill_key) do update set
  track = excluded.track,
  order_no = excluded.order_no,
  title = excluded.title,
  summary = excluded.summary,
  is_free = excluded.is_free,
  self_checks = excluded.self_checks;

insert into stages (track, order_no, title, skill_key, summary, is_free, self_checks)
values ('sentence', 10, '동작에 이유 넣기', 'action_reason',
        '동작 사이에 왜 그렇게 했는지를 끼운다', true, array['마지막에 채운 칸이 그 뒤 결정타 줄의 이유가 되는가', '채운 칸들이 앞뒤 고정 줄과 끊기지 않고 이어지는가']::text[])
on conflict (skill_key) do update set
  track = excluded.track,
  order_no = excluded.order_no,
  title = excluded.title,
  summary = excluded.summary,
  is_free = excluded.is_free,
  self_checks = excluded.self_checks;

insert into stages (track, order_no, title, skill_key, summary, is_free, self_checks)
values ('sentence', 11, '절단신공', 'cliffhanger',
        '마지막 줄이 다음을 부르게 한다', true, array[]::text[])
on conflict (skill_key) do update set
  track = excluded.track,
  order_no = excluded.order_no,
  title = excluded.title,
  summary = excluded.summary,
  is_free = excluded.is_free,
  self_checks = excluded.self_checks;

insert into stages (track, order_no, title, skill_key, summary, is_free, self_checks)
values ('sentence', 12, '전투 서사화', 'action_turn',
        '빌드업을 쌓고 마지막 한 줄로 승부를 가른다', true, array[]::text[])
on conflict (skill_key) do update set
  track = excluded.track,
  order_no = excluded.order_no,
  title = excluded.title,
  summary = excluded.summary,
  is_free = excluded.is_free,
  self_checks = excluded.self_checks;

insert into stages (track, order_no, title, skill_key, summary, is_free, self_checks)
values ('structure', 11, '결핍 부여', 'lack',
        '완벽한 인물을 만들지 않는다', false, array[]::text[])
on conflict (skill_key) do update set
  track = excluded.track,
  order_no = excluded.order_no,
  title = excluded.title,
  summary = excluded.summary,
  is_free = excluded.is_free,
  self_checks = excluded.self_checks;

insert into stages (track, order_no, title, skill_key, summary, is_free, self_checks)
values ('structure', 12, '대비 캐릭터', 'contrast_char',
        '상반된 인물을 나란히 세운다', false, array[]::text[])
on conflict (skill_key) do update set
  track = excluded.track,
  order_no = excluded.order_no,
  title = excluded.title,
  summary = excluded.summary,
  is_free = excluded.is_free,
  self_checks = excluded.self_checks;

insert into stages (track, order_no, title, skill_key, summary, is_free, self_checks)
values ('structure', 13, '호감 확보', 'likability',
        '초반에 응원할 이유를 만든다', false, array[]::text[])
on conflict (skill_key) do update set
  track = excluded.track,
  order_no = excluded.order_no,
  title = excluded.title,
  summary = excluded.summary,
  is_free = excluded.is_free,
  self_checks = excluded.self_checks;

insert into stages (track, order_no, title, skill_key, summary, is_free, self_checks)
values ('structure', 14, '궤도 이탈 찾기', 'off_track',
        '장면 목적에 기여하지 않는 문장을 본다', true, array[]::text[])
on conflict (skill_key) do update set
  track = excluded.track,
  order_no = excluded.order_no,
  title = excluded.title,
  summary = excluded.summary,
  is_free = excluded.is_free,
  self_checks = excluded.self_checks;

insert into stages (track, order_no, title, skill_key, summary, is_free, self_checks)
values ('structure', 15, '정보 비대칭', 'info_gap',
        '답답함을 기대감으로 바꾼다', false, array[]::text[])
on conflict (skill_key) do update set
  track = excluded.track,
  order_no = excluded.order_no,
  title = excluded.title,
  summary = excluded.summary,
  is_free = excluded.is_free,
  self_checks = excluded.self_checks;

insert into stages (track, order_no, title, skill_key, summary, is_free, self_checks)
values ('structure', 16, '절단신공 심화', 'cliffhanger_adv',
        '끊기 전에 신호를 깐다', false, array[]::text[])
on conflict (skill_key) do update set
  track = excluded.track,
  order_no = excluded.order_no,
  title = excluded.title,
  summary = excluded.summary,
  is_free = excluded.is_free,
  self_checks = excluded.self_checks;

insert into stages (track, order_no, title, skill_key, summary, is_free, self_checks)
values ('structure', 17, '역순 설계', 'reverse_design',
        '목표에서 거꾸로 조건을 세운다', true, array[]::text[])
on conflict (skill_key) do update set
  track = excluded.track,
  order_no = excluded.order_no,
  title = excluded.title,
  summary = excluded.summary,
  is_free = excluded.is_free,
  self_checks = excluded.self_checks;

insert into stages (track, order_no, title, skill_key, summary, is_free, self_checks)
values ('structure', 18, '1화 훅', 'first_hook',
        '다섯 줄 안에 세 요소를 넣는다', false, array[]::text[])
on conflict (skill_key) do update set
  track = excluded.track,
  order_no = excluded.order_no,
  title = excluded.title,
  summary = excluded.summary,
  is_free = excluded.is_free,
  self_checks = excluded.self_checks;

insert into stages (track, order_no, title, skill_key, summary, is_free, self_checks)
values ('structure', 19, '장르의 조어법', 'genre_coinage',
        '장르마다 이름을 만드는 규칙이 있다', true, array[]::text[])
on conflict (skill_key) do update set
  track = excluded.track,
  order_no = excluded.order_no,
  title = excluded.title,
  summary = excluded.summary,
  is_free = excluded.is_free,
  self_checks = excluded.self_checks;

insert into stages (track, order_no, title, skill_key, summary, is_free, self_checks)
values ('structure', 20, '분량 역산', 'branch_estimate',
        '분기점 수로 전체 분량을 가늠한다', true, array[]::text[])
on conflict (skill_key) do update set
  track = excluded.track,
  order_no = excluded.order_no,
  title = excluded.title,
  summary = excluded.summary,
  is_free = excluded.is_free,
  self_checks = excluded.self_checks;

insert into stages (track, order_no, title, skill_key, summary, is_free, self_checks)
values ('start', 1, '첫 문장 고르기', 'start_choose',
        '어떤 첫 문장이 통하는지 안다', true, array[]::text[])
on conflict (skill_key) do update set
  track = excluded.track,
  order_no = excluded.order_no,
  title = excluded.title,
  summary = excluded.summary,
  is_free = excluded.is_free,
  self_checks = excluded.self_checks;

insert into stages (track, order_no, title, skill_key, summary, is_free, self_checks)
values ('start', 2, '첫 문장 쓰기', 'start_write',
        '주인공의 감각에서 시작한다', true, array[]::text[])
on conflict (skill_key) do update set
  track = excluded.track,
  order_no = excluded.order_no,
  title = excluded.title,
  summary = excluded.summary,
  is_free = excluded.is_free,
  self_checks = excluded.self_checks;

insert into stages (track, order_no, title, skill_key, summary, is_free, self_checks)
values ('start', 3, '도입 잇기', 'start_extend',
        '세 문장 안에 인물을 세운다', true, array[]::text[])
on conflict (skill_key) do update set
  track = excluded.track,
  order_no = excluded.order_no,
  title = excluded.title,
  summary = excluded.summary,
  is_free = excluded.is_free,
  self_checks = excluded.self_checks;

insert into stages (track, order_no, title, skill_key, summary, is_free, self_checks)
values ('start', 4, '1화 축약', 'start_episode',
        '1화의 요소를 손에 쥔다', true, array[]::text[])
on conflict (skill_key) do update set
  track = excluded.track,
  order_no = excluded.order_no,
  title = excluded.title,
  summary = excluded.summary,
  is_free = excluded.is_free,
  self_checks = excluded.self_checks;

-- ── 문항 ────────────────────────────────────────────────────────────

-- rm-axe-pond (order_no 1, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'reduce_adverb'),
  'remove', 'auto', '꾸미는 말을 걷어내고 다시 쓰시오. 도끼가 물에 빠지는 순간만 남길 것. 여기서는 일부러 부사를 전부 막습니다. 실제 소설에서는 쓰셔도 됩니다 — 언제 쓰는지는 뒤에서 다룹니다.',
  '나무꾼은 힘껏 도끼를 휘둘렀다. 자루가 갑자기 빠졌고, 도끼는 빠르게 연못으로 떨어졌다.', null, '{"maxChars":36,"minVerbs":2,"maxRepeat":2,"maxAdverbs":1,"maxModifiers":1}'::jsonb,
  'folktale', 'fantasy', 'planned',
  1, 'rm-axe-pond'
where not exists (select 1 from problems p where p.source_key = 'rm-axe-pond');

-- rm-heungbu-swallow (order_no 1, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'reduce_adverb'),
  'remove', 'auto', '꾸미는 말을 걷어내고 다시 쓰시오. 뜻은 그대로 두되, 동작으로 대신할 것. 여기서는 일부러 부사를 전부 막습니다. 실제 소설에서는 쓰셔도 됩니다 — 언제 쓰는지는 뒤에서 다룹니다.',
  '흥부는 조심스럽게 제비의 다리를 감쌌다. 그는 간절하게 제비가 얼른 낫기를 바랐다.', null, '{"maxChars":34,"minVerbs":2,"maxRepeat":2,"maxAdverbs":1,"maxModifiers":2}'::jsonb,
  'folktale', 'fantasy', 'planned',
  1, 'rm-heungbu-swallow'
where not exists (select 1 from problems p where p.source_key = 'rm-heungbu-swallow');

-- rm-kongjwi-jar (order_no 1, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'reduce_adverb'),
  'remove', 'auto', '꾸미는 말을 걷어내고 다시 쓰시오. 깨진 독은 그대로 두고, 콩쥐가 무엇을 하는지만 보이게 할 것. 여기서는 일부러 부사를 전부 막습니다. 실제 소설에서는 쓰셔도 됩니다 — 언제 쓰는지는 뒤에서 다룹니다.',
  '콩쥐는 깨진 독에 열심히 물을 부었지만 물은 계속 빠르게 새어 나갔다. 그녀는 몹시 지친 얼굴로 천천히 주저앉았다.', null, '{"maxChars":39,"minVerbs":4,"maxRepeat":2,"maxAdverbs":1,"maxModifiers":2}'::jsonb,
  'folktale', 'modern', 'planned',
  1, 'rm-kongjwi-jar'
where not exists (select 1 from problems p where p.source_key = 'rm-kongjwi-jar');

-- rm-simcheong-deck (order_no 1, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'reduce_adverb'),
  'remove', 'auto', '꾸미는 말을 걷어내고 다시 쓰시오. 여기서는 일부러 부사를 전부 막습니다. 실제 소설에서는 쓰셔도 됩니다 — 언제 쓰는지는 뒤에서 다룹니다.',
  '심청은 천천히 뱃전으로 걸어갔다. 사람들은 안타깝게 그녀를 바라보았고, 뱃사공은 무겁게 고개를 돌렸다.', null, '{"maxChars":40,"minVerbs":2,"maxRepeat":2,"maxAdverbs":1,"maxModifiers":1}'::jsonb,
  'folktale', 'modern', 'planned',
  1, 'rm-simcheong-deck'
where not exists (select 1 from problems p where p.source_key = 'rm-simcheong-deck');

-- rm-magpie-bridge (order_no 1, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'reduce_adverb'),
  'remove', 'auto', '꾸미는 말을 걷어내고 다시 쓰시오. 까치들이 다리를 만드는 장면만 남길 것. 여기서는 일부러 부사를 전부 막습니다. 실제 소설에서는 쓰셔도 됩니다 — 언제 쓰는지는 뒤에서 다룹니다.',
  '까치들은 부지런하게 날아와 아주 촘촘하게 몸을 이었다. 견우는 조심스럽게 그 위에 발을 얹었다.', null, '{"maxChars":34,"minVerbs":2,"maxRepeat":2,"maxAdverbs":1,"maxModifiers":1}'::jsonb,
  'folktale', 'romance', 'planned',
  2, 'rm-magpie-bridge'
where not exists (select 1 from problems p where p.source_key = 'rm-magpie-bridge');

-- rm-rabbit-court (order_no 1, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'reduce_adverb'),
  'remove', 'auto', '꾸미는 말을 걷어내고 다시 쓰시오. 여기서는 일부러 부사를 전부 막습니다. 실제 소설에서는 쓰셔도 됩니다 — 언제 쓰는지는 뒤에서 다룹니다.',
  '토끼는 태연하게 웃으며 말했다. 용왕은 다급하게 몸을 일으켰고, 신하들은 어리둥절한 표정으로 서로를 바라보았다.', null, '{"maxChars":40,"minVerbs":3,"maxRepeat":2,"maxAdverbs":1,"maxModifiers":1}'::jsonb,
  'folktale', 'martial', 'impulsive',
  2, 'rm-rabbit-court'
where not exists (select 1 from problems p where p.source_key = 'rm-rabbit-court');

-- rm-siblings-tree (order_no 1, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'reduce_adverb'),
  'remove', 'auto', '꾸미는 말을 걷어내고 다시 쓰시오. 여기서는 일부러 부사를 전부 막습니다. 실제 소설에서는 쓰셔도 됩니다 — 언제 쓰는지는 뒤에서 다룹니다.',
  '오누이는 급하게 나무 위로 올라갔다. 호랑이는 아래에서 계속 사납게 나무를 흔들었고, 아이들은 몹시 세게 가지를 붙잡았다.', null, '{"maxChars":44,"minVerbs":2,"maxRepeat":2,"maxAdverbs":1,"maxModifiers":1}'::jsonb,
  'folktale', 'fantasy', 'impulsive',
  2, 'rm-siblings-tree'
where not exists (select 1 from problems p where p.source_key = 'rm-siblings-tree');

-- rm-goblin-club (order_no 1, difficulty 3)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'reduce_adverb'),
  'remove', 'auto', '꾸미는 말을 걷어내고 다시 쓰시오. 남는 문장은 두 개 이하로. 여기서는 일부러 부사를 전부 막습니다. 실제 소설에서는 쓰셔도 됩니다 — 언제 쓰는지는 뒤에서 다룹니다.',
  '나무꾼은 조심스럽게 방망이를 들었다. 그는 몹시 떨리는 손으로 천천히 그것을 내리쳤고, 곡식이 갑자기 쏟아져 나왔다.', null, '{"maxChars":42,"minVerbs":3,"maxRepeat":2,"maxAdverbs":1,"maxModifiers":2}'::jsonb,
  'folktale', 'fantasy', 'impulsive',
  3, 'rm-goblin-club'
where not exists (select 1 from problems p where p.source_key = 'rm-goblin-club');

-- heungbu-joy (order_no 2, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'emotion_action'),
  'convert', 'hybrid', '''흥부는 기뻤다''를 감정어 없이 쓰시오.',
  '박이 갈라지고 안에서 금은보화가 쏟아졌다. 흥부는 기뻤다.', null, '{"maxChars":60,"minVerbs":2,"maxAdverbs":1,"forbidWords":["기뻤","기쁘","기뻐","기쁨","행복","신났","신나","즐거","좋았"],"maxModifiers":2,"forbidLabel":"기쁨을 직접 말하는 표현","forbidDisplay":["기쁘다","기쁨","행복하다","신나다","좋다","즐거워하다"]}'::jsonb,
  'folktale', 'fantasy', 'planned',
  1, 'heungbu-joy'
where not exists (select 1 from problems p where p.source_key = 'heungbu-joy');

-- sim-cheong-fear (order_no 2, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'emotion_action'),
  'convert', 'hybrid', '''심청은 두려웠다''를 감정어 없이 쓰시오. 신체 동작만으로 두려움이 보이게 할 것.',
  '뱃사람들이 뱃전에 모여 그녀를 불렀다. 심청은 두려웠다.', null, '{"maxChars":60,"minVerbs":1,"maxAdverbs":1,"forbidWords":["두려","두렵","무서","겁먹","떨렸","공포","질렸"],"maxModifiers":2,"forbidLabel":"두려움을 직접 말하는 표현","forbidDisplay":["두렵다","무서워하다","겁먹다","떨다","공포"]}'::jsonb,
  'folktale', 'modern', 'planned',
  1, 'sim-cheong-fear'
where not exists (select 1 from problems p where p.source_key = 'sim-cheong-fear');

-- dragon-king-anger (order_no 2, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'emotion_action'),
  'convert', 'hybrid', '''용왕은 화가 났다''를 감정어 없이 쓰시오.',
  '토끼가 간을 두고 왔다고 말했다. 용왕은 화가 났다.', null, '{"maxChars":60,"minVerbs":2,"maxAdverbs":1,"forbidWords":["화났","화가 났","화가 나서","화가 치밀","분노","노여","성났","격분","짜증","치밀어","치밀었"],"maxModifiers":2,"forbidLabel":"분노를 직접 말하는 표현","forbidDisplay":["화나다","분노","짜증","치밀다","성나다","격분","노여워하다"]}'::jsonb,
  'folktale', 'martial', 'planned',
  2, 'dragon-king-anger'
where not exists (select 1 from problems p where p.source_key = 'dragon-king-anger');

-- kongjwi-grief (order_no 2, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'emotion_action'),
  'convert', 'hybrid', '''콩쥐는 서러웠다''를 감정어 없이 쓰시오. 울음을 직접 쓰지 말 것.',
  '식구들은 잔치에 가고 마당에는 깨진 독만 남았다. 콩쥐는 서러웠다.', null, '{"maxChars":70,"minVerbs":2,"maxAdverbs":1,"forbidWords":["서러","서럽","슬프","슬펐","슬픔","눈물","흐느","비참","원망"],"maxModifiers":2,"forbidLabel":"서러움을 직접 말하는 표현","forbidDisplay":["서럽다","슬프다","눈물","흐느끼다","비참하다","원망"]}'::jsonb,
  'folktale', 'modern', 'planned',
  2, 'kongjwi-grief'
where not exists (select 1 from problems p where p.source_key = 'kongjwi-grief');

-- gyeonu-longing (order_no 2, difficulty 3)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'emotion_action'),
  'convert', 'hybrid', '''견우는 그리웠다''를 감정어 없이 쓰시오. 직녀를 등장시키지 말 것.',
  '일 년에 한 번 다리가 놓이는 날이 아직 멀었다. 견우는 그리웠다.', null, '{"maxChars":70,"minVerbs":2,"maxAdverbs":1,"forbidWords":["그리웠","그리워","그리움","그립","보고 싶","외로","쓸쓸","사무치","애틋"],"maxModifiers":2,"forbidLabel":"그리움을 직접 말하는 표현","forbidDisplay":["그립다","그리움","보고 싶다","쓸쓸하다","사무치다","애틋하다"]}'::jsonb,
  'folktale', 'romance', 'planned',
  3, 'gyeonu-longing'
where not exists (select 1 from problems p where p.source_key = 'gyeonu-longing');

-- woodcutter-shame (order_no 2, difficulty 3)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'emotion_action'),
  'convert', 'hybrid', '''나무꾼은 부끄러웠다''를 감정어 없이 쓰시오.',
  '산신령이 금도끼와 은도끼를 나란히 들어 보였다. 나무꾼은 부끄러웠다.', null, '{"maxChars":65,"minVerbs":2,"maxAdverbs":1,"forbidWords":["부끄","창피","민망","수치스","낯뜨거","뻘개"],"maxModifiers":2,"forbidLabel":"부끄러움을 직접 말하는 표현","forbidDisplay":["부끄럽다","창피하다","민망하다","수치스럽다"]}'::jsonb,
  'folktale', 'fantasy', 'planned',
  3, 'woodcutter-shame'
where not exists (select 1 from problems p where p.source_key = 'woodcutter-shame');

-- tp-axe-water (order_no 3, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'trim_padding'),
  'remove', 'auto', '없어도 되는 문장을 지우고 다시 쓰시오. 나무꾼이 손을 넣는 동작까지 남길 것.',
  '나무꾼은 연못가에 앉았다. 연못은 산 아래의 깊은 물이었다. 그날은 바람 한 점 없이 잔잔했다. 도끼는 물속에 보이지 않았다. 그는 소매를 걷고 물에 손을 넣었다.', null, '{"maxChars":38,"minVerbs":3,"maxRepeat":2}'::jsonb,
  'folktale', 'fantasy', 'planned',
  1, 'tp-axe-water'
where not exists (select 1 from problems p where p.source_key = 'tp-axe-water');

-- tp-heungbu-yard (order_no 3, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'trim_padding'),
  'remove', 'auto', '없어도 되는 문장을 지우고 다시 쓰시오. 인물이 하는 동작은 하나도 빼지 말 것.',
  '흥부는 마당에 나갔다. 마당은 좁고 흙바닥이라 늘 먼지투성이였다. 제비 한 마리가 떨어져 있었다. 제비는 봄의 새다. 흥부는 제비를 두 손으로 들어 올렸다.', null, '{"maxChars":35,"minVerbs":3,"maxRepeat":2}'::jsonb,
  'folktale', 'fantasy', 'planned',
  1, 'tp-heungbu-yard'
where not exists (select 1 from problems p where p.source_key = 'tp-heungbu-yard');

-- tp-simcheong-rail (order_no 3, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'trim_padding'),
  'remove', 'auto', '없어도 되는 문장을 지우고 다시 쓰시오.',
  '심청은 뱃전에 섰다. 그 배는 마을에서 가장 큰 배였다. 공양미 삼백 석이 이 배에 실려 있었다. 바다는 넓고 깊었다. 심청은 치마를 걷어쥐었다.', null, '{"maxChars":35,"minVerbs":3,"maxRepeat":2}'::jsonb,
  'folktale', 'modern', 'planned',
  1, 'tp-simcheong-rail'
where not exists (select 1 from problems p where p.source_key = 'tp-simcheong-rail');

-- tp-gyeonu-river (order_no 3, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'trim_padding'),
  'remove', 'auto', '없어도 되는 문장을 지우고 다시 쓰시오.',
  '견우는 강가에 나왔다. 강은 일 년 내내 소리 없이 그대로였다. 까치들이 하늘을 덮었다. 까치는 검고 흰, 아주 흔한 새다. 견우는 강물에 발을 담갔다.', null, '{"maxChars":35,"minVerbs":2,"maxRepeat":2}'::jsonb,
  'folktale', 'romance', 'planned',
  2, 'tp-gyeonu-river'
where not exists (select 1 from problems p where p.source_key = 'tp-gyeonu-river');

-- tp-kongjwi-crack (order_no 3, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'trim_padding'),
  'remove', 'auto', '없어도 되는 문장을 지우고 다시 쓰시오. 독의 상태와 콩쥐의 동작만 남길 것.',
  '콩쥐는 독 앞에 앉았다. 독은 마당 한가운데의 커다란 물건이었다. 바닥에 금이 가 있었다. 금은 손가락 하나 굵기였다. 콩쥐는 손바닥으로 그 자리를 눌렀다.', null, '{"maxChars":35,"minVerbs":2,"maxRepeat":2}'::jsonb,
  'folktale', 'modern', 'planned',
  2, 'tp-kongjwi-crack'
where not exists (select 1 from problems p where p.source_key = 'tp-kongjwi-crack');

-- tp-rabbit-gate (order_no 3, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'trim_padding'),
  'remove', 'auto', '없어도 되는 문장을 지우고 다시 쓰시오.',
  '토끼는 용궁 문 앞에 섰다. 용궁은 바다 밑의 깊은 곳이었다. 문지기가 창을 내렸다. 문지기의 창은 길고 무거웠다. 토끼는 웃으며 한 걸음 나섰다.', null, '{"maxChars":33,"minVerbs":3,"maxRepeat":2}'::jsonb,
  'folktale', 'martial', 'impulsive',
  2, 'tp-rabbit-gate'
where not exists (select 1 from problems p where p.source_key = 'tp-rabbit-gate');

-- tp-siblings-floor (order_no 3, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'trim_padding'),
  'remove', 'auto', '없어도 되는 문장을 지우고 다시 쓰시오.',
  '오누이는 마루 밑에 숨었다. 그 집은 마을에서 가장 낡은 초가집이었다. 문밖에서 발소리가 났다. 문밖은 달도 없이 어두웠다. 오라비가 동생의 입을 막았다.', null, '{"maxChars":38,"minVerbs":2,"maxRepeat":2}'::jsonb,
  'folktale', 'fantasy', 'impulsive',
  2, 'tp-siblings-floor'
where not exists (select 1 from problems p where p.source_key = 'tp-siblings-floor');

-- tp-goblin-mark (order_no 3, difficulty 3)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'trim_padding'),
  'remove', 'auto', '없어도 되는 문장을 지우고 다시 쓰시오. 남는 문장은 세 개 이하로.',
  '나무꾼은 방망이를 상 위에 올렸다. 상은 다리 하나가 짧은 낡은 것이었다. 집 안은 조용했다. 방망이에 검은 자국이 남아 있었다. 그는 그것을 다시 집어 들었다.', null, '{"maxChars":37,"minVerbs":3,"maxRepeat":2}'::jsonb,
  'folktale', 'fantasy', 'impulsive',
  3, 'tp-goblin-mark'
where not exists (select 1 from problems p where p.source_key = 'tp-goblin-mark');

-- rp-axe-gold (order_no 4, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'reduce_repeat'),
  'remove', 'auto', '같은 말이 겹치는 곳을 찾아 다시 쓰시오.',
  '산신령이 금도끼를 들었다. 나무꾼은 그 도끼를 보았다. 산신령이 은도끼를 들었다. 나무꾼은 도끼를 고르지 않았다.', null, '{"maxChars":45,"minVerbs":3,"maxRepeat":2}'::jsonb,
  'folktale', 'fantasy', 'planned',
  1, 'rp-axe-gold'
where not exists (select 1 from problems p where p.source_key = 'rp-axe-gold');

-- rp-heungbu-gourd (order_no 4, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'reduce_repeat'),
  'remove', 'auto', '같은 말이 겹치는 곳을 찾아 다시 쓰시오. 일어나는 일은 하나도 빼지 말 것.',
  '흥부는 박을 켰다. 박 속에서 쌀이 쏟아졌다. 흥부는 두 번째 박을 켰다. 그 박에서도 비단이 나왔다.', null, '{"maxChars":35,"minVerbs":3,"maxRepeat":2}'::jsonb,
  'folktale', 'fantasy', 'planned',
  1, 'rp-heungbu-gourd'
where not exists (select 1 from problems p where p.source_key = 'rp-heungbu-gourd');

-- rp-simcheong-sea (order_no 4, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'reduce_repeat'),
  'remove', 'auto', '같은 말이 겹치는 곳을 찾아 다시 쓰시오.',
  '심청은 바다를 보았다. 바다는 검은 물결로 일렁였다. 뱃사람들이 바다를 가리켰다. 심청은 바다 쪽으로 한 걸음 옮겼다.', null, '{"maxChars":46,"minVerbs":3,"maxRepeat":2}'::jsonb,
  'folktale', 'modern', 'planned',
  1, 'rp-simcheong-sea'
where not exists (select 1 from problems p where p.source_key = 'rp-simcheong-sea');

-- rp-kongjwi-jar (order_no 4, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'reduce_repeat'),
  'remove', 'auto', '같은 말이 겹치는 곳을 찾아 다시 쓰시오.',
  '콩쥐는 물을 길었다. 물은 독에서 새어 나갔다. 콩쥐는 다시 물을 부었다. 물은 또 빠져나갔다.', null, '{"maxChars":34,"minVerbs":3,"maxRepeat":2}'::jsonb,
  'folktale', 'modern', 'planned',
  2, 'rp-kongjwi-jar'
where not exists (select 1 from problems p where p.source_key = 'rp-kongjwi-jar');

-- rp-magpie-bridge (order_no 4, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'reduce_repeat'),
  'remove', 'auto', '같은 말이 겹치는 곳을 찾아 다시 쓰시오.',
  '까치들이 다리를 놓았다. 다리는 강 위로 이어졌다. 견우가 다리에 올랐다. 다리는 흔들렸다.', null, '{"maxChars":38,"minVerbs":3,"maxRepeat":2}'::jsonb,
  'folktale', 'romance', 'planned',
  2, 'rp-magpie-bridge'
where not exists (select 1 from problems p where p.source_key = 'rp-magpie-bridge');

-- rp-rabbit-liver (order_no 4, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'reduce_repeat'),
  'remove', 'auto', '같은 말이 겹치는 곳을 찾아 다시 쓰시오.',
  '토끼는 간을 두고 왔다고 했다. 용왕은 간을 요구했다. 신하들이 간을 찾아 나섰다. 토끼는 간이 없다고 웃었다.', null, '{"maxChars":44,"minVerbs":5,"maxRepeat":2}'::jsonb,
  'folktale', 'martial', 'impulsive',
  2, 'rp-rabbit-liver'
where not exists (select 1 from problems p where p.source_key = 'rp-rabbit-liver');

-- rp-siblings-rope (order_no 4, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'reduce_repeat'),
  'remove', 'auto', '같은 말이 겹치는 곳을 찾아 다시 쓰시오. 밧줄이 어떤 상태인지는 남길 것.',
  '오누이는 밧줄을 잡았다. 밧줄이 하늘에서 내려왔다. 오라비가 밧줄을 당겼다. 밧줄은 튼튼했다.', null, '{"maxChars":40,"minVerbs":3,"maxRepeat":2}'::jsonb,
  'folktale', 'fantasy', 'impulsive',
  2, 'rp-siblings-rope'
where not exists (select 1 from problems p where p.source_key = 'rp-siblings-rope');

-- rp-goblin-club (order_no 4, difficulty 3)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'reduce_repeat'),
  'remove', 'auto', '같은 말이 겹치는 곳을 찾아 다시 쓰시오. 방망이가 멈추지 않는다는 것을 남길 것.',
  '도깨비가 방망이를 두드렸다. 방망이에서 쌀이 나왔다. 도깨비가 방망이를 다시 두드렸다. 방망이는 멈추지 않았다.', null, '{"maxChars":41,"minVerbs":4,"maxRepeat":2}'::jsonb,
  'folktale', 'fantasy', 'impulsive',
  3, 'rp-goblin-club'
where not exists (select 1 from problems p where p.source_key = 'rp-goblin-club');

-- ae-gyeonu-bridge (order_no 5, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'adverb_exception'),
  'choice', 'auto', '뒤 문장의 부사가 앞 문장 덕분에 값을 얻는 것을 고르시오. 부사가 없거나, 부사가 앞에서 혼자 일하고 있으면 답이 아니다.',
  '까치 다리가 놓인 날이다.', '["까치들이 강 위로 몸을 이어 다리를 놓았다. 견우는 조심스럽게 첫 발을 얹었다.","까치들이 강 위로 몸을 이어 다리를 놓았다. 견우는 첫 발을 얹었다.","견우는 조심스럽게 강가에 나왔다. 까치들이 하늘을 덮었다.","강물이 아주 깊었다. 견우는 매우 두려웠다."]'::jsonb, '{}'::jsonb,
  'folktale', 'fantasy', 'planned',
  1, 'ae-gyeonu-bridge'
where not exists (select 1 from problems p where p.source_key = 'ae-gyeonu-bridge');

-- ae-rabbit-gate (order_no 5, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'adverb_exception'),
  'choice', 'auto', '뒤 문장의 부사가 앞 문장 덕분에 값을 얻는 것을 고르시오. 부사가 없거나, 부사가 앞에서 혼자 일하고 있으면 답이 아니다.',
  '토끼가 용궁 문 앞에 섰다.', '["문지기의 창끝이 토끼의 목 앞에서 멈췄다. 토끼는 천천히 한 걸음 나섰다.","문지기의 창끝이 토끼의 목 앞에서 멈췄다. 토끼는 한 걸음 나섰다.","토끼는 정말 용감하게 걸었다. 문지기가 창을 내렸다.","용궁 문이 열렸다. 토끼는 몹시 두려웠다."]'::jsonb, '{}'::jsonb,
  'folktale', 'fantasy', 'planned',
  1, 'ae-rabbit-gate'
where not exists (select 1 from problems p where p.source_key = 'ae-rabbit-gate');

-- ae-axe-drop (order_no 5, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'adverb_exception'),
  'choice', 'auto', '부사가 동사에 얹혀 제 일을 하는 것을 고르시오. 부사가 없거나, 동사가 이미 품은 뜻을 되풀이하거나, 동사 대신 감정을 서술하고 있으면 답이 아니다.',
  null, '["나무꾼은 도끼를 물속으로 조심스럽게 내려놓았다.","나무꾼은 연못가로 황급히 내달렸다.","나무꾼은 몹시 안타깝게 연못을 바라보고 있었다.","나무꾼은 도끼를 물속으로 내려놓았다."]'::jsonb, '{}'::jsonb,
  'folktale', 'modern', 'planned',
  2, 'ae-axe-drop'
where not exists (select 1 from problems p where p.source_key = 'ae-axe-drop');

-- ae-kongjwi-jar (order_no 5, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'adverb_exception'),
  'choice', 'auto', '한 장면에 부사를 하나만 쓴다. 값이 가장 큰 자리에 놓은 것을 고르시오.',
  null, '["콩쥐는 독에 천천히 물을 부었다. 물이 바닥으로 새어 나갔다. 콩쥐는 물을 길어 왔다.","콩쥐는 독에 물을 부었다. 물이 바닥으로 빠르게 새어 나갔다. 콩쥐는 물을 길어 왔다.","콩쥐는 독에 물을 부었다. 물이 바닥으로 새어 나갔다. 콩쥐는 말없이 물을 길어 왔다.","콩쥐는 몹시 힘들게 독에 물을 부었다. 물이 바닥으로 새어 나갔다. 콩쥐는 물을 길어 왔다."]'::jsonb, '{}'::jsonb,
  'folktale', 'fantasy', 'planned',
  2, 'ae-kongjwi-jar'
where not exists (select 1 from problems p where p.source_key = 'ae-kongjwi-jar');

-- sn-axe-pond (order_no 6, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'sensory'),
  'convert', 'auto', '연못 바닥에 손을 넣은 상태다. 눈에 기대는 말을 걷어내고 다른 감각으로 다시 쓰시오. 눈·빛·색·시선·시야·모습·얼굴·그림자·어둠·캄캄·깜깜·컴컴·흐릿·뚜렷·선명·투명·반짝·어른어른이 들어간 말은 전부 막습니다. 보다 계열(보이다·바라보다·살펴보다 등), 밝기와 색(밝다·어둡다·붉다·푸르다·하얗다·검다·노랗다·흐리다·훤하다), 빛의 움직임(빛나다·번쩍이다·반짝이다·어른거리다)도 막습니다.',
  '물빛이 탁해 아무것도 보이지 않았다. 나무꾼은 손끝을 살펴보았다.', null, '{"maxChars":70,"forbidWords":["눈","빛","색","시선","모습","그림자","어둠","캄캄","깜깜","컴컴","흐릿","뚜렷","얼굴","시야","선명","투명","반짝","어른어른"],"forbidLemmas":["보/VV","보이/VV","바라보/VV","쳐다보/VV","내려다보/VV","올려다보/VV","둘러보/VV","살펴보/VV","띄/VV","비치/VV","빛나/VV","번쩍이/VV","반짝이/VV","어른거리/VV","밝/VA","어둡/VA","붉/VA","푸르/VA","하얗/VA","희/VA","환하/VA","검/VA","노랗/VA","누렇/VA","하얘지/VV","흐리/VA","훤하/VA","훤/XR"],"forbidLabel":"눈에 기대는 표현","forbidDisplay":["눈","빛","색","시선","모습","그림자","어둠","보다","보이다","바라보다","쳐다보다","살펴보다","밝다","어둡다","붉다","푸르다","하얗다","검다","빛나다","번쩍이다","반짝이다"]}'::jsonb,
  'folktale', 'modern', 'planned',
  2, 'sn-axe-pond'
where not exists (select 1 from problems p where p.source_key = 'sn-axe-pond');

-- sn-heungbu-barn (order_no 6, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'sensory'),
  'convert', 'auto', '빛이 들지 않는 헛간 안이다. 눈에 기대는 말을 걷어내고 다른 감각으로 다시 쓰시오. 눈·빛·색·시선·시야·모습·얼굴·그림자·어둠·캄캄·깜깜·컴컴·흐릿·뚜렷·선명·투명·반짝·어른어른이 들어간 말은 전부 막습니다. 보다 계열(보이다·바라보다·살펴보다 등), 밝기와 색(밝다·어둡다·붉다·푸르다·하얗다·검다·노랗다·흐리다·훤하다), 빛의 움직임(빛나다·번쩍이다·반짝이다·어른거리다)도 막습니다.',
  '아무것도 보이지 않았다. 어둠 속에서 제비의 흰 배가 어렴풋이 눈에 띄었다.', null, '{"maxChars":70,"forbidWords":["눈","빛","색","시선","모습","그림자","어둠","캄캄","깜깜","컴컴","흐릿","뚜렷","얼굴","시야","선명","투명","반짝","어른어른"],"forbidLemmas":["보/VV","보이/VV","바라보/VV","쳐다보/VV","내려다보/VV","올려다보/VV","둘러보/VV","살펴보/VV","띄/VV","비치/VV","빛나/VV","번쩍이/VV","반짝이/VV","어른거리/VV","밝/VA","어둡/VA","붉/VA","푸르/VA","하얗/VA","희/VA","환하/VA","검/VA","노랗/VA","누렇/VA","하얘지/VV","흐리/VA","훤하/VA","훤/XR"],"forbidLabel":"눈에 기대는 표현","forbidDisplay":["눈","빛","색","시선","모습","그림자","어둠","보다","보이다","바라보다","쳐다보다","살펴보다","밝다","어둡다","붉다","푸르다","하얗다","검다","빛나다","번쩍이다","반짝이다"]}'::jsonb,
  'folktale', 'fantasy', 'planned',
  2, 'sn-heungbu-barn'
where not exists (select 1 from problems p where p.source_key = 'sn-heungbu-barn');

-- sn-kongjwi-night (order_no 6, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'sensory'),
  'convert', 'auto', '달도 없는 밤의 마당이다. 눈에 기대는 말을 걷어내고 다른 감각으로 다시 쓰시오. 눈·빛·색·시선·시야·모습·얼굴·그림자·어둠·캄캄·깜깜·컴컴·흐릿·뚜렷·선명·투명·반짝·어른어른이 들어간 말은 전부 막습니다. 보다 계열(보이다·바라보다·살펴보다 등), 밝기와 색(밝다·어둡다·붉다·푸르다·하얗다·검다·노랗다·흐리다·훤하다), 빛의 움직임(빛나다·번쩍이다·반짝이다·어른거리다)도 막습니다.',
  '깨진 독이 검게 보였다. 물이 흘러나온 자리가 어둡게 번들거렸다.', null, '{"maxChars":70,"forbidWords":["눈","빛","색","시선","모습","그림자","어둠","캄캄","깜깜","컴컴","흐릿","뚜렷","얼굴","시야","선명","투명","반짝","어른어른"],"forbidLemmas":["보/VV","보이/VV","바라보/VV","쳐다보/VV","내려다보/VV","올려다보/VV","둘러보/VV","살펴보/VV","띄/VV","비치/VV","빛나/VV","번쩍이/VV","반짝이/VV","어른거리/VV","밝/VA","어둡/VA","붉/VA","푸르/VA","하얗/VA","희/VA","환하/VA","검/VA","노랗/VA","누렇/VA","하얘지/VV","흐리/VA","훤하/VA","훤/XR"],"forbidLabel":"눈에 기대는 표현","forbidDisplay":["눈","빛","색","시선","모습","그림자","어둠","보다","보이다","바라보다","쳐다보다","살펴보다","밝다","어둡다","붉다","푸르다","하얗다","검다","빛나다","번쩍이다","반짝이다"]}'::jsonb,
  'folktale', 'modern', 'planned',
  2, 'sn-kongjwi-night'
where not exists (select 1 from problems p where p.source_key = 'sn-kongjwi-night');

-- sn-simcheong-water (order_no 6, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'sensory'),
  'convert', 'auto', '물에 잠긴 직후다. 눈에 기대는 말을 걷어내고 다른 감각으로 다시 쓰시오. 눈·빛·색·시선·시야·모습·얼굴·그림자·어둠·캄캄·깜깜·컴컴·흐릿·뚜렷·선명·투명·반짝·어른어른이 들어간 말은 전부 막습니다. 보다 계열(보이다·바라보다·살펴보다 등), 밝기와 색(밝다·어둡다·붉다·푸르다·하얗다·검다·노랗다·흐리다·훤하다), 빛의 움직임(빛나다·번쩍이다·반짝이다·어른거리다)도 막습니다.',
  '푸른 물빛이 눈앞을 가득 채웠다. 뱃사람들의 모습이 점점 멀어지는 것이 보였다.', null, '{"maxChars":70,"forbidWords":["눈","빛","색","시선","모습","그림자","어둠","캄캄","깜깜","컴컴","흐릿","뚜렷","얼굴","시야","선명","투명","반짝","어른어른"],"forbidLemmas":["보/VV","보이/VV","바라보/VV","쳐다보/VV","내려다보/VV","올려다보/VV","둘러보/VV","살펴보/VV","띄/VV","비치/VV","빛나/VV","번쩍이/VV","반짝이/VV","어른거리/VV","밝/VA","어둡/VA","붉/VA","푸르/VA","하얗/VA","희/VA","환하/VA","검/VA","노랗/VA","누렇/VA","하얘지/VV","흐리/VA","훤하/VA","훤/XR"],"forbidLabel":"눈에 기대는 표현","forbidDisplay":["눈","빛","색","시선","모습","그림자","어둠","보다","보이다","바라보다","쳐다보다","살펴보다","밝다","어둡다","붉다","푸르다","하얗다","검다","빛나다","번쩍이다","반짝이다"]}'::jsonb,
  'folktale', 'fantasy', 'planned',
  2, 'sn-simcheong-water'
where not exists (select 1 from problems p where p.source_key = 'sn-simcheong-water');

-- sn-goblin-club (order_no 6, difficulty 3)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'sensory'),
  'convert', 'auto', '도깨비들이 방망이를 두드린다. 등을 돌리고 있어 앞이 분간되지 않는다. 눈에 기대는 말을 걷어내고 다른 감각으로 다시 쓰시오. 눈·빛·색·시선·시야·모습·얼굴·그림자·어둠·캄캄·깜깜·컴컴·흐릿·뚜렷·선명·투명·반짝·어른어른이 들어간 말은 전부 막습니다. 보다 계열(보이다·바라보다·살펴보다 등), 밝기와 색(밝다·어둡다·붉다·푸르다·하얗다·검다·노랗다·흐리다·훤하다), 빛의 움직임(빛나다·번쩍이다·반짝이다·어른거리다)도 막습니다.',
  '도깨비의 모습이 어둠 속에서 어른거렸다. 방망이가 붉게 빛났다.', null, '{"maxChars":70,"forbidWords":["눈","빛","색","시선","모습","그림자","어둠","캄캄","깜깜","컴컴","흐릿","뚜렷","얼굴","시야","선명","투명","반짝","어른어른"],"forbidLemmas":["보/VV","보이/VV","바라보/VV","쳐다보/VV","내려다보/VV","올려다보/VV","둘러보/VV","살펴보/VV","띄/VV","비치/VV","빛나/VV","번쩍이/VV","반짝이/VV","어른거리/VV","밝/VA","어둡/VA","붉/VA","푸르/VA","하얗/VA","희/VA","환하/VA","검/VA","노랗/VA","누렇/VA","하얘지/VV","흐리/VA","훤하/VA","훤/XR"],"forbidLabel":"눈에 기대는 표현","forbidDisplay":["눈","빛","색","시선","모습","그림자","어둠","보다","보이다","바라보다","쳐다보다","살펴보다","밝다","어둡다","붉다","푸르다","하얗다","검다","빛나다","번쩍이다","반짝이다"]}'::jsonb,
  'folktale', 'martial', 'planned',
  3, 'sn-goblin-club'
where not exists (select 1 from problems p where p.source_key = 'sn-goblin-club');

-- sn-gyeonu-bridge (order_no 6, difficulty 3)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'sensory'),
  'convert', 'auto', '까치 다리 위다. 발밑이 분간되지 않는다. 눈에 기대는 말을 걷어내고 다른 감각으로 다시 쓰시오. 눈·빛·색·시선·시야·모습·얼굴·그림자·어둠·캄캄·깜깜·컴컴·흐릿·뚜렷·선명·투명·반짝·어른어른이 들어간 말은 전부 막습니다. 보다 계열(보이다·바라보다·살펴보다 등), 밝기와 색(밝다·어둡다·붉다·푸르다·하얗다·검다·노랗다·흐리다·훤하다), 빛의 움직임(빛나다·번쩍이다·반짝이다·어른거리다)도 막습니다.',
  '까치들의 검은 모습이 눈앞에 가득했다. 견우는 발밑을 내려다보았다.', null, '{"maxChars":70,"forbidWords":["눈","빛","색","시선","모습","그림자","어둠","캄캄","깜깜","컴컴","흐릿","뚜렷","얼굴","시야","선명","투명","반짝","어른어른"],"forbidLemmas":["보/VV","보이/VV","바라보/VV","쳐다보/VV","내려다보/VV","올려다보/VV","둘러보/VV","살펴보/VV","띄/VV","비치/VV","빛나/VV","번쩍이/VV","반짝이/VV","어른거리/VV","밝/VA","어둡/VA","붉/VA","푸르/VA","하얗/VA","희/VA","환하/VA","검/VA","노랗/VA","누렇/VA","하얘지/VV","흐리/VA","훤하/VA","훤/XR"],"forbidLabel":"눈에 기대는 표현","forbidDisplay":["눈","빛","색","시선","모습","그림자","어둠","보다","보이다","바라보다","쳐다보다","살펴보다","밝다","어둡다","붉다","푸르다","하얗다","검다","빛나다","번쩍이다","반짝이다"]}'::jsonb,
  'folktale', 'fantasy', 'planned',
  3, 'sn-gyeonu-bridge'
where not exists (select 1 from problems p where p.source_key = 'sn-gyeonu-bridge');

-- sn-rabbit-hall (order_no 6, difficulty 3)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'sensory'),
  'convert', 'auto', '용궁 복도에서 등불이 꺼졌다. 눈에 기대는 말을 걷어내고 다른 감각으로 다시 쓰시오. 눈·빛·색·시선·시야·모습·얼굴·그림자·어둠·캄캄·깜깜·컴컴·흐릿·뚜렷·선명·투명·반짝·어른어른이 들어간 말은 전부 막습니다. 보다 계열(보이다·바라보다·살펴보다 등), 밝기와 색(밝다·어둡다·붉다·푸르다·하얗다·검다·노랗다·흐리다·훤하다), 빛의 움직임(빛나다·번쩍이다·반짝이다·어른거리다)도 막습니다.',
  '붉은 기둥들이 어둠 속에 잠겨 보이지 않았다. 토끼는 앞을 바라보았다.', null, '{"maxChars":70,"forbidWords":["눈","빛","색","시선","모습","그림자","어둠","캄캄","깜깜","컴컴","흐릿","뚜렷","얼굴","시야","선명","투명","반짝","어른어른"],"forbidLemmas":["보/VV","보이/VV","바라보/VV","쳐다보/VV","내려다보/VV","올려다보/VV","둘러보/VV","살펴보/VV","띄/VV","비치/VV","빛나/VV","번쩍이/VV","반짝이/VV","어른거리/VV","밝/VA","어둡/VA","붉/VA","푸르/VA","하얗/VA","희/VA","환하/VA","검/VA","노랗/VA","누렇/VA","하얘지/VV","흐리/VA","훤하/VA","훤/XR"],"forbidLabel":"눈에 기대는 표현","forbidDisplay":["눈","빛","색","시선","모습","그림자","어둠","보다","보이다","바라보다","쳐다보다","살펴보다","밝다","어둡다","붉다","푸르다","하얗다","검다","빛나다","번쩍이다","반짝이다"]}'::jsonb,
  'folktale', 'fantasy', 'planned',
  3, 'sn-rabbit-hall'
where not exists (select 1 from problems p where p.source_key = 'sn-rabbit-hall');

-- sn-siblings-tree (order_no 6, difficulty 3)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'sensory'),
  'convert', 'auto', '나무 위다. 아래는 아무것도 분간되지 않는다. 눈에 기대는 말을 걷어내고 다른 감각으로 다시 쓰시오. 눈·빛·색·시선·시야·모습·얼굴·그림자·어둠·캄캄·깜깜·컴컴·흐릿·뚜렷·선명·투명·반짝·어른어른이 들어간 말은 전부 막습니다. 보다 계열(보이다·바라보다·살펴보다 등), 밝기와 색(밝다·어둡다·붉다·푸르다·하얗다·검다·노랗다·흐리다·훤하다), 빛의 움직임(빛나다·번쩍이다·반짝이다·어른거리다)도 막습니다.',
  '호랑이의 모습이 밑동 쪽에서 어른거렸다. 오누이는 아래를 내려다보았다.', null, '{"maxChars":70,"forbidWords":["눈","빛","색","시선","모습","그림자","어둠","캄캄","깜깜","컴컴","흐릿","뚜렷","얼굴","시야","선명","투명","반짝","어른어른"],"forbidLemmas":["보/VV","보이/VV","바라보/VV","쳐다보/VV","내려다보/VV","올려다보/VV","둘러보/VV","살펴보/VV","띄/VV","비치/VV","빛나/VV","번쩍이/VV","반짝이/VV","어른거리/VV","밝/VA","어둡/VA","붉/VA","푸르/VA","하얗/VA","희/VA","환하/VA","검/VA","노랗/VA","누렇/VA","하얘지/VV","흐리/VA","훤하/VA","훤/XR"],"forbidLabel":"눈에 기대는 표현","forbidDisplay":["눈","빛","색","시선","모습","그림자","어둠","보다","보이다","바라보다","쳐다보다","살펴보다","밝다","어둡다","붉다","푸르다","하얗다","검다","빛나다","번쩍이다","반짝이다"]}'::jsonb,
  'folktale', 'fantasy', 'planned',
  3, 'sn-siblings-tree'
where not exists (select 1 from problems p where p.source_key = 'sn-siblings-tree');

-- rh-axe-pond (order_no 7, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'rhythm'),
  'convert', 'auto', '한 덩어리로 붙은 글을 끊어 읽히게 다시 쓰시오. 내용은 그대로 두고 줄만 나눕니다. 문장이 길어서 문장 단위로만 끊으면 줄이 넘칩니다. 문장 안에서도 끊으십시오. 7~13줄로 나누고, 한 줄은 18자를 넘기지 마십시오. 같은 줄을 되풀이해 채우지 마십시오. 분량은 111~131자로 유지합니다. 덜어내는 훈련이 아닙니다. ''나무꾼''는 반드시 남깁니다.',
  '나무꾼이 연못가에 주저앉자, 방금까지 흔들리던 물낯이 거짓말처럼 잔잔해져 있었다. 도끼는 이미 바닥까지 가라앉아 어디쯤 놓여 있는지 짐작조차 되지 않았다. 그가 소매를 팔꿈치까지 걷고 진흙 속을 더듬자, 손끝에 단단한 것이 걸렸다. 끌어올린 손바닥에 찬 기운이 오래 남아 있었다.', null, '{"maxChars":131,"maxLines":13,"minChars":111,"minLines":7,"requireAny":["나무꾼"],"maxLineChars":18,"maxDuplicateLines":2}'::jsonb,
  'folktale', 'fantasy', 'planned',
  1, 'rh-axe-pond'
where not exists (select 1 from problems p where p.source_key = 'rh-axe-pond');

-- rh-heungbu-yard (order_no 7, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'rhythm'),
  'convert', 'auto', '한 덩어리로 붙은 글을 끊어 읽히게 다시 쓰시오. 내용은 그대로 두고 줄만 나눕니다. 문장이 길어서 문장 단위로만 끊으면 줄이 넘칩니다. 문장 안에서도 끊으십시오. 7~13줄로 나누고, 한 줄은 18자를 넘기지 마십시오. 같은 줄을 되풀이해 채우지 마십시오. 분량은 111~131자로 유지합니다. 덜어내는 훈련이 아닙니다. ''제비''는 반드시 남깁니다.',
  '흥부가 마당으로 나서자, 밤새 내린 비에 땅이 질척거리고 있었다. 담장 아래에는 다리가 꺾인 채 깃털이 흠뻑 젖은 제비 한 마리가 떨어져 있었다. 흥부가 조심스럽게 두 손으로 제비를 들어 올리자, 손바닥 위에서 작은 몸이 파르르 떨렸다. 그는 제비를 감쌀 헝겊을 찾으려고 서둘러 방으로 들어갔다.', null, '{"maxChars":131,"maxLines":13,"minChars":111,"minLines":7,"requireAny":["제비"],"maxLineChars":18,"maxDuplicateLines":2}'::jsonb,
  'folktale', 'fantasy', 'planned',
  1, 'rh-heungbu-yard'
where not exists (select 1 from problems p where p.source_key = 'rh-heungbu-yard');

-- rh-kongjwi-jar (order_no 7, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'rhythm'),
  'convert', 'auto', '한 덩어리로 붙은 글을 끊어 읽히게 다시 쓰시오. 내용은 그대로 두고 줄만 나눕니다. 문장이 길어서 문장 단위로만 끊으면 줄이 넘칩니다. 문장 안에서도 끊으십시오. 7~13줄로 나누고, 한 줄은 18자를 넘기지 마십시오. 같은 줄을 되풀이해 채우지 마십시오. 분량은 111~131자로 유지합니다. 덜어내는 훈련이 아닙니다. ''물동이''는 반드시 남깁니다.',
  '콩쥐가 물동이를 내려놓자, 독 바닥에 난 금 사이로 물이 소리 없이 새어 나가고 있었다. 부으면 부은 만큼 빠져나가는데도 마당에는 도와줄 사람이 아무도 없었다. 콩쥐가 손바닥으로 금을 눌러 보았지만, 물은 손가락 사이로 그대로 흘러내렸다. 해가 담장 위로 올라올 무렵 콩쥐는 다시 우물 쪽으로 걸어갔다.', null, '{"maxChars":131,"maxLines":13,"minChars":111,"minLines":7,"requireAny":["물동이"],"maxLineChars":18,"maxDuplicateLines":2}'::jsonb,
  'folktale', 'modern', 'planned',
  1, 'rh-kongjwi-jar'
where not exists (select 1 from problems p where p.source_key = 'rh-kongjwi-jar');

-- rh-simcheong-deck (order_no 7, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'rhythm'),
  'convert', 'auto', '한 덩어리로 붙은 글을 끊어 읽히게 다시 쓰시오. 내용은 그대로 두고 줄만 나눕니다. 문장이 길어서 문장 단위로만 끊으면 줄이 넘칩니다. 문장 안에서도 끊으십시오. 7~13줄로 나누고, 한 줄은 18자를 넘기지 마십시오. 같은 줄을 되풀이해 채우지 마십시오. 분량은 111~131자로 유지합니다. 덜어내는 훈련이 아닙니다. ''공양미''는 반드시 남깁니다.',
  '심청이 뱃전에 올라서자, 노를 젓던 뱃사람들이 하나둘 손을 멈추었다. 갑판 한쪽에는 아버지의 눈을 뜨게 해 줄 공양미 삼백 석이 그대로 쌓여 있었다. 심청이 아버지의 이름을 한 번 부르고 치마를 걷어쥐자, 바람이 돛을 크게 밀었다. 발밑에서 검은 물결이 소리 없이 갈라지고 있었다.', null, '{"maxChars":131,"maxLines":13,"minChars":111,"minLines":7,"requireAny":["공양미"],"maxLineChars":18,"maxDuplicateLines":2}'::jsonb,
  'folktale', 'modern', 'planned',
  1, 'rh-simcheong-deck'
where not exists (select 1 from problems p where p.source_key = 'rh-simcheong-deck');

-- rh-goblin-club (order_no 7, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'rhythm'),
  'convert', 'auto', '한 덩어리로 붙은 글을 끊어 읽히게 다시 쓰시오. 내용은 그대로 두고 줄만 나눕니다. 문장이 길어서 문장 단위로만 끊으면 줄이 넘칩니다. 문장 안에서도 끊으십시오. 7~13줄로 나누고, 한 줄은 18자를 넘기지 마십시오. 같은 줄을 되풀이해 채우지 마십시오. 분량은 111~131자로 유지합니다. 덜어내는 훈련이 아닙니다. ''방망이''는 반드시 남깁니다.',
  '도깨비들이 마루에 둘러앉아 상 위에 놓인 방망이를 하나씩 돌려 가며 두드리기 시작했다. 방망이가 바닥을 칠 때마다 마루 위로 쌀이 한 무더기씩 쏟아져 내렸다. 기둥 뒤에 몸을 붙인 나무꾼이 숨을 죽이는 사이 발밑에서 마루가 삐걱 소리를 냈다. 도깨비들이 한꺼번에 고개를 돌렸다.', null, '{"maxChars":131,"maxLines":13,"minChars":111,"minLines":7,"requireAny":["방망이"],"maxLineChars":18,"maxDuplicateLines":2}'::jsonb,
  'folktale', 'fantasy', 'impulsive',
  2, 'rh-goblin-club'
where not exists (select 1 from problems p where p.source_key = 'rh-goblin-club');

-- rh-gyeonu-bridge (order_no 7, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'rhythm'),
  'convert', 'auto', '한 덩어리로 붙은 글을 끊어 읽히게 다시 쓰시오. 내용은 그대로 두고 줄만 나눕니다. 문장이 길어서 문장 단위로만 끊으면 줄이 넘칩니다. 문장 안에서도 끊으십시오. 7~13줄로 나누고, 한 줄은 18자를 넘기지 마십시오. 같은 줄을 되풀이해 채우지 마십시오. 분량은 111~131자로 유지합니다. 덜어내는 훈련이 아닙니다. ''까치들''는 반드시 남깁니다.',
  '견우가 강가에 나와 선 밤에도 물소리는 그치지 않고 밤새 이어졌다. 하늘이 검은 새떼로 뒤덮이더니 까치들이 서로 몸을 이어 강 위에 다리를 놓기 시작했다. 견우가 첫 발을 얹자 다리는 발밑에서 위태롭게 흔들렸지만 그는 걸음을 멈추지 않았다. 발밑에서 깃털 스치는 소리가 계속 올라왔다.', null, '{"maxChars":131,"maxLines":13,"minChars":111,"minLines":7,"requireAny":["까치들"],"maxLineChars":18,"maxDuplicateLines":2}'::jsonb,
  'folktale', 'romance', 'planned',
  2, 'rh-gyeonu-bridge'
where not exists (select 1 from problems p where p.source_key = 'rh-gyeonu-bridge');

-- rh-rabbit-gate (order_no 7, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'rhythm'),
  'convert', 'auto', '한 덩어리로 붙은 글을 끊어 읽히게 다시 쓰시오. 내용은 그대로 두고 줄만 나눕니다. 문장이 길어서 문장 단위로만 끊으면 줄이 넘칩니다. 문장 안에서도 끊으십시오. 7~13줄로 나누고, 한 줄은 18자를 넘기지 마십시오. 같은 줄을 되풀이해 채우지 마십시오. 분량은 111~131자로 유지합니다. 덜어내는 훈련이 아닙니다. ''문지기''는 반드시 남깁니다.',
  '토끼가 용궁 문 앞에 서자마자 문지기가 내린 창끝이 목 앞에서 아슬아슬하게 멈추었다. 토끼는 웃음을 거두지 않은 채 오히려 한 걸음을 더 내디뎠다. 안쪽에서 문이 천천히 열리며 복도 끝의 발소리가 점점 가까워졌다. 소매 속에 감춘 주먹만이 저도 모르게 단단히 쥐어지고 있었다.', null, '{"maxChars":131,"maxLines":13,"minChars":111,"minLines":7,"requireAny":["문지기"],"maxLineChars":18,"maxDuplicateLines":2}'::jsonb,
  'folktale', 'martial', 'impulsive',
  2, 'rh-rabbit-gate'
where not exists (select 1 from problems p where p.source_key = 'rh-rabbit-gate');

-- rh-siblings-tree (order_no 7, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'rhythm'),
  'convert', 'auto', '한 덩어리로 붙은 글을 끊어 읽히게 다시 쓰시오. 내용은 그대로 두고 줄만 나눕니다. 문장이 길어서 문장 단위로만 끊으면 줄이 넘칩니다. 문장 안에서도 끊으십시오. 7~13줄로 나누고, 한 줄은 18자를 넘기지 마십시오. 같은 줄을 되풀이해 채우지 마십시오. 분량은 111~131자로 유지합니다. 덜어내는 훈련이 아닙니다. ''오라비''는 반드시 남깁니다.',
  '오누이가 나무 꼭대기까지 올라간 뒤에도 호랑이는 밑동을 긁으며 좀처럼 물러가지 않았다. 가지가 크게 흔들릴 때마다 동생은 울음을 삼키며 오라비의 소매를 붙잡았다. 오라비가 하늘을 향해 두 손을 뻗어 무언가를 빌자 낡은 밧줄 하나가 소리 없이 내려왔다. 두 아이는 그것을 함께 붙잡았다.', null, '{"maxChars":131,"maxLines":13,"minChars":111,"minLines":7,"requireAny":["오라비"],"maxLineChars":18,"maxDuplicateLines":2}'::jsonb,
  'folktale', 'fantasy', 'impulsive',
  2, 'rh-siblings-tree'
where not exists (select 1 from problems p where p.source_key = 'rh-siblings-tree');

-- mo-axe-pond (order_no 8, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'dialogue_ratio'),
  'convert', 'auto', E'대사 사이에 속마음을 한 줄 끼워 넣으시오. 이렇게 됩니다.\n\n  사공이 노를 놓고 물끄러미 강 건너를 보았다.\n  "오늘은 배를 안 띄우려 하오."\n  ''이 물살이면 반도 못 가서 뒤집힌다.''\n  "삯은 이미 받으셨잖습니까."\n  "받은 것은 내일 돌려드리리다."\n\n원래 서술과 대사는 그대로 둡니다. 속마음은 작은따옴표로 감쌉니다.',
  E'산신이 물속에서 금도끼를 건져 올려 나무꾼 앞에 놓았다.\n"네가 빠뜨린 것이 이것이냐."\n"아닙니다. 제 것은 낡은 쇠도끼입니다."\n"그 말이 참이면 셋을 다 가져가거라."', null, '{"maxChars":200,"minChars":75,"requireAny":["쇠도끼"],"minSpeeches":3,"minMonologues":1,"maxDuplicateLines":0,"maxLineWordRepeat":6,"maxNarrationLines":3,"minMonologueChars":8,"requireMonologueBetween":true}'::jsonb,
  'folktale', 'fantasy', 'planned',
  1, 'mo-axe-pond'
where not exists (select 1 from problems p where p.source_key = 'mo-axe-pond');

-- mo-heungbu-swallow (order_no 8, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'dialogue_ratio'),
  'convert', 'auto', E'대사 사이에 속마음을 한 줄 끼워 넣으시오. 이렇게 됩니다.\n\n  사공이 노를 놓고 물끄러미 강 건너를 보았다.\n  "오늘은 배를 안 띄우려 하오."\n  ''이 물살이면 반도 못 가서 뒤집힌다.''\n  "삯은 이미 받으셨잖습니까."\n  "받은 것은 내일 돌려드리리다."\n\n원래 서술과 대사는 그대로 둡니다. 속마음은 작은따옴표로 감쌉니다.',
  E'흥부가 마당으로 나서자 담장 아래 제비 한 마리가 떨어져 있었다.\n"다리가 부러졌소. 데려다 거둡시다."\n"아이들 먹일 것도 없어요."\n"그래도 눈앞에서 죽게 둘 수야 없지."', null, '{"maxChars":200,"minChars":75,"requireAny":["제비"],"minSpeeches":3,"minMonologues":1,"maxDuplicateLines":0,"maxLineWordRepeat":6,"maxNarrationLines":3,"minMonologueChars":8,"requireMonologueBetween":true}'::jsonb,
  'folktale', 'fantasy', 'planned',
  1, 'mo-heungbu-swallow'
where not exists (select 1 from problems p where p.source_key = 'mo-heungbu-swallow');

-- mo-kongjwi-shoe (order_no 8, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'dialogue_ratio'),
  'convert', 'auto', E'대사 사이에 속마음을 한 줄 끼워 넣으시오. 이렇게 됩니다.\n\n  사공이 노를 놓고 물끄러미 강 건너를 보았다.\n  "오늘은 배를 안 띄우려 하오."\n  ''이 물살이면 반도 못 가서 뒤집힌다.''\n  "삯은 이미 받으셨잖습니까."\n  "받은 것은 내일 돌려드리리다."\n\n원래 서술과 대사는 그대로 둡니다. 속마음은 작은따옴표로 감쌉니다.',
  E'원님이 뜰에 놓인 신 한 짝을 턱으로 가리켰다.\n"저것이 네 것이냐."\n"제 것이 맞습니다."\n"신어 보아라. 발이 맞지 않으면 도둑으로 다스린다."', null, '{"maxChars":200,"minChars":75,"requireAny":["도둑"],"minSpeeches":3,"minMonologues":1,"maxDuplicateLines":0,"maxLineWordRepeat":6,"maxNarrationLines":3,"minMonologueChars":8,"requireMonologueBetween":true}'::jsonb,
  'folktale', 'modern', 'impulsive',
  1, 'mo-kongjwi-shoe'
where not exists (select 1 from problems p where p.source_key = 'mo-kongjwi-shoe');

-- mo-simcheong-rice (order_no 8, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'dialogue_ratio'),
  'convert', 'auto', E'대사 사이에 속마음을 한 줄 끼워 넣으시오. 이렇게 됩니다.\n\n  사공이 노를 놓고 물끄러미 강 건너를 보았다.\n  "오늘은 배를 안 띄우려 하오."\n  ''이 물살이면 반도 못 가서 뒤집힌다.''\n  "삯은 이미 받으셨잖습니까."\n  "받은 것은 내일 돌려드리리다."\n\n원래 서술과 대사는 그대로 둡니다. 속마음은 작은따옴표로 감쌉니다.',
  E'심청이 아버지 앞에 무릎을 접고 앉았다.\n"공양미 삼백 석이면 눈을 뜨신다 합니다."\n"그 많은 쌀을 어디서 구한단 말이냐."\n"이미 마련해 두었으니 묻지 마십시오."', null, '{"maxChars":200,"minChars":75,"requireAny":["공양미"],"minSpeeches":3,"minMonologues":1,"maxDuplicateLines":0,"maxLineWordRepeat":6,"maxNarrationLines":3,"minMonologueChars":8,"requireMonologueBetween":true}'::jsonb,
  'folktale', 'modern', 'planned',
  1, 'mo-simcheong-rice'
where not exists (select 1 from problems p where p.source_key = 'mo-simcheong-rice');

-- mo-goblin-club (order_no 8, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'dialogue_ratio'),
  'convert', 'auto', E'대사 사이에 속마음을 한 줄 끼워 넣으시오. 이렇게 됩니다.\n\n  사공이 노를 놓고 물끄러미 강 건너를 보았다.\n  "오늘은 배를 안 띄우려 하오."\n  ''이 물살이면 반도 못 가서 뒤집힌다.''\n  "삯은 이미 받으셨잖습니까."\n  "받은 것은 내일 돌려드리리다."\n\n원래 서술과 대사는 그대로 둡니다. 속마음은 작은따옴표로 감쌉니다.',
  E'도깨비들이 방망이를 두드리다 말고 노인 쪽으로 고개를 돌렸다.\n"그 고운 노래가 어디서 나오느냐."\n"이 혹에서 나옵니다."\n"거짓이면 저 방망이로 다스리겠다."', null, '{"maxChars":200,"minChars":75,"requireAny":["방망이"],"minSpeeches":3,"minMonologues":1,"maxDuplicateLines":0,"maxLineWordRepeat":6,"maxNarrationLines":3,"minMonologueChars":8,"requireMonologueBetween":true}'::jsonb,
  'folktale', 'fantasy', 'impulsive',
  2, 'mo-goblin-club'
where not exists (select 1 from problems p where p.source_key = 'mo-goblin-club');

-- mo-gyeonu-bridge (order_no 8, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'dialogue_ratio'),
  'convert', 'auto', E'대사 사이에 속마음을 한 줄 끼워 넣으시오. 이렇게 됩니다.\n\n  사공이 노를 놓고 물끄러미 강 건너를 보았다.\n  "오늘은 배를 안 띄우려 하오."\n  ''이 물살이면 반도 못 가서 뒤집힌다.''\n  "삯은 이미 받으셨잖습니까."\n  "받은 것은 내일 돌려드리리다."\n\n원래 서술과 대사는 그대로 둡니다. 속마음은 작은따옴표로 감쌉니다.',
  E'까치들이 은하 위로 몰려들었으나 다리는 좀처럼 이어지지 않았다.\n"올해는 비가 늦게 그쳤습니다."\n"그러면 만날 날이 하루 줄어들겠군요."\n"줄어든 하루는 내년에 갚으면 되오."', null, '{"maxChars":200,"minChars":75,"requireAny":["까치"],"minSpeeches":3,"minMonologues":1,"maxDuplicateLines":0,"maxLineWordRepeat":6,"maxNarrationLines":3,"minMonologueChars":8,"requireMonologueBetween":true}'::jsonb,
  'folktale', 'romance', 'planned',
  2, 'mo-gyeonu-bridge'
where not exists (select 1 from problems p where p.source_key = 'mo-gyeonu-bridge');

-- mo-rabbit-gate (order_no 8, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'dialogue_ratio'),
  'convert', 'auto', E'대사 사이에 속마음을 한 줄 끼워 넣으시오. 이렇게 됩니다.\n\n  사공이 노를 놓고 물끄러미 강 건너를 보았다.\n  "오늘은 배를 안 띄우려 하오."\n  ''이 물살이면 반도 못 가서 뒤집힌다.''\n  "삯은 이미 받으셨잖습니까."\n  "받은 것은 내일 돌려드리리다."\n\n원래 서술과 대사는 그대로 둡니다. 속마음은 작은따옴표로 감쌉니다.',
  E'용왕이 옥좌에서 몸을 앞으로 기울였다.\n"네 간이 어디에 있느냐."\n"뭍에 두고 왔사옵니다."\n"용궁까지 온 놈의 혀를 어찌 믿으시렵니까."', null, '{"maxChars":200,"minChars":75,"requireAny":["용궁"],"minSpeeches":3,"minMonologues":1,"maxDuplicateLines":0,"maxLineWordRepeat":6,"maxNarrationLines":3,"minMonologueChars":8,"requireMonologueBetween":true}'::jsonb,
  'folktale', 'martial', 'planned',
  2, 'mo-rabbit-gate'
where not exists (select 1 from problems p where p.source_key = 'mo-rabbit-gate');

-- mo-siblings-rope (order_no 8, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'dialogue_ratio'),
  'convert', 'auto', E'대사 사이에 속마음을 한 줄 끼워 넣으시오. 이렇게 됩니다.\n\n  사공이 노를 놓고 물끄러미 강 건너를 보았다.\n  "오늘은 배를 안 띄우려 하오."\n  ''이 물살이면 반도 못 가서 뒤집힌다.''\n  "삯은 이미 받으셨잖습니까."\n  "받은 것은 내일 돌려드리리다."\n\n원래 서술과 대사는 그대로 둡니다. 속마음은 작은따옴표로 감쌉니다.',
  E'문 밖에서 발소리가 멎고 낮은 목소리가 들려왔다.\n"얘들아, 문을 열어라. 밖이 몹시 춥구나."\n"어머니 목소리가 아니야."\n"손을 들이밀어 보라고 해."', null, '{"maxChars":200,"minChars":75,"requireAny":["어머니"],"minSpeeches":3,"minMonologues":1,"maxDuplicateLines":0,"maxLineWordRepeat":6,"maxNarrationLines":3,"minMonologueChars":8,"requireMonologueBetween":true}'::jsonb,
  'folktale', 'fantasy', 'impulsive',
  2, 'mo-siblings-rope'
where not exists (select 1 from problems p where p.source_key = 'mo-siblings-rope');

-- pv-broken-gate (order_no 9, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'pov_lock'),
  'convert', 'auto', E'한 사람의 눈에 든 것만 남기고 다시 쓰시오. 이렇게 됩니다.\n\n  저 앞 나루에는 배 세 척이 묶여 있었고, 사공 둘이 그물을 손질하고 있었다.\n  덕수는 둑 위에 서 있었다.\n\n  ↓\n\n  덕수가 둑을 내려서자 젖은 밧줄 냄새가 먼저 올라왔다.\n  발치에서 물이 뱃전을 두드렸고, 등 뒤에서 그물 터는 소리가 났다.\n\n1인칭으로 바꾸지 않습니다. 그 사람이 못 본 것은 쓰지 않습니다.',
  E'멀찍이 무너진 성문 앞에 병사 열이 창을 세우고 늘어섰고, 깨진 돌이 길을 반쯤 막고 있었다.\n규담은 마른 도랑에 엎드려 있었다.', null, '{"minChars":20,"maxChars":130,"forbidWords":["저기","저쪽","저 멀리","저 너머","저 위","저 앞","멀찍이","병사 열이","길을 반쯤 막고"],"requireAny":["규담"]}'::jsonb,
  'original', 'fantasy', 'planned',
  1, 'pv-broken-gate'
where not exists (select 1 from problems p where p.source_key = 'pv-broken-gate');

-- pv-drill-yard (order_no 9, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'pov_lock'),
  'convert', 'auto', E'한 사람의 눈에 든 것만 남기고 다시 쓰시오. 이렇게 됩니다.\n\n  저 앞 나루에는 배 세 척이 묶여 있었고, 사공 둘이 그물을 손질하고 있었다.\n  덕수는 둑 위에 서 있었다.\n\n  ↓\n\n  덕수가 둑을 내려서자 젖은 밧줄 냄새가 먼저 올라왔다.\n  발치에서 물이 뱃전을 두드렸고, 등 뒤에서 그물 터는 소리가 났다.\n\n1인칭으로 바꾸지 않습니다. 그 사람이 못 본 것은 쓰지 않습니다.',
  E'저 멀리 연무장에서는 제자 스물이 목검을 휘둘렀고, 흙먼지가 담장 위로 피어올랐다.\n무결은 회랑 기둥에 기대 있었다.', null, '{"minChars":20,"maxChars":130,"forbidWords":["저기","저쪽","저 멀리","저 너머","저 위","저 앞","멀찍이","제자 스물","흙먼지가 담장 위로"],"requireAny":["무결"]}'::jsonb,
  'original', 'martial', 'impulsive',
  1, 'pv-drill-yard'
where not exists (select 1 from problems p where p.source_key = 'pv-drill-yard');

-- pv-guild-desk (order_no 9, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'pov_lock'),
  'convert', 'auto', E'한 사람의 눈에 든 것만 남기고 다시 쓰시오. 이렇게 됩니다.\n\n  저 앞 나루에는 배 세 척이 묶여 있었고, 사공 둘이 그물을 손질하고 있었다.\n  덕수는 둑 위에 서 있었다.\n\n  ↓\n\n  덕수가 둑을 내려서자 젖은 밧줄 냄새가 먼저 올라왔다.\n  발치에서 물이 뱃전을 두드렸고, 등 뒤에서 그물 터는 소리가 났다.\n\n1인칭으로 바꾸지 않습니다. 그 사람이 못 본 것은 쓰지 않습니다.',
  E'저쪽 길드 사무실에는 모험가 열둘이 모여 있었고, 벽에는 의뢰서가 빼곡히 붙어 있었다.\n하람은 문턱에 서 있었다.', null, '{"minChars":20,"maxChars":130,"forbidWords":["저기","저쪽","저 멀리","저 너머","저 위","저 앞","멀찍이","모험가 열둘","의뢰서가 빼곡히"],"requireAny":["하람"]}'::jsonb,
  'original', 'fantasy', 'planned',
  1, 'pv-guild-desk'
where not exists (select 1 from problems p where p.source_key = 'pv-guild-desk');

-- pv-star-field (order_no 9, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'pov_lock'),
  'convert', 'auto', E'한 사람의 눈에 든 것만 남기고 다시 쓰시오. 이렇게 됩니다.\n\n  저 앞 나루에는 배 세 척이 묶여 있었고, 사공 둘이 그물을 손질하고 있었다.\n  덕수는 둑 위에 서 있었다.\n\n  ↓\n\n  덕수가 둑을 내려서자 젖은 밧줄 냄새가 먼저 올라왔다.\n  발치에서 물이 뱃전을 두드렸고, 등 뒤에서 그물 터는 소리가 났다.\n\n1인칭으로 바꾸지 않습니다. 그 사람이 못 본 것은 쓰지 않습니다.',
  E'저기 하늘에 별이 떠 있고, 남자 둘 여자 하나가 지나가며 이야기를 나누고 있었다.\n태윤은 담장 아래 서 있었다.', null, '{"minChars":20,"maxChars":130,"forbidWords":["저기","저쪽","저 멀리","저 너머","저 위","저 앞","멀찍이","남자 둘 여자 하나","이야기를 나누고"],"requireAny":["태윤"]}'::jsonb,
  'original', 'modern', 'planned',
  1, 'pv-star-field'
where not exists (select 1 from problems p where p.source_key = 'pv-star-field');

-- pv-banquet-hall (order_no 9, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'pov_lock'),
  'convert', 'auto', E'한 사람의 눈에 든 것만 남기고 다시 쓰시오. 이렇게 됩니다.\n\n  저 앞 나루에는 배 세 척이 묶여 있었고, 사공 둘이 그물을 손질하고 있었다.\n  덕수는 둑 위에 서 있었다.\n\n  ↓\n\n  덕수가 둑을 내려서자 젖은 밧줄 냄새가 먼저 올라왔다.\n  발치에서 물이 뱃전을 두드렸고, 등 뒤에서 그물 터는 소리가 났다.\n\n1인칭으로 바꾸지 않습니다. 그 사람이 못 본 것은 쓰지 않습니다.',
  E'저 위 연회장에는 촛대 열둘이 타올랐고, 귀족 예닐곱이 잔을 든 채 낮은 말을 주고받았다.\n유안은 계단 아래 그늘에 서 있었다.', null, '{"minChars":20,"maxChars":130,"forbidWords":["저기","저쪽","저 멀리","저 너머","저 위","저 앞","멀찍이","촛대 열둘","귀족 예닐곱이"],"requireAny":["유안"]}'::jsonb,
  'original', 'fantasy', 'planned',
  2, 'pv-banquet-hall'
where not exists (select 1 from problems p where p.source_key = 'pv-banquet-hall');

-- pv-dawn-market (order_no 9, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'pov_lock'),
  'convert', 'auto', E'한 사람의 눈에 든 것만 남기고 다시 쓰시오. 이렇게 됩니다.\n\n  저 앞 나루에는 배 세 척이 묶여 있었고, 사공 둘이 그물을 손질하고 있었다.\n  덕수는 둑 위에 서 있었다.\n\n  ↓\n\n  덕수가 둑을 내려서자 젖은 밧줄 냄새가 먼저 올라왔다.\n  발치에서 물이 뱃전을 두드렸고, 등 뒤에서 그물 터는 소리가 났다.\n\n1인칭으로 바꾸지 않습니다. 그 사람이 못 본 것은 쓰지 않습니다.',
  E'저 앞 시장에는 좌판 여덟이 늘어섰고, 짐꾼 셋이 상자를 나르며 고함을 주고받고 있었다.\n정순은 골목 어귀에 서 있었다.', null, '{"minChars":20,"maxChars":130,"forbidWords":["저기","저쪽","저 멀리","저 너머","저 위","저 앞","멀찍이","좌판 여덟","짐꾼 셋이"],"requireAny":["정순"]}'::jsonb,
  'original', 'modern', 'impulsive',
  2, 'pv-dawn-market'
where not exists (select 1 from problems p where p.source_key = 'pv-dawn-market');

-- pv-frozen-lake (order_no 9, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'pov_lock'),
  'convert', 'auto', E'한 사람의 눈에 든 것만 남기고 다시 쓰시오. 이렇게 됩니다.\n\n  저 앞 나루에는 배 세 척이 묶여 있었고, 사공 둘이 그물을 손질하고 있었다.\n  덕수는 둑 위에 서 있었다.\n\n  ↓\n\n  덕수가 둑을 내려서자 젖은 밧줄 냄새가 먼저 올라왔다.\n  발치에서 물이 뱃전을 두드렸고, 등 뒤에서 그물 터는 소리가 났다.\n\n1인칭으로 바꾸지 않습니다. 그 사람이 못 본 것은 쓰지 않습니다.',
  E'저기 얼어붙은 호수에는 낚시 구멍 열넷이 뚫려 있었고, 아이 셋이 얼음을 지치며 소리를 질렀다.\n연희는 비탈 위 바위에 앉아 있었다.', null, '{"minChars":20,"maxChars":130,"forbidWords":["저기","저쪽","저 멀리","저 너머","저 위","저 앞","멀찍이","낚시 구멍 열넷","아이 셋이"],"requireAny":["연희"]}'::jsonb,
  'original', 'fantasy', 'impulsive',
  2, 'pv-frozen-lake'
where not exists (select 1 from problems p where p.source_key = 'pv-frozen-lake');

-- pv-lantern-night (order_no 9, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'pov_lock'),
  'convert', 'auto', E'한 사람의 눈에 든 것만 남기고 다시 쓰시오. 이렇게 됩니다.\n\n  저 앞 나루에는 배 세 척이 묶여 있었고, 사공 둘이 그물을 손질하고 있었다.\n  덕수는 둑 위에 서 있었다.\n\n  ↓\n\n  덕수가 둑을 내려서자 젖은 밧줄 냄새가 먼저 올라왔다.\n  발치에서 물이 뱃전을 두드렸고, 등 뒤에서 그물 터는 소리가 났다.\n\n1인칭으로 바꾸지 않습니다. 그 사람이 못 본 것은 쓰지 않습니다.',
  E'저 너머 강가에는 등불 스무 개가 떠갔고, 다리 위에서 연인 넷이 난간에 기대 웃고 있었다.\n소하는 버드나무 그늘에 서 있었다.', null, '{"minChars":20,"maxChars":130,"forbidWords":["저기","저쪽","저 멀리","저 너머","저 위","저 앞","멀찍이","등불 스무 개","연인 넷이"],"requireAny":["소하"]}'::jsonb,
  'original', 'romance', 'planned',
  2, 'pv-lantern-night'
where not exists (select 1 from problems p where p.source_key = 'pv-lantern-night');

-- ar-cracked-ice (order_no 10, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'action_reason'),
  'fill', 'auto', E'고정된 줄 사이에 뚫린 빈칸을 채우시오. 이렇게 됩니다.\n\n  덕수가 장터에서 자신을 밀친 사내와 맞붙습니다.\n  사내는 앞서 오른쪽 다리를 절뚝였습니다.\n\n  사내가 어깨를 들이밀며 다가왔다.\n  ①\n  덕수는 왼발을 반 보 뒤로 뺐다.\n  ②\n  덕수의 발이 사내의 절뚝인 걸음을 걸어 넘겼다.\n\n  ↓\n\n  ①  주먹을 쥐어 봐야 힘에서 진다. 덕수는 다른 것을 보기로 했다.\n  ②  사내는 걸음마다 오른쪽이 반 박자 늦었다. 덕수는 그것을 세 번 세었다.\n\n빈칸마다 한 문장에서 두 문장으로 씁니다.\n앞뒤 줄을 그대로 옮겨 적지 않습니다.\n무엇을 했는지가 아니라 왜 그렇게 했는지를 씁니다.\n[상황]·[복선]·[결정타]는 힌트일 뿐이고, 답에 그 대괄호를 쓰지 않습니다.',
  E'[상황] 도경이 얼어붙은 강을 건너다 늑대 무리에 둘러싸인다. 강 한가운데는 물살이 빨라 얼음이 얇고 색이 검다. 도경은 그 자리를 지나왔다. 늑대는 여섯이고, 무리로 붙어 몰아붙인다.\n[복선] 지나오며 발밑에서 들은 금 가는 소리\n[결정타] 갈라진 얼음\n\n늑대 여섯이 원을 좁혀 왔다.\n①\n도경은 강 한가운데로 물러섰다.\n②\n갈라진 얼음이 늑대를 삼켰다.', null, '{"blanks":[{"key":"①","label":"도경이 물러설 곳을 어떻게 골랐는지","minSentences":1,"maxSentences":2,"maxChars":60},{"key":"②","label":"늑대가 왜 따라 들어왔는지","minSentences":1,"maxSentences":2,"maxChars":60}],"forbidWords":["[상황]","[복선]","[결정타]"],"forbidCopyOfFixedLines":true,"fixedLines":["늑대 여섯이 원을 좁혀 왔다.","도경은 강 한가운데로 물러섰다.","갈라진 얼음이 늑대를 삼켰다."]}'::jsonb,
  'original', 'fantasy', 'impulsive',
  1, 'ar-cracked-ice'
where not exists (select 1 from problems p where p.source_key = 'ar-cracked-ice');

-- ar-dragon-jaw (order_no 10, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'action_reason'),
  'fill', 'auto', E'고정된 줄 사이에 뚫린 빈칸을 채우시오. 이렇게 됩니다.\n\n  덕수가 장터에서 자신을 밀친 사내와 맞붙습니다.\n  사내는 앞서 오른쪽 다리를 절뚝였습니다.\n\n  사내가 어깨를 들이밀며 다가왔다.\n  ①\n  덕수는 왼발을 반 보 뒤로 뺐다.\n  ②\n  덕수의 발이 사내의 절뚝인 걸음을 걸어 넘겼다.\n\n  ↓\n\n  ①  주먹을 쥐어 봐야 힘에서 진다. 덕수는 다른 것을 보기로 했다.\n  ②  사내는 걸음마다 오른쪽이 반 박자 늦었다. 덕수는 그것을 세 번 세었다.\n\n빈칸마다 한 문장에서 두 문장으로 씁니다.\n앞뒤 줄을 그대로 옮겨 적지 않습니다.\n무엇을 했는지가 아니라 왜 그렇게 했는지를 씁니다.\n[상황]·[복선]·[결정타]는 힌트일 뿐이고, 답에 그 대괄호를 쓰지 않습니다.',
  E'[상황] 각성자 태윤이 던전에서 용의 형상을 한 괴물과 마주친다. 괴물은 크고 팔이 길어 정면에서는 닿지 않는다. 태윤의 각성 등급으로는 한 방을 제대로 넣어야 끝난다.\n[복선] 괴물이 팔을 휘두를 때마다 턱이 앞으로 나오는 것\n[결정타] 턱\n\n괴물이 팔을 휘두르며 덮쳐 왔다.\n①\n태윤은 고개를 숙여 그 아래로 들어갔다.\n②\n주먹이 괴물의 턱에 꽂혔다.', null, '{"blanks":[{"key":"①","label":"태윤이 이 순간 무엇을 하는지","minSentences":1,"maxSentences":2,"maxChars":60,"optional":true},{"key":"②","label":"태윤이 무엇을 보고 턱을 노렸는지","minSentences":1,"maxSentences":2,"maxChars":60}],"forbidWords":["[상황]","[복선]","[결정타]"],"forbidCopyOfFixedLines":true,"fixedLines":["괴물이 팔을 휘두르며 덮쳐 왔다.","태윤은 고개를 숙여 그 아래로 들어갔다.","주먹이 괴물의 턱에 꽂혔다."]}'::jsonb,
  'original', 'modern', 'planned',
  1, 'ar-dragon-jaw'
where not exists (select 1 from problems p where p.source_key = 'ar-dragon-jaw');

-- ar-dull-blade (order_no 10, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'action_reason'),
  'fill', 'auto', E'고정된 줄 사이에 뚫린 빈칸을 채우시오. 이렇게 됩니다.\n\n  덕수가 장터에서 자신을 밀친 사내와 맞붙습니다.\n  사내는 앞서 오른쪽 다리를 절뚝였습니다.\n\n  사내가 어깨를 들이밀며 다가왔다.\n  ①\n  덕수는 왼발을 반 보 뒤로 뺐다.\n  ②\n  덕수의 발이 사내의 절뚝인 걸음을 걸어 넘겼다.\n\n  ↓\n\n  ①  주먹을 쥐어 봐야 힘에서 진다. 덕수는 다른 것을 보기로 했다.\n  ②  사내는 걸음마다 오른쪽이 반 박자 늦었다. 덕수는 그것을 세 번 세었다.\n\n빈칸마다 한 문장에서 두 문장으로 씁니다.\n앞뒤 줄을 그대로 옮겨 적지 않습니다.\n무엇을 했는지가 아니라 왜 그렇게 했는지를 씁니다.\n[상황]·[복선]·[결정타]는 힌트일 뿐이고, 답에 그 대괄호를 쓰지 않습니다.',
  E'[상황] 무결이 사부와 대련한다. 사부는 중검을 쓴다. 빠르지 않고 무겁기만 한 검이다. 무결은 그 느린 검을 막을 수 있다고 생각했다.\n[복선] 막을 수 있다는 생각\n[결정타] 목젖 — 사부의 검이 닿는다\n\n중검의 묘리를 담은 칼이 천천히 위에서 아래로 떨어졌다.\n①\n무결은 검을 들어 받아쳤다.\n②\n사부의 검이 무결의 목젖 위에 있었다.', null, '{"blanks":[{"key":"①","label":"무결이 무엇을 하기로 했는지","minSentences":1,"maxSentences":2,"maxChars":60},{"key":"②","label":"받아친 뒤에 무엇이 일어났는지","minSentences":1,"maxSentences":2,"maxChars":60}],"forbidWords":["[상황]","[복선]","[결정타]"],"forbidCopyOfFixedLines":true,"fixedLines":["중검의 묘리를 담은 칼이 천천히 위에서 아래로 떨어졌다.","무결은 검을 들어 받아쳤다.","사부의 검이 무결의 목젖 위에 있었다."]}'::jsonb,
  'original', 'martial', 'planned',
  1, 'ar-dull-blade'
where not exists (select 1 from problems p where p.source_key = 'ar-dull-blade');

-- ar-left-feeler (order_no 10, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'action_reason'),
  'fill', 'auto', E'고정된 줄 사이에 뚫린 빈칸을 채우시오. 이렇게 됩니다.\n\n  덕수가 장터에서 자신을 밀친 사내와 맞붙습니다.\n  사내는 앞서 오른쪽 다리를 절뚝였습니다.\n\n  사내가 어깨를 들이밀며 다가왔다.\n  ①\n  덕수는 왼발을 반 보 뒤로 뺐다.\n  ②\n  덕수의 발이 사내의 절뚝인 걸음을 걸어 넘겼다.\n\n  ↓\n\n  ①  주먹을 쥐어 봐야 힘에서 진다. 덕수는 다른 것을 보기로 했다.\n  ②  사내는 걸음마다 오른쪽이 반 박자 늦었다. 덕수는 그것을 세 번 세었다.\n\n빈칸마다 한 문장에서 두 문장으로 씁니다.\n앞뒤 줄을 그대로 옮겨 적지 않습니다.\n무엇을 했는지가 아니라 왜 그렇게 했는지를 씁니다.\n[상황]·[복선]·[결정타]는 힌트일 뿐이고, 답에 그 대괄호를 쓰지 않습니다.',
  E'[상황] 연희가 좁은 갱도에서 마수와 마주친다. 갱도는 등불 하나뿐이라 어둡다. 마수는 눈이 퇴화했고 머리 양옆의 더듬이로 공기의 흔들림을 읽는다. 연희는 광부라 그 짐승을 안다.\n[복선] 앞서 마수가 오른쪽 벽만 훑고 지나간 것\n[결정타] 곡괭이로 잘라 낸 왼쪽 더듬이\n\n마수가 머리를 흔들며 갱도를 좁혀 왔다.\n①\n연희는 등불을 오른쪽 벽으로 던졌다.\n②\n곡괭이가 왼쪽 더듬이를 잘라 냈다.', null, '{"blanks":[{"key":"①","label":"연희가 어느 쪽으로 붙을지 어떻게 정했는지","minSentences":1,"maxSentences":2,"maxChars":60},{"key":"②","label":"등불을 던진 것이 무엇을 만들었는지","minSentences":1,"maxSentences":2,"maxChars":60}],"forbidWords":["[상황]","[복선]","[결정타]"],"forbidCopyOfFixedLines":true,"fixedLines":["마수가 머리를 흔들며 갱도를 좁혀 왔다.","연희는 등불을 오른쪽 벽으로 던졌다.","곡괭이가 왼쪽 더듬이를 잘라 냈다."]}'::jsonb,
  'original', 'fantasy', 'impulsive',
  1, 'ar-left-feeler'
where not exists (select 1 from problems p where p.source_key = 'ar-left-feeler');

-- at-cracked-ice (order_no 10, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'action_turn'),
  'convert', 'auto', E'빌드업 세 줄 뒤에 결정타 한 줄을 쓰시오. 이렇게 됩니다.\n\n  덕수가 장터에서 자신을 밀친 사내와 맞붙습니다.\n  결정타로 쓸 것은 사내가 앞서 절뚝인 걸음입니다.\n\n  ↓\n\n  덕수는 주먹을 쥐지 않았다.\n  사내가 걸음을 옮길 때마다 오른쪽이 반 박자 늦었다.\n  덕수는 그것을 세 번 세었다.\n  덕수의 발이 그 절뚝인 걸음을 걸어 넘겼다.\n\n네 줄로 씁니다. [결정타] 요소는 마지막 줄에 옵니다.\n동작을 낱낱이 늘어놓지 않습니다.\n무엇을 했는지보다 왜 그렇게 했는지가 빌드업입니다.',
  E'[상황] 도경이 얼어붙은 강 위에서 늑대 무리에 둘러싸인다.\n[결정타] 발밑에서 갈라진 얼음', null, '{"minLines":4,"maxLines":4,"maxLineChars":30,"requireAny":["갈라진 얼음"],"requireInLastLine":["갈라진 얼음"],"forbidWords":["[상황]","[복선]","[결정타]"]}'::jsonb,
  'original', 'fantasy', 'impulsive',
  1, 'at-cracked-ice'
where not exists (select 1 from problems p where p.source_key = 'at-cracked-ice');

-- at-left-feeler (order_no 10, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'action_turn'),
  'convert', 'auto', E'빌드업 세 줄 뒤에 결정타 한 줄을 쓰시오. 이렇게 됩니다.\n\n  덕수가 장터에서 자신을 밀친 사내와 맞붙습니다.\n  결정타로 쓸 것은 사내가 앞서 절뚝인 걸음입니다.\n\n  ↓\n\n  덕수는 주먹을 쥐지 않았다.\n  사내가 걸음을 옮길 때마다 오른쪽이 반 박자 늦었다.\n  덕수는 그것을 세 번 세었다.\n  덕수의 발이 그 절뚝인 걸음을 걸어 넘겼다.\n\n네 줄로 씁니다. [결정타] 요소는 마지막 줄에 옵니다.\n동작을 낱낱이 늘어놓지 않습니다.\n무엇을 했는지보다 왜 그렇게 했는지가 빌드업입니다.',
  E'[상황] 연희가 좁은 갱도에서 마수와 갑자기 마주친다.\n[결정타] 움직임을 읽는 마수의 왼쪽 더듬이', null, '{"minLines":4,"maxLines":4,"maxLineChars":30,"requireAny":["왼쪽 더듬이"],"requireInLastLine":["왼쪽 더듬이"],"forbidWords":["[상황]","[복선]","[결정타]"]}'::jsonb,
  'original', 'fantasy', 'impulsive',
  1, 'at-left-feeler'
where not exists (select 1 from problems p where p.source_key = 'at-left-feeler');

-- at-left-feint (order_no 10, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'action_turn'),
  'convert', 'auto', E'빌드업 세 줄 뒤에 결정타 한 줄을 쓰시오. 이렇게 됩니다.\n\n  덕수가 장터에서 자신을 밀친 사내와 맞붙습니다.\n  결정타로 쓸 것은 사내가 앞서 절뚝인 걸음입니다.\n\n  ↓\n\n  덕수는 주먹을 쥐지 않았다.\n  사내가 걸음을 옮길 때마다 오른쪽이 반 박자 늦었다.\n  덕수는 그것을 세 번 세었다.\n  덕수의 발이 그 절뚝인 걸음을 걸어 넘겼다.\n\n네 줄로 씁니다. [결정타] 요소는 마지막 줄에 옵니다.\n동작을 낱낱이 늘어놓지 않습니다.\n무엇을 했는지보다 왜 그렇게 했는지가 빌드업입니다.',
  E'[상황] 태윤이 자신보다 머리 하나 큰 상대와 맞붙는다.\n[결정타] 상대가 앞서 한 번 보인 왼발 페인트', null, '{"minLines":4,"maxLines":4,"maxLineChars":30,"requireAny":["왼발 페인트"],"requireInLastLine":["왼발 페인트"],"forbidWords":["[상황]","[복선]","[결정타]"]}'::jsonb,
  'original', 'modern', 'planned',
  1, 'at-left-feint'
where not exists (select 1 from problems p where p.source_key = 'at-left-feint');

-- at-look-back (order_no 10, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'action_turn'),
  'convert', 'auto', E'빌드업 세 줄 뒤에 결정타 한 줄을 쓰시오. 이렇게 됩니다.\n\n  덕수가 장터에서 자신을 밀친 사내와 맞붙습니다.\n  결정타로 쓸 것은 사내가 앞서 절뚝인 걸음입니다.\n\n  ↓\n\n  덕수는 주먹을 쥐지 않았다.\n  사내가 걸음을 옮길 때마다 오른쪽이 반 박자 늦었다.\n  덕수는 그것을 세 번 세었다.\n  덕수의 발이 그 절뚝인 걸음을 걸어 넘겼다.\n\n네 줄로 씁니다. [결정타] 요소는 마지막 줄에 옵니다.\n동작을 낱낱이 늘어놓지 않습니다.\n무엇을 했는지보다 왜 그렇게 했는지가 빌드업입니다.',
  E'[상황] 수하가 저승 문턱에서 자신을 돌려보내려는 문지기와 마주 선다.\n[결정타] 뒤를 돌아보지 않겠다는 말', null, '{"minLines":4,"maxLines":4,"maxLineChars":30,"requireAny":["돌아보지 않겠다"],"requireInLastLine":["돌아보지 않겠다"],"forbidWords":["[상황]","[복선]","[결정타]"]}'::jsonb,
  'original', 'romance', 'planned',
  1, 'at-look-back'
where not exists (select 1 from problems p where p.source_key = 'at-look-back');

-- ar-bell-rope (order_no 10, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'action_reason'),
  'fill', 'auto', E'고정된 줄 사이에 뚫린 빈칸을 채우시오. 이렇게 됩니다.\n\n  덕수가 장터에서 자신을 밀친 사내와 맞붙습니다.\n  사내는 앞서 오른쪽 다리를 절뚝였습니다.\n\n  사내가 어깨를 들이밀며 다가왔다.\n  ①\n  덕수는 왼발을 반 보 뒤로 뺐다.\n  ②\n  덕수의 발이 사내의 절뚝인 걸음을 걸어 넘겼다.\n\n  ↓\n\n  ①  주먹을 쥐어 봐야 힘에서 진다. 덕수는 다른 것을 보기로 했다.\n  ②  사내는 걸음마다 오른쪽이 반 박자 늦었다. 덕수는 그것을 세 번 세었다.\n\n빈칸마다 한 문장에서 두 문장으로 씁니다.\n앞뒤 줄을 그대로 옮겨 적지 않습니다.\n무엇을 했는지가 아니라 왜 그렇게 했는지를 씁니다.\n[상황]·[복선]·[결정타]는 힌트일 뿐이고, 답에 그 대괄호를 쓰지 않습니다.',
  E'[상황] 서린이 종탑 꼭대기에서 추격자와 마주 선다. 추격자의 이마에는 검은 표식이 있다. 누이를 죽인 자다. 이 마을에는 오래된 설화가 있다. 종이 울리면 마을의 수호신이 내려와 성 안의 부정한 것을 거둔다. 서린과 누이는 어릴 적부터 그 종탑에 공물을 올렸다. 아무도 그 설화를 믿지 않는다. 서린도 믿지 않았다.\n[복선] 누이와 함께 종탑에 공물을 올리던 일\n[결정타] 종줄\n\n추격자가 등 뒤로 바짝 쫓아오고 있다.\n①\n칼끝이 서린의 볼을 스치고 벽에 부딪쳤다.\n②\n서린은 뒤로 물러서며 막다른 벽에 등을 붙였다.\n③\n종줄이 당겨지고 종이 울렸다.', null, '{"blanks":[{"key":"①","label":"서린이 이 순간 무엇을 하는지","minSentences":1,"maxSentences":3,"maxChars":60},{"key":"②","label":"볼을 베인 서린이 무엇을 느끼거나 깨닫는지","minSentences":1,"maxSentences":3,"maxChars":60},{"key":"③","label":"서린의 손이 무엇에 닿았는지","minSentences":1,"maxSentences":3,"maxChars":60}],"forbidWords":["[상황]","[복선]","[결정타]"],"forbidCopyOfFixedLines":true,"fixedLines":["추격자가 등 뒤로 바짝 쫓아오고 있다.","칼끝이 서린의 볼을 스치고 벽에 부딪쳤다.","서린은 뒤로 물러서며 막다른 벽에 등을 붙였다.","종줄이 당겨지고 종이 울렸다."]}'::jsonb,
  'original', 'fantasy', 'impulsive',
  2, 'ar-bell-rope'
where not exists (select 1 from problems p where p.source_key = 'ar-bell-rope');

-- ar-broken-gate (order_no 10, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'action_reason'),
  'fill', 'auto', E'고정된 줄 사이에 뚫린 빈칸을 채우시오. 이렇게 됩니다.\n\n  덕수가 장터에서 자신을 밀친 사내와 맞붙습니다.\n  사내는 앞서 오른쪽 다리를 절뚝였습니다.\n\n  사내가 어깨를 들이밀며 다가왔다.\n  ①\n  덕수는 왼발을 반 보 뒤로 뺐다.\n  ②\n  덕수의 발이 사내의 절뚝인 걸음을 걸어 넘겼다.\n\n  ↓\n\n  ①  주먹을 쥐어 봐야 힘에서 진다. 덕수는 다른 것을 보기로 했다.\n  ②  사내는 걸음마다 오른쪽이 반 박자 늦었다. 덕수는 그것을 세 번 세었다.\n\n빈칸마다 한 문장에서 두 문장으로 씁니다.\n앞뒤 줄을 그대로 옮겨 적지 않습니다.\n무엇을 했는지가 아니라 왜 그렇게 했는지를 씁니다.\n[상황]·[복선]·[결정타]는 힌트일 뿐이고, 답에 그 대괄호를 쓰지 않습니다.',
  E'[상황] 세연이 무너진 성문 아래서 마수와 마주친다. 그 마수가 지나간 자리에는 번개 모양 자국이 남는다. 작년 동생의 시신 옆 나무에도 그 자국이 있었다. 세연은 숲 어귀에서 같은 자국을 찾아 사흘을 따라 들어왔다.\n[복선] 사흘을 따라온 번개 모양 자국\n[결정타] 목 — 비늘 사이의 역린\n\n마수의 앞발이 세연을 성문 잔해로 밀어붙였다.\n①\n세연은 부러진 창끝을 두 손으로 고쳐 쥐었다.\n마수가 몸을 낮추고 머리를 들이밀었다.\n②\n창끝이 마수의 목을 찔렀다.', null, '{"blanks":[{"key":"①","label":"세연이 이 순간 무엇을 하는지","minSentences":1,"maxSentences":2,"maxChars":60,"optional":true},{"key":"②","label":"세연이 무엇을 보고 목을 노리기로 했는지","minSentences":1,"maxSentences":2,"maxChars":60}],"forbidWords":["[상황]","[복선]","[결정타]"],"forbidCopyOfFixedLines":true,"fixedLines":["마수의 앞발이 세연을 성문 잔해로 밀어붙였다.","세연은 부러진 창끝을 두 손으로 고쳐 쥐었다.","마수가 몸을 낮추고 머리를 들이밀었다.","창끝이 마수의 목을 찔렀다."]}'::jsonb,
  'original', 'martial', 'planned',
  2, 'ar-broken-gate'
where not exists (select 1 from problems p where p.source_key = 'ar-broken-gate');

-- ar-left-draw (order_no 10, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'action_reason'),
  'fill', 'auto', E'고정된 줄 사이에 뚫린 빈칸을 채우시오. 이렇게 됩니다.\n\n  덕수가 장터에서 자신을 밀친 사내와 맞붙습니다.\n  사내는 앞서 오른쪽 다리를 절뚝였습니다.\n\n  사내가 어깨를 들이밀며 다가왔다.\n  ①\n  덕수는 왼발을 반 보 뒤로 뺐다.\n  ②\n  덕수의 발이 사내의 절뚝인 걸음을 걸어 넘겼다.\n\n  ↓\n\n  ①  주먹을 쥐어 봐야 힘에서 진다. 덕수는 다른 것을 보기로 했다.\n  ②  사내는 걸음마다 오른쪽이 반 박자 늦었다. 덕수는 그것을 세 번 세었다.\n\n빈칸마다 한 문장에서 두 문장으로 씁니다.\n앞뒤 줄을 그대로 옮겨 적지 않습니다.\n무엇을 했는지가 아니라 왜 그렇게 했는지를 씁니다.\n[상황]·[복선]·[결정타]는 힌트일 뿐이고, 답에 그 대괄호를 쓰지 않습니다.',
  E'[상황] 무결이 저번 싸움에서 자신을 벤 상대와 다시 마주한다. 그때 오른팔 힘줄이 끊겼다. 검은 왼손에 있다. 상대도 그것을 안다.\n[복선] 힘이 안 들어가는 오른팔\n[결정타] 왼손이 목을 찌른다\n\n상대가 무결의 오른쪽으로 크게 돌아 들어왔다.\n①\n무결은 오른팔을 들어 올렸다.\n②\n왼손의 검이 상대의 목으로 들어갔다.', null, '{"blanks":[{"key":"①","label":"무결이 오른쪽으로 도는 상대를 보고 무엇을 생각하는지","minSentences":1,"maxSentences":2,"maxChars":60},{"key":"②","label":"오른팔이 이 순간 무엇을 하는지","minSentences":1,"maxSentences":2,"maxChars":60}],"forbidWords":["[상황]","[복선]","[결정타]"],"forbidCopyOfFixedLines":true,"fixedLines":["상대가 무결의 오른쪽으로 크게 돌아 들어왔다.","무결은 오른팔을 들어 올렸다.","왼손의 검이 상대의 목으로 들어갔다."]}'::jsonb,
  'original', 'martial', 'planned',
  2, 'ar-left-draw'
where not exists (select 1 from problems p where p.source_key = 'ar-left-draw');

-- ar-wind-gate (order_no 10, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'action_reason'),
  'fill', 'auto', E'고정된 줄 사이에 뚫린 빈칸을 채우시오. 이렇게 됩니다.\n\n  덕수가 장터에서 자신을 밀친 사내와 맞붙습니다.\n  사내는 앞서 오른쪽 다리를 절뚝였습니다.\n\n  사내가 어깨를 들이밀며 다가왔다.\n  ①\n  덕수는 왼발을 반 보 뒤로 뺐다.\n  ②\n  덕수의 발이 사내의 절뚝인 걸음을 걸어 넘겼다.\n\n  ↓\n\n  ①  주먹을 쥐어 봐야 힘에서 진다. 덕수는 다른 것을 보기로 했다.\n  ②  사내는 걸음마다 오른쪽이 반 박자 늦었다. 덕수는 그것을 세 번 세었다.\n\n빈칸마다 한 문장에서 두 문장으로 씁니다.\n앞뒤 줄을 그대로 옮겨 적지 않습니다.\n무엇을 했는지가 아니라 왜 그렇게 했는지를 씁니다.\n[상황]·[복선]·[결정타]는 힌트일 뿐이고, 답에 그 대괄호를 쓰지 않습니다.',
  E'[상황] 마법사 연희가 아군이 밀리는 전장에 선다. 적은 성문 뒤에 진을 치고 화살을 쏟아붓는다. 성문을 뚫지 못하면 아군이 오늘 안에 무너진다.\n[복선] 적의 진형이 성문 앞에 몰려 있는 것\n[결정타] 성문\n\n화살이 아군 머리 위로 쏟아졌다.\n①\n바람의 칼날이 적의 진형을 갈랐다.\n②\n압축한 바람이 성문을 뚫었다.', null, '{"blanks":[{"key":"①","label":"연희가 먼저 무엇을 했는지","minSentences":1,"maxSentences":2,"maxChars":60},{"key":"②","label":"진형이 무너진 것이 무엇을 만들었는지","minSentences":1,"maxSentences":2,"maxChars":60}],"forbidWords":["[상황]","[복선]","[결정타]"],"forbidCopyOfFixedLines":true,"fixedLines":["화살이 아군 머리 위로 쏟아졌다.","바람의 칼날이 적의 진형을 갈랐다.","압축한 바람이 성문을 뚫었다."]}'::jsonb,
  'original', 'fantasy', 'planned',
  2, 'ar-wind-gate'
where not exists (select 1 from problems p where p.source_key = 'ar-wind-gate');

-- at-bell-rope (order_no 10, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'action_turn'),
  'convert', 'auto', E'빌드업 세 줄 뒤에 결정타 한 줄을 쓰시오. 이렇게 됩니다.\n\n  덕수가 장터에서 자신을 밀친 사내와 맞붙습니다.\n  앞서 깔린 것은 지난겨울 덕수의 짐을 엎은 손입니다.\n  결정타로 쓸 것은 사내가 앞서 절뚝인 걸음입니다.\n\n  ↓\n\n  덕수는 그 손을 알아보았다. 지난겨울 자기 짐을 엎은 손이었다.\n  사내는 걸음마다 오른쪽이 반 박자 늦었다.\n  덕수는 그것을 세 번 세었다.\n  덕수의 발이 그 절뚝인 걸음을 걸어 넘겼다.\n\n네 줄로 씁니다. [결정타] 요소는 마지막 줄에, [복선]은 그 앞 어딘가에 옵니다.\n동작을 낱낱이 늘어놓지 않습니다.\n이 싸움을 왜 봐야 하는지가 [복선]에 있습니다.',
  E'[상황] 서린이 종탑 꼭대기에서 추격자와 마주 선다.\n[복선] 추격자가 죽인 누이\n[결정타] 마지막 층의 종줄', null, '{"minLines":4,"maxLines":4,"maxLineChars":30,"requireAny":["종줄"],"requireInLastLine":["종줄"],"forbidWords":["[상황]","[복선]","[결정타]"]}'::jsonb,
  'original', 'fantasy', 'planned',
  2, 'at-bell-rope'
where not exists (select 1 from problems p where p.source_key = 'at-bell-rope');

-- at-broken-gate (order_no 10, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'action_turn'),
  'convert', 'auto', E'빌드업 세 줄 뒤에 결정타 한 줄을 쓰시오. 이렇게 됩니다.\n\n  덕수가 장터에서 자신을 밀친 사내와 맞붙습니다.\n  앞서 깔린 것은 지난겨울 덕수의 짐을 엎은 손입니다.\n  결정타로 쓸 것은 사내가 앞서 절뚝인 걸음입니다.\n\n  ↓\n\n  덕수는 그 손을 알아보았다. 지난겨울 자기 짐을 엎은 손이었다.\n  사내는 걸음마다 오른쪽이 반 박자 늦었다.\n  덕수는 그것을 세 번 세었다.\n  덕수의 발이 그 절뚝인 걸음을 걸어 넘겼다.\n\n네 줄로 씁니다. [결정타] 요소는 마지막 줄에, [복선]은 그 앞 어딘가에 옵니다.\n동작을 낱낱이 늘어놓지 않습니다.\n이 싸움을 왜 봐야 하는지가 [복선]에 있습니다.',
  E'[상황] 세연이 무너진 성문 아래서 마수와 갑자기 마주친다.\n[복선] 작년에 동생을 문 이빨\n[결정타] 잔해에서 주운 부러진 창끝', null, '{"minLines":4,"maxLines":4,"maxLineChars":30,"requireAny":["창끝"],"requireInLastLine":["창끝"],"forbidWords":["[상황]","[복선]","[결정타]"]}'::jsonb,
  'original', 'fantasy', 'impulsive',
  2, 'at-broken-gate'
where not exists (select 1 from problems p where p.source_key = 'at-broken-gate');

-- at-edit-log (order_no 10, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'action_turn'),
  'convert', 'auto', E'빌드업 세 줄 뒤에 결정타 한 줄을 쓰시오. 이렇게 됩니다.\n\n  덕수가 장터에서 자신을 밀친 사내와 맞붙습니다.\n  앞서 깔린 것은 지난겨울 덕수의 짐을 엎은 손입니다.\n  결정타로 쓸 것은 사내가 앞서 절뚝인 걸음입니다.\n\n  ↓\n\n  덕수는 그 손을 알아보았다. 지난겨울 자기 짐을 엎은 손이었다.\n  사내는 걸음마다 오른쪽이 반 박자 늦었다.\n  덕수는 그것을 세 번 세었다.\n  덕수의 발이 그 절뚝인 걸음을 걸어 넘겼다.\n\n네 줄로 씁니다. [결정타] 요소는 마지막 줄에, [복선]은 그 앞 어딘가에 옵니다.\n동작을 낱낱이 늘어놓지 않습니다.\n이 싸움을 왜 봐야 하는지가 [복선]에 있습니다.',
  E'[상황] 민재가 기획안을 가로챈 팀장과 마주 앉는다.\n[복선] 회의 전에 공유해 둔 초안\n[결정타] 초안에 남은 수정 기록', null, '{"minLines":4,"maxLines":4,"maxLineChars":30,"requireAny":["수정 기록"],"requireInLastLine":["수정 기록"],"forbidWords":["[상황]","[복선]","[결정타]"]}'::jsonb,
  'original', 'modern', 'planned',
  2, 'at-edit-log'
where not exists (select 1 from problems p where p.source_key = 'at-edit-log');

-- at-left-draw (order_no 10, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'action_turn'),
  'convert', 'auto', E'빌드업 세 줄 뒤에 결정타 한 줄을 쓰시오. 이렇게 됩니다.\n\n  덕수가 장터에서 자신을 밀친 사내와 맞붙습니다.\n  앞서 깔린 것은 지난겨울 덕수의 짐을 엎은 손입니다.\n  결정타로 쓸 것은 사내가 앞서 절뚝인 걸음입니다.\n\n  ↓\n\n  덕수는 그 손을 알아보았다. 지난겨울 자기 짐을 엎은 손이었다.\n  사내는 걸음마다 오른쪽이 반 박자 늦었다.\n  덕수는 그것을 세 번 세었다.\n  덕수의 발이 그 절뚝인 걸음을 걸어 넘겼다.\n\n네 줄로 씁니다. [결정타] 요소는 마지막 줄에, [복선]은 그 앞 어딘가에 옵니다.\n동작을 낱낱이 늘어놓지 않습니다.\n이 싸움을 왜 봐야 하는지가 [복선]에 있습니다.',
  E'[상황] 무결이 지난달 자신을 벤 상대와 다시 마주한다.\n[복선] 그때 부러진 오른팔\n[결정타] 한 달을 감춘 왼손 발도', null, '{"minLines":4,"maxLines":4,"maxLineChars":30,"requireAny":["왼손 발도"],"requireInLastLine":["왼손 발도"],"forbidWords":["[상황]","[복선]","[결정타]"]}'::jsonb,
  'original', 'martial', 'planned',
  2, 'at-left-draw'
where not exists (select 1 from problems p where p.source_key = 'at-left-draw');

-- ch-village-approval (order_no 14, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'off_track'),
  'choice', 'auto', '이 장면의 목적은 ''주인공이 마을 사람들에게 처음으로 인정받는 것''이다. 목적에 기여하지 않는 문장을 고르시오.',
  null, '["촌장이 지팡이를 내려놓고 그에게 자리를 내주었다.","이 마을은 삼백 년 전 소금 장수들이 터를 잡으며 생겨났다.","뒷줄에 섰던 아이들이 앞으로 몰려나와 그의 소매를 잡았다.","우물가에 모인 아낙들이 서로를 돌아보며 고개를 끄덕였다."]'::jsonb, '{}'::jsonb,
  'original', 'fantasy', 'planned',
  1, 'ch-village-approval'
where not exists (select 1 from problems p where p.source_key = 'ch-village-approval');

-- ch-cursed-sword (order_no 14, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'off_track'),
  'choice', 'auto', '이 장면의 목적은 ''주인공이 이 검이 위험하다는 것을 알아채는 것''이다. 목적에 기여하지 않는 문장을 고르시오.',
  null, '["검을 쥔 손등의 핏줄이 검은빛으로 부풀었다.","앞서 이 검을 들었던 자들의 이름이 칼자루에 새겨져 있었다.","무기점 주인은 사흘 전 아들을 장에 보냈다고 했다.","검을 내려놓자 손끝의 저림이 그대로 남았다."]'::jsonb, '{}'::jsonb,
  'original', 'martial', 'planned',
  2, 'ch-cursed-sword'
where not exists (select 1 from problems p where p.source_key = 'ch-cursed-sword');

-- ch-misunderstanding (order_no 14, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'off_track'),
  'choice', 'auto', '이 장면의 목적은 ''두 사람이 서로를 오해하게 만드는 것''이다. 목적에 기여하지 않는 문장을 고르시오.',
  null, '["그가 문을 나서는 순간 그녀가 뒤돌아 다른 이름을 불렀다.","편지는 봉투째 서랍에 들어갔고 그는 그것을 보지 못했다.","창밖에는 사흘째 눈이 내려 처마 끝에 고드름이 자랐다.","그녀는 대답을 기다렸지만 그는 이미 계단을 내려가고 있었다."]'::jsonb, '{}'::jsonb,
  'original', 'romance', 'planned',
  2, 'ch-misunderstanding'
where not exists (select 1 from problems p where p.source_key = 'ch-misunderstanding');

-- ch-sinking-ship (order_no 14, difficulty 3)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'off_track'),
  'choice', 'auto', '이 장면의 목적은 ''독자에게 주인공의 배가 곧 침몰한다는 예감을 주는 것''이다. 목적에 기여하지 않는 문장을 고르시오.',
  null, '["갑판 아래에서 나무가 갈라지는 소리가 두 번 울렸다.","선장은 아무 말 없이 나침반을 주머니에 넣었다.","항구를 떠나던 날 아침에는 갈매기가 유난히 많았다.","선원들이 서로의 눈을 피하며 밧줄 쪽으로 움직였다."]'::jsonb, '{}'::jsonb,
  'original', 'modern', 'planned',
  3, 'ch-sinking-ship'
where not exists (select 1 from problems p where p.source_key = 'ch-sinking-ship');

-- od-mountain-sword (order_no 17, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'reverse_design'),
  'order', 'auto', '결말에서 거꾸로 짚어 순서를 세우시오. 맨 위가 최종 목표, 아래로 갈수록 먼저 일어나는 일이다.',
  null, null, '{"cards":["노인의 잃어버린 소를 찾아준다","산신에게 검을 받는다","장터에서 소 발자국을 알아본다","산신의 사당 위치를 노인에게 듣는다"]}'::jsonb,
  'original', 'fantasy', 'planned',
  1, 'od-mountain-sword'
where not exists (select 1 from problems p where p.source_key = 'od-mountain-sword');

-- od-apology (order_no 17, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'reverse_design'),
  'order', 'auto', '결말에서 거꾸로 짚어 순서를 세우시오.',
  null, null, '{"cards":["그녀의 빈 책상을 본다","출근길에 그녀의 우산을 챙긴다","그가 먼저 사과한다","그녀가 떠났다는 것을 알게 된다"]}'::jsonb,
  'original', 'romance', 'planned',
  2, 'od-apology'
where not exists (select 1 from problems p where p.source_key = 'od-apology');

-- od-open-gate (order_no 17, difficulty 3)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'reverse_design'),
  'order', 'auto', '결말에서 거꾸로 짚어 순서를 세우시오. 각 단계는 다음 단계의 조건이 되어야 한다.',
  null, null, '{"cards":["전날 밤 주방 아이를 도와준다","보초의 교대 시각을 안다","성문을 안에서 연다","주방 심부름꾼으로 들어간다"]}'::jsonb,
  'original', 'modern', 'planned',
  3, 'od-open-gate'
where not exists (select 1 from problems p where p.source_key = 'od-open-gate');

-- cg-lightning-sword (order_no 19, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'genre_coinage'),
  'coinage', 'auto', '번개를 다루는 검법의 이름을 셋 지으시오. 조건: 각 두 자에서 넉 자, 서로 다른 글자로 시작할 것. 한 줄에 하나씩.',
  '무협의 이름은 자연현상과 움직임을 한자어로 붙여 만든다. 뇌·풍·염에 류·격·참을 붙이는 식이다.', null, '{"count":3,"maxLen":4,"minLen":2,"distinctInitial":true}'::jsonb,
  'original', 'martial', 'planned',
  1, 'cg-lightning-sword'
where not exists (select 1 from problems p where p.source_key = 'cg-lightning-sword');

-- cg-ice-magic (order_no 19, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'genre_coinage'),
  'coinage', 'auto', '얼음을 다루는 마법의 이름을 셋 지으시오. 조건: 각 세 자에서 여섯 자, 서로 다른 글자로 시작할 것.',
  '정통 판타지는 외래어 음차나 속성과 현상을 붙이는 구조를 쓴다. 등급은 숫자로, 이름은 현상으로 부른다.', null, '{"count":3,"maxLen":6,"minLen":3,"distinctInitial":true}'::jsonb,
  'original', 'fantasy', 'planned',
  2, 'cg-ice-magic'
where not exists (select 1 from problems p where p.source_key = 'cg-ice-magic');

-- cn-romance-70 (order_no 20, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'branch_estimate'),
  'count', 'auto', '현대 로맨스 70화 분량을 목표로 한다. 분기점 개수와 첫 분기점까지 걸리는 화수를 정하시오.',
  '반드시 일어나야 하는 핵심 사건을 분기점이라 한다. 분기점 개수와 도달 화수를 곱하면 전체 분량이 나온다.', null, '{"op":"multiply","inputs":[{"key":"branchCount","max":15,"min":3,"label":"분기점 개수"},{"key":"chaptersToFirst","max":40,"min":5,"label":"첫 분기점까지 화수"}]}'::jsonb,
  'original', 'romance', 'planned',
  1, 'cn-romance-70'
where not exists (select 1 from problems p where p.source_key = 'cn-romance-70');

-- cn-fantasy-200 (order_no 20, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'branch_estimate'),
  'count', 'auto', '남성향 장편 200화 분량을 목표로 한다. 분기점 개수와 첫 분기점까지 걸리는 화수를 정하시오.',
  '분량이 커지면 분기점 사이 간격도 길어진다. 첫 분기점이 너무 늦으면 초반 이탈이 생긴다.', null, '{"op":"multiply","inputs":[{"key":"branchCount","max":15,"min":3,"label":"분기점 개수"},{"key":"chaptersToFirst","max":40,"min":5,"label":"첫 분기점까지 화수"}]}'::jsonb,
  'original', 'fantasy', 'planned',
  2, 'cn-fantasy-200'
where not exists (select 1 from problems p where p.source_key = 'cn-fantasy-200');

-- ── 정답 ────────────────────────────────────────────────────────────

-- ae-gyeonu-bridge
insert into problem_answers (problem_id, answer)
select p.id, '{"kind":"choice","index":0}'::jsonb
from problems p
where p.source_key = 'ae-gyeonu-bridge'
on conflict (problem_id) do nothing;

-- ae-rabbit-gate
insert into problem_answers (problem_id, answer)
select p.id, '{"kind":"choice","index":0}'::jsonb
from problems p
where p.source_key = 'ae-rabbit-gate'
on conflict (problem_id) do nothing;

-- ae-axe-drop
insert into problem_answers (problem_id, answer)
select p.id, '{"kind":"choice","index":0}'::jsonb
from problems p
where p.source_key = 'ae-axe-drop'
on conflict (problem_id) do nothing;

-- ae-kongjwi-jar
insert into problem_answers (problem_id, answer)
select p.id, '{"kind":"choice","index":2}'::jsonb
from problems p
where p.source_key = 'ae-kongjwi-jar'
on conflict (problem_id) do nothing;

-- ch-village-approval
insert into problem_answers (problem_id, answer)
select p.id, '{"kind":"choice","index":1}'::jsonb
from problems p
where p.source_key = 'ch-village-approval'
on conflict (problem_id) do nothing;

-- ch-cursed-sword
insert into problem_answers (problem_id, answer)
select p.id, '{"kind":"choice","index":2}'::jsonb
from problems p
where p.source_key = 'ch-cursed-sword'
on conflict (problem_id) do nothing;

-- ch-misunderstanding
insert into problem_answers (problem_id, answer)
select p.id, '{"kind":"choice","index":2}'::jsonb
from problems p
where p.source_key = 'ch-misunderstanding'
on conflict (problem_id) do nothing;

-- ch-sinking-ship
insert into problem_answers (problem_id, answer)
select p.id, '{"kind":"choice","index":2}'::jsonb
from problems p
where p.source_key = 'ch-sinking-ship'
on conflict (problem_id) do nothing;

-- od-mountain-sword
insert into problem_answers (problem_id, answer)
select p.id, '{"kind":"order","sequence":[1,3,0,2]}'::jsonb
from problems p
where p.source_key = 'od-mountain-sword'
on conflict (problem_id) do nothing;

-- od-apology
insert into problem_answers (problem_id, answer)
select p.id, '{"kind":"order","sequence":[2,3,0,1]}'::jsonb
from problems p
where p.source_key = 'od-apology'
on conflict (problem_id) do nothing;

-- od-open-gate
insert into problem_answers (problem_id, answer)
select p.id, '{"kind":"order","sequence":[2,1,3,0]}'::jsonb
from problems p
where p.source_key = 'od-open-gate'
on conflict (problem_id) do nothing;

-- cn-romance-70
insert into problem_answers (problem_id, answer)
select p.id, '{"kind":"count","expected":70,"tolerance":0.15}'::jsonb
from problems p
where p.source_key = 'cn-romance-70'
on conflict (problem_id) do nothing;

-- cn-fantasy-200
insert into problem_answers (problem_id, answer)
select p.id, '{"kind":"count","expected":200,"tolerance":0.15}'::jsonb
from problems p
where p.source_key = 'cn-fantasy-200'
on conflict (problem_id) do nothing;

-- ── 골든셋 ──────────────────────────────────────────────────────────

-- sim-cheong-fear: 감정어 우회 시도. 겁먹 어간으로 잡아야 한다
insert into golden_cases (problem_id, content, expected, note)
select p.id, '심청은 겁먹은 얼굴로 뱃전을 붙잡았다.', false, '감정어 우회 시도. 겁먹 어간으로 잡아야 한다'
from problems p
where p.source_key = 'sim-cheong-fear'
  and not exists (
    select 1 from golden_cases gc
     where gc.problem_id = p.id and gc.content = '심청은 겁먹은 얼굴로 뱃전을 붙잡았다.'
  );

-- sim-cheong-fear: ㅂ불규칙 회귀 테스트. 어간에 두렵이 없으면 이 케이스가 통과로 잘못 나온다
insert into golden_cases (problem_id, content, expected, note)
select p.id, '심청은 두렵게 뱃전을 붙잡았다.', false, 'ㅂ불규칙 회귀 테스트. 어간에 두렵이 없으면 이 케이스가 통과로 잘못 나온다'
from problems p
where p.source_key = 'sim-cheong-fear'
  and not exists (
    select 1 from golden_cases gc
     where gc.problem_id = p.id and gc.content = '심청은 두렵게 뱃전을 붙잡았다.'
  );

-- sim-cheong-fear: 감정어 없음 + 신체 동작 둘
insert into golden_cases (problem_id, content, expected, note)
select p.id, '심청은 뱃전을 붙잡은 손을 놓지 못했다. 발끝이 자꾸 뒤로 밀렸다.', true, '감정어 없음 + 신체 동작 둘'
from problems p
where p.source_key = 'sim-cheong-fear'
  and not exists (
    select 1 from golden_cases gc
     where gc.problem_id = p.id and gc.content = '심청은 뱃전을 붙잡은 손을 놓지 못했다. 발끝이 자꾸 뒤로 밀렸다.'
  );

-- sim-cheong-fear: 동작 중심. 감정을 이름 붙이지 않음
insert into golden_cases (problem_id, content, expected, note)
select p.id, '심청은 숨을 삼켰다. 부름이 한 번 더 들렸고, 그녀는 뒤를 돌아보았다.', true, '동작 중심. 감정을 이름 붙이지 않음'
from problems p
where p.source_key = 'sim-cheong-fear'
  and not exists (
    select 1 from golden_cases gc
     where gc.problem_id = p.id and gc.content = '심청은 숨을 삼켰다. 부름이 한 번 더 들렸고, 그녀는 뒤를 돌아보았다.'
  );

-- sim-cheong-fear: 감각으로 대체한 상급 답안
insert into golden_cases (problem_id, content, expected, note)
select p.id, '심청의 손끝이 뱃전을 긁었다. 가시가 손톱 밑으로 파고들었다.', true, '감각으로 대체한 상급 답안'
from problems p
where p.source_key = 'sim-cheong-fear'
  and not exists (
    select 1 from golden_cases gc
     where gc.problem_id = p.id and gc.content = '심청의 손끝이 뱃전을 긁었다. 가시가 손톱 밑으로 파고들었다.'
  );

-- dragon-king-anger: 띄어쓴 감정어. 화났 만으로는 안 잡히므로 화가 났 이 필요하다
insert into golden_cases (problem_id, content, expected, note)
select p.id, '용왕은 화가 났다.', false, '띄어쓴 감정어. 화났 만으로는 안 잡히므로 화가 났 이 필요하다'
from problems p
where p.source_key = 'dragon-king-anger'
  and not exists (
    select 1 from golden_cases gc
     where gc.problem_id = p.id and gc.content = '용왕은 화가 났다.'
  );

-- dragon-king-anger: 동작으로 대체
insert into golden_cases (problem_id, content, expected, note)
select p.id, '용왕이 술잔을 바닥에 내려놓았다. 잔이 두 조각으로 갈라졌다.', true, '동작으로 대체'
from problems p
where p.source_key = 'dragon-king-anger'
  and not exists (
    select 1 from golden_cases gc
     where gc.problem_id = p.id and gc.content = '용왕이 술잔을 바닥에 내려놓았다. 잔이 두 조각으로 갈라졌다.'
  );

-- ── fill 모범답안 ──────────────────────────────────────────────────
--
-- problem_answers 가 아니다 — 채점 정답이 아니라 stage2 자기점검이
-- 화면에 보여줄 것이다(재설계안 11-2 4번). RLS 는 seed_schema.sql 이
-- 건다: 그 문항에 제출 기록이 있는 학습자만 읽는다.

-- rm-axe-pond ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '나무꾼이 도끼를 휘둘렀다. 자루가 빠지고 도끼가 연못에 떨어졌다.'
from problems p
where p.source_key = 'rm-axe-pond'
on conflict (problem_id, ord, blank_key) do nothing;

-- rm-axe-pond ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '나무꾼은 도끼를 머리 위로 들어 내리쳤다. 자루만 손에 남고 날은 연못에 박혔다.'
from problems p
where p.source_key = 'rm-axe-pond'
on conflict (problem_id, ord, blank_key) do nothing;

-- rm-heungbu-swallow ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '흥부는 제비의 다리를 감쌌다. 부러진 뼈에 헝겊을 둘렀다.'
from problems p
where p.source_key = 'rm-heungbu-swallow'
on conflict (problem_id, ord, blank_key) do nothing;

-- rm-heungbu-swallow ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '흥부는 숨을 죽이고 제비 다리를 헝겊으로 감았다. 매듭을 두 번 확인했다.'
from problems p
where p.source_key = 'rm-heungbu-swallow'
on conflict (problem_id, ord, blank_key) do nothing;

-- rm-kongjwi-jar ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '콩쥐는 깨진 독에 물을 부었다. 물이 새어 나갔다. 그녀는 주저앉았다.'
from problems p
where p.source_key = 'rm-kongjwi-jar'
on conflict (problem_id, ord, blank_key) do nothing;

-- rm-kongjwi-jar ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '콩쥐는 깨진 독에 물을 부었다. 물이 바닥으로 빠졌다. 콩쥐는 바가지를 놓고 주저앉았다.'
from problems p
where p.source_key = 'rm-kongjwi-jar'
on conflict (problem_id, ord, blank_key) do nothing;

-- rm-simcheong-deck ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '심청은 뱃전으로 걸어갔다. 사람들은 그녀를 바라보았고, 뱃사공은 고개를 돌렸다.'
from problems p
where p.source_key = 'rm-simcheong-deck'
on conflict (problem_id, ord, blank_key) do nothing;

-- rm-simcheong-deck ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '심청이 뱃전에 섰다. 사람들이 입을 다물었다. 뱃사공은 고개를 돌려 노를 잡았다.'
from problems p
where p.source_key = 'rm-simcheong-deck'
on conflict (problem_id, ord, blank_key) do nothing;

-- rm-magpie-bridge ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '까치들이 날아와 몸을 이었다. 견우는 그 위에 발을 얹었다.'
from problems p
where p.source_key = 'rm-magpie-bridge'
on conflict (problem_id, ord, blank_key) do nothing;

-- rm-magpie-bridge ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '까치들이 날아와 몸을 이었다. 견우는 발끝으로 다리를 눌러 보았다.'
from problems p
where p.source_key = 'rm-magpie-bridge'
on conflict (problem_id, ord, blank_key) do nothing;

-- rm-rabbit-court ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '토끼는 웃으며 말했다. 용왕은 몸을 일으켰고, 신하들은 서로를 바라보았다.'
from problems p
where p.source_key = 'rm-rabbit-court'
on conflict (problem_id, ord, blank_key) do nothing;

-- rm-rabbit-court ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '토끼가 웃으며 말했다. 용왕이 자리를 박차고 일어섰다. 신하들이 서로를 돌아보았다.'
from problems p
where p.source_key = 'rm-rabbit-court'
on conflict (problem_id, ord, blank_key) do nothing;

-- rm-siblings-tree ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '오누이는 나무 위로 올라갔다. 호랑이는 아래에서 나무를 흔들었고, 아이들은 가지를 붙잡았다.'
from problems p
where p.source_key = 'rm-siblings-tree'
on conflict (problem_id, ord, blank_key) do nothing;

-- rm-siblings-tree ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '오누이가 나무 위로 기어올랐다. 호랑이가 밑동을 들이받았다. 아이들은 가지를 끌어안았다.'
from problems p
where p.source_key = 'rm-siblings-tree'
on conflict (problem_id, ord, blank_key) do nothing;

-- rm-goblin-club ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '나무꾼은 방망이를 들어 내리쳤다. 곡식이 쏟아져 나왔다.'
from problems p
where p.source_key = 'rm-goblin-club'
on conflict (problem_id, ord, blank_key) do nothing;

-- rm-goblin-club ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '나무꾼은 방망이를 들었다. 손이 떨렸다. 그가 내리치자 곡식이 쏟아졌다.'
from problems p
where p.source_key = 'rm-goblin-club'
on conflict (problem_id, ord, blank_key) do nothing;

-- heungbu-joy ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '흥부는 금은보화를 한 움큼 쥐었다가 놓쳤다. 손이 자꾸 벌어졌다.'
from problems p
where p.source_key = 'heungbu-joy'
on conflict (problem_id, ord, blank_key) do nothing;

-- heungbu-joy ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '흥부는 주먹으로 입을 막았다. 어깨가 들썩이는 것을 누르지 못했다.'
from problems p
where p.source_key = 'heungbu-joy'
on conflict (problem_id, ord, blank_key) do nothing;

-- sim-cheong-fear ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '심청은 치맛자락을 움켜쥐었다. 발이 뱃전 앞에서 멈췄다.'
from problems p
where p.source_key = 'sim-cheong-fear'
on conflict (problem_id, ord, blank_key) do nothing;

-- sim-cheong-fear ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '심청은 숨을 들이켰다. 손끝이 하얗게 되도록 치마를 쥐었다.'
from problems p
where p.source_key = 'sim-cheong-fear'
on conflict (problem_id, ord, blank_key) do nothing;

-- dragon-king-anger ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '용왕이 옥좌의 팔걸이를 내리쳤다. 산호 술잔이 바닥에 굴렀다.'
from problems p
where p.source_key = 'dragon-king-anger'
on conflict (problem_id, ord, blank_key) do nothing;

-- dragon-king-anger ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '용왕은 수염을 부르르 떨며 일어섰다. 목소리가 대전 기둥을 울렸다.'
from problems p
where p.source_key = 'dragon-king-anger'
on conflict (problem_id, ord, blank_key) do nothing;

-- kongjwi-grief ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '콩쥐는 깨진 독의 조각을 하나씩 주워 모았다. 조각이 손에서 자꾸 미끄러졌다.'
from problems p
where p.source_key = 'kongjwi-grief'
on conflict (problem_id, ord, blank_key) do nothing;

-- kongjwi-grief ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '콩쥐는 마당 한가운데 섰다. 잔치 소리가 담 너머에서 들려왔다. 그녀는 깨진 독을 바라보았다.'
from problems p
where p.source_key = 'kongjwi-grief'
on conflict (problem_id, ord, blank_key) do nothing;

-- gyeonu-longing ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '견우는 소를 몰다 말고 강가에 앉았다. 물에 비친 하늘만 오래 바라보았다.'
from problems p
where p.source_key = 'gyeonu-longing'
on conflict (problem_id, ord, blank_key) do nothing;

-- gyeonu-longing ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '견우는 달력 대신 강물을 보러 갔다. 다리가 놓일 자리를 손가락으로 그어 보았다.'
from problems p
where p.source_key = 'gyeonu-longing'
on conflict (problem_id, ord, blank_key) do nothing;

-- woodcutter-shame ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '나무꾼은 고개를 들지 못했다. 손이 제 낡은 도끼자루만 만지작거렸다.'
from problems p
where p.source_key = 'woodcutter-shame'
on conflict (problem_id, ord, blank_key) do nothing;

-- woodcutter-shame ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '나무꾼은 두 도끼에서 눈을 돌렸다. 목덜미가 달아올라 뒷걸음질을 쳤다.'
from problems p
where p.source_key = 'woodcutter-shame'
on conflict (problem_id, ord, blank_key) do nothing;

-- tp-axe-water ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '나무꾼은 연못가에 앉았다. 도끼는 보이지 않았다. 소매를 걷고 물에 손을 넣었다.'
from problems p
where p.source_key = 'tp-axe-water'
on conflict (problem_id, ord, blank_key) do nothing;

-- tp-axe-water ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '나무꾼은 연못가에 앉아 소매를 걷었다. 도끼가 안 보이는 물에 손을 넣었다.'
from problems p
where p.source_key = 'tp-axe-water'
on conflict (problem_id, ord, blank_key) do nothing;

-- tp-heungbu-yard ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '흥부는 마당에 나갔다. 제비 한 마리가 떨어져 있었다. 흥부는 제비를 들어 올렸다.'
from problems p
where p.source_key = 'tp-heungbu-yard'
on conflict (problem_id, ord, blank_key) do nothing;

-- tp-heungbu-yard ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '마당에 제비 한 마리가 떨어져 있었다. 흥부는 두 손으로 들어 올렸다.'
from problems p
where p.source_key = 'tp-heungbu-yard'
on conflict (problem_id, ord, blank_key) do nothing;

-- tp-simcheong-rail ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '심청은 뱃전에 섰다. 심청은 치마를 걷어쥐었다.'
from problems p
where p.source_key = 'tp-simcheong-rail'
on conflict (problem_id, ord, blank_key) do nothing;

-- tp-simcheong-rail ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '심청은 뱃전에 서서 치마를 걷어쥐었다.'
from problems p
where p.source_key = 'tp-simcheong-rail'
on conflict (problem_id, ord, blank_key) do nothing;

-- tp-gyeonu-river ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '견우는 강가에 나왔다. 까치들이 하늘을 덮었다. 견우는 강물에 발을 담갔다.'
from problems p
where p.source_key = 'tp-gyeonu-river'
on conflict (problem_id, ord, blank_key) do nothing;

-- tp-gyeonu-river ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '견우가 강가에 나오자 까치들이 하늘을 덮었다. 그는 강물에 발을 담갔다.'
from problems p
where p.source_key = 'tp-gyeonu-river'
on conflict (problem_id, ord, blank_key) do nothing;

-- tp-kongjwi-crack ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '콩쥐는 독 앞에 앉았다. 바닥에 금이 가 있었다. 콩쥐는 손바닥으로 눌렀다.'
from problems p
where p.source_key = 'tp-kongjwi-crack'
on conflict (problem_id, ord, blank_key) do nothing;

-- tp-kongjwi-crack ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '독 바닥에 금이 가 있었다. 콩쥐는 그 자리를 손바닥으로 눌렀다.'
from problems p
where p.source_key = 'tp-kongjwi-crack'
on conflict (problem_id, ord, blank_key) do nothing;

-- tp-rabbit-gate ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '토끼는 용궁 문 앞에 섰다. 문지기가 창을 내렸다. 토끼는 웃으며 나섰다.'
from problems p
where p.source_key = 'tp-rabbit-gate'
on conflict (problem_id, ord, blank_key) do nothing;

-- tp-rabbit-gate ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '문지기가 창을 내렸다. 토끼는 웃으며 한 걸음 나섰다.'
from problems p
where p.source_key = 'tp-rabbit-gate'
on conflict (problem_id, ord, blank_key) do nothing;

-- tp-siblings-floor ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '오누이는 마루 밑에 숨었다. 문밖에서 발소리가 났다. 오라비가 동생의 입을 막았다.'
from problems p
where p.source_key = 'tp-siblings-floor'
on conflict (problem_id, ord, blank_key) do nothing;

-- tp-siblings-floor ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '마루 밑에서 발소리를 들었다. 오라비가 동생의 입을 막았다.'
from problems p
where p.source_key = 'tp-siblings-floor'
on conflict (problem_id, ord, blank_key) do nothing;

-- tp-goblin-mark ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '나무꾼은 방망이를 상 위에 올렸다. 검은 자국이 남아 있었다. 그는 다시 집어 들었다.'
from problems p
where p.source_key = 'tp-goblin-mark'
on conflict (problem_id, ord, blank_key) do nothing;

-- tp-goblin-mark ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '방망이에 검은 자국이 남아 있었다. 나무꾼은 그것을 다시 집어 들었다.'
from problems p
where p.source_key = 'tp-goblin-mark'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-cracked-ice ord 1 ①
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '①', '건너올 때 저 자리에서 발밑이 울렸다. 도경은 그 소리를 기억했다.'
from problems p
where p.source_key = 'ar-cracked-ice'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-cracked-ice ord 1 ②
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '②', '늑대는 물러서는 먹이를 그냥 두지 않는다. 여섯이 한 덩어리로 따라붙었다.'
from problems p
where p.source_key = 'ar-cracked-ice'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-cracked-ice ord 2 ①
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '①', '강 한가운데만 얼음이 검었다. 아래로 물이 흐르고 있다는 뜻이다.'
from problems p
where p.source_key = 'ar-cracked-ice'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-cracked-ice ord 2 ②
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '②', '도경이 등을 보이자 늑대들이 거리를 좁혔다. 무리는 흩어질 줄을 몰랐다.'
from problems p
where p.source_key = 'ar-cracked-ice'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-cracked-ice ord 3 ①
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 3, '①', '도경은 발을 헛디딘 척 뒤로 밀렸다. 물러서는 것처럼 보여야 했다.'
from problems p
where p.source_key = 'ar-cracked-ice'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-cracked-ice ord 3 ②
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 3, '②', '앞선 두 마리가 뛰어들자 나머지도 따라붙었다. 여섯이 한 자리에 모였다.'
from problems p
where p.source_key = 'ar-cracked-ice'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-dragon-jaw ord 1 ②
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '②', '휘두른 팔을 따라 상체가 앞으로 쏠렸다. 턱이 그만큼 내려와 있었다.'
from problems p
where p.source_key = 'ar-dragon-jaw'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-dragon-jaw ord 2 ①
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '①', '태윤은 숨을 멈추고 발끝에 무게를 옮겼다.'
from problems p
where p.source_key = 'ar-dragon-jaw'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-dragon-jaw ord 2 ②
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '②', '주변 소리가 멀어질 만큼 집중이 올라갔다. 느리게 흐르는 시야 안에서 턱이 눈앞에 있었다.'
from problems p
where p.source_key = 'ar-dragon-jaw'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-dragon-jaw ord 3 ①
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 3, '①', '한 방을 제대로 넣지 못하면 끝난다. 거리를 좁혀 안으로 파고 들어간다.'
from problems p
where p.source_key = 'ar-dragon-jaw'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-dragon-jaw ord 3 ②
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 3, '②', '괴물은 팔을 휘두를 때마다 턱을 앞으로 내밀었다. 세 번을 세었다.'
from problems p
where p.source_key = 'ar-dragon-jaw'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-dull-blade ord 1 ①
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '①', '느린 검이었다. 받아치면 막을 수 있다고 보았다.'
from problems p
where p.source_key = 'ar-dull-blade'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-dull-blade ord 1 ②
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '②', '가공할 힘이 검을 짓눌렀다. 자세가 무너지는 데 한 호흡도 걸리지 않았다.'
from problems p
where p.source_key = 'ar-dull-blade'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-dull-blade ord 2 ①
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '①', '사부의 검은 빠르지 않다. 무결은 정면으로 맞받기로 했다.'
from problems p
where p.source_key = 'ar-dull-blade'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-dull-blade ord 2 ②
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '②', '검을 통해 내려온 무게가 손목을 꺾고 무릎을 땅에 붙였다.'
from problems p
where p.source_key = 'ar-dull-blade'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-dull-blade ord 3 ①
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 3, '①', '무결은 피하는 대신 검을 세웠다. 여기서 물러서면 배울 것이 없었다.'
from problems p
where p.source_key = 'ar-dull-blade'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-dull-blade ord 3 ②
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 3, '②', '검에 중검의 묘리가 스며들었다. 그것을 알았을 때는 이미 늦었다.'
from problems p
where p.source_key = 'ar-dull-blade'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-bell-rope ord 1 ①
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '①', '서린은 몸을 낮추고 옆으로 굴렀다. 등 뒤는 이미 벽이었다.'
from problems p
where p.source_key = 'ar-bell-rope'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-bell-rope ord 1 ②
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '②', '뺨을 타고 뜨거운 것이 흘러내렸다.'
from problems p
where p.source_key = 'ar-bell-rope'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-bell-rope ord 1 ③
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '③', '등이 닿은 자리에 굵은 줄이 걸려 있었다. 누이와 공물을 올리던 날에도 이 줄은 그 자리에 있었다.'
from problems p
where p.source_key = 'ar-bell-rope'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-bell-rope ord 2 ①
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '①', '서린은 두 팔로 머리를 감싸고 벽을 따라 돌았다.'
from problems p
where p.source_key = 'ar-bell-rope'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-bell-rope ord 2 ②
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '②', '피가 턱을 타고 내려왔다. 맞서 봐야 이길 수 없다. 어릴 적 누이가 해 준 이야기가 그때 떠올랐다.'
from problems p
where p.source_key = 'ar-bell-rope'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-bell-rope ord 2 ③
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '③', '벽을 더듬던 손끝에 젖은 삼줄이 걸렸다. 서린은 두 손으로 그것을 감았다.'
from problems p
where p.source_key = 'ar-bell-rope'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-broken-gate ord 1 ①
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '①', '등이 돌무더기에 처박혔다. 숨이 한 번에 빠져나갔다.'
from problems p
where p.source_key = 'ar-broken-gate'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-broken-gate ord 1 ②
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '②', '목을 덮은 비늘 사이로 역린이 드러났다.'
from problems p
where p.source_key = 'ar-broken-gate'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-broken-gate ord 2 ①
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '①', '세연은 잔해에 손을 짚고 몸을 일으켰다. 팔이 말을 듣지 않았다.'
from problems p
where p.source_key = 'ar-broken-gate'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-broken-gate ord 2 ②
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '②', '들이미는 머리에 따라 빈틈이 보였다. 목 아래 비늘이 얇은 자리가 거기였다.'
from problems p
where p.source_key = 'ar-broken-gate'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-left-draw ord 1 ①
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '①', '저 칼을 한 손으로는 버틸 수 없다. 상대도 그걸 알고 도는 것이다.'
from problems p
where p.source_key = 'ar-left-draw'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-left-draw ord 1 ②
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '②', '무결은 팔뚝을 세워 검을 받았다. 반쯤 베였지만 검은 거기서 멈췄다.'
from problems p
where p.source_key = 'ar-left-draw'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-left-draw ord 2 ①
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '①', '저번과 같은 자세다. 같은 기술이 온다.'
from problems p
where p.source_key = 'ar-left-draw'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-left-draw ord 2 ②
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '②', '무결은 끊긴 힘줄에 내공을 밀어 넣어 억지로 손을 접었다. 억지로 이어 붙인 자리가 타들어가는 느낌이 들었다.'
from problems p
where p.source_key = 'ar-left-draw'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-left-draw ord 3 ①
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 3, '①', '저 칼을 막을 수 없다. 그러면 막지 않으면 된다.'
from problems p
where p.source_key = 'ar-left-draw'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-left-draw ord 3 ②
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 3, '②', '무결은 오른팔을 상대의 검 앞으로 들이밀었다. 팔이 베이며 생긴 그 짧은 틈에 왼손이 들어갔다.'
from problems p
where p.source_key = 'ar-left-draw'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-wind-gate ord 1 ①
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '①', '연희는 바람을 벽처럼 세워 화살을 막고, 그 바람을 그대로 앞으로 밀었다.'
from problems p
where p.source_key = 'ar-wind-gate'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-wind-gate ord 1 ②
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '②', '갈라진 자리로 성문까지 곧게 길이 났다.'
from problems p
where p.source_key = 'ar-wind-gate'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-wind-gate ord 2 ①
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '①', '머리 위로 손을 뻗어 공기를 눕히자 화살이 방향을 잃었다. 연희는 그 공기를 모아 날을 세웠다.'
from problems p
where p.source_key = 'ar-wind-gate'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-wind-gate ord 2 ②
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '②', '성문 앞을 메우던 병사들이 물러났다. 남은 것은 문 하나였다.'
from problems p
where p.source_key = 'ar-wind-gate'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-wind-gate ord 3 ①
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 3, '①', '막기만 해서는 오늘을 못 넘긴다. 연희는 화살을 걷어 내며 손을 앞으로 뻗었다.'
from problems p
where p.source_key = 'ar-wind-gate'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-wind-gate ord 3 ②
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 3, '②', '진형이 흩어지자 성문이 그대로 드러났다.'
from problems p
where p.source_key = 'ar-wind-gate'
on conflict (problem_id, ord, blank_key) do nothing;

-- ── 비활성 ─────────────────────────────────────────────────────────
-- 옛 action_turn convert 8건. 재설계안 11-4·세션 18. 재료·픽스처는 11-5 픽스처 갈아엎기 때 삭제.

update problems set is_active = false
 where source_key in ('at-left-feint', 'at-left-draw', 'at-left-feeler', 'at-broken-gate', 'at-cracked-ice', 'at-bell-rope', 'at-look-back', 'at-edit-log');

commit;

select '시드 적용 완료. 다음: seed_check.sql' as 결과,
       (select count(*) from problems) as 문항수,
       (select count(*) from stages) as 단계수;
