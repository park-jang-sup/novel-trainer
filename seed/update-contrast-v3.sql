-- 구성 12 전면 재구성 v3 — 60자 압축을 100자 시연형으로 · 원문 복사 차단 (세션 32 후기 2).
--
-- 박 님 실사용 판정 2건:
--  ① 모범답안 전부 미달 — 60자 2문장 압축은 층이 퍼즐이 돼 "뭘 알려주는지 모르겠다".
--    100자 3~4문장, 겉→전환→속이 새는 행동이 순서대로 읽히는 시연형으로 교체.
--  ② 뚫기 실증 — "원문 복사 + 이름"으로 활성 6문항 전부 통과(무난 원문 단계의 구멍,
--    lack 도 동일). forbidPassageCopy 를 신설해 막는다(gradeLocal 에 원문을 넘겨 판정).
--
-- seed/dump/{problems,answers}.json 이 단일 출처. problems 는 기존 행이라 seed_data 의
-- insert(where not exists)로는 안 들어간다 — 이 update 를 따로 낸다. reference 는
-- seed_data 재실행으로 안 갱신되므로 아래에 함께 싣는다(on conflict do nothing).
-- 순서: 이 파일 → seed_data.sql(멱등) → seed_check.sql. 재실행 안전.

begin;

-- ── 활성 cc- 6건: maxChars 100 · minVerbs 3 · forbidPassageCopy · (일부) instruction ──

-- cc-first-pay
update problems set
  instruction = '조평과 유겸을 대비시키시오. 조평은 배곯던 시절이 몸에 남아 제 것엔 인색해도 남의 끼니엔 아깝지 않은 호위다. 유겸은 신세를 지면 도련님 취급이 진짜가 될까 밥값부터 제가 내는 신참이다. 아래 장면을 다시 써서, 같은 삯 앞에서 두 사람이 서로 다르게 움직이게 하시오.',
  scoring_config = '{"maxChars":100,"minVerbs":3,"requireAll":["조평","유겸"],"forbidPassageCopy":true}'::jsonb
 where source_key = 'cc-first-pay';

-- cc-praise-callout
update problems set
  instruction = '서담의 겉과 속을 한 장면에 담으시오. 서담은 공을 팀에 돌리고 칭찬 앞에서 사양부터 하는 대리다. 그러나 속으로는 그 칭찬을 오래 좋아한다. 아래 장면을 다시 써서, 사양하는 겉과 좋아하는 속이 둘 다 행동으로 보이게 하시오.',
  scoring_config = '{"maxChars":100,"minVerbs":3,"forbidLabel":"속마음을 직접 말하는 표현","forbidWords":["좋아","기쁘","기뻤","뿌듯"],"forbidDisplay":["좋아하다","기쁘다","뿌듯하다"],"requireAny":["서담"],"forbidPassageCopy":true}'::jsonb
 where source_key = 'cc-praise-callout';

-- cc-ace-siren
update problems set
  instruction = '도현의 겉과 속을 한 장면에 담으시오. 도현은 누구에게나 같은 온도로 친절한 S급 헌터다. 무전 속 부상자는 그가 마음의 울타리 안에 둔 몇 안 되는 사람이다. 아래 장면을 다시 써서, 흐트러지지 않는 겉과 일정을 처음 미루는 속이 둘 다 행동으로 보이게 하시오.',
  scoring_config = '{"maxChars":100,"minVerbs":3,"forbidLabel":"속마음을 직접 말하는 표현","forbidWords":["걱정","불안","초조"],"forbidDisplay":["걱정","불안","초조"],"requireAny":["도현"],"forbidPassageCopy":true}'::jsonb
 where source_key = 'cc-ace-siren';

-- cc-night-shift
update problems set
  instruction = '유겸의 겉과 속을 한 장면에 담으시오. 유겸은 씀씀이 크고 낙천적인 부잣집 출신 신참 호위다. 그러나 실력을 의심받으면 웃는 얼굴로 제일 험한 일에 손을 든다. 아래 장면을 다시 써서, 웃는 겉과 이 악무는 속이 둘 다 행동으로 보이게 하시오.',
  scoring_config = '{"maxChars":100,"minVerbs":3,"forbidLabel":"속마음을 직접 말하는 표현","forbidWords":["불안","자존심","증명"],"forbidDisplay":["불안","자존심","증명하다"],"requireAny":["유겸"],"forbidPassageCopy":true}'::jsonb
 where source_key = 'cc-night-shift';

-- cc-junk-dealer
update problems set
  instruction = '셀라의 겉과 속을 한 장면에 담으시오. 셀라는 모든 것에 값부터 매기는 실용주의 견습이다. 그러나 값을 매기는 것이 그녀가 물건과 사람을 지키는 방식이다. 아래 장면을 다시 써서, 차가운 겉과 지키려는 속이 둘 다 행동으로 보이게 하시오.',
  scoring_config = '{"maxChars":100,"minVerbs":3,"forbidLabel":"속마음을 직접 말하는 표현","forbidWords":["소중","다정"],"forbidDisplay":["소중하다","다정하다"],"requireAny":["셀라"],"forbidPassageCopy":true}'::jsonb
 where source_key = 'cc-junk-dealer';

-- cc-flash-crowd
update problems set
  instruction = '군중과 한시우를 갈라 세우시오. 한시우는 재능 대신 훈련량으로 버티는 B급 헌터다. 아래 장면에서 모두가 같은 곳을 향한다. 다시 써서, 다른 사람들과 한시우가 서로 다른 방향으로 움직이게 하시오.',
  scoring_config = '{"maxChars":100,"minVerbs":3,"requireAny":["한시우","시우"],"forbidPassageCopy":true}'::jsonb
 where source_key = 'cc-flash-crowd';

-- ── lk- 5건: forbidPassageCopy 추가 (같은 구멍 · 나머지 불변) ──

-- lk-desk-nine
update problems set
  scoring_config = '{"maxChars":60,"minVerbs":2,"forbidLabel":"인정 욕구를 직접 말하는 표현","forbidWords":["인정","칭찬","알아주"],"forbidDisplay":["인정","칭찬","알아주다"],"requireAny":["김하준","하준"],"forbidPassageCopy":true}'::jsonb
 where source_key = 'lk-desk-nine';

-- lk-cafe-wait
update problems set
  scoring_config = '{"maxChars":60,"minVerbs":2,"forbidLabel":"외로움을 직접 말하는 표현","forbidWords":["사랑","애정","외로","쓸쓸","관심"],"forbidDisplay":["사랑","애정","외롭다","쓸쓸하다","관심"],"requireAny":["윤소민","소민"],"forbidPassageCopy":true}'::jsonb
 where source_key = 'lk-cafe-wait';

-- lk-guard-dawn
update problems set
  scoring_config = '{"maxChars":60,"minVerbs":2,"forbidLabel":"가난을 직접 말하는 표현","forbidWords":["가난","굶","궁핍"],"forbidDisplay":["가난","굶다","궁핍"],"requireAny":["조평"],"forbidPassageCopy":true}'::jsonb
 where source_key = 'lk-guard-dawn';

-- lk-board-rank
update problems set
  scoring_config = '{"maxChars":60,"minVerbs":2,"forbidLabel":"열등감을 직접 말하는 표현","forbidWords":["열등","부럽","부러워","질투","뒤처"],"forbidDisplay":["열등감","부럽다","질투","뒤처지다"],"requireAny":["한시우","시우"],"forbidPassageCopy":true}'::jsonb
 where source_key = 'lk-board-rank';

-- lk-tower-shelf
update problems set
  scoring_config = '{"maxChars":60,"minVerbs":2,"forbidLabel":"그리움을 직접 말하는 표현","forbidWords":["그립","그리워"],"forbidDisplay":["그립다","그리워하다"],"requireAny":["리안"],"forbidPassageCopy":true}'::jsonb
 where source_key = 'lk-tower-shelf';

-- ── 활성 cc- 모범답안 12행 (100자 시연형으로 전면 교체) ──

-- cc-first-pay ord 1
update reference_answers set content =
  '유겸은 첫 삯을 받자마자 술자리부터 잡았다. 얻어먹은 밥값을 갚는 자리라며 조평의 잔부터 채웠다. 조평은 그 잔을 두 손으로 받고, 제 삯 절반을 전대 바닥에 꿰매 넣었다. 남은 반에서 신참들 안주 한 접시를 더 시킨 것도 조평이었다.'
 where problem_id = (select id from problems where source_key = 'cc-first-pay')
   and ord = 1 and blank_key = '';

-- cc-first-pay ord 2
update reference_answers set content =
  '조평은 제 잔에는 가장 싼 술을 시켰다. 그러면서 신참들 상에는 고기 한 접시를 말없이 올려 보냈다. 그 값을 셈하려는 조평의 손을 유겸이 웃으며 눌렀다. 오늘은 갚는 날이라고, 여기부터는 제 몫이라고 했다.'
 where problem_id = (select id from problems where source_key = 'cc-first-pay')
   and ord = 2 and blank_key = '';

-- cc-praise-callout ord 1
update reference_answers set content =
  '호명된 서담은 손사래를 치며 반쯤 일어섰다. 팀장님이 다 하신 건데요, 하는 목소리가 끝까지 작았다. 그런데 자리로 돌아온 뒤에도 상장은 서류철에 못 들어갔다. 모니터 옆에 세워 둔 채, 서담은 오후 내내 그쪽으로 눈을 안 주는 척했다.'
 where problem_id = (select id from problems where source_key = 'cc-praise-callout')
   and ord = 1 and blank_key = '';

-- cc-praise-callout ord 2
update reference_answers set content =
  '서담은 상을 받는 내내 고개를 숙이고 있었다. 회식 자리에서 그 얘기가 나오자 화제부터 돌렸다. 그런데 그날 밤, 서담의 책상 서랍에는 상장이 반듯하게 눕혀졌다. 모서리가 구겨질까 봐 파일까지 끼운 채였다.'
 where problem_id = (select id from problems where source_key = 'cc-praise-callout')
   and ord = 2 and blank_key = '';

-- cc-ace-siren ord 1
update reference_answers set content =
  '도현은 남은 질문 둘에 끝까지 답했다. 목소리는 평소의 온도 그대로였다. 인터뷰가 끝나자 그는 처음으로 다음 일정을 미뤘다. 기자에게 양해를 구하는 인사도, 병원으로 방향을 트는 걸음도 흐트러지지 않았다.'
 where problem_id = (select id from problems where source_key = 'cc-ace-siren')
   and ord = 1 and blank_key = '';

-- cc-ace-siren ord 2
update reference_answers set content =
  '무전이 끝나고도 도현의 말씨는 평소 그대로였다. 같은 온도의 경어로 인터뷰 연기를 부탁했다. 그러나 주차장까지 걸어 내려가는 법이 없던 사람이 그날은 엘리베이터를 기다리지 못했다. 계단을 두 칸씩 내려가는 발소리가 울렸다.'
 where problem_id = (select id from problems where source_key = 'cc-ace-siren')
   and ord = 2 and blank_key = '';

-- cc-night-shift ord 1
update reference_answers set content =
  '도련님이 새벽 경계도 서겠냐는 웃음 섞인 말이 돌았다. 유겸은 더 크게 웃으며 명부에 제 이름을 적었다. 그게 얼마나 한다고요, 하는 목소리도 가벼웠다. 그러나 돌아서서 붓을 내려놓는 손등에는 힘줄이 서 있었다.'
 where problem_id = (select id from problems where source_key = 'cc-night-shift')
   and ord = 1 and blank_key = '';

-- cc-night-shift ord 2
update reference_answers set content =
  '유겸은 웃는 낯으로 새벽 구간에 손을 들었다. 잠이 안 와서 그런다며 너스레까지 떨었다. 그런데 그날 밤 순찰로를 도는 걸음은 평소의 배로 촘촘했다. 담장 아래 어둠을 살피는 눈에는 웃음기가 없었다.'
 where problem_id = (select id from problems where source_key = 'cc-night-shift')
   and ord = 2 and blank_key = '';

-- cc-junk-dealer ord 1
update reference_answers set content =
  '셀라는 고물상의 값을 듣자마자 목록을 덮었다. 은화 열 닢 아래로는 안 팝니다, 하는 목소리에 흥정의 여지가 없었다. 돌아가는 길, 셀라는 수레 위 유품 보자기를 다시 여몄다. 매듭이 풀리지 않게 두 번을 더 조인 손이었다.'
 where problem_id = (select id from problems where source_key = 'cc-junk-dealer')
   and ord = 1 and blank_key = '';

-- cc-junk-dealer ord 2
update reference_answers set content =
  '셀라는 물건을 도로 싸며 값을 두 번 말하지 않았다. 장부에는 깨진 흥정의 값만 건조하게 적혔다. 다만 상자를 드는 리안의 손이 느려지자, 셀라는 제 몫의 짐을 먼저 지고 앞서 걸었다. 재촉하는 말 대신 걸음만 늦췄다.'
 where problem_id = (select id from problems where source_key = 'cc-junk-dealer')
   and ord = 2 and blank_key = '';

-- cc-flash-crowd ord 1
update reference_answers set content =
  '카메라 앞으로 헌터들이 줄을 이뤘다. 한시우는 그 줄의 끝을 지나쳐 장비부터 쌌다. 인터뷰 소리가 등 뒤에서 커졌다 작아졌다. 훈련장 예약까지 십 분, 한시우의 걸음은 게이트 반대쪽으로 이미 멀어지고 있었다.'
 where problem_id = (select id from problems where source_key = 'cc-flash-crowd')
   and ord = 1 and blank_key = '';

-- cc-flash-crowd ord 2
update reference_answers set content =
  '플래시가 터질 때마다 사람들의 고개가 그쪽으로 쏠렸다. 한시우만 무너진 방벽 앞에 쪼그려 앉아 있었다. 제 검이 낸 흔적을 손끝으로 재고, 수첩에 각도를 옮겨 적었다. 등 뒤의 환호는 끝까지 한 번도 돌아보지 않았다.'
 where problem_id = (select id from problems where source_key = 'cc-flash-crowd')
   and ord = 2 and blank_key = '';

commit;

-- 눈으로 확인한다 — 활성 cc- 의 자수 상한·forbidPassageCopy.
select p.source_key,
       p.scoring_config->>'maxChars' as max_chars,
       p.scoring_config->>'minVerbs' as min_verbs,
       p.scoring_config->>'forbidPassageCopy' as fpc
  from problems p join stages s on s.id = p.stage_id
 where s.skill_key in ('contrast_char', 'lack') and p.is_active is not false
 order by s.skill_key, p.difficulty, p.source_key;
