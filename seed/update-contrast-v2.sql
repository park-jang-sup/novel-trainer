-- 구성 12 재설계 — 대비형 cc- 4건 비활성 (세션 32 후기).
--
-- 박 님 판정: 기존 문항은 인물이 한 줄 라벨이라 "결과만 있고 배움이 없다".
-- '대비 캐릭터' → '입체 캐릭터'(겉과 속의 갭)로 전면 교체한다. 옛 대비형
-- 네 건은 지우지 않고 비활성으로 내린다 — 제출 이력 보존, 행 삭제 금지
-- (10단계 action_turn 선례).
--
--   비활성:  cc-report-credit · cc-street-night · cc-raid-reward · cc-relic-box
--   활성 유지: cc-first-pay (조평·유겸 프로필 정합 최고)
--
-- seed/dump/deactivate.json 이 단일 출처. seed_data.sql 도 이 update 를 통째로
-- 재발행한다(멱등) — 이 파일은 박 님이 신규 insert 전에 먼저 돌리는 델타다.
-- 순서: 이 파일 → seed_data.sql(신규 5 + stages 갱신) → seed_check.sql

begin;

update problems set is_active = false
 where source_key in (
   'cc-report-credit',
   'cc-street-night',
   'cc-raid-reward',
   'cc-relic-box'
 );

commit;

-- 눈으로 확인한다 — 구성 12 문항의 활성 상태. cc-first-pay 와 신규 5건만 true.
select p.source_key, p.is_active
  from problems p join stages s on s.id = p.stage_id
 where s.skill_key = 'contrast_char'
 order by p.difficulty, p.source_key;
