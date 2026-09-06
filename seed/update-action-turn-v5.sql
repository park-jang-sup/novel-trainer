-- 문장 12 action_turn(bt-) 5문항 — ai_shadow 를 배열로 승격, "tell" 추가 (세션 45).
--
-- ai_shadow 는 세션 40~44 내내 문자열 "support" 하나였다. 이 세션이 느낌어
-- 판정(tell)을 새로 열면서 한 문항에 섀도 둘을 같이 켤 필요가 생겨 배열로
-- 바꾼다 — ["support","tell"]. 코드(lib/scoring/types.ts 의 shadowKinds)는
-- 문자열도 여전히 읽는다(하위 호환) — 이 SQL 을 아직 안 돌린 DB 도 안 깨진다.
-- **tell 은 관측 층이다. gating 없다** — support 의 no_beat 부분 gating(세션
-- 43, shadow_gate_no_beat)과 무관하게 그대로 둔다.
--
-- seed/dump/problems.json 이 단일 출처. problems 는 기존 행이라 seed_data 의
-- insert(where not exists)로는 안 들어간다 — 이 update 를 따로 낸다.
-- 순서: 이 파일 → seed_data.sql(멱등) → seed_check.sql. 재실행 안전
-- (jsonb_set 이 멱등 — 이미 배열이어도 같은 값을 다시 쓸 뿐이다).

begin;

update problems set
  scoring_config = jsonb_set(scoring_config, '{ai_shadow}', '["support","tell"]'::jsonb)
 where source_key in (
   'bt-alley-hook',
   'bt-spear-range',
   'bt-orc-axe',
   'bt-fireball-shield',
   'bt-low-guard'
 );

commit;

-- 눈으로 확인한다 — 5건 전부 ai_shadow ["support", "tell"].
select p.source_key, p.scoring_config->>'ai_shadow' as ai_shadow
  from problems p join stages s on s.id = p.stage_id
 where s.skill_key = 'action_turn' and p.source_key like 'bt-%'
 order by p.difficulty, p.source_key;
