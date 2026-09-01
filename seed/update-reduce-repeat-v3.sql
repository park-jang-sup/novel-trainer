-- 4단계 reduce_repeat — v2 실행 후 추가 패치 (세션 27 후기).
--
-- 실사용 발견: rp-kongjwi-jar 원문의 '우물' + '물동이' 가 부분 문자열로 '물' 을
-- 선점해(repeatTargets 는 부분 문자열을 센다), 맨 '물' 반복만 고쳐서는 한도(2회)
-- 안으로 못 들어왔다 — 정직한 수정이 어휘 교체를 강요당했다. 원문 마지막 문장의
-- '물동이' 를 '항아리' 로 바꿔 함정을 걷는다. 한도는 그대로 — 올리면 한 음절 '물'
-- 반복 구멍이 다시 열린다. 자수 68 동일이라 scoring_config 는 안 건드린다.
--
-- v2(seed/update-reduce-repeat-v2.sql)는 이미 DB 에 실행됐다. 이 파일은 그 위에
-- 얹는 작은 델타 — problems 1건 passage + reference_answers 1행(ord 1 가) content.
--
-- 순서: 이 파일 → seed_data.sql(멱등) → seed_check.sql. 재실행해도 안전.

begin;

-- rp-kongjwi-jar: 물동이 → 항아리 (합성어 '물동이' 가 '물' 을 선점하던 함정 제거)
update problems set
  passage = '콩쥐는 우물에서 물을 길어 왔다. 콩쥐가 물을 부으면 물은 독 밑으로 새어 나갔다. 물을 채워도 채워도 독은 차지 않았다. 콩쥐는 항아리를 안은 채 주저앉아 울었다.'
 where source_key = 'rp-kongjwi-jar';

-- rp-kongjwi-jar ord 1 (가): 모범답안도 물동이 → 항아리
update reference_answers set content =
  '콩쥐는 물을 길어다 독에 부었다. 그러나 밑으로 다 새어 나가, 채워도 채워도 독은 차지 않았다. 콩쥐는 항아리를 안은 채 주저앉아 울었다.'
 where problem_id = (select id from problems where source_key = 'rp-kongjwi-jar')
   and ord = 1 and blank_key = '';

commit;

-- 눈으로 확인한다 — 원문 끝 문장에 '항아리', '물동이' 없음.
select p.source_key, p.passage
  from problems p join stages s on s.id = p.stage_id
 where p.source_key = 'rp-kongjwi-jar';
