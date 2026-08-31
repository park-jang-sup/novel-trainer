-- 1단계 reduce_adverb 원문 여덟을 박 님 판(희화화 완화)으로 교체한다.
-- 세션 20. seed/dump/problems.json 이 단일 출처 — 이 파일은 거기서 뽑았다.
--
-- seed_data.sql 의 문항 insert 는 `where not exists` 라 기존 행의 passage 를
-- 안 고친다. 그래서 이 update 를 따로 낸다. 순서:
--   이 파일 실행 → seed_check.sql (덤프 ↔ DB 대조가 새 md5 로 통과하는지)
--
-- scoring_config·모범답안(reference_answers)은 안 건드린다. 새 원문 여덟은
-- 형태소 서버로 실측했다 — 전부 자수 초과 + 부사 2~5라 원문 그대로 제출이
-- 여전히 미달이다.
--
-- 재실행해도 안전하다(update 는 멱등).

begin;

update problems set passage = '나무꾼은 힘껏 도끼를 휘둘렀다. 자루가 갑자기 빠졌고, 도끼는 빠르게 연못으로 떨어졌다.'
 where source_key = 'rm-axe-pond';

update problems set passage = '흥부는 조심스럽게 제비의 다리를 감쌌다. 그는 간절하게 제비가 얼른 낫기를 바랐다.'
 where source_key = 'rm-heungbu-swallow';

update problems set passage = '콩쥐는 깨진 독에 열심히 물을 부었지만 물은 계속 빠르게 새어 나갔다. 그녀는 몹시 지친 얼굴로 천천히 주저앉았다.'
 where source_key = 'rm-kongjwi-jar';

update problems set passage = '심청은 천천히 뱃전으로 걸어갔다. 사람들은 안타깝게 그녀를 바라보았고, 뱃사공은 무겁게 고개를 돌렸다.'
 where source_key = 'rm-simcheong-deck';

update problems set passage = '까치들은 부지런하게 날아와 아주 촘촘하게 몸을 이었다. 견우는 조심스럽게 그 위에 발을 얹었다.'
 where source_key = 'rm-magpie-bridge';

update problems set passage = '토끼는 태연하게 웃으며 말했다. 용왕은 다급하게 몸을 일으켰고, 신하들은 어리둥절한 표정으로 서로를 바라보았다.'
 where source_key = 'rm-rabbit-court';

update problems set passage = '오누이는 급하게 나무 위로 올라갔다. 호랑이는 아래에서 계속 사납게 나무를 흔들었고, 아이들은 몹시 세게 가지를 붙잡았다.'
 where source_key = 'rm-siblings-tree';

update problems set passage = '나무꾼은 조심스럽게 방망이를 들었다. 그는 몹시 떨리는 손으로 천천히 그것을 내리쳤고, 곡식이 갑자기 쏟아져 나왔다.'
 where source_key = 'rm-goblin-club';

commit;

-- 눈으로 확인한다 — 여덟 줄이 새 원문이어야 한다. 그다음 seed_check.sql.
select p.source_key, p.passage
  from problems p
  join stages s on s.id = p.stage_id
 where s.skill_key = 'reduce_adverb'
 order by p.difficulty, p.source_key;
