-- 구성 16 cliffhanger_adv(ca-) — ca-crystal-exam 만 ai_shadow 제거 (세션 48 후속).
--
-- 세션 47/48 signal 골든 실측(data/probe/signal-golden-20260907.json — good 45
-- 오탐 0 · nak 25 미검출 0)이 판정선을 넘어 구성 16(ca-) signal 실사용을 확정했다.
-- 다만 ca-crystal-exam 가(모범답안)의 신호는 대조형(기준 깔기) — "앞 사람들은
-- 손바닥만 한 빛을 냈다"는 대조 기준 줄이 마지막 줄 앞에 와야 대조로 작동해,
-- signal-v2 정의(독자에게 주어진 사실이 평소·기대와 어긋나는 것 — 사실형)의
-- 밖에 있다. 켜 두면 잘 쓴 답안(가)에 no_signal 카드가 붙는 오지도를 낳는다.
-- 나머지 4건(gate-dinner·open-door·inn-endroom·walk-home)은 사실형 신호라 그대로
-- 둔다. 문항 수정이 아니다 — 관측(ai_shadow)만 뺀다.
--
-- seed/dump/problems.json 이 단일 출처. problems 는 기존 행이라 seed_data 의
-- insert(where not exists)로는 안 들어간다 — 이 update 를 따로 낸다.
-- 순서: 이 파일 → seed_data.sql(멱등) → seed_check.sql. 재실행 안전
-- (jsonb 키 삭제는 이미 없는 키를 다시 지워도 안전 — 멱등).
--
-- ★ problems 테이블엔 정렬용 난도 컬럼이 p.difficulty 뿐이다(없는 컬럼을 쓰면
--   42703 로 죽는다) — order by 는 p.difficulty 로 한다.

begin;

update problems set
  scoring_config = scoring_config - 'ai_shadow'
 where source_key = 'ca-crystal-exam';

commit;

-- 눈으로 확인한다 — crystal 만 ai_shadow 없음(null), 나머지 4건은 그대로 ["signal"].
select p.source_key, p.scoring_config->>'ai_shadow' as ai_shadow
  from problems p join stages s on s.id = p.stage_id
 where s.skill_key = 'cliffhanger_adv' and p.source_key like 'ca-%'
 order by p.difficulty, p.source_key;
