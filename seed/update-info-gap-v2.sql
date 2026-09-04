-- 구성 15 info_gap 정정 v2 — ig-ball-envelope 폐기 → ig-friend-text 신설 (세션 34).
--
-- 박 님 판정: ig-ball-envelope(손등 키스 오해)를 반려한다 — 손등 키스는 유럽
-- 궁정 예법에서 신사가 숙녀에게 하는 정중한 인사라 이레나가 반응할 이유가
-- 없었고(조사로 확인), 오빠 청혼 편지 심부름도 장치를 위해 지은 억지 구도였다.
-- 후속 초안(테라스 봉투 · 카페 유리창 목격 · 직접 보낸 사진)도 "눈앞에서 보고
-- 돌아서는 사람은 드물다 · 오해는 간접 증거(전언·물건·SNS)에서 생긴다"는 지적으로
-- 반려 — 확정판은 친구의 목격 문자 + 인스타 태그 / 차 안 향수(ig-friend-text).
--
-- 행 삭제 금지(10단계 action_turn·구성 12 대비형 선례). ig-ball-envelope 는
-- is_active=false 로 내리고 모범답안 2행은 그대로 둔다. seed/dump/{problems,
-- answers,deactivate}.json 이 단일 출처. seed_data.sql 도 이 델타를 통째로
-- 재발행한다(멱등) — 이 파일은 박 님이 먼저 돌리는 델타다.
-- 순서: 이 파일 → seed_data.sql(멱등) → seed_check.sql. 재실행 안전.

begin;

update problems set is_active = false
 where source_key = 'ig-ball-envelope';

insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'info_gap'),
  'continue', 'auto', '오해를 만들되 풀지 마시오. 서윤은 지훈과 사귄 지 한 달 된 회사원으로, 마음이 상해도 먼저 묻지는 못하는 사람이다. 원문에서 독자는 친구가 본 여자가 지훈의 여동생이라는 것을 알지만 서윤은 모른다. 원문을 읽고 다음에 올 장면을, 서윤의 속마음이나 대사 한 줄이 들리게 하고, 오해가 굳어지되 언젠가 풀릴 실마리 하나(동생·선물·향수)를 장면 안에 두고 지금은 풀지 않게 작성하시오.',
  '토요일 낮, 지훈은 서울에 올라온 여동생 지아와 백화점을 돌았다. 저녁에 서윤에게 줄 선물을 고르는데 지아가 오빠 팔짱을 끼고 매장마다 끌고 다녔다. 그날 저녁 서윤의 휴대폰에 친구의 문자가 떴다. "너 남친 아까 백화점에서 어떤 여자랑 팔짱 끼고 있던데? 내가 잘못 봤나."', null, '{"maxChars":100,"minVerbs":3,"forbidLabel":"서술자가 사실을 말해 주거나 풀어 주는 표현","forbidWords":["몰랐","알지 못","모르고 있","눈치채지 못","알 리 없","훗날","사실은","고백","털어놓","알고 보니","오해였","해명"],"forbidDisplay":["몰랐다","알지 못했다","훗날","사실은","고백하다","털어놓다","알고 보니","해명하다"],"forbidPassageCopy":true}'::jsonb,
  'original', 'romance', 'planned',
  2, 'ig-friend-text'
where not exists (select 1 from problems p where p.source_key = 'ig-friend-text');

insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '잘못 봤겠지. 서윤은 답을 쓰다가 지웠다. 자정 넘어 지훈의 인스타에 새 운동화 사진이 올라왔다. 큰맘 먹고 질렀다, 는 글 아래 백화점 태그가 달려 있었고, 서윤은 휴대폰을 덮었다.'
from problems p
where p.source_key = 'ig-friend-text'
on conflict (problem_id, ord, blank_key) do nothing;

insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '"응, 잘못 봤을 거야." 서윤은 친구에게 그렇게 보내고 넘겼다. 약속 시간에 지훈이 집 앞까지 차를 가져왔다. 조수석에 앉자 낯선 여자 향수 냄새가 났고, 친구의 말이 머리 한편을 스쳐 지나갔다.'
from problems p
where p.source_key = 'ig-friend-text'
on conflict (problem_id, ord, blank_key) do nothing;

commit;

-- 눈으로 확인한다 — 구성 15 문항의 활성 상태. friend-text 만 true, ball-envelope 는 false.
select p.source_key, p.is_active
  from problems p join stages s on s.id = p.stage_id
 where s.skill_key = 'info_gap'
 order by p.difficulty, p.source_key;
