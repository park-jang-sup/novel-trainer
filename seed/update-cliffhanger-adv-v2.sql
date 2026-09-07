-- 구성 16 cliffhanger_adv(ca-) 5문항 — ai_shadow 신설, ["signal"] (세션 47).
--
-- ca- 는 세션 45(set C) 골든셋으로만 재 왔고 실제로는 ai_shadow 를 한 번도
-- 켠 적이 없다(verify.ts 세션 45 픽스처: "구성 16(ca-) 는 ai_shadow 가
-- 없다"). support 확장은 아직 판정선(STATUS "다음" 2번)에 안 닿았다 — 그
-- 대신 이 세션이 새 관측(signal, 절단 신호)을 연다: 마지막 줄(절단문)을
-- 가리고 읽어도 '무언가 온다'는 낌새가 그 앞에 있는가. support·tell 과
-- 안 섞는다 — ["signal"] 하나뿐이다. **gating 없다** — 관측 층.
--
-- seed/dump/problems.json 이 단일 출처. problems 는 기존 행이라 seed_data
-- 의 insert(where not exists)로는 안 들어간다 — 이 update 를 따로 낸다.
-- 순서: 이 파일 → seed_data.sql(멱등) → seed_check.sql. 재실행 안전
-- (jsonb_set 이 멱등).

begin;

update problems set
  scoring_config = jsonb_set(scoring_config, '{ai_shadow}', '["signal"]'::jsonb)
 where source_key in (
   'ca-gate-dinner',
   'ca-open-door',
   'ca-inn-endroom',
   'ca-crystal-exam',
   'ca-walk-home'
 );

commit;

-- 눈으로 확인한다 — 5건 전부 ai_shadow ["signal"].
select p.source_key, p.scoring_config->>'ai_shadow' as ai_shadow
  from problems p join stages s on s.id = p.stage_id
 where s.skill_key = 'cliffhanger_adv' and p.source_key like 'ca-%'
 order by p.difficulty, p.source_key;
