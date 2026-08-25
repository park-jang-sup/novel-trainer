-- =====================================================================
-- novel-trainer 불변식 검사
--
-- 적용 순서: seed_schema.sql → seed_data.sql → 이 파일
-- seed_data.sql 을 실행한 뒤에 돌린다. 이 파일은 아무것도 바꾸지 않는다.
--
-- 검사만 하고 아무것도 바꾸지 않으므로 begin/commit 으로 감싸지 않는다.
-- 불변식이 깨지면 raise exception 으로 멈춘다. 어느 문항인지 메시지로
-- 알려준다.
-- =====================================================================

do $$
declare v_bad text; v_cnt int;
begin
  -- (1) remove 문항의 지문은 maxChars 를 넘어야 한다.
  --     넘지 않으면 원문을 그대로 붙여넣어도 통과해 제거 훈련이 성립하지 않는다.
  --     maxChars 는 원문의 75% 안팎으로 잡는다 — 모범답안을 직접 써서
  --     Kiwi 로 측정한 뒤 여유 1을 더한 값이다. 원문보다 크면 그대로
  --     붙여넣어도 통과해 제거 훈련이 성립하지 않는다.
  select string_agg(p.source_key || ' (' ||
                    length(replace(p.passage, ' ', '')) || '자 vs 상한 ' ||
                    (p.scoring_config->>'maxChars') || ')', ', ') into v_bad
    from problems p
   where p.type = 'remove'
     and p.scoring_config ? 'maxChars'
     and length(replace(p.passage, ' ', '')) <= (p.scoring_config->>'maxChars')::int;
  if v_bad is not null then
    raise exception '[불변식 1] 지문이 maxChars 를 넘지 않음: %', v_bad;
  end if;

  -- (2) convert 문항의 지문은 자기 forbidWords 나 forbidLemmas 중 하나에는 걸려야 한다.
  --     forbidWords/forbidLemmas 에 걸리면 AI 를 호출하지 않는다 — 비용 통제의
  --     핵심이다. 걸리지 않으면 지문을 복사해 제출한 답안이 통과하고 AI 까지 호출된다.
  --
  --     원래는 forbidWords 만 봤다. 5·6단계에 forbidLemmas 가 생기면서
  --     forbidLemmas 로만 걸리는 문항(sn-kongjwi-night)이 나왔고, 그대로
  --     두면 시드 전체가 롤백됐다. 그래서 "둘 중 하나"로 넓힌다.
  --
  --     forbidLemmas 는 "보/VV" 형식이라 표제어(split_part(l, '/', 1))만
  --     떼어 passage like 로 본다. 활용형(쳐다봤다 등)은 이 like 로 못
  --     잡는다 — 형태소 분석 없이 SQL 에서 표제어를 정확히 판정할 수
  --     없기 때문이다. 이 검사는 설계 실수(자기 지문도 안 걸리는 규칙을
  --     심는 것)를 잡는 그물이지 채점기가 아니다. 느슨한 근사로 충분하다.
  --
  --     검사 대상은 forbidWords 나 forbidLemmas 중 하나라도 가진 문항이다.
  --     둘 다 없는 문항은 건너뛴다.
  select string_agg(p.source_key, ', ') into v_bad
    from problems p
   where p.type = 'convert'
     and (p.scoring_config ? 'forbidWords' or p.scoring_config ? 'forbidLemmas')
     and not (
       exists (
         select 1 from jsonb_array_elements_text(coalesce(p.scoring_config->'forbidWords', '[]'::jsonb)) w
          where p.passage like '%' || w || '%'
       )
       or exists (
         select 1 from jsonb_array_elements_text(coalesce(p.scoring_config->'forbidLemmas', '[]'::jsonb)) l
          where p.passage like '%' || split_part(l, '/', 1) || '%'
       )
     );
  if v_bad is not null then
    raise exception '[불변식 2] 지문이 자기 forbidWords/forbidLemmas 에 걸리지 않음: %', v_bad;
  end if;

  -- (3) 정답이 필요한 유형에는 problem_answers 행이 있어야 한다.
  select string_agg(coalesce(p.source_key, p.id::text), ', ') into v_bad
    from problems p
   where p.type in ('choice', 'order', 'count')
     and not exists (select 1 from problem_answers a where a.problem_id = p.id);
  if v_bad is not null then
    raise exception '[불변식 3] 정답이 없는 문항: %', v_bad;
  end if;

  -- (4) order 정답은 cards 와 길이가 같고 0..n-1 을 한 번씩 써야 한다.
  --     cards 는 섞인 상태로 저장한다 — 정답 순서대로 저장하면 "아무것도
  --     건드리지 않으면 정답"이 되어 문항이 성립하지 않는다. sequence 의
  --     숫자는 cards 의 원본 인덱스이고 화면 표시 순서와 무관하다. UI 가
  --     다시 섞으려면 displayOrder 를 따로 두고 제출 시 원본 인덱스로
  --     되돌린다.
  select string_agg(p.source_key, ', ') into v_bad
    from problems p
    join problem_answers a on a.problem_id = p.id
   where p.type = 'order'
     and (
       jsonb_array_length(a.answer->'sequence') <> jsonb_array_length(p.scoring_config->'cards')
       or (select count(distinct x) from jsonb_array_elements_text(a.answer->'sequence') x)
          <> jsonb_array_length(p.scoring_config->'cards')
     );
  if v_bad is not null then
    raise exception '[불변식 4] order 정답이 cards 와 맞지 않음: %', v_bad;
  end if;

  -- (5) 정답과 골든셋에는 정책이 하나도 없어야 한다 (service_role 전용).
  --     정책이 붙으면 choice 정답 인덱스가 클라이언트로 샌다.
  select string_agg(tablename || '.' || policyname, ', ') into v_bad
    from pg_policies
   where tablename in ('problem_answers', 'golden_cases');
  if v_bad is not null then
    raise exception '[불변식 5] 정답 테이블에 정책이 붙어 있음: %', v_bad;
  end if;

  -- (6) authenticated 에 problems / stages 의 SELECT 권한이 있어야 한다.
  --     정책만 있고 권한이 없으면 화면이 42501 로 죽는다. 정책과 권한은 다른 층이다.
  select string_agg(t, ', ') into v_bad
    from unnest(array['problems', 'stages']) t
   where not exists (
     select 1 from information_schema.role_table_grants g
      where g.table_schema = 'public' and g.table_name = t
        and g.grantee = 'authenticated' and g.privilege_type = 'SELECT'
   );
  if v_bad is not null then
    raise exception '[불변식 6] authenticated 에 SELECT 권한 없음: %. grant 문을 확인하라', v_bad;
  end if;

  -- (7) anon 에는 데이터 접근 권한이 없어야 한다.
  --     있으면 로그인하지 않고도 문항과 제출 기록이 읽힌다.
  select string_agg(distinct table_name || '(' || privilege_type || ')', ', ') into v_bad
    from information_schema.role_table_grants
   where table_schema = 'public'
     and grantee = 'anon'
     and privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE');
  if v_bad is not null then
    raise exception '[불변식 7] anon 에 데이터 권한이 있음: %', v_bad;
  end if;

  -- (8) service_role 이 정답을 읽을 수 있어야 한다.
  --     RLS 우회와 GRANT 는 다른 층이다. 이것이 없으면 라우트가 정답을 못 읽어
  --     choice / order / count 채점이 전부 pending 으로 떨어진다.
  select string_agg(t, ', ') into v_bad
    from unnest(array['problem_answers', 'golden_cases']) t
   where not exists (
     select 1 from information_schema.role_table_grants g
      where g.table_schema = 'public' and g.table_name = t
        and g.grantee = 'service_role' and g.privilege_type = 'SELECT'
   );
  if v_bad is not null then
    raise exception '[불변식 8] service_role 에 SELECT 권한 없음: %', v_bad;
  end if;

  -- (9) 모든 문항의 stage_id 가 null 이 아니다.
  --     stages.json 에 없는 skill_key 를 참조하면 seed_data.sql 의
  --     insert ... select (select id from stages where skill_key = ...)
  --     가 null 을 낳고, insert 자체는 그대로 성공한다. 오류가 안 난다 —
  --     화면에서만 그 문항이 조용히 사라진다. skill_key 오타나
  --     stages.json 누락을 이 검사가 대신 잡는다.
  select string_agg(coalesce(p.source_key, p.id::text), ', ') into v_bad
    from problems p
   where p.stage_id is null;
  if v_bad is not null then
    raise exception '[불변식 9] stage_id 가 null 인 문항: %', v_bad;
  end if;

  select count(*) into v_cnt from problems;
  raise notice '불변식 9건 통과. 문항 % 개', v_cnt;
end $$;


-- ── 확인 쿼리 (필요하면 따로 돌린다) ─────────────────────────────────
--
-- select s.order_no, s.track, s.title, p.type, count(*)
--   from problems p join stages s on s.id = p.stage_id
--  group by s.order_no, s.track, s.title, p.type
--  order by s.track, s.order_no;
--
-- 형태소 없이 지금 채점 가능한 문항:
-- select count(*) from problems
--  where not (scoring_config ?| array['maxAdverbs','maxModifiers','minVerbs',
--                                     'maxProperNouns','maxRepeat','forbidLemmas']);
-- → 23 이어야 한다
--   (choice 8 + order 3 + coinage 2 + count 2 + rhythm 8)
--
-- 이 배열은 lib/scoring/morph.ts 의 gradeMorph 와 local.ts 의
-- pendingMorphChecks 가 다루는 키와 같아야 한다. 한쪽에 키를 더하면
-- 여기도 더해야 이 확인이 유지된다.
