-- system_flags 에 'shadow_gate_no_beat' 행 추가 — no_beat 부분 gating 스위치
-- (세션 43). 기본 false(gating 안 함). system_flags 는 이 저장소 밖 Day1
-- 테이블이라(seed_schema.sql 에 CREATE 문 없음 — kill_switch·daily_spend_cap_usd
-- 와 같은 자리) key 의 유니크 제약을 이 파일에서 안 가정한다 — where not
-- exists 로 멱등을 낸다.
--
-- 켜는 것은 박 님 몫이다(STATUS "no_beat gating on 결정" 참고) — 이 파일은
-- 행을 "없으면 false 로" 만들 뿐, true 로 바꾸지 않는다. 켤 때는:
--   update system_flags set value = 'true' where key = 'shadow_gate_no_beat';

begin;

insert into system_flags (key, value)
select 'shadow_gate_no_beat', 'false'
 where not exists (select 1 from system_flags where key = 'shadow_gate_no_beat');

commit;

-- 눈으로 확인한다.
select key, value from system_flags where key = 'shadow_gate_no_beat';
