-- 자동 생성 파일. 직접 고치지 말 것.
-- 원본: seed/dump/problems.json
-- 재생성: npm run gen:seed
--
-- 적용 순서: seed_schema.sql → seed_data.sql → 이 파일 → seed_verify.sql
--
-- 이 파일은 덤프와 DB를 대조한다. seed_verify.sql은 DB 안에서 닫힌
-- 불변식을 잰다 — 다른 일이라 파일을 나눈다.
-- 아무것도 바꾸지 않는다.
--
-- md5만으로는 "다르다"만 알고 무엇이 다른지 모른다. 길이가 함께 있으면
-- 214 vs 206처럼 CRLF 오염이 즉시 드러난다. 이번 세션에 그것 때문에
-- 한참 걸렸다.
--
-- scoring_config는 md5를 쓰지 않는다. jsonb끼리 is distinct from으로
-- 비교한다 — 키 순서와 공백이 무관해진다. md5를 쓰려면 양쪽이 똑같은
-- 정규화 문자열을 만들어야 하는데 배열 표기(["a", "b"] vs ["a","b"])
-- 에서 갈려 거짓 경보가 난다.
--
-- expect는 CTE가 아니라 임시 테이블이다. CTE는 그것이 붙은 statement
-- 하나에만 유효해서, 검사 넷을 한 do 블록 안에서 나눠 적으려면 매번
-- 93행짜리 values를 다시 적어야 한다. 임시 테이블로 한 번만 채운다.
--
-- 마지막 문장이 select인 것은 의도다. Supabase 편집기가 NOTICE를
-- 안 띄워서, raise notice로 끝내면 "통과"와 "파일이 잘려 안 돌았다"가
-- 둘 다 'Success. No rows returned'로 보인다. 행이 나오면 끝까지 돈 것이다.
-- 이 select 뒤에 다른 문장을 두지 마라 — 편집기는 마지막 결과만 보여준다.
-- do 블록 안의 raise notice는 지우지 않는다. psql로 돌리는 사람에게는
-- 그쪽이 보인다.
--
-- Supabase 편집기가 'destructive / RLS 없는 테이블' 경고를 띄운다.
-- Run without RLS를 누르면 된다. drop 대상은 이 파일이 만든 임시 테이블
-- 뿐이고, temporary table은 pg_temp에 있어 anon·authenticated가 볼 수
-- 없다. Run and enable RLS는 임시 테이블에 RLS를 걸려다 검사가 엉뚱하게
-- 죽을 수 있으니 누르지 마라.

drop table if exists expect;

create temporary table expect (
  source_key text,
  instr_md5 text,
  instr_len int,
  pass_md5 text,
  pass_len int,
  cfg jsonb
);

insert into expect (source_key, instr_md5, instr_len, pass_md5, pass_len, cfg) values
  ('rm-axe-pond', '767bce97ba0984cb0aaa18ad470b183b', 99, 'f32376318db1d3b5936bc5bdaed0f9f7', 49, '{"maxChars":36,"minVerbs":2,"maxRepeat":2,"maxAdverbs":1,"maxModifiers":1}'::jsonb),
  ('rm-heungbu-swallow', '422bcd35e5ed12611f1c159741b8d284', 101, '6c9ffa5102ba47bf88f994870c85a89a', 46, '{"maxChars":34,"minVerbs":2,"maxRepeat":2,"maxAdverbs":1,"maxModifiers":2}'::jsonb),
  ('rm-kongjwi-jar', '3fc7a0a23aea08179dbcc07b8b58fd04', 114, 'dca740c6656f2f5a81e2f3589df6af2a', 64, '{"maxChars":39,"minVerbs":4,"maxRepeat":2,"maxAdverbs":1,"maxModifiers":2}'::jsonb),
  ('rm-simcheong-deck', 'c4a134de4c38ba8c8649c03ac9c494bd', 78, 'c3bbcfdbc37a9b2408db19837758c415', 57, '{"maxChars":40,"minVerbs":2,"maxRepeat":2,"maxAdverbs":1,"maxModifiers":1}'::jsonb),
  ('rm-magpie-bridge', '8c9989ae73ed1155503dbb3a1f20ae19', 101, '44abb15a305e9a456abfca5a65342dd4', 53, '{"maxChars":34,"minVerbs":2,"maxRepeat":2,"maxAdverbs":1,"maxModifiers":1}'::jsonb),
  ('rm-rabbit-court', 'c4a134de4c38ba8c8649c03ac9c494bd', 78, '5b89814326a3b13cf5aa33dbb50ca7d9', 62, '{"maxChars":40,"minVerbs":3,"maxRepeat":2,"maxAdverbs":1,"maxModifiers":1}'::jsonb),
  ('rm-siblings-tree', 'c4a134de4c38ba8c8649c03ac9c494bd', 78, '02a8bd50b2742dc40d2076f805c45998', 68, '{"maxChars":44,"minVerbs":2,"maxRepeat":2,"maxAdverbs":1,"maxModifiers":1}'::jsonb),
  ('rm-goblin-club', '4af82dadf8273d39e9012e06a7199f05', 94, 'e5fe17def733f583bd84b79d9d7a7ab3', 65, '{"maxChars":42,"minVerbs":3,"maxRepeat":2,"maxAdverbs":1,"maxModifiers":2}'::jsonb),
  ('heungbu-joy', '3d67b9991f63f7137c1e6ba4fa094d1d', 22, 'da937ab22e4be877e917c12dd2b7f4a0', 32, '{"maxChars":60,"minVerbs":2,"maxAdverbs":1,"forbidWords":["기뻤","기쁘","기뻐","기쁨","행복","신났","신나","즐거","좋았"],"maxModifiers":2}'::jsonb),
  ('sim-cheong-fear', '1ce88519de2a3b56c4602e5f1de52085', 46, '349f86cbb5b24dad2ed5a49d55af3aff', 31, '{"maxChars":60,"minVerbs":1,"maxAdverbs":1,"forbidWords":["두려","두렵","무서","겁먹","떨렸","공포","질렸"],"maxModifiers":2}'::jsonb),
  ('dragon-king-anger', '11ddecaa296705d33bb7247f1b59c364', 24, 'd90f2aadfc1d6f7dec8b7e1971db46d4', 29, '{"maxChars":60,"minVerbs":2,"maxAdverbs":1,"forbidWords":["화났","화가 났","화가 나서","화가 치밀","분노","노여","성났","격분","짜증","치밀어","치밀었"],"maxModifiers":2}'::jsonb),
  ('kongjwi-grief', '35f520990c3cf5aaf25482a2f0d491af', 38, 'f7b2bbb8765ace19f4f133dd592d867a', 37, '{"maxChars":70,"minVerbs":2,"maxAdverbs":1,"forbidWords":["서러","서럽","슬프","슬펐","슬픔","눈물","흐느","비참","원망"],"maxModifiers":2}'::jsonb),
  ('gyeonu-longing', 'd4fee3ce734cc2b298a0e7e4c777f338', 38, 'f28b2dfea5c35325d2d8dc27de70734e', 37, '{"maxChars":70,"minVerbs":2,"maxAdverbs":1,"forbidWords":["그리웠","그리워","그리움","그립","보고 싶","외로","쓸쓸","사무치","애틋"],"maxModifiers":2}'::jsonb),
  ('woodcutter-shame', 'a6f56f8890743432bc48983269612cbd', 25, '5ecd0f5785f56bd76b039f6273a80f33', 38, '{"maxChars":65,"minVerbs":2,"maxAdverbs":1,"forbidWords":["부끄","창피","민망","수치스","낯뜨거","뻘개"],"maxModifiers":2}'::jsonb),
  ('tp-axe-water', '57c8bc31f1b1c66706c61ac8b31dec9c', 44, '26b338bc7f1b667978b981a81341d2b3', 91, '{"maxChars":38,"minVerbs":3,"maxRepeat":2}'::jsonb),
  ('tp-heungbu-yard', '5407c4a893a58e40326b3940e73c6b81', 45, '42c60aefd16e062afbf4fe2bc5eb6404', 87, '{"maxChars":35,"minVerbs":3,"maxRepeat":2}'::jsonb),
  ('tp-simcheong-rail', '8d430d24a6be445070263f7df09ab0f6', 22, '2c68ea80cc8fc425c70af016b9600864', 81, '{"maxChars":35,"minVerbs":3,"maxRepeat":2}'::jsonb),
  ('tp-gyeonu-river', '8d430d24a6be445070263f7df09ab0f6', 22, 'c552444862473f89926ba108004f4806', 85, '{"maxChars":35,"minVerbs":2,"maxRepeat":2}'::jsonb),
  ('tp-kongjwi-crack', '0564f8263dce0040d2e5e1b7e0e1e206', 43, '7f4d27d99cca66c188bd4f8ce31347a4', 87, '{"maxChars":35,"minVerbs":2,"maxRepeat":2}'::jsonb),
  ('tp-rabbit-gate', '8d430d24a6be445070263f7df09ab0f6', 22, '16ccb3562d6164f5ec4961788ab1f670', 82, '{"maxChars":33,"minVerbs":3,"maxRepeat":2}'::jsonb),
  ('tp-siblings-floor', '8d430d24a6be445070263f7df09ab0f6', 22, '01a84cc13a5b0afe03a92d5ae1c62301', 86, '{"maxChars":38,"minVerbs":2,"maxRepeat":2}'::jsonb),
  ('tp-goblin-mark', '416bdd9d578d47b01b832c84e33daa1d', 38, '865fb3df2adb61a2e6fbe8d6630da094', 90, '{"maxChars":37,"minVerbs":3,"maxRepeat":2}'::jsonb),
  ('rp-axe-gold', '1923f3bd3896a41facdc89d04e9c0444', 23, '0f9bf0b2af8a2a9e2e8730b1cc5efb94', 63, '{"maxChars":45,"minVerbs":3,"maxRepeat":2}'::jsonb),
  ('rp-heungbu-gourd', 'abe00269b9cf9de6d03bab6f3aad86dd', 43, 'e2f8c891580685e259caf4227588bffd', 57, '{"maxChars":35,"minVerbs":3,"maxRepeat":2}'::jsonb),
  ('rp-simcheong-sea', '1923f3bd3896a41facdc89d04e9c0444', 23, '969127c7c9ef4e2fa20b1959ee2cf721', 66, '{"maxChars":46,"minVerbs":3,"maxRepeat":2}'::jsonb),
  ('rp-kongjwi-jar', '1923f3bd3896a41facdc89d04e9c0444', 23, '7ffaae72a0af461617b9fbc3143baeb7', 53, '{"maxChars":34,"minVerbs":3,"maxRepeat":2}'::jsonb),
  ('rp-magpie-bridge', '1923f3bd3896a41facdc89d04e9c0444', 23, '194e21b3d596b7e05e457fbba96f5285', 51, '{"maxChars":38,"minVerbs":3,"maxRepeat":2}'::jsonb),
  ('rp-rabbit-liver', '1923f3bd3896a41facdc89d04e9c0444', 23, '28acee405bdc39308cd3663566e53220', 62, '{"maxChars":44,"minVerbs":5,"maxRepeat":2}'::jsonb),
  ('rp-siblings-rope', '691dff2ae02dec8e5210b8edfc12c52e', 42, '1e0a2d5307922a925ff58c990dac26e2', 52, '{"maxChars":40,"minVerbs":3,"maxRepeat":2}'::jsonb),
  ('rp-goblin-club', 'ffd522567376018a709ddaee7f1973a4', 46, '054a908aaaf3f7865152063f4e49fd47', 62, '{"maxChars":41,"minVerbs":4,"maxRepeat":2}'::jsonb),
  ('ae-gyeonu-bridge', 'd0b29ca3e9ef3a7469ae9654c5571880', 69, 'cf2ba72479f268c26ad5005d2878436f', 14, '{}'::jsonb),
  ('ae-rabbit-gate', 'd0b29ca3e9ef3a7469ae9654c5571880', 69, '265c8e8798aa4c9fed7e1d0da0652a1d', 15, '{}'::jsonb),
  ('ae-axe-drop', 'f5b8d17c8e33f178f65d364d801ec11b', 84, null, null, '{}'::jsonb),
  ('ae-kongjwi-jar', 'a890bd3fe800ba68d3baed1c1b5b98eb', 41, null, null, '{}'::jsonb),
  ('sn-axe-pond', 'e60d21d41febc3e8e1284191bf0f3abd', 219, '50938045d3b3668de7c80eda697f43ee', 36, '{"maxChars":70,"forbidWords":["눈","빛","색","시선","모습","그림자","어둠","캄캄","깜깜","컴컴","흐릿","뚜렷","얼굴","시야","선명","투명","반짝","어른어른"],"forbidLemmas":["보/VV","보이/VV","바라보/VV","쳐다보/VV","내려다보/VV","올려다보/VV","둘러보/VV","살펴보/VV","띄/VV","비치/VV","빛나/VV","번쩍이/VV","반짝이/VV","어른거리/VV","밝/VA","어둡/VA","붉/VA","푸르/VA","하얗/VA","희/VA","환하/VA","검/VA","노랗/VA","누렇/VA","하얘지/VV","흐리/VA","훤하/VA","훤/XR"]}'::jsonb),
  ('sn-heungbu-barn', 'f543f767eb0d33cf5991f41736c2931c', 218, '5286dea572a76e4feeb92d0e851c8c19', 42, '{"maxChars":70,"forbidWords":["눈","빛","색","시선","모습","그림자","어둠","캄캄","깜깜","컴컴","흐릿","뚜렷","얼굴","시야","선명","투명","반짝","어른어른"],"forbidLemmas":["보/VV","보이/VV","바라보/VV","쳐다보/VV","내려다보/VV","올려다보/VV","둘러보/VV","살펴보/VV","띄/VV","비치/VV","빛나/VV","번쩍이/VV","반짝이/VV","어른거리/VV","밝/VA","어둡/VA","붉/VA","푸르/VA","하얗/VA","희/VA","환하/VA","검/VA","노랗/VA","누렇/VA","하얘지/VV","흐리/VA","훤하/VA","훤/XR"]}'::jsonb),
  ('sn-kongjwi-night', '8a8dc8b25dcca83c9deee944162c04e0', 216, '56966cd2ed592b65bc535ba5feb70802', 36, '{"maxChars":70,"forbidWords":["눈","빛","색","시선","모습","그림자","어둠","캄캄","깜깜","컴컴","흐릿","뚜렷","얼굴","시야","선명","투명","반짝","어른어른"],"forbidLemmas":["보/VV","보이/VV","바라보/VV","쳐다보/VV","내려다보/VV","올려다보/VV","둘러보/VV","살펴보/VV","띄/VV","비치/VV","빛나/VV","번쩍이/VV","반짝이/VV","어른거리/VV","밝/VA","어둡/VA","붉/VA","푸르/VA","하얗/VA","희/VA","환하/VA","검/VA","노랗/VA","누렇/VA","하얘지/VV","흐리/VA","훤하/VA","훤/XR"]}'::jsonb),
  ('sn-simcheong-water', '61f01f2683b1547dcdae0d342bbb5c49', 212, 'bebd8573c7e87eabaa89f245816d27d5', 44, '{"maxChars":70,"forbidWords":["눈","빛","색","시선","모습","그림자","어둠","캄캄","깜깜","컴컴","흐릿","뚜렷","얼굴","시야","선명","투명","반짝","어른어른"],"forbidLemmas":["보/VV","보이/VV","바라보/VV","쳐다보/VV","내려다보/VV","올려다보/VV","둘러보/VV","살펴보/VV","띄/VV","비치/VV","빛나/VV","번쩍이/VV","반짝이/VV","어른거리/VV","밝/VA","어둡/VA","붉/VA","푸르/VA","하얗/VA","희/VA","환하/VA","검/VA","노랗/VA","누렇/VA","하얘지/VV","흐리/VA","훤하/VA","훤/XR"]}'::jsonb),
  ('sn-goblin-club', 'a2665ddf420d58e4aa44d22b511eed9b', 241, 'f05f81ab612a5aff2b1db60eae92ce33', 35, '{"maxChars":70,"forbidWords":["눈","빛","색","시선","모습","그림자","어둠","캄캄","깜깜","컴컴","흐릿","뚜렷","얼굴","시야","선명","투명","반짝","어른어른"],"forbidLemmas":["보/VV","보이/VV","바라보/VV","쳐다보/VV","내려다보/VV","올려다보/VV","둘러보/VV","살펴보/VV","띄/VV","비치/VV","빛나/VV","번쩍이/VV","반짝이/VV","어른거리/VV","밝/VA","어둡/VA","붉/VA","푸르/VA","하얗/VA","희/VA","환하/VA","검/VA","노랗/VA","누렇/VA","하얘지/VV","흐리/VA","훤하/VA","훤/XR"]}'::jsonb),
  ('sn-gyeonu-bridge', '011ee3f3ee7e69d5f22420c6e090448c', 225, '6196c208c03d48c22830c8519ea3e1b3', 37, '{"maxChars":70,"forbidWords":["눈","빛","색","시선","모습","그림자","어둠","캄캄","깜깜","컴컴","흐릿","뚜렷","얼굴","시야","선명","투명","반짝","어른어른"],"forbidLemmas":["보/VV","보이/VV","바라보/VV","쳐다보/VV","내려다보/VV","올려다보/VV","둘러보/VV","살펴보/VV","띄/VV","비치/VV","빛나/VV","번쩍이/VV","반짝이/VV","어른거리/VV","밝/VA","어둡/VA","붉/VA","푸르/VA","하얗/VA","희/VA","환하/VA","검/VA","노랗/VA","누렇/VA","하얘지/VV","흐리/VA","훤하/VA","훤/XR"]}'::jsonb),
  ('sn-rabbit-hall', '7d2615d2c8778b3245457d092702560f', 218, 'b67ccb07758e0279792723d88fdb2a4b', 39, '{"maxChars":70,"forbidWords":["눈","빛","색","시선","모습","그림자","어둠","캄캄","깜깜","컴컴","흐릿","뚜렷","얼굴","시야","선명","투명","반짝","어른어른"],"forbidLemmas":["보/VV","보이/VV","바라보/VV","쳐다보/VV","내려다보/VV","올려다보/VV","둘러보/VV","살펴보/VV","띄/VV","비치/VV","빛나/VV","번쩍이/VV","반짝이/VV","어른거리/VV","밝/VA","어둡/VA","붉/VA","푸르/VA","하얗/VA","희/VA","환하/VA","검/VA","노랗/VA","누렇/VA","하얘지/VV","흐리/VA","훤하/VA","훤/XR"]}'::jsonb),
  ('sn-siblings-tree', 'c8b0c4ddf18b004af23390fc39744f81', 227, '5ea0e515140c64812a8c35a818d62839', 39, '{"maxChars":70,"forbidWords":["눈","빛","색","시선","모습","그림자","어둠","캄캄","깜깜","컴컴","흐릿","뚜렷","얼굴","시야","선명","투명","반짝","어른어른"],"forbidLemmas":["보/VV","보이/VV","바라보/VV","쳐다보/VV","내려다보/VV","올려다보/VV","둘러보/VV","살펴보/VV","띄/VV","비치/VV","빛나/VV","번쩍이/VV","반짝이/VV","어른거리/VV","밝/VA","어둡/VA","붉/VA","푸르/VA","하얗/VA","희/VA","환하/VA","검/VA","노랗/VA","누렇/VA","하얘지/VV","흐리/VA","훤하/VA","훤/XR"]}'::jsonb),
  ('rh-axe-pond', '6649e981d73180f27d35f695adbfc823', 197, '9b3f5f1166b052e4eb3cc9cb5bfab004', 156, '{"maxChars":131,"maxLines":13,"minChars":111,"minLines":7,"requireAny":["나무꾼"],"maxLineChars":18,"maxDuplicateLines":2}'::jsonb),
  ('rh-heungbu-yard', '4cb8a1a2c18b6899bebfb2baeba6e126', 196, 'a48c3e0154e49bb444434eb783b4488a', 165, '{"maxChars":131,"maxLines":13,"minChars":111,"minLines":7,"requireAny":["제비"],"maxLineChars":18,"maxDuplicateLines":2}'::jsonb),
  ('rh-kongjwi-jar', '8ec96f6519afb1a306685a383f6fbeb0', 197, 'c063e4f45bab5f54fa97bf511a95da33', 169, '{"maxChars":131,"maxLines":13,"minChars":111,"minLines":7,"requireAny":["물동이"],"maxLineChars":18,"maxDuplicateLines":2}'::jsonb),
  ('rh-simcheong-deck', '237d62a5b01f078cf073f29dfadec932', 197, '5f448fcb39282bdca83be47447ed4cd5', 157, '{"maxChars":131,"maxLines":13,"minChars":111,"minLines":7,"requireAny":["공양미"],"maxLineChars":18,"maxDuplicateLines":2}'::jsonb),
  ('rh-goblin-club', '139d6d107a1310628a2548f0bd8bcf3d', 197, 'f8db0265af32ffe53be0e75503c0e129', 155, '{"maxChars":131,"maxLines":13,"minChars":111,"minLines":7,"requireAny":["방망이"],"maxLineChars":18,"maxDuplicateLines":2}'::jsonb),
  ('rh-gyeonu-bridge', '46d0e8ca3d201f9a5f74c921f11cc36f', 197, '2bfa034cb76bd75d4bb233881a3bcdac', 159, '{"maxChars":131,"maxLines":13,"minChars":111,"minLines":7,"requireAny":["까치들"],"maxLineChars":18,"maxDuplicateLines":2}'::jsonb),
  ('rh-rabbit-gate', 'eafcd05a28e92688b21fecb28f40d3b2', 197, '46722e361a3fb9e37e200adb4539dda1', 154, '{"maxChars":131,"maxLines":13,"minChars":111,"minLines":7,"requireAny":["문지기"],"maxLineChars":18,"maxDuplicateLines":2}'::jsonb),
  ('rh-siblings-tree', '3d62ed5830e45c31d79ff3afc31bcbf1', 197, '0f78b1528f873adb6e4a09bc7ebed245', 159, '{"maxChars":131,"maxLines":13,"minChars":111,"minLines":7,"requireAny":["오라비"],"maxLineChars":18,"maxDuplicateLines":2}'::jsonb),
  ('mo-axe-pond', 'b8bc31899f2ffa26eb9992a725e0857c', 187, '9dfd1e33e4c84cbe99595e9a38e899f4', 96, '{"maxChars":200,"minChars":75,"requireAny":["쇠도끼"],"minSpeeches":3,"minMonologues":1,"maxDuplicateLines":0,"maxLineWordRepeat":6,"maxNarrationLines":3,"minMonologueChars":8,"requireMonologueBetween":true}'::jsonb),
  ('mo-heungbu-swallow', 'b8bc31899f2ffa26eb9992a725e0857c', 187, '8d2d6bd60c670fd853388a8dde28cbce', 98, '{"maxChars":200,"minChars":75,"requireAny":["제비"],"minSpeeches":3,"minMonologues":1,"maxDuplicateLines":0,"maxLineWordRepeat":6,"maxNarrationLines":3,"minMonologueChars":8,"requireMonologueBetween":true}'::jsonb),
  ('mo-kongjwi-shoe', 'b8bc31899f2ffa26eb9992a725e0857c', 187, 'b40bba0f350868faee978f9b0710eb37', 83, '{"maxChars":200,"minChars":75,"requireAny":["도둑"],"minSpeeches":3,"minMonologues":1,"maxDuplicateLines":0,"maxLineWordRepeat":6,"maxNarrationLines":3,"minMonologueChars":8,"requireMonologueBetween":true}'::jsonb),
  ('mo-simcheong-rice', 'b8bc31899f2ffa26eb9992a725e0857c', 187, '8fb5dbaa1f46ed84df48c107db5dc774', 93, '{"maxChars":200,"minChars":75,"requireAny":["공양미"],"minSpeeches":3,"minMonologues":1,"maxDuplicateLines":0,"maxLineWordRepeat":6,"maxNarrationLines":3,"minMonologueChars":8,"requireMonologueBetween":true}'::jsonb),
  ('mo-goblin-club', 'b8bc31899f2ffa26eb9992a725e0857c', 187, '170e0971efda3b3871058299ef21c831', 90, '{"maxChars":200,"minChars":75,"requireAny":["방망이"],"minSpeeches":3,"minMonologues":1,"maxDuplicateLines":0,"maxLineWordRepeat":6,"maxNarrationLines":3,"minMonologueChars":8,"requireMonologueBetween":true}'::jsonb),
  ('mo-gyeonu-bridge', 'b8bc31899f2ffa26eb9992a725e0857c', 187, '10d32f33636fb8d589316c216b8636b6', 99, '{"maxChars":200,"minChars":75,"requireAny":["까치"],"minSpeeches":3,"minMonologues":1,"maxDuplicateLines":0,"maxLineWordRepeat":6,"maxNarrationLines":3,"minMonologueChars":8,"requireMonologueBetween":true}'::jsonb),
  ('mo-rabbit-gate', 'b8bc31899f2ffa26eb9992a725e0857c', 187, '332fa573aca761a846aec48d3d2c690d', 78, '{"maxChars":200,"minChars":75,"requireAny":["용궁"],"minSpeeches":3,"minMonologues":1,"maxDuplicateLines":0,"maxLineWordRepeat":6,"maxNarrationLines":3,"minMonologueChars":8,"requireMonologueBetween":true}'::jsonb),
  ('mo-siblings-rope', 'b8bc31899f2ffa26eb9992a725e0857c', 187, '978da35d3407801ab6fae051f91a6798', 86, '{"maxChars":200,"minChars":75,"requireAny":["어머니"],"minSpeeches":3,"minMonologues":1,"maxDuplicateLines":0,"maxLineWordRepeat":6,"maxNarrationLines":3,"minMonologueChars":8,"requireMonologueBetween":true}'::jsonb),
  ('pv-broken-gate', '74c90b61bb8cb9f643b3570bcc5844bb', 217, 'c4f92b5a91faffa69a6fd42482d5cedd', 72, '{"minChars":20,"maxChars":130,"forbidWords":["저기","저쪽","저 멀리","저 너머","저 위","저 앞","멀찍이","병사 열이","길을 반쯤 막고"],"requireAny":["규담"]}'::jsonb),
  ('pv-drill-yard', '74c90b61bb8cb9f643b3570bcc5844bb', 217, '1d76062ca723b97d8f4009d0c197e6cc', 65, '{"minChars":20,"maxChars":130,"forbidWords":["저기","저쪽","저 멀리","저 너머","저 위","저 앞","멀찍이","제자 스물","흙먼지가 담장 위로"],"requireAny":["무결"]}'::jsonb),
  ('pv-guild-desk', '74c90b61bb8cb9f643b3570bcc5844bb', 217, 'b20b1efa045a257e942a34654913d54b', 63, '{"minChars":20,"maxChars":130,"forbidWords":["저기","저쪽","저 멀리","저 너머","저 위","저 앞","멀찍이","모험가 열둘","의뢰서가 빼곡히"],"requireAny":["하람"]}'::jsonb),
  ('pv-star-field', '74c90b61bb8cb9f643b3570bcc5844bb', 217, '31b722d53ba5930dd63df1f97aafd008', 63, '{"minChars":20,"maxChars":130,"forbidWords":["저기","저쪽","저 멀리","저 너머","저 위","저 앞","멀찍이","남자 둘 여자 하나","이야기를 나누고"],"requireAny":["태윤"]}'::jsonb),
  ('pv-banquet-hall', '74c90b61bb8cb9f643b3570bcc5844bb', 217, '8eae85a65ef951d256123b3e4026947e', 71, '{"minChars":20,"maxChars":130,"forbidWords":["저기","저쪽","저 멀리","저 너머","저 위","저 앞","멀찍이","촛대 열둘","귀족 예닐곱이"],"requireAny":["유안"]}'::jsonb),
  ('pv-dawn-market', '74c90b61bb8cb9f643b3570bcc5844bb', 217, '6820a24800c1b8060fb6adc7c59c1881', 67, '{"minChars":20,"maxChars":130,"forbidWords":["저기","저쪽","저 멀리","저 너머","저 위","저 앞","멀찍이","좌판 여덟","짐꾼 셋이"],"requireAny":["정순"]}'::jsonb),
  ('pv-frozen-lake', '74c90b61bb8cb9f643b3570bcc5844bb', 217, 'f835e02b9ca70ad41038f4a531efe3b6', 74, '{"minChars":20,"maxChars":130,"forbidWords":["저기","저쪽","저 멀리","저 너머","저 위","저 앞","멀찍이","낚시 구멍 열넷","아이 셋이"],"requireAny":["연희"]}'::jsonb),
  ('pv-lantern-night', '74c90b61bb8cb9f643b3570bcc5844bb', 217, '048ec67183dc20a6e73e14ac0acc8377', 71, '{"minChars":20,"maxChars":130,"forbidWords":["저기","저쪽","저 멀리","저 너머","저 위","저 앞","멀찍이","등불 스무 개","연인 넷이"],"requireAny":["소하"]}'::jsonb),
  ('ar-cracked-ice', '1f6b95ba07be4b99aaaca798ebda772c', 380, '7a2e5d28bdb3b4252598eaa5f2a03bb5', 199, '{"blanks":[{"key":"①","label":"도경이 물러설 곳을 어떻게 골랐는지","minSentences":1,"maxSentences":2,"maxChars":60},{"key":"②","label":"늑대가 왜 따라 들어왔는지","minSentences":1,"maxSentences":2,"maxChars":60}],"forbidWords":["[상황]","[복선]","[결정타]"],"forbidCopyOfFixedLines":true,"fixedLines":["늑대 여섯이 원을 좁혀 왔다.","도경은 강 한가운데로 물러섰다.","갈라진 얼음이 늑대를 삼켰다."]}'::jsonb),
  ('ar-dragon-jaw', '1f6b95ba07be4b99aaaca798ebda772c', 380, '2cb2e4dae84bebc48102c0c6d8a355e5', 198, '{"blanks":[{"key":"①","label":"태윤이 이 순간 무엇을 하는지","minSentences":1,"maxSentences":2,"maxChars":60,"optional":true},{"key":"②","label":"태윤이 무엇을 보고 턱을 노렸는지","minSentences":1,"maxSentences":2,"maxChars":60}],"forbidWords":["[상황]","[복선]","[결정타]"],"forbidCopyOfFixedLines":true,"fixedLines":["괴물이 팔을 휘두르며 덮쳐 왔다.","태윤은 고개를 숙여 그 아래로 들어갔다.","주먹이 괴물의 턱에 꽂혔다."]}'::jsonb),
  ('ar-dull-blade', '1f6b95ba07be4b99aaaca798ebda772c', 380, 'adde7f851ec5c7be4376dcdb0f2f3104', 190, '{"blanks":[{"key":"①","label":"무결이 무엇을 하기로 했는지","minSentences":1,"maxSentences":2,"maxChars":60},{"key":"②","label":"받아친 뒤에 무엇이 일어났는지","minSentences":1,"maxSentences":2,"maxChars":60}],"forbidWords":["[상황]","[복선]","[결정타]"],"forbidCopyOfFixedLines":true,"fixedLines":["중검의 묘리를 담은 칼이 천천히 위에서 아래로 떨어졌다.","무결은 검을 들어 받아쳤다.","사부의 검이 무결의 목젖 위에 있었다."]}'::jsonb),
  ('ar-left-feeler', '1f6b95ba07be4b99aaaca798ebda772c', 380, '683248610a9e78770c0e93e407d445a6', 220, '{"blanks":[{"key":"①","label":"연희가 어느 쪽으로 붙을지 어떻게 정했는지","minSentences":1,"maxSentences":2,"maxChars":60},{"key":"②","label":"등불을 던진 것이 무엇을 만들었는지","minSentences":1,"maxSentences":2,"maxChars":60}],"forbidWords":["[상황]","[복선]","[결정타]"],"forbidCopyOfFixedLines":true,"fixedLines":["마수가 머리를 흔들며 갱도를 좁혀 왔다.","연희는 등불을 오른쪽 벽으로 던졌다.","곡괭이가 왼쪽 더듬이를 잘라 냈다."]}'::jsonb),
  ('at-cracked-ice', 'b2cd91e973687aef56c316448ce23e47', 276, '4bef9a1e8146392e1adb3f64d1d9717d', 51, '{"minLines":4,"maxLines":4,"maxLineChars":30,"requireAny":["갈라진 얼음"],"requireInLastLine":["갈라진 얼음"],"forbidWords":["[상황]","[복선]","[결정타]"]}'::jsonb),
  ('at-left-feeler', 'b2cd91e973687aef56c316448ce23e47', 276, '67d80ef72c708e66051c9029da981875', 55, '{"minLines":4,"maxLines":4,"maxLineChars":30,"requireAny":["왼쪽 더듬이"],"requireInLastLine":["왼쪽 더듬이"],"forbidWords":["[상황]","[복선]","[결정타]"]}'::jsonb),
  ('at-left-feint', 'b2cd91e973687aef56c316448ce23e47', 276, 'a73394c2476d78e42951fc6d724ad90e', 58, '{"minLines":4,"maxLines":4,"maxLineChars":30,"requireAny":["왼발 페인트"],"requireInLastLine":["왼발 페인트"],"forbidWords":["[상황]","[복선]","[결정타]"]}'::jsonb),
  ('at-look-back', 'b2cd91e973687aef56c316448ce23e47', 276, 'a688a5491b0033c66bfba485b8c150f0', 60, '{"minLines":4,"maxLines":4,"maxLineChars":30,"requireAny":["돌아보지 않겠다"],"requireInLastLine":["돌아보지 않겠다"],"forbidWords":["[상황]","[복선]","[결정타]"]}'::jsonb),
  ('ar-bell-rope', '1f6b95ba07be4b99aaaca798ebda772c', 380, '8de7b204e8123926fb579211c381c2c1', 309, '{"blanks":[{"key":"①","label":"서린이 이 순간 무엇을 하는지","minSentences":1,"maxSentences":3,"maxChars":60},{"key":"②","label":"볼을 베인 서린이 무엇을 느끼거나 깨닫는지","minSentences":1,"maxSentences":3,"maxChars":60},{"key":"③","label":"서린의 손이 무엇에 닿았는지","minSentences":1,"maxSentences":3,"maxChars":60}],"forbidWords":["[상황]","[복선]","[결정타]"],"forbidCopyOfFixedLines":true,"fixedLines":["추격자가 등 뒤로 바짝 쫓아오고 있다.","칼끝이 서린의 볼을 스치고 벽에 부딪쳤다.","서린은 뒤로 물러서며 막다른 벽에 등을 붙였다.","종줄이 당겨지고 종이 울렸다."]}'::jsonb),
  ('ar-broken-gate', '1f6b95ba07be4b99aaaca798ebda772c', 380, 'ae029852c6821f8f8ce01c0f3ef15831', 258, '{"blanks":[{"key":"①","label":"세연이 이 순간 무엇을 하는지","minSentences":1,"maxSentences":2,"maxChars":60,"optional":true},{"key":"②","label":"세연이 무엇을 보고 목을 노리기로 했는지","minSentences":1,"maxSentences":2,"maxChars":60}],"forbidWords":["[상황]","[복선]","[결정타]"],"forbidCopyOfFixedLines":true,"fixedLines":["마수의 앞발이 세연을 성문 잔해로 밀어붙였다.","세연은 부러진 창끝을 두 손으로 고쳐 쥐었다.","마수가 몸을 낮추고 머리를 들이밀었다.","창끝이 마수의 목을 찔렀다."]}'::jsonb),
  ('ar-left-draw', '1f6b95ba07be4b99aaaca798ebda772c', 380, '49cc7d8ecd6dc1b0bc9e28fcbab34b98', 179, '{"blanks":[{"key":"①","label":"무결이 오른쪽으로 도는 상대를 보고 무엇을 생각하는지","minSentences":1,"maxSentences":2,"maxChars":60},{"key":"②","label":"오른팔이 이 순간 무엇을 하는지","minSentences":1,"maxSentences":2,"maxChars":60}],"forbidWords":["[상황]","[복선]","[결정타]"],"forbidCopyOfFixedLines":true,"fixedLines":["상대가 무결의 오른쪽으로 크게 돌아 들어왔다.","무결은 오른팔을 들어 올렸다.","왼손의 검이 상대의 목으로 들어갔다."]}'::jsonb),
  ('ar-wind-gate', '1f6b95ba07be4b99aaaca798ebda772c', 380, '8705ab126aec019dd671580fe9391b5f', 177, '{"blanks":[{"key":"①","label":"연희가 먼저 무엇을 했는지","minSentences":1,"maxSentences":2,"maxChars":60},{"key":"②","label":"진형이 무너진 것이 무엇을 만들었는지","minSentences":1,"maxSentences":2,"maxChars":60}],"forbidWords":["[상황]","[복선]","[결정타]"],"forbidCopyOfFixedLines":true,"fixedLines":["화살이 아군 머리 위로 쏟아졌다.","바람의 칼날이 적의 진형을 갈랐다.","압축한 바람이 성문을 뚫었다."]}'::jsonb),
  ('at-bell-rope', '3bb15c8a9e7d79578a6b4a70ba59e01f', 337, '627ddaa0c39b10d9c437ac6eb3ba75a8', 61, '{"minLines":4,"maxLines":4,"maxLineChars":30,"requireAny":["종줄"],"requireInLastLine":["종줄"],"forbidWords":["[상황]","[복선]","[결정타]"]}'::jsonb),
  ('at-broken-gate', '3bb15c8a9e7d79578a6b4a70ba59e01f', 337, '340a0da31431ccb48aa1056c172f77cb', 72, '{"minLines":4,"maxLines":4,"maxLineChars":30,"requireAny":["창끝"],"requireInLastLine":["창끝"],"forbidWords":["[상황]","[복선]","[결정타]"]}'::jsonb),
  ('at-edit-log', '3bb15c8a9e7d79578a6b4a70ba59e01f', 337, '030184dfe54da5fe9141a53a94a616f2', 68, '{"minLines":4,"maxLines":4,"maxLineChars":30,"requireAny":["수정 기록"],"requireInLastLine":["수정 기록"],"forbidWords":["[상황]","[복선]","[결정타]"]}'::jsonb),
  ('at-left-draw', '3bb15c8a9e7d79578a6b4a70ba59e01f', 337, '9cd4c4cfc018a698d3ea58b16c302cf2', 67, '{"minLines":4,"maxLines":4,"maxLineChars":30,"requireAny":["왼손 발도"],"requireInLastLine":["왼손 발도"],"forbidWords":["[상황]","[복선]","[결정타]"]}'::jsonb),
  ('ch-village-approval', '424cd68473f72bfa2999257a700f216f', 62, null, null, '{}'::jsonb),
  ('ch-cursed-sword', 'f1831fd166947069b9e047c021b5fa0d', 62, null, null, '{}'::jsonb),
  ('ch-misunderstanding', 'bbcbf8d670bc52057ddf7d316948beae', 57, null, null, '{}'::jsonb),
  ('ch-sinking-ship', '5e2b9513f822623d6fbbc1b68732a58e', 66, null, null, '{}'::jsonb),
  ('od-mountain-sword', 'fe04b4be6b8beced702c28d2fe80eb06', 54, null, null, '{"cards":["노인의 잃어버린 소를 찾아준다","산신에게 검을 받는다","장터에서 소 발자국을 알아본다","산신의 사당 위치를 노인에게 듣는다"]}'::jsonb),
  ('od-apology', 'a018bfba6bc74095dcc5427d5b21cb07', 21, null, null, '{"cards":["그녀의 빈 책상을 본다","출근길에 그녀의 우산을 챙긴다","그가 먼저 사과한다","그녀가 떠났다는 것을 알게 된다"]}'::jsonb),
  ('od-open-gate', '3d67d82218f851b66744a38ab6d00f2e', 46, null, null, '{"cards":["전날 밤 주방 아이를 도와준다","보초의 교대 시각을 안다","성문을 안에서 연다","주방 심부름꾼으로 들어간다"]}'::jsonb),
  ('cg-lightning-sword', '577d2b087527ff24415bc7c84b007852', 67, '91f846f9bece0cf1de1f8fd4183e9fdb', 54, '{"count":3,"maxLen":4,"minLen":2,"distinctInitial":true}'::jsonb),
  ('cg-ice-magic', 'ee9b77047f64833c6068b61f6f1f13b8', 58, 'e867ad594b43ed476796225b451357c1', 58, '{"count":3,"maxLen":6,"minLen":3,"distinctInitial":true}'::jsonb),
  ('cn-romance-70', '093bc26a9682d9d3e031641d9e8fa8eb', 52, 'dc1517de3a87c675ba62d6d6a98ba51c', 59, '{"op":"multiply","inputs":[{"key":"branchCount","max":15,"min":3,"label":"분기점 개수"},{"key":"chaptersToFirst","max":40,"min":5,"label":"첫 분기점까지 화수"}]}'::jsonb),
  ('cn-fantasy-200', '8586c87dff46d99653205e2fc3e30bca', 53, '50b8d388dbc819fcfc2b838ed2f761f7', 50, '{"op":"multiply","inputs":[{"key":"branchCount","max":15,"min":3,"label":"분기점 개수"},{"key":"chaptersToFirst","max":40,"min":5,"label":"첫 분기점까지 화수"}]}'::jsonb);

do $$
declare v_bad text; v_cnt int;
begin
  -- (1) 덤프에는 있는데 DB에 없는 문항.
  select string_agg(e.source_key, ', ') into v_bad
    from expect e
   where not exists (select 1 from problems p where p.source_key = e.source_key);
  if v_bad is not null then
    raise exception '[대조] 덤프에는 있는데 DB에 없음: %', v_bad;
  end if;

  -- (2) DB에는 있는데 덤프에 없는 문항. expect는 덤프에서 왔으니
  --     반대 방향은 problems 쪽에서 따로 훑어야 한다.
  select string_agg(p.source_key, ', ') into v_bad
    from problems p
   where p.source_key is not null
     and not exists (select 1 from expect e where e.source_key = p.source_key);
  if v_bad is not null then
    raise exception '[대조] DB에는 있는데 덤프에 없음: %', v_bad;
  end if;

  -- (3) instruction/passage가 어긋난 문항. 어느 필드인지와 길이를 함께
  --     낸다 — 214 vs 206처럼 CRLF 오염이 여기서 드러난다. md5가
  --     is distinct from이므로 한쪽만 null이어도(passage 유무가 갈려도)
  --     정확히 잡힌다.
  select string_agg(
           p.source_key || '(' || array_to_string(array_remove(array[
             case when md5(p.instruction) is distinct from e.instr_md5
                  then 'instruction ' || e.instr_len || '→' || length(p.instruction) end,
             case when md5(p.passage) is distinct from e.pass_md5
                  then 'passage ' || coalesce(e.pass_len::text, 'null') || '→' ||
                       coalesce(length(p.passage)::text, 'null') end
           ], null), ', ') || ')', ', '
         ) into v_bad
    from problems p
    join expect e on e.source_key = p.source_key
   where md5(p.instruction) is distinct from e.instr_md5
      or md5(p.passage) is distinct from e.pass_md5;
  if v_bad is not null then
    raise exception '[대조] instruction/passage 가 어긋남: %', v_bad;
  end if;

  -- (4) scoring_config가 어긋난 문항.
  select string_agg(p.source_key, ', ') into v_bad
    from problems p
    join expect e on e.source_key = p.source_key
   where p.scoring_config is distinct from e.cfg;
  if v_bad is not null then
    raise exception '[대조] scoring_config 가 어긋남: %', v_bad;
  end if;

  -- (5) fill 문항: scoring_config.blanks 의 모든 key 가 passage 에 제 줄로
  --     있어야 한다. 빈칸과 지문 표식이 갈리면 화면이 못 그린다(재설계안 11-5).
  select string_agg(p.source_key || ' (' || k.key || ')', ', ') into v_bad
    from problems p
    cross join lateral jsonb_to_recordset(
           coalesce(p.scoring_config->'blanks', '[]'::jsonb)) as k(key text)
   where p.type = 'fill'
     and strpos(E'\n' || p.passage || E'\n', E'\n' || k.key || E'\n') = 0;
  if v_bad is not null then
    raise exception '[대조 5] fill blanks 키가 지문에 줄로 없음: %', v_bad;
  end if;

  -- (5b) fill 문항: 지문의 표식 줄(①②③ …만 있는 줄) 수가 blanks 개수와 같아야
  --      한다. (5)와 함께면 선언한 key 가 지문에 딱 그만큼 있다는 뜻이 된다.
  select string_agg(
           p.source_key || ' (표식 ' || m.n || ' / 빈칸 ' ||
           jsonb_array_length(coalesce(p.scoring_config->'blanks', '[]'::jsonb)) || ')', ', '
         ) into v_bad
    from problems p
    cross join lateral (
           select count(*) filter (where trim(line) ~ '^[①-⑳]$') as n
             from regexp_split_to_table(coalesce(p.passage, ''), E'\n') as line
         ) m
   where p.type = 'fill'
     and m.n <> jsonb_array_length(coalesce(p.scoring_config->'blanks', '[]'::jsonb));
  if v_bad is not null then
    raise exception '[대조 5b] fill 표식 줄 수 ≠ 빈칸 수: %', v_bad;
  end if;

  -- (6) reference_answers 에 SELECT 정책이 있어야 한다. 없으면 모범답안이
  --     제출 전 학습자에게 새거나(정책 없이 GRANT 만) 0행으로만 온다.
  if not exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = 'reference_answers' and cmd = 'SELECT'
  ) then
    raise exception '[대조 6] reference_answers 에 SELECT 정책이 없다';
  end if;

  select count(*) into v_cnt from expect;
  raise notice '덤프 ↔ DB 대조 통과. 문항 % 개', v_cnt;
end $$;

drop table expect;

select '덤프 ↔ DB 대조 통과' as 결과, count(*) as 문항수 from problems;
