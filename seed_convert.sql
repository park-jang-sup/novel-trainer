
> novel-trainer@0.1.0 gen:seed
> tsx scripts/gen-convert-seed.ts

-- 자동 생성 파일. 직접 고치지 말 것.
-- 원본: lib/scoring/fixtures/convert-seeds.ts
-- 재생성: npm run gen:seed > seed_convert.sql
--
-- 적용 순서: seed_patch_01 → seed_patch_02 → 이 파일
-- 적용 전에 npm run test:scoring 이 통과해야 한다.

begin;

-- source_key: 지문에서 독립한 안정 식별자.
-- 지문을 고쳐도 매칭이 깨지지 않게 한다.
alter table problems add column if not exists source_key text;
create unique index if not exists problems_source_key_uniq
  on problems (source_key) where source_key is not null;

-- 최초 1회 백필. 이미 값이 있으면 건드리지 않는다.
update problems set source_key = 'sim-cheong-fear'
 where type = 'convert' and source_key is null
   and passage like '%심청은 두려웠다%';
update problems set source_key = 'heungbu-joy'
 where type = 'convert' and source_key is null
   and passage like '%흥부는 기뻤다%';
update problems set source_key = 'kongjwi-grief'
 where type = 'convert' and source_key is null
   and passage like '%콩쥐는 서러웠다%';
update problems set source_key = 'dragon-king-anger'
 where type = 'convert' and source_key is null
   and passage like '%용왕은 화가 났다%';
update problems set source_key = 'woodcutter-shame'
 where type = 'convert' and source_key is null
   and passage like '%나무꾼은 부끄러웠다%';
update problems set source_key = 'gyeonu-longing'
 where type = 'convert' and source_key is null
   and passage like '%견우는 그리웠다%';

-- sim-cheong-fear
update problems set
      instruction    = '''심청은 두려웠다''를 감정어 없이 쓰시오. 신체 동작만으로 두려움이 보이게 할 것.',
      passage        = '뱃사람들이 뱃전에 모여 그녀를 불렀다. 심청은 두려웠다.',
      scoring_config = '{"maxChars":60,"maxAdverbs":1,"maxModifiers":2,"minVerbs":1,"forbidWords":["두려","두렵","무서","겁먹","떨렸","공포","질렸"]}'::jsonb,
      genre_tag      = 'modern',
      difficulty     = 1
 where source_key = 'sim-cheong-fear';

-- heungbu-joy
update problems set
      instruction    = '''흥부는 기뻤다''를 감정어 없이 쓰시오.',
      passage        = '박이 갈라지고 안에서 금은보화가 쏟아졌다. 흥부는 기뻤다.',
      scoring_config = '{"maxChars":60,"maxAdverbs":1,"maxModifiers":2,"minVerbs":2,"forbidWords":["기뻤","기쁘","기뻐","기쁨","행복","신났","신나","즐거","좋았"]}'::jsonb,
      genre_tag      = 'fantasy',
      difficulty     = 1
 where source_key = 'heungbu-joy';

-- kongjwi-grief
update problems set
      instruction    = '''콩쥐는 서러웠다''를 감정어 없이 쓰시오. 울음을 직접 쓰지 말 것.',
      passage        = '식구들은 잔치에 가고 마당에는 깨진 독만 남았다. 콩쥐는 서러웠다.',
      scoring_config = '{"maxChars":70,"maxAdverbs":1,"maxModifiers":2,"minVerbs":2,"forbidWords":["서러","서럽","슬프","슬펐","슬픔","눈물","흐느","비참","원망"]}'::jsonb,
      genre_tag      = 'modern',
      difficulty     = 2
 where source_key = 'kongjwi-grief';

-- dragon-king-anger
update problems set
      instruction    = '''용왕은 화가 났다''를 감정어 없이 쓰시오.',
      passage        = '토끼가 간을 두고 왔다고 말했다. 용왕은 화가 났다.',
      scoring_config = '{"maxChars":60,"maxAdverbs":1,"maxModifiers":2,"minVerbs":2,"forbidWords":["화났","화가 났","화가 나서","화가 치밀","분노","노여","성났","격분","짜증","치밀어","치밀었"]}'::jsonb,
      genre_tag      = 'martial',
      difficulty     = 2
 where source_key = 'dragon-king-anger';

-- woodcutter-shame
update problems set
      instruction    = '''나무꾼은 부끄러웠다''를 감정어 없이 쓰시오.',
      passage        = '산신령이 금도끼와 은도끼를 나란히 들어 보였다. 나무꾼은 부끄러웠다.',
      scoring_config = '{"maxChars":65,"maxAdverbs":1,"maxModifiers":2,"minVerbs":2,"forbidWords":["부끄","창피","민망","수치스","낯뜨거","뻘개"]}'::jsonb,
      genre_tag      = 'fantasy',
      difficulty     = 3
 where source_key = 'woodcutter-shame';

-- gyeonu-longing
update problems set
      instruction    = '''견우는 그리웠다''를 감정어 없이 쓰시오. 직녀를 등장시키지 말 것.',
      passage        = '일 년에 한 번 다리가 놓이는 날이 아직 멀었다. 견우는 그리웠다.',
      scoring_config = '{"maxChars":70,"maxAdverbs":1,"maxModifiers":2,"minVerbs":2,"forbidWords":["그리웠","그리워","그리움","그립","보고 싶","외로","쓸쓸","사무치","애틋"]}'::jsonb,
      genre_tag      = 'romance',
      difficulty     = 3
 where source_key = 'gyeonu-longing';

-- 백필과 갱신이 실제로 걸렸는지, 불변식이 지켜지는지 확인한다.
do $$
declare v_missing text; v_bad text;
begin
  select string_agg(k, ', ') into v_missing
  from unnest(array['sim-cheong-fear', 'heungbu-joy', 'kongjwi-grief', 'dragon-king-anger', 'woodcutter-shame', 'gyeonu-longing']) k
  where not exists (select 1 from problems p where p.source_key = k);
  if v_missing is not null then
    raise exception '[시드] source_key 백필 실패: %. 지문이 예상과 다를 수 있다', v_missing;
  end if;

  -- 지문이 자기 forbidWords에 걸리지 않으면 지문 복사 제출이 통과한다
  select string_agg(p.source_key, ', ') into v_bad
    from problems p
   where p.type = 'convert'
     and p.scoring_config ? 'forbidWords'
     and not exists (
       select 1
         from jsonb_array_elements_text(p.scoring_config->'forbidWords') w
        where p.passage like '%' || w || '%'
     );
  if v_bad is not null then
    raise exception '[시드] 지문이 자기 forbidWords에 걸리지 않음: %', v_bad;
  end if;

  raise notice '시드 적용 및 불변식 확인 완료';
end $$;

commit;

