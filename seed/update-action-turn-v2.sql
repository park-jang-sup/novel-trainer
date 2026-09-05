-- 문장 12 action_turn(bt-) 5문항 — ai_shadow: "support" 추가 (세션 40).
--
-- 결정타 빌드업 섀도(support-v2)를 이 5문항에만 켠다. 규칙 판정 pass 일 때만
-- 그리다이드 gate 를 통과해 support 판정을 매긴다 — **섀도 모드**(gating:
-- false, submissions.is_passed 무영향). 16(ca- cliffhanger_adv)는 이번에 안 켠다.
--
-- seed/dump/problems.json 이 단일 출처. problems 는 기존 행이라 seed_data 의
-- insert(where not exists)로는 안 들어간다 — 이 update 를 따로 낸다.
-- 순서: 이 파일 → seed_data.sql(멱등) → seed_check.sql. 재실행 안전
-- (jsonb_set 이 멱등 — 이미 켜져 있어도 같은 값을 다시 쓸 뿐이다).

begin;

update problems set
  scoring_config = jsonb_set(scoring_config, '{ai_shadow}', '"support"'::jsonb)
 where source_key in (
   'bt-alley-hook',
   'bt-spear-range',
   'bt-orc-axe',
   'bt-fireball-shield',
   'bt-low-guard'
 );

commit;

-- 눈으로 확인한다 — 5건 전부 ai_shadow "support".
select p.source_key, p.scoring_config->>'ai_shadow' as ai_shadow
  from problems p join stages s on s.id = p.stage_id
 where s.skill_key = 'action_turn' and p.source_key like 'bt-%'
 order by p.difficulty, p.source_key;
