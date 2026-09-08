-- 문장 12 action_turn(bt-) 5문항 — forbidWords/forbidDisplay 에 느낌의 이름(명사)
-- 넷 추가: 고통 · 통증 · 아픔 · 지독 (세션 48 후속).
--
-- 세션 45~47 tell 관측 실사용에서 forbidWords 가 정확 어간만 잡는다는 것을
-- 학습자가 동의어로 자연스럽게 피해 간 사례가 쌓였다 — 세션 45 D-2(통증·열기)·
-- 세션 47 D-3(지독한 통증)·D-5(고통)·D-4·D-6(아픔). 세션 47 tell-v2 골든이
-- "tell_only 로 잡힌 표본이 forbidWords 와 100% 겹친다"는 결과를 냈다 — AI
-- 승격(gating) 대신 forbidWords 확장으로 푼다는 판정선을 그대로 따른다.
-- 채팅 실측: 이 네 어휘 모두 bt- 모범답안 10건·활성 모범답안 전수에 0건 —
-- 정직한 답을 안 물린다.
--
-- ★ 넣지 않은 것 — 저릿·화끈·얼얼·따가운·시린(모범답안이 이미 쓰는 몸 부위+
-- 결과 곁의 감각어라 정당한 묘사) · 뜨거운(사물 상태) · 둔탁(소리) · 열기
-- (물리적 열, 몸·사물의 변화를 그대로 서술하는 말이라 대신하는 말이 아니다).
--
-- bt-fireball-shield 는 '고통'이 이미 forbidWords/forbidDisplay 에 있어(세션
-- 45) 나머지 셋(통증·아픔·지독)만 더한다 — 4건이 아니라 3건이 늘어난다.
-- 새 항목은 기존 '강력' 뒤, '그때였다' 앞에 끼운다(느낌어 묶음 다음, 억지
-- 접속 앞) — 순서·기존 문구는 그대로 두고 자리만 낸다.
--
-- seed/dump/problems.json 이 단일 출처. problems 는 기존 행이라 seed_data 의
-- insert(where not exists)로는 안 들어간다 — 이 update 를 따로 낸다.
-- 순서: 이 파일 → seed_data.sql(멱등) → seed_check.sql. 재실행 안전
-- (jsonb_set 이 멱등).

begin;

update problems set
  scoring_config = jsonb_set(scoring_config, '{forbidWords}',
    '["끔찍","무서웠","두려웠","압도적","굉장","엄청난","강력","고통","통증","아픔","지독","그때였다","과연"]'::jsonb)
 where source_key = 'bt-alley-hook';
update problems set
  scoring_config = jsonb_set(scoring_config, '{forbidDisplay}',
    '["끔찍하다","무섭다","두렵다","압도적","굉장하다","엄청나다","강력하다","고통","통증","아픔","지독하다","그때였다","과연"]'::jsonb)
 where source_key = 'bt-alley-hook';

update problems set
  scoring_config = jsonb_set(scoring_config, '{forbidWords}',
    '["끔찍","무서웠","두려웠","압도적","굉장","엄청난","강력","고통","통증","아픔","지독","그때였다","과연"]'::jsonb)
 where source_key = 'bt-spear-range';
update problems set
  scoring_config = jsonb_set(scoring_config, '{forbidDisplay}',
    '["끔찍하다","무섭다","두렵다","압도적","굉장하다","엄청나다","강력하다","고통","통증","아픔","지독하다","그때였다","과연"]'::jsonb)
 where source_key = 'bt-spear-range';

update problems set
  scoring_config = jsonb_set(scoring_config, '{forbidWords}',
    '["끔찍","무서웠","두려웠","압도적","굉장","엄청난","강력","고통","통증","아픔","지독","그때였다","과연"]'::jsonb)
 where source_key = 'bt-orc-axe';
update problems set
  scoring_config = jsonb_set(scoring_config, '{forbidDisplay}',
    '["끔찍하다","무섭다","두렵다","압도적","굉장하다","엄청나다","강력하다","고통","통증","아픔","지독하다","그때였다","과연"]'::jsonb)
 where source_key = 'bt-orc-axe';

update problems set
  scoring_config = jsonb_set(scoring_config, '{forbidWords}',
    '["끔찍","무서웠","두려웠","압도적","굉장","엄청난","강력","고통","통증","아픔","지독","그때였다","과연"]'::jsonb)
 where source_key = 'bt-fireball-shield';
update problems set
  scoring_config = jsonb_set(scoring_config, '{forbidDisplay}',
    '["끔찍하다","무섭다","두렵다","압도적","굉장하다","엄청나다","강력하다","고통","통증","아픔","지독하다","그때였다","과연"]'::jsonb)
 where source_key = 'bt-fireball-shield';

update problems set
  scoring_config = jsonb_set(scoring_config, '{forbidWords}',
    '["끔찍","무서웠","두려웠","압도적","굉장","엄청난","강력","고통","통증","아픔","지독","그때였다","과연"]'::jsonb)
 where source_key = 'bt-low-guard';
update problems set
  scoring_config = jsonb_set(scoring_config, '{forbidDisplay}',
    '["끔찍하다","무섭다","두렵다","압도적","굉장하다","엄청나다","강력하다","고통","통증","아픔","지독하다","그때였다","과연"]'::jsonb)
 where source_key = 'bt-low-guard';

commit;

-- 눈으로 확인한다 — 5건 전부 forbidWords/forbidDisplay 에 고통·통증·아픔·지독(하다)
-- 이 강력(하다) 뒤, 그때였다 앞에 들어갔는지.
select p.source_key, p.scoring_config->'forbidWords' as forbid_words, p.scoring_config->'forbidDisplay' as forbid_display
  from problems p join stages s on s.id = p.stage_id
 where s.skill_key = 'action_turn' and p.source_key like 'bt-%'
 order by p.difficulty, p.source_key;
