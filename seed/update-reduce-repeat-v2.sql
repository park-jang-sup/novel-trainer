-- 4단계 reduce_repeat 전면 교체 v2 — 세션 27.
-- 원작 전래동화 장면으로 원문 8건을 소설다운 문장으로 갈았다. 반복 결함은
-- 훈련 목적상 의도적으로 유지한다. 모범답안 16행도 새 원문에 맞춰 다시 썼다.
-- 새 원칙: maxChars = 새 원문의 countChars(공백 제외) 그대로 — 반복 고치기가
-- 압축을 강요하면 안 된다. 원문 그대로 제출하는 꼼수는 repeatTargets(겹친 말)에서 걸린다.
--
-- seed/dump/{problems,answers}.json 이 단일 출처. seed_data.sql 의 insert 는
-- problems 가 where not exists, reference_answers 가 on conflict do nothing 이라
-- 기존 행을 안 고친다. 그래서 이 update 를 따로 낸다. 순서: 이 파일 → seed_data.sql(멱등) → seed_check.sql
--
-- ★ 세션 26 의 seed/update-reduce-repeat.sql 을 아직 안 돌렸어도 이 v2 하나만
--   돌리면 된다 — v2 가 scoring_config 를 통째로(repeatTargets 포함) 싣는다.
--
-- 재실행해도 안전(update 는 멱등).

begin;

-- ── 원문 · 지시문 · 채점 설정 (problems 8건) ──

-- rp-axe-gold
update problems set
  passage = '산신령이 번쩍이는 금도끼를 들어 보였다. "이 도끼가 네 도끼냐?" 나무꾼은 고개를 저었다. "그 도끼는 제 도끼가 아닙니다." 산신령은 이번에는 은도끼를 들어 보였다. 나무꾼은 이번에도 고개를 저었다.',
  instruction = '같은 말이 겹치는 곳을 찾아 다시 쓰시오.',
  scoring_config = '{"maxChars":88,"minVerbs":3,"maxRepeat":2,"repeatTargets":[{"word":"도끼","max":2},{"word":"나무꾼","max":2},{"word":"산신령","max":1}]}'::jsonb
 where source_key = 'rp-axe-gold';

-- rp-heungbu-gourd
update problems set
  passage = '흥부는 박을 반으로 갈랐다. 박 속에서 쌀이 쏟아졌다. "여보, 박에서 쌀이 나와요!" 흥부는 두 번째 박도 갈랐다. 그 박에서는 비단이 쏟아져 나왔다.',
  instruction = '같은 말이 겹치는 곳을 찾아 다시 쓰시오. 일어나는 일은 하나도 빼지 말 것.',
  scoring_config = '{"maxChars":64,"minVerbs":3,"maxRepeat":2,"repeatTargets":[{"word":"박","max":2},{"word":"흥부","max":1}]}'::jsonb
 where source_key = 'rp-heungbu-gourd';

-- rp-simcheong-sea
update problems set
  passage = '심청은 뱃전에서 바다를 내려다보았다. 바다는 검은 물결로 일렁였다. 뱃사람들이 바다를 향해 북을 울렸다. 심청은 바다 앞에서 눈을 감았다. "아버지, 부디 눈을 뜨세요." 심청은 바다로 몸을 던졌다.',
  instruction = '같은 말이 겹치는 곳을 찾아 다시 쓰시오.',
  scoring_config = '{"maxChars":86,"minVerbs":3,"maxRepeat":2,"repeatTargets":[{"word":"바다","max":2},{"word":"심청","max":2}]}'::jsonb
 where source_key = 'rp-simcheong-sea';

-- rp-kongjwi-jar
update problems set
  passage = '콩쥐는 우물에서 물을 길어 왔다. 콩쥐가 물을 부으면 물은 독 밑으로 새어 나갔다. 물을 채워도 채워도 독은 차지 않았다. 콩쥐는 물동이를 안은 채 주저앉아 울었다.',
  instruction = '같은 말이 겹치는 곳을 찾아 다시 쓰시오.',
  scoring_config = '{"maxChars":68,"minVerbs":3,"maxRepeat":2,"repeatTargets":[{"word":"물","max":2},{"word":"콩쥐","max":2}]}'::jsonb
 where source_key = 'rp-kongjwi-jar';

-- rp-magpie-bridge
update problems set
  passage = '까치들이 은하수 위로 다리를 놓았다. 다리는 강 건너까지 길게 이어졌다. 견우는 떨리는 발로 다리에 올랐다. 다리가 출렁일 때마다 까치들이 날개를 퍼덕였다. "직녀님!" 견우는 다리 위를 내달렸다.',
  instruction = '같은 말이 겹치는 곳을 찾아 다시 쓰시오.',
  scoring_config = '{"maxChars":85,"minVerbs":3,"maxRepeat":2,"repeatTargets":[{"word":"다리","max":2}]}'::jsonb
 where source_key = 'rp-magpie-bridge';

-- rp-rabbit-liver
update problems set
  passage = '용왕이 토끼의 간을 내놓으라고 명했다. 토끼는 침착하게 대답했다. "제 간은 워낙 귀한 간이라, 깊은 산속에 감추어 두고 왔습니다." 신하들이 웅성거렸다. 간도 없이 다니는 토끼가 어디 있느냐고 다그쳤지만, 토끼는 태연히 웃기만 했다.',
  instruction = '같은 말이 겹치는 곳을 찾아 다시 쓰시오.',
  scoring_config = '{"maxChars":101,"minVerbs":5,"maxRepeat":2,"repeatTargets":[{"word":"간","max":2},{"word":"토끼","max":2}]}'::jsonb
 where source_key = 'rp-rabbit-liver';

-- rp-siblings-rope
update problems set
  passage = '오누이는 나무 꼭대기에서 두 손을 모아 빌었다. "하느님, 저희에게 튼튼한 동아줄을 내려 주세요." 하늘에서 동아줄이 스르르 내려왔다. 오누이는 동아줄을 꽉 잡았다. 동아줄은 오누이를 매단 채 하늘로 올라갔다.',
  instruction = '같은 말이 겹치는 곳을 찾아 다시 쓰시오. 동아줄이 튼튼하다는 것은 남길 것.',
  scoring_config = '{"maxChars":91,"minVerbs":3,"maxRepeat":2,"repeatTargets":[{"word":"동아줄","max":2},{"word":"오누이","max":2}]}'::jsonb
 where source_key = 'rp-siblings-rope';

-- rp-goblin-club
update problems set
  passage = '도깨비들이 방망이를 휘두르며 외쳤다. "은 나와라, 뚝딱!" 방망이에서 은돈이 쏟아졌다. 도깨비들이 방망이를 다시 휘둘렀다. "금 나와라, 뚝딱!" 방망이는 멈추지 않고 보물을 쏟아 냈다.',
  instruction = '같은 말이 겹치는 곳을 찾아 다시 쓰시오. 방망이가 멈추지 않는다는 것을 남길 것.',
  scoring_config = '{"maxChars":83,"minVerbs":4,"maxRepeat":2,"repeatTargets":[{"word":"방망이","max":2},{"word":"도깨비","max":1}]}'::jsonb
 where source_key = 'rp-goblin-club';

-- ── 모범답안 (reference_answers 16행, blank_key '') ──

-- rp-axe-gold ord 1
update reference_answers set content =
  '산신령이 번쩍이는 금도끼를 들어 보였다. "이것이 네 것이냐?" 나무꾼은 고개를 저었다. "제 것이 아닙니다." 은도끼가 나왔을 때도 나무꾼은 고개를 저었다.'
 where problem_id = (select id from problems where source_key = 'rp-axe-gold')
   and ord = 1 and blank_key = '';

-- rp-axe-gold ord 2
update reference_answers set content =
  '산신령이 금도끼와 은도끼를 차례로 들어 보였다. 나무꾼은 그때마다 고개를 저으며 제 것이 아니라고 답했다.'
 where problem_id = (select id from problems where source_key = 'rp-axe-gold')
   and ord = 2 and blank_key = '';

-- rp-heungbu-gourd ord 1
update reference_answers set content =
  '흥부는 박을 반으로 갈랐다. 속에서 쌀이 쏟아졌다. "여보, 쌀이에요!" 두 번째 박을 가르자 이번에는 비단이 나왔다.'
 where problem_id = (select id from problems where source_key = 'rp-heungbu-gourd')
   and ord = 1 and blank_key = '';

-- rp-heungbu-gourd ord 2
update reference_answers set content =
  '첫 박에서는 쌀이, 두 번째 박에서는 비단이 쏟아져 나왔다. "여보, 우리 이제 살았어요!" 흥부는 톱을 놓고 웃었다.'
 where problem_id = (select id from problems where source_key = 'rp-heungbu-gourd')
   and ord = 2 and blank_key = '';

-- rp-simcheong-sea ord 1
update reference_answers set content =
  '심청은 뱃전에서 검게 일렁이는 바다를 내려다보았다. 뱃사람들이 북을 울렸다. 심청은 눈을 감았다. "아버지, 부디 눈을 뜨세요." 그리고 바다로 몸을 던졌다.'
 where problem_id = (select id from problems where source_key = 'rp-simcheong-sea')
   and ord = 1 and blank_key = '';

-- rp-simcheong-sea ord 2
update reference_answers set content =
  '검은 물결이 일렁이는 인당수 앞에서 심청은 눈을 감았다. "아버지, 부디 눈을 뜨세요." 북소리가 울리는 가운데 심청은 바다로 몸을 던졌다.'
 where problem_id = (select id from problems where source_key = 'rp-simcheong-sea')
   and ord = 2 and blank_key = '';

-- rp-kongjwi-jar ord 1
update reference_answers set content =
  '콩쥐는 물을 길어다 독에 부었다. 그러나 밑으로 다 새어 나가, 채워도 채워도 독은 차지 않았다. 콩쥐는 물동이를 안은 채 주저앉아 울었다.'
 where problem_id = (select id from problems where source_key = 'rp-kongjwi-jar')
   and ord = 1 and blank_key = '';

-- rp-kongjwi-jar ord 2
update reference_answers set content =
  '콩쥐가 아무리 길어다 부어도 독은 차지 않았다. 물은 깨진 밑으로 다 새어 나갔다. 콩쥐는 빈 독 앞에 주저앉아 울고 말았다.'
 where problem_id = (select id from problems where source_key = 'rp-kongjwi-jar')
   and ord = 2 and blank_key = '';

-- rp-magpie-bridge ord 1
update reference_answers set content =
  '까치들이 은하수 위로 다리를 놓았다. 강 건너까지 길게 이어진 길이었다. 견우는 떨리는 발로 그 위에 올랐다. 다리가 출렁일 때마다 까치들이 날개를 퍼덕였다. "직녀님!" 견우는 내달렸다.'
 where problem_id = (select id from problems where source_key = 'rp-magpie-bridge')
   and ord = 1 and blank_key = '';

-- rp-magpie-bridge ord 2
update reference_answers set content =
  '까치들이 놓은 다리가 은하수를 가로질렀다. 견우는 출렁이는 그 길 위를 내달리며 외쳤다. "직녀님!" 발밑에서 까치들의 날개가 퍼덕였다.'
 where problem_id = (select id from problems where source_key = 'rp-magpie-bridge')
   and ord = 2 and blank_key = '';

-- rp-rabbit-liver ord 1
update reference_answers set content =
  '용왕이 간을 내놓으라고 명했다. 토끼는 침착하게 대답했다. "워낙 귀한 것이라, 깊은 산속에 감추어 두고 왔습니다." 신하들이 그런 짐승이 어디 있느냐고 다그쳤지만, 토끼는 태연히 웃기만 했다.'
 where problem_id = (select id from problems where source_key = 'rp-rabbit-liver')
   and ord = 1 and blank_key = '';

-- rp-rabbit-liver ord 2
update reference_answers set content =
  '간을 내놓으라는 용왕의 명에 토끼는 태연히 답했다. "귀한 것이라 산속에 감추어 두고 왔지요." 신하들이 다그쳐도 토끼는 웃기만 했다.'
 where problem_id = (select id from problems where source_key = 'rp-rabbit-liver')
   and ord = 2 and blank_key = '';

-- rp-siblings-rope ord 1
update reference_answers set content =
  '오누이는 나무 꼭대기에서 두 손을 모아 빌었다. "하느님, 튼튼한 동아줄을 내려 주세요." 하늘에서 스르르 내려온 줄을 오누이는 꽉 잡았다. 동아줄은 둘을 매단 채 하늘로 올라갔다.'
 where problem_id = (select id from problems where source_key = 'rp-siblings-rope')
   and ord = 1 and blank_key = '';

-- rp-siblings-rope ord 2
update reference_answers set content =
  '"하느님, 튼튼한 동아줄을 내려 주세요." 오누이의 기도에 하늘에서 줄이 스르르 내려왔다. 둘은 그것을 꽉 잡고 하늘로 올라갔다.'
 where problem_id = (select id from problems where source_key = 'rp-siblings-rope')
   and ord = 2 and blank_key = '';

-- rp-goblin-club ord 1
update reference_answers set content =
  '도깨비들이 방망이를 휘두르며 외쳤다. "은 나와라, 뚝딱!" 은돈이 쏟아졌다. "금 나와라, 뚝딱!" 방망이는 멈추지 않고 보물을 쏟아 냈다.'
 where problem_id = (select id from problems where source_key = 'rp-goblin-club')
   and ord = 1 and blank_key = '';

-- rp-goblin-club ord 2
update reference_answers set content =
  '도깨비들이 방망이를 휘두를 때마다 은돈과 금돈이 쏟아졌다. "나와라, 뚝딱!" 외침이 이어질수록 보물은 멈추지 않고 쌓여 갔다.'
 where problem_id = (select id from problems where source_key = 'rp-goblin-club')
   and ord = 2 and blank_key = '';

commit;

-- 눈으로 확인한다 — 새 원문·자수 상한·모범답안. 그다음 seed_data.sql → seed_check.sql.
select p.source_key,
       p.scoring_config->>'maxChars' as max_chars,
       p.scoring_config->'repeatTargets' as repeat_targets,
       left(p.passage, 24) as passage_head
  from problems p join stages s on s.id = p.stage_id
 where s.skill_key = 'reduce_repeat'
 order by p.difficulty, p.source_key;
