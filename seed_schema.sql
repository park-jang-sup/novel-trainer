-- =====================================================================
-- novel-trainer 스키마 시드
--
-- 적용 순서: 이 파일 → seed_data.sql → seed_verify.sql
--
-- 이 파일은 테이블·GRANT·RLS 정책만 담는다. 손으로 유지한다 — 자주
-- 바뀌지 않고, 바뀔 때는 설계 판단이 필요하다.
--
-- 단계(stages) 정의와 문항·정답·골든셋 데이터는 여기 없다. stages도
-- 문항과 같은 이유로 손으로 유지하면 DB와 갈라진다 (실제로 그랬다 —
-- adverb_exception 단계가 DB에만 있었다). seed/dump/*.json이 단일
-- 출처이고, npm run gen:seed 가 만드는 seed_data.sql 이 담당한다.
--
-- 불변식 검사도 여기 없다. 예전에는 이 파일 끝, 데이터 뒤에 있었다.
-- 스키마·데이터를 분리하면서 스키마 파일에 남겨두면 데이터보다 먼저
-- 실행되어 빈 테이블을 검사하고 전부 통과하는, 아무것도 검사하지 않는
-- 검사가 된다. seed_verify.sql로 옮겨 데이터 뒤에 돌린다.
--
-- 전체가 하나의 트랜잭션이다. delete 구문은 없다. 재실행해도 안전하다.
-- =====================================================================

begin;

-- ── 0. 스키마 보강 ───────────────────────────────────────────────────
-- Day1 스키마에 없을 수 있는 것들만 방어적으로 추가한다. 기존 것은 건드리지 않는다.

alter table problems add column if not exists tone_tag   text;
alter table problems add column if not exists source_key text;

create unique index if not exists problems_source_key_uniq
  on problems (source_key) where source_key is not null;

create table if not exists problem_answers (
  problem_id uuid primary key references problems(id) on delete cascade,
  answer     jsonb not null
);
alter table problem_answers enable row level security;
-- 정책 없음 = service_role 전용. 정답이 클라이언트로 나가면 안 된다.

-- ── 권한(GRANT)과 정책(RLS)은 다른 층이다 ───────────────────────────
--
-- 이 프로젝트에서 두 번 물린 지점이다. 반드시 함께 관리한다.
--   GRANT 가 없으면 42501(insufficient_privilege) 오류가 난다.
--   RLS 정책만 없으면 오류 없이 조용히 0행이 온다 — 더 찾기 어렵다.
-- Day1 의 revoke 로 SELECT 권한이 회수돼 있어, 정책만 붙여서는 화면이
-- 뜨지 않는다. 권한을 먼저 확인하고, 그다음 정책을 본다.
--
-- anon 에는 아무 권한도 주지 않는다. 로그인해야 문항을 볼 수 있다.
-- problem_answers / golden_cases / system_flags 에도 주지 않는다.
-- 권한 자체가 없는 것이 정책으로 막는 것보다 확실하다.

grant select         on public.stages      to authenticated;
grant select         on public.problems    to authenticated;
grant select, insert on public.submissions to authenticated;  -- 수정·삭제 불가
grant select         on public.ai_quota    to authenticated;  -- 증가는 consume_ai_quota 만
grant select, update on public.profiles    to authenticated;

-- service_role 은 RLS 는 우회하지만 GRANT 는 우회하지 않는다.
-- 이것이 없으면 라우트가 admin 클라이언트를 써도 정답을 읽지 못하고,
-- 채점이 조용히 pending 으로 떨어진다. 오류도 안 보인다.
grant select         on public.problem_answers to service_role;
grant select         on public.golden_cases    to service_role;
grant select, update on public.system_flags    to service_role;
-- ai_usage_log 은 쓰기만으로 부족하다. 지출 상한이 오늘 sum(cost_usd) 를 읽는다.
-- insert 만 있던 동안에는 마개가 첫 호출에서 42501 로 죽는다 — 위 주석이 적어 둔
-- 바로 그 함정이다.
--
-- ★ 세션 11 §8-1 의 세 번째 얼굴이다.
--     적혀 있는 것과 걸리는 것은 다르다   daily_spend_cap_usd 20 을 읽는 코드가 없었다
--     있는 것과 읽을 수 있는 것은 다르다  ★ 테이블은 있었고 select 이 없었다
--   세션 12가 'ai_usage_log 가 이미 있다' 로 가-2 를 신설에서 배선으로 낮췄는데,
--   배선에도 이 줄이 필요했다.
grant select, insert on public.ai_usage_log    to service_role;


-- submissions 는 읽기와 쓰기 정책을 나눈다.
-- for all 의 using 은 읽기·수정 대상 행을 고르는 조건이라 삽입에는 적용되지 않는다.
-- 삽입에는 with check 가 필요하다. 없으면 제출이 저장되지 않는다.
drop policy if exists "own submissions"        on submissions;
drop policy if exists "own submissions read"   on submissions;
drop policy if exists "own submissions insert" on submissions;

create policy "own submissions read" on submissions
  for select to authenticated using (auth.uid() = user_id);

create policy "own submissions insert" on submissions
  for insert to authenticated with check (auth.uid() = user_id);


-- 문항과 단계는 로그인한 사용자가 읽을 수 있어야 한다.
-- 문항 자체는 비밀이 아니다. 비밀은 정답(problem_answers)뿐이다.
-- 이 정책이 없으면 훈련 화면이 42501(insufficient_privilege)로 실패한다.
alter table stages enable row level security;

drop policy if exists "authed read stages" on stages;
create policy "authed read stages" on stages
  for select to authenticated using (true);

drop policy if exists "authed read problems" on problems;
create policy "authed read problems" on problems
  for select to authenticated
  using (is_active is not false);   -- null 도 활성으로 본다

-- 프롬프트를 고칠 때마다 이것을 돌려 판정이 유지되는지 본다.
create table if not exists golden_cases (
  id         uuid primary key default gen_random_uuid(),
  problem_id uuid references problems(id) on delete cascade,
  content    text not null,
  expected   boolean not null,
  note       text
);
alter table golden_cases enable row level security;

commit;
