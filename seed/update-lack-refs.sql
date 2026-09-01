-- 구성 11 lack — 모범답안 4행 교체 (세션 31 후기).
--
-- 박 님 실사용 판정 반영(원칙 3 — 실사용이 설계를 이긴다. 세션 28 magpie 이후
-- 두 번째):
--  · lk-desk-nine 가: '눈치보기'로 읽히던 것을 '전시하는 인정욕구'로
--    (은근한 업적 나열 — "그거 사실 제가 그린 그림이라고")
--  · lk-cafe-wait 가·나, lk-board-rank 나: 박 님이 직접 쓴 답이 더 좋음
--
-- seed/dump/answers.json 이 단일 출처. reference_answers 는 seed_data.sql 의
-- insert 가 on conflict do nothing 이라 기존 행을 안 고친다 — 이 update 를 따로 낸다.
-- 나머지 6행은 불변. 재실행 안전(update 는 멱등).

begin;

update reference_answers set content =
  '회식 자리에서 김하준은 지난 분기 계약 얘기를 또 꺼냈다. 그거 사실 제가 그린 그림이라고, 잔을 채우며 말했다.'
 where problem_id = (select id from problems where source_key = 'lk-desk-nine')
   and ord = 1 and blank_key = '';

update reference_answers set content =
  '윤소민은 친구가 오기 전에 휴대폰을 계속 만지작거렸다. 벌써 세 번이었다. 답장 없는 대화창을 열었다가 덮었다.'
 where problem_id = (select id from problems where source_key = 'lk-cafe-wait')
   and ord = 1 and blank_key = '';

update reference_answers set content =
  '윤소민은 점원이 물잔을 채워 주자 몇 번째인지 모를 고맙다는 인사와 동시에 물잔을 비웠다. 그러고는 문이 열릴 때마다 고개를 들었다.'
 where problem_id = (select id from problems where source_key = 'lk-cafe-wait')
   and ord = 2 and blank_key = '';

update reference_answers set content =
  '한시우는 동기의 인터뷰 영상을 소리 없이 돌려 보았다. 화면에 반사된 얼굴이 동기의 모습과 상반되어 있었다.'
 where problem_id = (select id from problems where source_key = 'lk-board-rank')
   and ord = 2 and blank_key = '';

commit;

-- 눈으로 확인한다 — 교체된 4행의 새 content.
select p.source_key, ra.ord, ra.content
  from reference_answers ra
  join problems p on p.id = ra.problem_id
 where p.source_key in ('lk-desk-nine', 'lk-cafe-wait', 'lk-board-rank')
 order by p.source_key, ra.ord;
