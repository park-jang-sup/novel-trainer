-- 2단계 emotion_action 6 + 6단계 sensory 8 문항의 scoring_config 에
-- 표시 전용 필드 forbidLabel·forbidDisplay 를 더한다. 채점 키(forbidWords·
-- forbidLemmas 등)는 한 글자도 안 바뀐다 — 화면의 '쓰지 않을 말' 규칙 줄이
-- 범주 한 줄 + '예: …'(펼치면 전체)로 보이게만 한다.
--
-- seed/dump/problems.json 이 단일 출처 — 이 파일은 거기서 뽑았다.
-- seed_data.sql 의 문항 insert 는 where not exists 라 기존 행 scoring_config 를
-- 안 고친다. 그래서 이 update 를 따로 낸다. 순서: 이 파일 → seed_check.sql
--
-- 재실행해도 안전하다(update 는 멱등).

begin;

-- heungbu-joy
update problems set scoring_config = '{"maxChars":60,"minVerbs":2,"maxAdverbs":1,"forbidWords":["기뻤","기쁘","기뻐","기쁨","행복","신났","신나","즐거","좋았"],"maxModifiers":2,"forbidLabel":"기쁨을 직접 말하는 표현","forbidDisplay":["기쁘다","기쁨","행복하다","신나다","좋다","즐거워하다"]}'::jsonb
 where source_key = 'heungbu-joy';

-- sim-cheong-fear
update problems set scoring_config = '{"maxChars":60,"minVerbs":1,"maxAdverbs":1,"forbidWords":["두려","두렵","무서","겁먹","떨렸","공포","질렸"],"maxModifiers":2,"forbidLabel":"두려움을 직접 말하는 표현","forbidDisplay":["두렵다","무서워하다","겁먹다","떨다","공포"]}'::jsonb
 where source_key = 'sim-cheong-fear';

-- dragon-king-anger
update problems set scoring_config = '{"maxChars":60,"minVerbs":2,"maxAdverbs":1,"forbidWords":["화났","화가 났","화가 나서","화가 치밀","분노","노여","성났","격분","짜증","치밀어","치밀었"],"maxModifiers":2,"forbidLabel":"분노를 직접 말하는 표현","forbidDisplay":["화나다","분노","짜증","치밀다","성나다","격분","노여워하다"]}'::jsonb
 where source_key = 'dragon-king-anger';

-- kongjwi-grief
update problems set scoring_config = '{"maxChars":70,"minVerbs":2,"maxAdverbs":1,"forbidWords":["서러","서럽","슬프","슬펐","슬픔","눈물","흐느","비참","원망"],"maxModifiers":2,"forbidLabel":"서러움을 직접 말하는 표현","forbidDisplay":["서럽다","슬프다","눈물","흐느끼다","비참하다","원망"]}'::jsonb
 where source_key = 'kongjwi-grief';

-- sn-axe-pond
update problems set scoring_config = '{"maxChars":70,"forbidWords":["눈","빛","색","시선","모습","그림자","어둠","캄캄","깜깜","컴컴","흐릿","뚜렷","얼굴","시야","선명","투명","반짝","어른어른"],"forbidLemmas":["보/VV","보이/VV","바라보/VV","쳐다보/VV","내려다보/VV","올려다보/VV","둘러보/VV","살펴보/VV","띄/VV","비치/VV","빛나/VV","번쩍이/VV","반짝이/VV","어른거리/VV","밝/VA","어둡/VA","붉/VA","푸르/VA","하얗/VA","희/VA","환하/VA","검/VA","노랗/VA","누렇/VA","하얘지/VV","흐리/VA","훤하/VA","훤/XR"],"forbidLabel":"눈에 기대는 표현","forbidDisplay":["눈","빛","색","시선","모습","그림자","어둠","보다","보이다","바라보다","쳐다보다","살펴보다","밝다","어둡다","붉다","푸르다","하얗다","검다","빛나다","번쩍이다","반짝이다"]}'::jsonb
 where source_key = 'sn-axe-pond';

-- sn-heungbu-barn
update problems set scoring_config = '{"maxChars":70,"forbidWords":["눈","빛","색","시선","모습","그림자","어둠","캄캄","깜깜","컴컴","흐릿","뚜렷","얼굴","시야","선명","투명","반짝","어른어른"],"forbidLemmas":["보/VV","보이/VV","바라보/VV","쳐다보/VV","내려다보/VV","올려다보/VV","둘러보/VV","살펴보/VV","띄/VV","비치/VV","빛나/VV","번쩍이/VV","반짝이/VV","어른거리/VV","밝/VA","어둡/VA","붉/VA","푸르/VA","하얗/VA","희/VA","환하/VA","검/VA","노랗/VA","누렇/VA","하얘지/VV","흐리/VA","훤하/VA","훤/XR"],"forbidLabel":"눈에 기대는 표현","forbidDisplay":["눈","빛","색","시선","모습","그림자","어둠","보다","보이다","바라보다","쳐다보다","살펴보다","밝다","어둡다","붉다","푸르다","하얗다","검다","빛나다","번쩍이다","반짝이다"]}'::jsonb
 where source_key = 'sn-heungbu-barn';

-- sn-kongjwi-night
update problems set scoring_config = '{"maxChars":70,"forbidWords":["눈","빛","색","시선","모습","그림자","어둠","캄캄","깜깜","컴컴","흐릿","뚜렷","얼굴","시야","선명","투명","반짝","어른어른"],"forbidLemmas":["보/VV","보이/VV","바라보/VV","쳐다보/VV","내려다보/VV","올려다보/VV","둘러보/VV","살펴보/VV","띄/VV","비치/VV","빛나/VV","번쩍이/VV","반짝이/VV","어른거리/VV","밝/VA","어둡/VA","붉/VA","푸르/VA","하얗/VA","희/VA","환하/VA","검/VA","노랗/VA","누렇/VA","하얘지/VV","흐리/VA","훤하/VA","훤/XR"],"forbidLabel":"눈에 기대는 표현","forbidDisplay":["눈","빛","색","시선","모습","그림자","어둠","보다","보이다","바라보다","쳐다보다","살펴보다","밝다","어둡다","붉다","푸르다","하얗다","검다","빛나다","번쩍이다","반짝이다"]}'::jsonb
 where source_key = 'sn-kongjwi-night';

-- sn-simcheong-water
update problems set scoring_config = '{"maxChars":70,"forbidWords":["눈","빛","색","시선","모습","그림자","어둠","캄캄","깜깜","컴컴","흐릿","뚜렷","얼굴","시야","선명","투명","반짝","어른어른"],"forbidLemmas":["보/VV","보이/VV","바라보/VV","쳐다보/VV","내려다보/VV","올려다보/VV","둘러보/VV","살펴보/VV","띄/VV","비치/VV","빛나/VV","번쩍이/VV","반짝이/VV","어른거리/VV","밝/VA","어둡/VA","붉/VA","푸르/VA","하얗/VA","희/VA","환하/VA","검/VA","노랗/VA","누렇/VA","하얘지/VV","흐리/VA","훤하/VA","훤/XR"],"forbidLabel":"눈에 기대는 표현","forbidDisplay":["눈","빛","색","시선","모습","그림자","어둠","보다","보이다","바라보다","쳐다보다","살펴보다","밝다","어둡다","붉다","푸르다","하얗다","검다","빛나다","번쩍이다","반짝이다"]}'::jsonb
 where source_key = 'sn-simcheong-water';

-- gyeonu-longing
update problems set scoring_config = '{"maxChars":70,"minVerbs":2,"maxAdverbs":1,"forbidWords":["그리웠","그리워","그리움","그립","보고 싶","외로","쓸쓸","사무치","애틋"],"maxModifiers":2,"forbidLabel":"그리움을 직접 말하는 표현","forbidDisplay":["그립다","그리움","보고 싶다","쓸쓸하다","사무치다","애틋하다"]}'::jsonb
 where source_key = 'gyeonu-longing';

-- sn-goblin-club
update problems set scoring_config = '{"maxChars":70,"forbidWords":["눈","빛","색","시선","모습","그림자","어둠","캄캄","깜깜","컴컴","흐릿","뚜렷","얼굴","시야","선명","투명","반짝","어른어른"],"forbidLemmas":["보/VV","보이/VV","바라보/VV","쳐다보/VV","내려다보/VV","올려다보/VV","둘러보/VV","살펴보/VV","띄/VV","비치/VV","빛나/VV","번쩍이/VV","반짝이/VV","어른거리/VV","밝/VA","어둡/VA","붉/VA","푸르/VA","하얗/VA","희/VA","환하/VA","검/VA","노랗/VA","누렇/VA","하얘지/VV","흐리/VA","훤하/VA","훤/XR"],"forbidLabel":"눈에 기대는 표현","forbidDisplay":["눈","빛","색","시선","모습","그림자","어둠","보다","보이다","바라보다","쳐다보다","살펴보다","밝다","어둡다","붉다","푸르다","하얗다","검다","빛나다","번쩍이다","반짝이다"]}'::jsonb
 where source_key = 'sn-goblin-club';

-- sn-gyeonu-bridge
update problems set scoring_config = '{"maxChars":70,"forbidWords":["눈","빛","색","시선","모습","그림자","어둠","캄캄","깜깜","컴컴","흐릿","뚜렷","얼굴","시야","선명","투명","반짝","어른어른"],"forbidLemmas":["보/VV","보이/VV","바라보/VV","쳐다보/VV","내려다보/VV","올려다보/VV","둘러보/VV","살펴보/VV","띄/VV","비치/VV","빛나/VV","번쩍이/VV","반짝이/VV","어른거리/VV","밝/VA","어둡/VA","붉/VA","푸르/VA","하얗/VA","희/VA","환하/VA","검/VA","노랗/VA","누렇/VA","하얘지/VV","흐리/VA","훤하/VA","훤/XR"],"forbidLabel":"눈에 기대는 표현","forbidDisplay":["눈","빛","색","시선","모습","그림자","어둠","보다","보이다","바라보다","쳐다보다","살펴보다","밝다","어둡다","붉다","푸르다","하얗다","검다","빛나다","번쩍이다","반짝이다"]}'::jsonb
 where source_key = 'sn-gyeonu-bridge';

-- sn-rabbit-hall
update problems set scoring_config = '{"maxChars":70,"forbidWords":["눈","빛","색","시선","모습","그림자","어둠","캄캄","깜깜","컴컴","흐릿","뚜렷","얼굴","시야","선명","투명","반짝","어른어른"],"forbidLemmas":["보/VV","보이/VV","바라보/VV","쳐다보/VV","내려다보/VV","올려다보/VV","둘러보/VV","살펴보/VV","띄/VV","비치/VV","빛나/VV","번쩍이/VV","반짝이/VV","어른거리/VV","밝/VA","어둡/VA","붉/VA","푸르/VA","하얗/VA","희/VA","환하/VA","검/VA","노랗/VA","누렇/VA","하얘지/VV","흐리/VA","훤하/VA","훤/XR"],"forbidLabel":"눈에 기대는 표현","forbidDisplay":["눈","빛","색","시선","모습","그림자","어둠","보다","보이다","바라보다","쳐다보다","살펴보다","밝다","어둡다","붉다","푸르다","하얗다","검다","빛나다","번쩍이다","반짝이다"]}'::jsonb
 where source_key = 'sn-rabbit-hall';

-- sn-siblings-tree
update problems set scoring_config = '{"maxChars":70,"forbidWords":["눈","빛","색","시선","모습","그림자","어둠","캄캄","깜깜","컴컴","흐릿","뚜렷","얼굴","시야","선명","투명","반짝","어른어른"],"forbidLemmas":["보/VV","보이/VV","바라보/VV","쳐다보/VV","내려다보/VV","올려다보/VV","둘러보/VV","살펴보/VV","띄/VV","비치/VV","빛나/VV","번쩍이/VV","반짝이/VV","어른거리/VV","밝/VA","어둡/VA","붉/VA","푸르/VA","하얗/VA","희/VA","환하/VA","검/VA","노랗/VA","누렇/VA","하얘지/VV","흐리/VA","훤하/VA","훤/XR"],"forbidLabel":"눈에 기대는 표현","forbidDisplay":["눈","빛","색","시선","모습","그림자","어둠","보다","보이다","바라보다","쳐다보다","살펴보다","밝다","어둡다","붉다","푸르다","하얗다","검다","빛나다","번쩍이다","반짝이다"]}'::jsonb
 where source_key = 'sn-siblings-tree';

-- woodcutter-shame
update problems set scoring_config = '{"maxChars":65,"minVerbs":2,"maxAdverbs":1,"forbidWords":["부끄","창피","민망","수치스","낯뜨거","뻘개"],"maxModifiers":2,"forbidLabel":"부끄러움을 직접 말하는 표현","forbidDisplay":["부끄럽다","창피하다","민망하다","수치스럽다"]}'::jsonb
 where source_key = 'woodcutter-shame';

commit;

-- 눈으로 확인한다 — forbidLabel 이 14행에 다 있어야 한다. 그다음 seed_check.sql.
select p.source_key,
       p.scoring_config->>'forbidLabel'   as label,
       jsonb_array_length(p.scoring_config->'forbidDisplay') as 예_개수
  from problems p
  join stages s on s.id = p.stage_id
 where s.skill_key in ('emotion_action','sensory')
 order by s.skill_key, p.difficulty, p.source_key;
