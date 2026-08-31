-- 4단계 reduce_repeat 8문항의 scoring_config 에 repeatTargets 를 더한다.
-- 세션 26. 실사용 확인 — 한 음절 명사 반복(박·물·간)이 형태소 maxRepeat 로
-- 안 잡혀 원문/답안이 그대로 통과했다. repeatTargets 는 형태소 아님 — 답안
-- 문자열에서 지정한 낱말이 나온 횟수를 그대로 센다.
--
-- seed/dump/problems.json 이 단일 출처. seed_data.sql 의 insert 는 where not
-- exists 라 기존 행을 안 고쳐서 이 update 를 따로 낸다. 순서: 이 파일 → seed_check.sql
--
-- 모범답안(reference_answers)은 그대로. 재실행해도 안전(update 는 멱등).

begin;

-- rp-axe-gold
update problems set scoring_config = '{"maxChars":45,"minVerbs":3,"maxRepeat":2,"repeatTargets":[{"word":"도끼","max":2},{"word":"나무꾼","max":2},{"word":"산신령","max":1}]}'::jsonb
 where source_key = 'rp-axe-gold';

-- rp-heungbu-gourd
update problems set scoring_config = '{"maxChars":35,"minVerbs":3,"maxRepeat":2,"repeatTargets":[{"word":"박","max":2},{"word":"흥부","max":1}]}'::jsonb
 where source_key = 'rp-heungbu-gourd';

-- rp-simcheong-sea
update problems set scoring_config = '{"maxChars":46,"minVerbs":3,"maxRepeat":2,"repeatTargets":[{"word":"바다","max":2},{"word":"심청","max":2}]}'::jsonb
 where source_key = 'rp-simcheong-sea';

-- rp-kongjwi-jar
update problems set scoring_config = '{"maxChars":34,"minVerbs":3,"maxRepeat":2,"repeatTargets":[{"word":"물","max":2},{"word":"콩쥐","max":2}]}'::jsonb
 where source_key = 'rp-kongjwi-jar';

-- rp-magpie-bridge
update problems set scoring_config = '{"maxChars":38,"minVerbs":3,"maxRepeat":2,"repeatTargets":[{"word":"다리","max":2}]}'::jsonb
 where source_key = 'rp-magpie-bridge';

-- rp-rabbit-liver
update problems set scoring_config = '{"maxChars":44,"minVerbs":5,"maxRepeat":2,"repeatTargets":[{"word":"간","max":2},{"word":"토끼","max":2}]}'::jsonb
 where source_key = 'rp-rabbit-liver';

-- rp-siblings-rope
update problems set scoring_config = '{"maxChars":40,"minVerbs":3,"maxRepeat":2,"repeatTargets":[{"word":"밧줄","max":2}]}'::jsonb
 where source_key = 'rp-siblings-rope';

-- rp-goblin-club
update problems set scoring_config = '{"maxChars":41,"minVerbs":4,"maxRepeat":2,"repeatTargets":[{"word":"방망이","max":2},{"word":"도깨비","max":1}]}'::jsonb
 where source_key = 'rp-goblin-club';

commit;

-- 눈으로 확인한다 — repeatTargets 가 8행에 다 있어야 한다. 그다음 seed_check.sql.
select p.source_key, p.scoring_config->'repeatTargets' as repeat_targets
  from problems p join stages s on s.id = p.stage_id
 where s.skill_key = 'reduce_repeat'
 order by p.difficulty, p.source_key;
