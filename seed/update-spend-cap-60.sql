-- 세션 55: AI 일일 지출 상한 20 → 60 USD (설정검사 추출 하니스 ③ 6회 × 세트 여러 개).
-- system_flags 는 key/value 다 (flags.ts). value 컬럼이 text 든 jsonb 든 asNumber 가 둘 다 읽는다 — 아래는 text 기준.
-- ★ 이 상한은 "하루 동안 ai_usage_log.cost_usd 합계" 다. 호출당이 아니라 하루 누적이다. 실행당 호출 수 상한은
--   하니스의 --cap(기본 = 계획 호출 수)이고 DB 와 무관하다.
update public.system_flags set value = '60' where key = 'daily_spend_cap_usd';
select key, value from public.system_flags where key = 'daily_spend_cap_usd';   -- 1행, 60
