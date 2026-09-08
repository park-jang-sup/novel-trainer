-- 힌트 v3 옛 캐시 정리(세션 51). **박 님이 SQL 편집기에서 직접 돌린다** —
-- ai_shadow_cache 권한은 service_role 에 select·insert 뿐이다(seed_schema.sql
-- 189행, grant select, insert) — 앱 코드에는 delete 경로를 만들지 않는다.
--
-- 왜 지우는가 — 벗기기(unwrapHintV3Feedback)는 judgeHintV3With **안에서만**
-- 한다. 세션 49 이전(벗기기 신설 전)에 route.ts 를 거쳐 저장된 캐시는
-- 껍데기(JSON 객체·bare string)째 저장돼 있다. PROMPT_VERSION_HINT_V3
-- ('hint-v3')가 그대로라 캐시 키(hash)도 그대로 — hint_visible 을 켜는
-- 순간 route.ts(599행)가 그 껍데기를 그대로 학습자 화면에 돌려준다. 건당
-- 재계산이 $0.003 이라 지우는 값이 아깝지 않다(박 님).
--
-- ★ prompt_version 조건을 반드시 건다 — support·tell·signal 캐시는 안
--   건드린다. ★ where 절이 check-hint-v3-live.sql ②와 글자까지 같다 —
--   다르면 "0건 확인" 뒤에도 화면에 껍데기가 뜰 수 있다.

begin;

delete from ai_shadow_cache
 where prompt_version = 'hint-v3'
   and (ltrim(judgment->>'text') like '{%' or ltrim(judgment->>'text') like '"%');

commit;

-- 확인 — 0 이 나와야 한다(check-hint-v3-live.sql ②와 같은 조건).
select count(*) as n
  from ai_shadow_cache
 where prompt_version = 'hint-v3'
   and (ltrim(judgment->>'text') like '{%' or ltrim(judgment->>'text') like '"%');
