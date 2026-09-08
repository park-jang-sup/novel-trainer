-- 문장 12 action_turn(bt-) — bt-spear-range 에 ai_hint_material 신설 (세션 49).
--
-- 세션 46 이 bt- 4건에 재료를 뒀고 bt-spear-range 는 없어서 route.ts 가 원문
-- (passage) 마지막 문장("창은 거리 싸움이었다")을 대신 썼다(resolveHintMaterial,
-- lib/ai/hint-text.ts). 세션 48 --hint 골든에서 이 문항 nak 5건의 힌트가 전부
-- "거리·간격"만 되풀이했다 — 원문 마지막 문장은 "무엇이 원리인지"만 말할 뿐
-- "그 원리로 무엇을 재고 고르는지"를 안 담아서다. 그래서 이 문항만 박 님이
-- 직접 재료를 두 줄로 썼다 — 창의 두 수(찌르기·후리기)가 각각 무엇을 요구하고
-- 무엇에 약한지를 담아야 '읽고 → 재고 → 고른다'는 축이 선다(양가창법의 란·나·
-- 찰 구도, 무예도보통지 장창술 계열 — 무협 배경에 맞는다). 나머지 넷(fireball·
-- alley-hook·orc-axe·low-guard)의 재료를 두 줄로 늘릴지는 이 문항 재측정 뒤에
-- 정한다 — 지금은 spear-range 하나만 바꾼다.
--
-- seed/dump/problems.json 이 단일 출처. problems 는 기존 행이라 seed_data 의
-- insert(where not exists)로는 안 들어간다 — 이 update 를 따로 낸다.
-- 순서: 이 파일 → seed_data.sql(멱등) → seed_check.sql. 재실행 안전
-- (jsonb_set 이 멱등).

begin;

update problems set
  scoring_config = jsonb_set(scoring_config, '{ai_hint_material}',
    '"창은 뒷손이 밀어야 찌르기가 나가고, 앞손이 창대를 감아쥐어야 후리기가 나간다.\n찌르기는 곧아서 반 뼘만 틀면 창끝이 몸을 스쳐 지나가고, 후리기는 둥글어서 원 안쪽이 가장 느리다."'::jsonb)
 where source_key = 'bt-spear-range';

commit;

-- 눈으로 확인한다 — bt- 5건 전부 ai_hint_material 이 있다(더는 null 이 없다).
select p.source_key, p.scoring_config->>'ai_hint_material' as ai_hint_material
  from problems p join stages s on s.id = p.stage_id
 where s.skill_key = 'action_turn' and p.source_key like 'bt-%'
 order by p.difficulty, p.source_key;
