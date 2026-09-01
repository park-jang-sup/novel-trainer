-- 도입 2 start_write — 세션 29 후기 실사용 반영.
--
-- 발견 4건 중 셋을 여기서 고친다:
--  (1) 지시문 오독 — 첫 문장이 제목으로 떼여(splitInstruction) '위 문장'이
--      제목(인물 소개)을 가리키는 걸로 읽혔다. 첫 문장을 과제형('…의 1화 첫
--      문장을 쓰시오.')으로, 지시 대상을 '아래 … 잘못된 첫 문장'으로 명명.
--  (2) 금지어 확장 — '기류'(forbidWords) + '오라'(forbidLemmas 오라/NNG,
--      명령형 '돌아오라'와 문자열 충돌 없음, kiwi 실측). forbidDisplay 도 확장.
--  (원문 라벨은 화면 코드 — TrainClient. coach_intro 는 seed_data do update.)
--
-- seed/dump/problems.json 이 단일 출처. 기존 행이라 seed_data.sql 의 insert
-- (where not exists)로는 안 들어간다 — 이 update 를 따로 낸다.
-- 순서: 이 파일 → seed_data.sql(coach_intro do update, 멱등) → seed_check.sql
-- 재실행 안전(update 는 멱등). reference 는 불변.

begin;

-- sw-hunter-dawn
update problems set
  instruction = '강도윤의 1화 첫 문장을 쓰시오. 주인공은 최약체에서 회귀한 헌터 강도윤이다. 아래는 분위기만 말하고 아무것도 보여주지 못한 잘못된 첫 문장이다. 저렇게 쓰지 말고, 강도윤이 보고 듣고 만지는 것 하나에서 시작하는 첫 문장을 새로 쓰시오.',
  scoring_config = '{"maxChars":60,"minVerbs":1,"forbidLabel":"분위기를 직접 말하는 표현","forbidWords":["기운","느낌","분위기","불길","기류","아우라","기색","낌새","기미"],"forbidLemmas":["오라/NNG"],"forbidDisplay":["기운","느낌","분위기","불길하다","기류","오라","아우라","기색","낌새","기미"],"requireAny":["강도윤","도윤"]}'::jsonb
 where source_key = 'sw-hunter-dawn';

-- sw-ruin-ash
update problems set
  instruction = '진운의 1화 첫 문장을 쓰시오. 주인공은 하룻밤에 멸문한 가문의 소년 진운이다. 아래는 분위기만 말하고 아무것도 보여주지 못한 잘못된 첫 문장이다. 저렇게 쓰지 말고, 진운이 보고 듣고 만지는 것 하나에서 시작하는 첫 문장을 새로 쓰시오.',
  scoring_config = '{"maxChars":60,"minVerbs":1,"forbidLabel":"분위기를 직접 말하는 표현","forbidWords":["기운","느낌","분위기","스산","기류","아우라","기색","낌새","기미"],"forbidLemmas":["오라/NNG"],"forbidDisplay":["기운","느낌","분위기","스산하다","기류","오라","아우라","기색","낌새","기미"],"requireAny":["진운"]}'::jsonb
 where source_key = 'sw-ruin-ash';

-- sw-vow-afternoon
update problems set
  instruction = '하은수의 1화 첫 문장을 쓰시오. 주인공은 결혼식 한 달 전 파혼을 통보받은 하은수다. 아래는 분위기만 말하고 아무것도 보여주지 못한 잘못된 첫 문장이다. 저렇게 쓰지 말고, 하은수가 보고 듣고 만지는 것 하나에서 시작하는 첫 문장을 새로 쓰시오.',
  scoring_config = '{"maxChars":60,"minVerbs":1,"forbidLabel":"분위기를 직접 말하는 표현","forbidWords":["기운","느낌","분위기","서글","기류","아우라","기색","낌새","기미"],"forbidLemmas":["오라/NNG"],"forbidDisplay":["기운","느낌","분위기","서글프다","기류","오라","아우라","기색","낌새","기미"],"requireAny":["하은수","은수"]}'::jsonb
 where source_key = 'sw-vow-afternoon';

-- sw-scaffold-morning
update problems set
  instruction = '카리엘의 1화 첫 문장을 쓰시오. 주인공은 소설 속 처형당하는 악녀 카리엘의 몸에서 깨어났다. 아래는 분위기만 말하고 아무것도 보여주지 못한 잘못된 첫 문장이다. 저렇게 쓰지 말고, 카리엘이 보고 듣고 만지는 것 하나에서 시작하는 첫 문장을 새로 쓰시오.',
  scoring_config = '{"maxChars":60,"minVerbs":1,"forbidLabel":"분위기를 직접 말하는 표현","forbidWords":["기운","느낌","분위기","긴장","형언","기류","아우라","기색","낌새","기미"],"forbidLemmas":["오라/NNG"],"forbidDisplay":["기운","느낌","분위기","긴장감","형언하다","기류","오라","아우라","기색","낌새","기미"],"requireAny":["카리엘"]}'::jsonb
 where source_key = 'sw-scaffold-morning';

-- sw-boss-wake
update problems set
  instruction = '이재하의 1화 첫 문장을 쓰시오. 주인공 이재하는 자신이 만든 게임 속 중간보스의 몸에서 깨어났다. 아래는 분위기만 말하고 아무것도 보여주지 못한 잘못된 첫 문장이다. 저렇게 쓰지 말고, 이재하가 보고 듣고 만지는 것 하나에서 시작하는 첫 문장을 새로 쓰시오.',
  scoring_config = '{"maxChars":60,"minVerbs":1,"forbidLabel":"분위기를 직접 말하는 표현","forbidWords":["기운","느낌","분위기","기류","아우라","기색","낌새","기미"],"forbidLemmas":["오라/NNG"],"forbidDisplay":["기운","느낌","분위기","기류","오라","아우라","기색","낌새","기미"],"requireAny":["이재하","재하"]}'::jsonb
 where source_key = 'sw-boss-wake';

commit;

-- 눈으로 확인한다 — instruction 첫머리·forbidWords·forbidLemmas.
select p.source_key,
       left(p.instruction, 18) as instr_head,
       p.scoring_config->'forbidWords' as forbid_words,
       p.scoring_config->'forbidLemmas' as forbid_lemmas
  from problems p join stages s on s.id = p.stage_id
 where s.skill_key = 'start_write'
 order by p.difficulty, p.order_no;
