-- 문장 12 action_turn(bt-) 3문항 — ai_hint_material 을 두 줄로(세션 53).
--
-- 세션 49·50 실측 — 재료 복사(6자 연속 표현 겹침)가 짧은 결론형 재료 5/50 →
-- 11/50 으로 늘었는데, 두 줄인 bt-spear-range 는 두 번 다 0/10 이었다. 짧은
-- 결론형 재료는 복사되고 두 줄 재료는 소화된다는 판정선이 섰다(STATUS "정한
-- 것"). 재료 규격(세션 53 채팅 확정): 앞줄 = 이 장면 안의 관찰거리 · 뒷줄 =
-- 그 관찰의 값(대가·조건·갈래) · 주인공 이름 금지 · 수(해법) 금지 · 격투기
-- 일반론 금지 · 두 줄이 한 축에서 이어질 것.
--
-- bt-low-guard·bt-spear-range 는 이 파일이 안 건드린다 — low-guard 는 한 줄
-- 대조군으로 남긴다(박 님).
--
-- ★ bt-alley-hook 은 확장이 아니라 **교체**다 — 기존 "강태는 오른손만 쓰고,
-- 주먹을 크게 돌린다."를 버리고 갈아 끼운다. 없앤 정보(오른손·큰 훅)를 학습자
-- 몫으로 넘겼다. 재측정에서 갈린다: 힌트가 "몸이 열린다" 쪽으로 옮겨 가면
-- 성공, 여전히 손·궤도를 말하면 재료가 힌트에 안 닿은 것이고 이 문항은 원문이
-- 이미 충분해 재료가 겉도는 자리라는 뜻이다(low-guard 와 정반대 진단).
--
-- seed/dump/problems.json 이 단일 출처. problems 는 기존 행이라 seed_data 의
-- insert(where not exists)로는 안 들어간다 — 이 update 를 따로 낸다.
-- 순서: 이 파일 → seed_data.sql(멱등) → seed_check.sql. 재실행 안전
-- (jsonb_set 이 멱등).

begin;

update problems set
  scoring_config = jsonb_set(scoring_config, '{ai_hint_material}',
    '"주먹은 뻗는 동안 그쪽 몸이 열린 채로 있다.\n열리는 자리는 뻗은 팔이 지나간 아래쪽이고, 주먹이 돌아오기 전까지 그대로 있다."'::jsonb)
 where source_key = 'bt-alley-hook';

update problems set
  scoring_config = jsonb_set(scoring_config, '{ai_hint_material}',
    '"도끼는 내려찍은 뒤 뽑는 데 한 호흡이 걸린다.\n그 한 호흡은 도끼가 어딘가에 박혀야 생기고, 빗나간 도끼는 땅에 박힌다."'::jsonb)
 where source_key = 'bt-orc-axe';

update problems set
  scoring_config = jsonb_set(scoring_config, '{ai_hint_material}',
    '"화염구는 빚는 데 시간이 걸리고, 빚는 동안 카엘의 두 손은 그 자리에 묶인다.\n막을 때마다 방패는 타들어 가지만 카엘은 한 발도 물러서지 않는다."'::jsonb)
 where source_key = 'bt-fireball-shield';

commit;

-- 눈으로 확인한다 — 5건 전부 ai_hint_material 이 있다. alley-hook·orc-axe·
-- fireball-shield 셋은 두 줄(\n 포함), low-guard·spear-range 는 안 바뀐다
-- (spear-range 는 세션 49 부터 이미 두 줄, low-guard 는 여전히 한 줄).
select p.source_key, p.scoring_config->>'ai_hint_material' as ai_hint_material
  from problems p join stages s on s.id = p.stage_id
 where s.skill_key = 'action_turn' and p.source_key like 'bt-%'
 order by p.difficulty, p.source_key;
