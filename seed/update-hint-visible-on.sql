-- system_flags 'hint_visible' 을 켠다(세션 51, 박 님 확정). value 는
-- 문자열이다(lib/ai/flags.ts asBoolean 이 boolean 과 'true'/'false' 문자열을
-- 둘 다 받는다, seed/update-hint-visible.sql 이 'false' 로 넣던 것과 같은
-- 문법) — ::jsonb 캐스팅을 안 쓴다.
--
-- ★ 순서 — 이 파일을 돌리기 전에 seed/clean-hint-v3-cache.sql 을 먼저
--   돌린다(세션 49 이전에 route.ts 를 거쳐 저장된 힌트 v3 캐시가 껍데기째
--   남아 있으면, 켜는 순간 그 껍데기가 그대로 화면에 뜬다).
-- ★ update 는 대상 행이 없으면 조용히 0건이다 — 아래 확인 select 에서
--   행이 안 보이면 seed/update-hint-visible.sql(세션 46, insert where not
--   exists)을 먼저 돌려 행을 만든다.
-- ★ 되돌리기 — 'false' 로 되돌리면 계산·캐시는 계속 서고 노출만 꺼진다
--   (system_flags.hint_visible 은 gating 이 아니라 화면 전시만 막는다):
--   update system_flags set value = 'false' where key = 'hint_visible';

update system_flags set value = 'true' where key = 'hint_visible';

-- 확인 — 1행이 나오는지까지 본다(0행이면 위 순서대로 update-hint-visible.sql 을 먼저 돌린다).
select key, value from system_flags where key = 'hint_visible';
