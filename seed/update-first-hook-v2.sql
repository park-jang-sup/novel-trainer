-- 구성 18 first_hook 정정 v2 — maxChars 200 (세션 36).
--
-- 박 님 결정: 다섯 줄 문항은 답안 여유가 필요하다 — 5문항 전부 maxChars 200
-- (fh-regress-date 150 → 200 포함, 나머지는 180 → 200). 다른 config 키·문안은
-- 그대로.
--
-- seed/dump/problems.json 이 단일 출처. problems 는 기존 행이라 seed_data 의
-- insert(where not exists)로는 안 들어간다 — 이 update 를 따로 낸다.
-- 순서: 이 파일 → seed_data.sql(멱등) → seed_check.sql. 재실행 안전.

begin;

update problems set
  scoring_config = jsonb_set(scoring_config, '{maxChars}', '200'::jsonb)
 where source_key in (
   'fh-villainess-mirror',
   'fh-release-ball',
   'fh-burnt-manor',
   'fh-regress-date',
   'fh-broken-engagement'
 );

commit;

-- 눈으로 확인한다 — 5건 전부 maxChars 200.
select p.source_key, p.scoring_config->>'maxChars' as max_chars
  from problems p join stages s on s.id = p.stage_id
 where s.skill_key = 'first_hook'
 order by p.difficulty, p.source_key;
