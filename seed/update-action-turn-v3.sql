-- 문장 12 action_turn(bt-) 모범답안 2건 교체 — 세션 41. 박 님 실사용 발견.
--
-- bt-orc-axe ord 1(가): "방패는 다시 사면 되지만" 표현 반려 · "미끄러지게
--   받았는데 방패가 반으로 갈라짐" 논리 어긋남(미끄러지게 받았으면 안 갈라진다)
--   → "흘렸는데도 방패 한쪽이 뜯겨 나가며" 로 인과를 바로잡음. 107자·5문장·
--   동사 9(실측) — maxChars 200 · minVerbs 4 여유.
-- bt-low-guard ord 1(가): '노인' 지칭 제거(이 문항은 인물 둘만 — 정후·백리진.
--   '노인'은 셋째 사람처럼 읽힌다) · 결정타 문장의 주어·동작을 명시(정후의
--   검이 무엇을 했는지) · 무릎을 그은 것과 다리가 꺾인 것 사이 인과를 한
--   문장 안에 붙임. 140자·7문장·동사 15(실측) — maxChars 200 · minVerbs 4 여유.
--
-- 원문(passage) · scoring_config · 각 ord 2(나)는 전부 그대로. reference_answers
-- 2행만. seed/dump/answers.json 이 단일 출처. 순서: 이 파일 → seed_data.sql(멱등)
-- → seed_check.sql. 재실행 안전.

begin;

-- bt-orc-axe ord 1 (가)
update reference_answers set content =
  '유나를 다치게 할 수는 없다. 진서는 방패를 비스듬히 세워 도끼날을 흘리듯 받았다. 흘렸는데도 방패 한쪽이 뜯겨 나가며 왼팔이 어깨까지 저릿했지만, 도끼는 진서의 발치에 박혔다. "지금이야!" 도끼를 뽑느라 굳은 오크의 목에 유나의 단검이 들어갔다.'
 where problem_id = (select id from problems where source_key = 'bt-orc-axe')
   and ord = 1 and blank_key = '';

-- bt-low-guard ord 1 (가)
update reference_answers set content =
  '하단은 올려 베기다. 백리진은 그 검이 올라오기 전에 거리를 죽이기로 하고 한 걸음 안으로 들어섰다. 서른 해 전 그 검객도 이렇게 잡았었다. 그런데 정후의 검은 올라오지 않았다. 낮은 자리에서 그대로 옆으로 휘둘러져 백리진의 무릎을 그었고, 베인 무릎이 힘을 잃어 왼 다리가 꺾였다. "하단은 올려 베는 게 아니오. 낮은 게 하단이지."'
 where problem_id = (select id from problems where source_key = 'bt-low-guard')
   and ord = 1 and blank_key = '';

commit;

-- 눈으로 확인한다 — 두 행 다 새 문안인지.
select p.source_key, ra.ord, ra.content
  from reference_answers ra
  join problems p on p.id = ra.problem_id
 where p.source_key in ('bt-orc-axe', 'bt-low-guard') and ra.ord = 1
 order by p.source_key;
