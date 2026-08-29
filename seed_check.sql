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
-- 85행짜리 values를 다시 적어야 한다. 임시 테이블로 한 번만 채운다.
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
  ('rm-axe-pond', '767bce97ba0984cb0aaa18ad470b183b', 99, '2c65b441663ec150c627365e39708a9f', 62, '{"maxChars":36,"minVerbs":2,"maxRepeat":2,"maxAdverbs":1,"maxModifiers":1}'::jsonb),
  ('rm-heungbu-swallow', '422bcd35e5ed12611f1c159741b8d284', 101, '2dcb8b9092502f143857cdda7ff024c3', 59, '{"maxChars":34,"minVerbs":2,"maxRepeat":2,"maxAdverbs":1,"maxModifiers":2}'::jsonb),
  ('rm-kongjwi-jar', '3fc7a0a23aea08179dbcc07b8b58fd04', 114, '76363c982ce50c71dd3ab65e924c75c1', 70, '{"maxChars":39,"minVerbs":4,"maxRepeat":2,"maxAdverbs":1,"maxModifiers":2}'::jsonb),
  ('rm-simcheong-deck', 'c4a134de4c38ba8c8649c03ac9c494bd', 78, '5c836e23962c677e05f909a85d9b476e', 67, '{"maxChars":40,"minVerbs":2,"maxRepeat":2,"maxAdverbs":1,"maxModifiers":1}'::jsonb),
  ('rm-magpie-bridge', '8c9989ae73ed1155503dbb3a1f20ae19', 101, '8c970496911d1c24ce3236f28adebec6', 60, '{"maxChars":34,"minVerbs":2,"maxRepeat":2,"maxAdverbs":1,"maxModifiers":1}'::jsonb),
  ('rm-rabbit-court', 'c4a134de4c38ba8c8649c03ac9c494bd', 78, '646ddf59216468d0668b58e4a403059b', 67, '{"maxChars":40,"minVerbs":3,"maxRepeat":2,"maxAdverbs":1,"maxModifiers":1}'::jsonb),
  ('rm-siblings-tree', 'c4a134de4c38ba8c8649c03ac9c494bd', 78, '91a0481d324253c330663e1f636b0a8a', 75, '{"maxChars":44,"minVerbs":2,"maxRepeat":2,"maxAdverbs":1,"maxModifiers":1}'::jsonb),
  ('rm-goblin-club', '4af82dadf8273d39e9012e06a7199f05', 94, 'e085bd79ebcf931ffe3e3fce73a51852', 72, '{"maxChars":42,"minVerbs":3,"maxRepeat":2,"maxAdverbs":1,"maxModifiers":2}'::jsonb),
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
  ('at-cracked-ice', 'b2cd91e973687aef56c316448ce23e47', 276, '4bef9a1e8146392e1adb3f64d1d9717d', 51, '{"minLines":4,"maxLines":4,"maxLineChars":30,"requireAny":["갈라진 얼음"],"requireInLastLine":["갈라진 얼음"],"forbidWords":["[상황]","[복선]","[결정타]"]}'::jsonb),
  ('at-left-feeler', 'b2cd91e973687aef56c316448ce23e47', 276, '67d80ef72c708e66051c9029da981875', 55, '{"minLines":4,"maxLines":4,"maxLineChars":30,"requireAny":["왼쪽 더듬이"],"requireInLastLine":["왼쪽 더듬이"],"forbidWords":["[상황]","[복선]","[결정타]"]}'::jsonb),
  ('at-left-feint', 'b2cd91e973687aef56c316448ce23e47', 276, 'a73394c2476d78e42951fc6d724ad90e', 58, '{"minLines":4,"maxLines":4,"maxLineChars":30,"requireAny":["왼발 페인트"],"requireInLastLine":["왼발 페인트"],"forbidWords":["[상황]","[복선]","[결정타]"]}'::jsonb),
  ('at-look-back', 'b2cd91e973687aef56c316448ce23e47', 276, 'a688a5491b0033c66bfba485b8c150f0', 60, '{"minLines":4,"maxLines":4,"maxLineChars":30,"requireAny":["돌아보지 않겠다"],"requireInLastLine":["돌아보지 않겠다"],"forbidWords":["[상황]","[복선]","[결정타]"]}'::jsonb),
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

  select count(*) into v_cnt from expect;
  raise notice '덤프 ↔ DB 대조 통과. 문항 % 개', v_cnt;
end $$;

drop table expect;

select '덤프 ↔ DB 대조 통과' as 결과, count(*) as 문항수 from problems;
