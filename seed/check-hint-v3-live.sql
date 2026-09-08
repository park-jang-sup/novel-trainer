-- 힌트 v3 캐시 실측(읽기 전용, 세션 51). ai_shadow_cache 를 안 지운다 —
-- 지우는 몫은 seed/clean-hint-v3-cache.sql. hint_visible 을 켜기 전에
-- 옛 캐시(세션 49 벗기기 신설 이전, route.ts 를 거쳐 저장된 것)가 얼마나
-- 남았는지 먼저 본다.
--
-- ★ 'hint-v3' 는 lib/ai/prompt.ts 의 PROMPT_VERSION_HINT_V3 값 그대로다
--   (손으로 다시 적지 말 것 — 어긋나면 삭제 0건이 "껍데기 없음"으로 잘못
--   읽힌다). check-hint-v3-live.sql·clean-hint-v3-cache.sql 두 파일의
--   where 절을 글자까지 같게 맞춘다.

-- ① prompt_version = 'hint-v3' 행의 verdict 별 건수.
select verdict, count(*) as n
  from ai_shadow_cache
 where prompt_version = 'hint-v3'
 group by verdict
 order by n desc;

-- ② judgment->>'text' 가 껍데기(JSON 객체 · bare string)째 남은 행 수와
--    최근 10건. ltrim 을 씌운다 — 세션 48 당시 judgeHintV3With(커밋
--    8b1b7e8)는 trim → 코드펜스 제거 → trim 순서라 보통 앞 공백은 없지만,
--    닫는 펜스 정규식(`/```$/`)이 문자열 끝에만 걸려 펜스 뒤에 말이 붙은
--    응답은 앞에 잔여 문자가 남을 수 있다 — ltrim 을 씌워 손해가 없다(박 님).
select count(*) as n
  from ai_shadow_cache
 where prompt_version = 'hint-v3'
   and (ltrim(judgment->>'text') like '{%' or ltrim(judgment->>'text') like '"%');

select hash, problem_id, left(judgment->>'text', 40) as text_head
  from ai_shadow_cache
 where prompt_version = 'hint-v3'
   and (ltrim(judgment->>'text') like '{%' or ltrim(judgment->>'text') like '"%')
 order by created_at desc
 limit 10;

-- ③ verdict='discarded'(세션 50 신설 — 재시도까지 실패한 답안) 최근 10건의
--    폐기 사유.
select hash, problem_id, judgment->'reasons' as reasons, created_at
  from ai_shadow_cache
 where prompt_version = 'hint-v3' and verdict = 'discarded'
 order by created_at desc
 limit 10;
