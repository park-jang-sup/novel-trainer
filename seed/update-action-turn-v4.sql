-- 문장 12 action_turn — bt-fireball-shield 에 passageCopyKeep 1 추가 (세션 41 후속 2).
--
-- 원문 근사 복사 차단(60%)의 예외. 이 문항 지시문은 "첫 문장은 두고 ... 다시
-- 쓰시오"다 — passageCopyKeep 1 은 원문 첫 문장을 근사 복사 검사에서 뺀다
-- (세지도, 분모에도 안 넣는다). 나머지 4문장만 60% 기준으로 잰다.
--
-- ★ STATUS 세션 41 후속 2 지시문은 fh-burnt-manor(update-first-hook-v3.sql)만
--   명시했지만, bt-fireball-shield 도 같은 이유(passageCopyKeep 예외 대상)로
--   config 가 바뀌었다 — 이 파일 없이는 덤프와 DB 가 갈린다(seed_check 가
--   그 갈림을 잡는다). action_turn 계열 델타 관례(v2 ai_shadow · v3 모범답안
--   교체)를 따라 v4 로 잇는다.
--
-- 다른 config 키·문안·다른 bt- 문항은 전부 그대로. seed/dump/problems.json 이
-- 단일 출처. 순서: 이 파일 → seed_data.sql(멱등) → seed_check.sql. 재실행
-- 안전(jsonb_set 멱등).

begin;

update problems set
  scoring_config = jsonb_set(scoring_config, '{passageCopyKeep}', '1'::jsonb)
 where source_key = 'bt-fireball-shield';

commit;

-- 눈으로 확인한다.
select p.source_key, p.scoring_config->>'forbidPassageCopy' as forbid_copy,
       p.scoring_config->>'passageCopyKeep' as keep
  from problems p
 where p.source_key = 'bt-fireball-shield';
