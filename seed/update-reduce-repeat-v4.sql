-- 4단계 reduce_repeat — v3 실행 후 추가 패치 (세션 27 후기 둘째).
--
-- rp-magpie-bridge 모범답안 ord 1(가) 교체. 박 님이 학습자로 통과한 답이 기존
-- 가보다 낫다 — 문장 연결 압축('놓았고, … 이어졌다') + 대사 귀속 명시('직녀를
-- 향해 내달렸다'). 학습자 답이 모범답안을 이긴 첫 사례.
--
-- 원문 · scoring_config · ord 2(나)는 전부 그대로. reference_answers 1행만.
-- 새 가: 80자(≤ maxChars 85) · 5문장 · 다리 2회(한도 2) · 지문 베낌 아님.
--
-- v2·v3 는 이미 DB 에 실행됐다. 순서: 이 파일 → seed_data.sql(멱등) → seed_check.sql.

begin;

-- rp-magpie-bridge ord 1 (가): 박 님 실제 통과 답안으로 교체
update reference_answers set content =
  '까치들이 은하수 위로 다리를 놓았고, 강 건너까지 길게 이어졌다. 견우는 떨리는 발로 올랐다. 다리가 출렁일 때마다 까치들이 날개를 퍼덕였다. "직녀님!" 견우는 직녀를 향해 내달렸다.'
 where problem_id = (select id from problems where source_key = 'rp-magpie-bridge')
   and ord = 1 and blank_key = '';

commit;

-- 눈으로 확인한다.
select ra.ord, ra.content
  from reference_answers ra
  join problems p on p.id = ra.problem_id
 where p.source_key = 'rp-magpie-bridge'
 order by ra.ord;
