-- system_flags 에 'hint_visible' 행 추가 — 힌트 v2 노출 스위치(세션 46).
-- 기본 false(화면에 안 띄움). system_flags 는 이 저장소 밖 Day1 테이블이라
-- (seed_schema.sql 에 CREATE 문 없음 — kill_switch·shadow_gate_no_beat 와
-- 같은 자리) key 의 유니크 제약을 이 파일에서 안 가정한다 — where not
-- exists 로 멱등을 낸다.
--
-- false 여도 힌트 v2 는 계속 계산·캐시된다(route.ts, ai_shadow_cache) —
-- 이 스위치는 gating 이 아니라 **화면 전시**만 막는다. 켜는 것은 박 님
-- 몫이다(STATUS "다음" 참고 — 하네스 --hint 로 힌트 10건을 읽고 거른 뒤).
-- 이 파일은 행을 "없으면 false 로" 만들 뿐, true 로 바꾸지 않는다. 켤 때는:
--   update system_flags set value = 'true' where key = 'hint_visible';

begin;

insert into system_flags (key, value)
select 'hint_visible', 'false'
 where not exists (select 1 from system_flags where key = 'hint_visible');

commit;

-- 눈으로 확인한다.
select key, value from system_flags where key = 'hint_visible';
