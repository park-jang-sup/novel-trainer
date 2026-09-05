-- 구성 18 first_hook — fh-burnt-manor 에 passageCopyKeep 3 추가 (세션 41 후속 2).
--
-- 원문 근사 복사 차단(60%)의 예외. 이 문항 지시문은 "앞 세 줄은 두고, 마지막
-- 두 줄을 ... 바꿔"다 — 지시대로 앞 3문장을 그대로 두면 3/5(60%)라 새 근사
-- 복사 검사에 그대로 걸린다. passageCopyKeep 3 은 그 앞 3문장을 검사에서
-- 아예 뺀다(세지도, 분모에도 안 넣는다) — 나머지 2문장만 60% 기준으로 잰다.
--
-- 다른 config 키·문안·다른 fh- 문항은 전부 그대로. seed/dump/problems.json 이
-- 단일 출처. problems 는 기존 행이라 seed_data 의 insert(where not exists)로는
-- 안 들어간다 — 이 update 를 따로 낸다. 순서: 이 파일 → seed_data.sql(멱등)
-- → seed_check.sql. 재실행 안전(jsonb_set 멱등).

begin;

update problems set
  scoring_config = jsonb_set(scoring_config, '{passageCopyKeep}', '3'::jsonb)
 where source_key = 'fh-burnt-manor';

commit;

-- 눈으로 확인한다.
select p.source_key, p.scoring_config->>'forbidPassageCopy' as forbid_copy,
       p.scoring_config->>'passageCopyKeep' as keep
  from problems p
 where p.source_key = 'fh-burnt-manor';
