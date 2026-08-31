-- 3단계 trim_padding 8문항: maxChars 재조정 6건 + 지시문 한 문장 추가 8건.
-- 세션 23. 실사용에서 정직한 답(필수 문장을 원문 그대로 남긴 답)이 옛 상한에
-- 걸렸다 — 지우기 단계가 고쳐쓰기를 강요하면 안 된다. 새 상한 = 필수 문장
-- 원문 그대로 자수 + 2. 지시문에 '새로 쓰지 말고, 원문에서 지우기만' 을 붙였다.
--
-- seed/dump/problems.json 이 단일 출처. seed_data.sql 의 insert 는 where not
-- exists 라 기존 행을 안 고쳐서 이 update 를 따로 낸다. 순서: 이 파일 → seed_check.sql
--
-- scoring_config·모범답안(reference_answers)은 그대로. 재실행해도 안전(update 는 멱등).

begin;

-- tp-axe-water
update problems set scoring_config = '{"maxChars":42,"minVerbs":3,"maxRepeat":2}'::jsonb,
                    instruction = '없어도 되는 문장을 지우고 다시 쓰시오. 나무꾼이 손을 넣는 동작까지 남길 것. 새로 쓰지 말고, 원문에서 지우기만 하십시오.'
 where source_key = 'tp-axe-water';

-- tp-heungbu-yard
update problems set scoring_config = '{"maxChars":41,"minVerbs":3,"maxRepeat":2}'::jsonb,
                    instruction = '없어도 되는 문장을 지우고 다시 쓰시오. 인물이 하는 동작은 하나도 빼지 말 것. 새로 쓰지 말고, 원문에서 지우기만 하십시오.'
 where source_key = 'tp-heungbu-yard';

-- tp-simcheong-rail
update problems set scoring_config = '{"maxChars":39,"minVerbs":3,"maxRepeat":2}'::jsonb,
                    instruction = '없어도 되는 문장을 지우고 다시 쓰시오. 새로 쓰지 말고, 원문에서 지우기만 하십시오.'
 where source_key = 'tp-simcheong-rail';

-- tp-gyeonu-river
update problems set scoring_config = '{"maxChars":35,"minVerbs":2,"maxRepeat":2}'::jsonb,
                    instruction = '없어도 되는 문장을 지우고 다시 쓰시오. 새로 쓰지 말고, 원문에서 지우기만 하십시오.'
 where source_key = 'tp-gyeonu-river';

-- tp-kongjwi-crack
update problems set scoring_config = '{"maxChars":38,"minVerbs":2,"maxRepeat":2}'::jsonb,
                    instruction = '없어도 되는 문장을 지우고 다시 쓰시오. 독의 상태와 콩쥐의 동작만 남길 것. 새로 쓰지 말고, 원문에서 지우기만 하십시오.'
 where source_key = 'tp-kongjwi-crack';

-- tp-rabbit-gate
update problems set scoring_config = '{"maxChars":36,"minVerbs":3,"maxRepeat":2}'::jsonb,
                    instruction = '없어도 되는 문장을 지우고 다시 쓰시오. 새로 쓰지 말고, 원문에서 지우기만 하십시오.'
 where source_key = 'tp-rabbit-gate';

-- tp-siblings-floor
update problems set scoring_config = '{"maxChars":38,"minVerbs":2,"maxRepeat":2}'::jsonb,
                    instruction = '없어도 되는 문장을 지우고 다시 쓰시오. 새로 쓰지 말고, 원문에서 지우기만 하십시오.'
 where source_key = 'tp-siblings-floor';

-- tp-goblin-mark
update problems set scoring_config = '{"maxChars":45,"minVerbs":3,"maxRepeat":2}'::jsonb,
                    instruction = '없어도 되는 문장을 지우고 다시 쓰시오. 남는 문장은 세 개 이하로. 새로 쓰지 말고, 원문에서 지우기만 하십시오.'
 where source_key = 'tp-goblin-mark';

commit;

-- 눈으로 확인한다 — maxChars 와 지시문 끝 문장. 그다음 seed_check.sql.
select p.source_key,
       p.scoring_config->>'maxChars' as max_chars,
       right(p.instruction, 24) as 지시문_끝
  from problems p join stages s on s.id = p.stage_id
 where s.skill_key = 'trim_padding'
 order by p.difficulty, p.source_key;
