-- migrations/setting/0001_setting_init.sql — 설정집 × 설정검사 2단계 저장소 **초안** (세션 55, 코드 전).
-- 설계: docs/설정집_설정검사_통합설계_v1.md §4-2 (리뷰 F 개정: conflicts 테이블 없음, 관찰/정본 분리).
-- novel-trainer 시드 파이프라인(seed/seed_schema.sql)과 섞지 않는다 — 별도 폴더, 별도 실행. DB 실행은 박 님 몫이고 아직 돌리지 않았다.
--
-- 원칙이 스키마에 박히는 자리
--   2  버리지 않는다        → entities.notes(분류 안 됨), observations.status='rejected'(지우지 않고 표시)
--   3  승인은 충돌 때만      → observations(원고 출처, 회색) 와 canonical(작가 소유) 이 다른 테이블
--   4  작가 말로 보여준다    → 모든 관찰에 surface + span. 정본에도 근거(promoted_from) 가 남는다
--   5  판정 못 한 것을 숨기지 않는다 → coverage 테이블. 빈 결과를 통과로 읽지 않는다
--   6  코드가 판단한다       → 카드(conflict) 테이블 없음. 카드 = f(observations, events, decisions). dismiss_key 가 멱등키
--   7  정본 승격은 작가만    → canonical.source ∈ {author_note, author_ui, promoted_from:<obs>}; 서버 코드가 자동으로 넣지 않는다
--
-- 1단계 결정이 반영된 곳
--   · 합집합 채점: observations.support / observations.runs (N회 중 등장 횟수). 1/N 은 weak — conflicts.ts 가 읽는다
--   · 관계·전이 물질화: observations.source 에 from_relation / from_transition
--   · 소속은 set: 카디널리티는 코드(attributes.ts) 몫이라 DB 는 모른다. attribute_key 만 저장한다
--   · 표기 축약(서울경찰청장 ⊃ 경찰청장): 카드가 아니라 info — 저장하지 않는다(순수 함수)

begin;

create schema if not exists setting;

-- ───────────── 작품 · 회차 · 장면 ─────────────
create table setting.works (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  title         text not null,
  narrator_entity_id uuid,                       -- entities 가 생긴 뒤 fk (아래 alter)
  tone          text not null default 'plotter' check (tone in ('pantser','plotter')),   -- 즉흥형|설계형 (개연성 임계)
  branches      jsonb not null default '[{"id":"main","label":"현재"}]'::jsonb,           -- 갈래 목록. 모델이 짓지 않고 여기서 준다
  attribute_aliases jsonb not null default '{}'::jsonb,                                  -- 작품별 속성 별칭 {"계급":"skill"}
  created_at    timestamptz not null default now()
);

create table setting.episodes (
  id            uuid primary key default gen_random_uuid(),
  work_id       uuid not null references setting.works(id) on delete cascade,
  number        int  not null,
  text          text not null,
  text_hash     text not null,                    -- 같은 원고 재투입 감지
  created_at    timestamptz not null default now(),
  unique (work_id, number)
);

create table setting.scenes (
  id            uuid primary key default gen_random_uuid(),
  episode_id    uuid not null references setting.episodes(id) on delete cascade,
  ord           int  not null,
  span_start    int  not null,
  span_end      int  not null,
  branch        text not null,                    -- main | pre_regression | flashback | …
  anchor_event_id uuid,                           -- events 가 생긴 뒤 fk
  anchor_rel    text check (anchor_rel in ('before','after','during')),
  anchor_confidence real,
  anchor_source text check (anchor_source in ('rule','llm','author')),
  pov_entity_id uuid,
  summary       text,
  unique (episode_id, ord)
);

-- ───────────── 개체 · 사전 ─────────────
create table setting.entities (
  id            uuid primary key default gen_random_uuid(),
  work_id       uuid not null references setting.works(id) on delete cascade,
  kind          text not null check (kind in ('character','organization','place','structure','item','skill','term','creature')),
  canonical_name text not null,
  summary       text,
  notes         text[] not null default '{}',     -- "분류 안 됨" 문장이 붙는 자리 (원칙 2)
  first_ep      int,
  last_ep       int,
  created_at    timestamptz not null default now(),
  unique (work_id, canonical_name)
);
alter table setting.works  add constraint works_narrator_fk foreign key (narrator_entity_id) references setting.entities(id) on delete set null;
alter table setting.scenes add constraint scenes_pov_fk foreign key (pov_entity_id) references setting.entities(id) on delete set null;

create table setting.lexicon (
  id            uuid primary key default gen_random_uuid(),
  work_id       uuid not null references setting.works(id) on delete cascade,
  entity_id     uuid not null references setting.entities(id) on delete cascade,
  surface       text not null,                    -- 표기 그대로
  script        text not null default 'hangul' check (script in ('hangul','hanja','roman')),
  is_alias      boolean not null default false,
  parent_id     uuid references setting.lexicon(id) on delete set null,   -- 천뢰검법 → 천뢰검
  unique (work_id, surface)
);

-- ───────────── 관찰 (원고 출처 · 점 · 불변) ─────────────
-- 검사기의 입력. 화면에서는 회색. 지우지 않는다 — status 로 표시한다.
create table setting.observations (
  id            uuid primary key default gen_random_uuid(),
  work_id       uuid not null references setting.works(id) on delete cascade,
  entity_id     uuid not null references setting.entities(id) on delete cascade,
  attribute     text not null,                    -- 원문 속성명 (화면용)
  attribute_key text not null,                    -- 정규화 키 (검사용, attributes.ts)
  value_raw     text not null,
  value_norm    jsonb not null,                   -- number 또는 string
  branch        text not null,
  episode_id    uuid not null references setting.episodes(id) on delete cascade,
  scene_id      uuid references setting.scenes(id) on delete set null,
  span_start    int  not null,
  span_end      int  not null,
  surface       text not null,
  certainty     text not null check (certainty in ('explicit','inferred')),
  claimed_in_dialogue boolean not null default false,
  speaker_entity_id uuid references setting.entities(id) on delete set null,
  exclusive     boolean not null default false,
  source        text not null check (source in ('manuscript_llm','manuscript_rule','from_relation','from_transition')),
  support       int  not null default 1,          -- 합집합: N회 중 등장 횟수
  runs          int  not null default 1,          -- 합집합: N. support = 1 and runs > 1 이면 weak
  status        text not null default 'observed' check (status in ('observed','rejected')),
  created_at    timestamptz not null default now()
);
create index on setting.observations (work_id, entity_id, attribute_key, branch);
create index on setting.observations (episode_id);

-- ───────────── 정본 (작가 소유 · 구간) ─────────────
-- 화면의 "지금 상태". 승격 = 관찰을 여기로 복사. 서버가 자동으로 넣지 않는다 (원칙 7).
create table setting.canonical (
  id            uuid primary key default gen_random_uuid(),
  work_id       uuid not null references setting.works(id) on delete cascade,
  entity_id     uuid not null references setting.entities(id) on delete cascade,
  attribute     text not null,
  attribute_key text not null,
  value         jsonb not null,
  from_ep       int  not null,
  to_ep         int,                              -- null = 열린 구간(현재)
  branch        text not null default 'main',
  source        text not null,                    -- author_note | author_ui | promoted_from:<observation uuid>
  created_at    timestamptz not null default now(),
  check (to_ep is null or to_ep >= from_ep)
);
create index on setting.canonical (work_id, entity_id, attribute_key, branch);

-- ───────────── 사건 · 관계 · 규칙 ─────────────
create table setting.events (
  id            uuid primary key default gen_random_uuid(),
  work_id       uuid not null references setting.works(id) on delete cascade,
  episode_id    uuid not null references setting.episodes(id) on delete cascade,
  scene_id      uuid references setting.scenes(id) on delete set null,
  kind          text not null check (kind in ('transition','occurrence')),
  description   text not null,
  surface       text not null,
  span_start    int  not null,
  branch        text not null,
  subject_entity_id uuid references setting.entities(id) on delete set null,
  attribute     text,
  attribute_key text,
  value_before  jsonb,
  value_after   jsonb,
  elapsed_years numeric,                          -- 시간 도약 (리뷰 H)
  source        text not null default 'manuscript_llm' check (source in ('manuscript_llm','author_ui')),   -- 작가가 카드에 "사건 등록" 으로 답하면 author_ui
  support       int not null default 1,
  runs          int not null default 1
);
alter table setting.scenes add constraint scenes_anchor_fk foreign key (anchor_event_id) references setting.events(id) on delete set null;
create index on setting.events (work_id, subject_entity_id, attribute_key, branch);

create table setting.relations (
  id            uuid primary key default gen_random_uuid(),
  work_id       uuid not null references setting.works(id) on delete cascade,
  subject_id    uuid not null references setting.entities(id) on delete cascade,
  predicate     text not null,
  object_id     uuid not null references setting.entities(id) on delete cascade,
  from_ep       int  not null,
  to_ep         int,
  branch        text not null default 'main',
  status        text not null default 'observed' check (status in ('observed','canonical','rejected')),
  source        text not null default 'manuscript_llm',
  scene_id      uuid references setting.scenes(id) on delete set null,
  span_start    int,
  span_end      int,
  surface       text,
  claimed_in_dialogue boolean not null default false,
  support       int not null default 1,
  runs          int not null default 1
);

create table setting.rules (
  id            uuid primary key default gen_random_uuid(),
  work_id       uuid not null references setting.works(id) on delete cascade,
  category      text not null default 'other',
  statement     text not null,                    -- 작가 말
  formal        jsonb,                            -- 검사기가 읽는 형식(③). null 이면 LLM 판정 대상. 우선 비교·포함·배타 3종
  scope_entity_id uuid references setting.entities(id) on delete set null,
  from_ep       int  not null,
  to_ep         int,                              -- 종료 회차가 붙으면 극복 서사
  branch        text not null default 'main',
  source        text not null default 'manuscript_llm',
  status        text not null default 'observed' check (status in ('observed','canonical','rejected')),
  surface       text,
  support       int not null default 1,
  runs          int not null default 1
);

-- ───────────── 결정 (작가가 카드에 한 답) ─────────────
-- 되돌리기 = 행 삭제. 카드는 저장하지 않는다 — dismiss_key 가 카드의 멱등키다 (conflicts.ts makeDismissKey).
create table setting.decisions (
  id            uuid primary key default gen_random_uuid(),
  work_id       uuid not null references setting.works(id) on delete cascade,
  dismiss_key   text not null,
  action        text not null check (action in ('dismiss','register_event','register_rule','register_alias','fix_manuscript')),
  payload       jsonb not null default '{}'::jsonb,   -- register_event 면 만든 events.id, register_alias 면 lexicon.id …
  decided_at    timestamptz not null default now(),
  unique (work_id, dismiss_key)
);

-- ───────────── coverage (판정 못 한 것) ─────────────
create table setting.coverage (
  id            bigserial primary key,
  episode_id    uuid not null references setting.episodes(id) on delete cascade,
  scene_id      uuid references setting.scenes(id) on delete set null,
  kind          text not null,                    -- unanchored_scene | dropped_surface | orphan_ref | ambiguous_surface | similar_attributes_unmerged | values_unparsed | first_mention_fallback | …
  detail        jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
create index on setting.coverage (episode_id, kind);

-- ───────────── 공유 · RLS ─────────────
create table setting.work_members (
  work_id       uuid not null references setting.works(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  role          text not null default 'editor' check (role in ('editor','viewer')),   -- 편집자 권한 범위는 열린 질문 3
  primary key (work_id, user_id)
);

-- RLS: works.owner_id 기준. 나머지 테이블은 work_id 로 works 를 따라간다.
alter table setting.works        enable row level security;
alter table setting.episodes     enable row level security;
alter table setting.scenes       enable row level security;
alter table setting.entities     enable row level security;
alter table setting.lexicon      enable row level security;
alter table setting.observations enable row level security;
alter table setting.canonical    enable row level security;
alter table setting.events       enable row level security;
alter table setting.relations    enable row level security;
alter table setting.rules        enable row level security;
alter table setting.decisions    enable row level security;
alter table setting.coverage     enable row level security;
alter table setting.work_members enable row level security;

create or replace function setting.can_read(w uuid) returns boolean language sql stable security definer as $$
  select exists (select 1 from setting.works where id = w and owner_id = auth.uid())
      or exists (select 1 from setting.work_members where work_id = w and user_id = auth.uid());
$$;
create or replace function setting.can_write(w uuid) returns boolean language sql stable security definer as $$
  select exists (select 1 from setting.works where id = w and owner_id = auth.uid())
      or exists (select 1 from setting.work_members where work_id = w and user_id = auth.uid() and role = 'editor');
$$;

create policy works_select on setting.works for select using (setting.can_read(id));
create policy works_all    on setting.works for all    using (owner_id = auth.uid()) with check (owner_id = auth.uid());
-- work_id 를 가진 테이블은 같은 꼴. (초안이라 한 테이블만 적고 나머지는 같은 두 줄을 복제한다 — 실행 전에 펼친다)
create policy observations_select on setting.observations for select using (setting.can_read(work_id));
create policy observations_write  on setting.observations for all    using (setting.can_write(work_id)) with check (setting.can_write(work_id));
-- TODO(실행 전): episodes · entities · lexicon · canonical · events · relations · rules · decisions · work_members 에 같은 정책.
--   scenes · coverage 는 episode_id → episodes.work_id 를 거친다(서브쿼리 또는 work_id 컬럼 추가 — 추가하는 쪽이 단순하다).

-- 서비스 롤: 추출 하니스와 서버 라우트가 쓴다. seed_schema.sql 의 grant 관행과 같다(권한은 DB 에 가야 걸린다 — flags.ts 주석).
grant usage on schema setting to service_role, authenticated;
grant select, insert, update, delete on all tables in schema setting to service_role;
grant usage, select on all sequences in schema setting to service_role;
grant select, insert, update, delete on all tables in schema setting to authenticated;   -- RLS 가 가른다
grant usage, select on all sequences in schema setting to authenticated;

commit;

-- 열린 질문 (docs/설정집_설정검사_2단계_설계초안.md 참고)
--   Q1 canonical 을 observations 와 같은 테이블에 status 로 둘지 → 아니오. 구간(from_ep/to_ep) 과 점(span) 은 다른 모양이다 (리뷰 F).
--   Q2 support/runs 를 observations 에 둘지 별도 extraction_runs 에 둘지 → 우선 컬럼. 실행 로그가 필요해지면 extraction_runs 를 뒤에 붙인다.
--   Q3 scenes.work_id 중복 컬럼 → RLS 단순화를 위해 넣는 쪽으로 기울어 있다.
