-- problems.reviewed — 미검토 문항 표시(세션 53). seed_schema.sql 에도 같은
-- alter 문을 넣어 뒀다(새 DB 는 그 파일 하나로 충분하다) — 이 파일은 **기존
-- DB** 에 컬럼만 얹을 때 박 님이 따로 돌리는 델타다.
--
-- ★ 초기값은 전부 false다. 세션 이력으로 추정하지 않는다 — 세션 33 이후
-- 신설분에도 급히 넘어간 게 있고 그 이전에도 전수로 본 것이 있다. 틀린
-- 초기값은 목록을 거짓말로 만든다. 박 님이 눈으로 본 문항만 이후에 손으로
-- true 로 올린다. 전체 157건 전부에 붙는다 — 활성·비활성을 안 가린다.
--
-- 재실행 안전(add column if not exists 가 멱등).

begin;

alter table problems add column if not exists reviewed boolean not null default false;

commit;

-- 눈으로 확인한다 — 지금은 전부 false 다(true 가 하나도 없어야 정상).
select reviewed, count(*) from problems group by 1;
