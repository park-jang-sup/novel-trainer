-- 3단계 trim_padding 8문항: maxChars 재조정 + 지시문 규격 재작성.
-- 세션 23~24. 지우기 단계가 고쳐쓰기를 강요하면 안 된다 — 새 상한 =
-- 필수 문장 원문 그대로 자수 + 2. 지시문은 공통부(남길 것/지울 것/문장째
-- 지우기만) + 문항별 조항.
--
-- seed/dump/problems.json 이 단일 출처. seed_data.sql 의 insert 는 where not
-- exists 라 기존 행을 안 고쳐서 이 update 를 따로 낸다. 순서: 이 파일 → seed_check.sql
--
-- 모범답안(reference_answers)은 그대로. 재실행해도 안전(update 는 멱등).

begin;

-- tp-axe-water
update problems set scoring_config = '{"maxChars":42,"minVerbs":3,"maxRepeat":2}'::jsonb,
                    instruction = '이야기가 멈추는 문장을 지우고 다시 쓰시오. 남길 것: 인물이 무엇을 하는 문장(사건). 지울 것: 장소나 사물을 설명하는 문장, 몰라도 되는 정보. 새로 쓰지 말고, 원문에서 문장째 지우기만 하십시오. 나무꾼이 손을 넣는 동작까지 남길 것.'
 where source_key = 'tp-axe-water';

-- tp-heungbu-yard
update problems set scoring_config = '{"maxChars":41,"minVerbs":3,"maxRepeat":2}'::jsonb,
                    instruction = '이야기가 멈추는 문장을 지우고 다시 쓰시오. 남길 것: 인물이 무엇을 하는 문장(사건). 지울 것: 장소나 사물을 설명하는 문장, 몰라도 되는 정보. 새로 쓰지 말고, 원문에서 문장째 지우기만 하십시오. 인물이 하는 동작은 하나도 빼지 말 것.'
 where source_key = 'tp-heungbu-yard';

-- tp-simcheong-rail
update problems set scoring_config = '{"maxChars":39,"minVerbs":3,"maxRepeat":2}'::jsonb,
                    instruction = '이야기가 멈추는 문장을 지우고 다시 쓰시오. 남길 것: 인물이 무엇을 하는 문장(사건). 지울 것: 장소나 사물을 설명하는 문장, 몰라도 되는 정보. 새로 쓰지 말고, 원문에서 문장째 지우기만 하십시오.'
 where source_key = 'tp-simcheong-rail';

-- tp-gyeonu-river
update problems set scoring_config = '{"maxChars":35,"minVerbs":2,"maxRepeat":2}'::jsonb,
                    instruction = '이야기가 멈추는 문장을 지우고 다시 쓰시오. 남길 것: 인물이 무엇을 하는 문장(사건). 지울 것: 장소나 사물을 설명하는 문장, 몰라도 되는 정보. 새로 쓰지 말고, 원문에서 문장째 지우기만 하십시오.'
 where source_key = 'tp-gyeonu-river';

-- tp-kongjwi-crack
update problems set scoring_config = '{"maxChars":38,"minVerbs":2,"maxRepeat":2}'::jsonb,
                    instruction = '이야기가 멈추는 문장을 지우고 다시 쓰시오. 남길 것: 인물이 무엇을 하는 문장(사건). 지울 것: 장소나 사물을 설명하는 문장, 몰라도 되는 정보. 새로 쓰지 말고, 원문에서 문장째 지우기만 하십시오. 독의 상태와 콩쥐의 동작만 남길 것.'
 where source_key = 'tp-kongjwi-crack';

-- tp-rabbit-gate
update problems set scoring_config = '{"maxChars":36,"minVerbs":3,"maxRepeat":2}'::jsonb,
                    instruction = '이야기가 멈추는 문장을 지우고 다시 쓰시오. 남길 것: 인물이 무엇을 하는 문장(사건). 지울 것: 장소나 사물을 설명하는 문장, 몰라도 되는 정보. 새로 쓰지 말고, 원문에서 문장째 지우기만 하십시오.'
 where source_key = 'tp-rabbit-gate';

-- tp-siblings-floor
update problems set scoring_config = '{"maxChars":38,"minVerbs":2,"maxRepeat":2}'::jsonb,
                    instruction = '이야기가 멈추는 문장을 지우고 다시 쓰시오. 남길 것: 인물이 무엇을 하는 문장(사건). 지울 것: 장소나 사물을 설명하는 문장, 몰라도 되는 정보. 새로 쓰지 말고, 원문에서 문장째 지우기만 하십시오.'
 where source_key = 'tp-siblings-floor';

-- tp-goblin-mark
update problems set scoring_config = '{"maxChars":45,"minVerbs":3,"maxRepeat":2}'::jsonb,
                    instruction = '이야기가 멈추는 문장을 지우고 다시 쓰시오. 남길 것: 인물이 무엇을 하는 문장(사건). 지울 것: 장소나 사물을 설명하는 문장, 몰라도 되는 정보. 새로 쓰지 말고, 원문에서 문장째 지우기만 하십시오. 남는 문장은 세 개 이하로.'
 where source_key = 'tp-goblin-mark';

commit;

-- 눈으로 확인한다 — maxChars 와 지시문. 그다음 seed_check.sql.
select p.source_key,
       p.scoring_config->>'maxChars' as max_chars,
       p.instruction
  from problems p join stages s on s.id = p.stage_id
 where s.skill_key = 'trim_padding'
 order by p.difficulty, p.source_key;
