-- 문장 12 action_turn(bt-) 4문항 — ai_hint_material 신설 (세션 46).
--
-- 힌트 v2(AI 가 짧은 코칭 문장을 직접 쓴다)가 참고할 관찰 재료. **답이
-- 아니라 관찰 거리다** — "상대는 이런 버릇이 있다"류 한 줄. 박 님이 문항
-- 마다 직접 거른 문안이다. bt-spear-range 는 없다 — route.ts 가 원문
-- (passage) 마지막 문장 중 forbidWords 에 안 걸리는 것을 대신 쓴다
-- (resolveHintMaterial, lib/ai/hint-text.ts) — 원문 "창은 거리 싸움이었다"
-- 가 그 문장이다.
--
-- seed/dump/problems.json 이 단일 출처. problems 는 기존 행이라 seed_data
-- 의 insert(where not exists)로는 안 들어간다 — 이 update 를 따로 낸다.
-- 순서: 이 파일 → seed_data.sql(멱등) → seed_check.sql. 재실행 안전
-- (jsonb_set 이 멱등).

begin;

update problems set
  scoring_config = jsonb_set(scoring_config, '{ai_hint_material}', '"카엘은 같은 자리에 서서 같은 주문을 되풀이한다."'::jsonb)
 where source_key = 'bt-fireball-shield';

update problems set
  scoring_config = jsonb_set(scoring_config, '{ai_hint_material}', '"강태는 오른손만 쓰고, 주먹을 크게 돌린다."'::jsonb)
 where source_key = 'bt-alley-hook';

update problems set
  scoring_config = jsonb_set(scoring_config, '{ai_hint_material}', '"도끼는 내려찍은 뒤 뽑는 데 한 호흡이 걸린다."'::jsonb)
 where source_key = 'bt-orc-axe';

update problems set
  scoring_config = jsonb_set(scoring_config, '{ai_hint_material}', '"하단 자세는 보통 올려 베기의 준비 자세로 읽힌다."'::jsonb)
 where source_key = 'bt-low-guard';

commit;

-- 눈으로 확인한다 — 4건은 재료가 있고, bt-spear-range 는 없다(null).
select p.source_key, p.scoring_config->>'ai_hint_material' as ai_hint_material
  from problems p join stages s on s.id = p.stage_id
 where s.skill_key = 'action_turn' and p.source_key like 'bt-%'
 order by p.difficulty, p.source_key;
