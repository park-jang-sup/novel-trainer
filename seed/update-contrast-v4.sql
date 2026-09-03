-- 구성 12 최종 확정 v4 — 박 님 견본 규격 반영 (세션 32 후기 3).
--
-- 박 님이 직접 수정한 도현 견본이 기준이다: ① 인물 설명은 겉·속의 관계까지
-- ("친절해 보이지만 오히려…") ② 과제는 "원문을 읽고 다음에 올 장면을 작성"
-- — 대체가 아니라 이어쓰기이므로 type 을 convert → continue 로 전환(채점 경로
-- 동일) ③ 답안은 지시문 정보만으로 자립, 함축·원장 내부 언어 금지 ④ 이름
-- 강제는 과제 본질일 때만 — 갭 4건(cc-praise-callout·cc-ace-siren·cc-night-shift·
-- cc-junk-dealer)은 requireAny 를 걷었다(검사: 자수·동사·금지어·원문복사 4개,
-- 두 칸 화면은 forbidWords 가 있어 유지). cc-flash-crowd 는 requireAny, cc-first-pay
-- 는 requireAll 을 그대로 둔다 — 갈라 세우기·대비가 그 두 문항의 과제 본질이다.
--
-- seed/dump/{problems,answers}.json 이 단일 출처. problems 는 기존 행이라 seed_data 의
-- insert(where not exists)로는 안 들어간다 — 이 update 를 따로 낸다. reference 는
-- seed_data 재실행으로 안 갱신되므로 아래에 함께 싣는다(on conflict do nothing).
-- lk- 5건은 이번 라운드에 안 건드린다(update-contrast-v3.sql 이 이미 반영).
-- 순서: update-contrast-v3.sql(이미 실행됨) → 이 파일 → seed_data.sql(멱등) →
-- seed_check.sql. 재실행 안전.

begin;

-- ── 활성 cc- 6건: type convert → continue · instruction 재작성 · 갭 4 requireAny 삭제 ──

-- cc-first-pay (requireAll 유지)
update problems set
  type = 'continue',
  instruction = '조평과 유겸을 대비시키시오. 조평은 배곯던 시절이 몸에 남아 제 것엔 인색해도 남의 끼니엔 아깝지 않은 호위다. 유겸은 신세를 지면 도련님 취급이 진짜가 될까 밥값부터 제가 내는 신참이다. 원문을 읽고 다음에 올 장면을, 같은 삯 앞에서 두 사람이 서로 다르게 움직이게 작성하시오.',
  scoring_config = '{"maxChars":100,"minVerbs":3,"requireAll":["조평","유겸"],"forbidPassageCopy":true}'::jsonb
 where source_key = 'cc-first-pay';

-- cc-praise-callout (requireAny 삭제)
update problems set
  type = 'continue',
  instruction = '서담의 겉과 속을 한 장면에 담으시오. 서담은 칭찬을 받으면 손부터 내젓는 조용한 대리다. 하지만 싫어서가 아니다 — 그 칭찬을 누구보다 오래 마음에 담아 두는 사람이다. 원문을 읽고 다음에 올 장면을, 사양하는 겉과 좋아하는 속이 둘 다 행동으로 보이게 작성하시오.',
  scoring_config = '{"maxChars":100,"minVerbs":3,"forbidLabel":"속마음을 직접 말하는 표현","forbidWords":["좋아","기쁘","기뻤","뿌듯"],"forbidDisplay":["좋아하다","기쁘다","뿌듯하다"],"forbidPassageCopy":true}'::jsonb
 where source_key = 'cc-praise-callout';

-- cc-ace-siren (requireAny 삭제)
update problems set
  type = 'continue',
  instruction = '도현의 겉과 속을 한 장면에 담으시오. 도현은 누구에게나 똑같이 친절해 보이지만, 쉽게 곁을 주지 않는 S급 헌터다. 그가 진짜 마음을 준 사람은 몇 없고, 그 몇 사람 앞에서만 목석 같은 행동도 무너진다. 무전 속 부상자가 바로 그중 하나다. 원문을 읽고 다음에 올 장면을 친절한 겉과 무너지는 속이 둘 다 행동으로 보이게 작성하시오.',
  scoring_config = '{"maxChars":100,"minVerbs":3,"forbidLabel":"속마음을 직접 말하는 표현","forbidWords":["걱정","불안","초조"],"forbidDisplay":["걱정","불안","초조"],"forbidPassageCopy":true}'::jsonb
 where source_key = 'cc-ace-siren';

-- cc-night-shift (requireAny 삭제)
update problems set
  type = 'continue',
  instruction = '유겸의 겉과 속을 한 장면에 담으시오. 유겸은 부잣집에서 나와 제 힘을 시험하러 온 신참 호위다. 도련님 소리가 제일 싫어서, 실력을 의심받으면 웃는 얼굴로 제일 험한 일을 자원한다. 원문을 읽고 다음에 올 장면을, 웃는 겉과 이를 무는 속이 둘 다 행동으로 보이게 작성하시오.',
  scoring_config = '{"maxChars":100,"minVerbs":3,"forbidLabel":"속마음을 직접 말하는 표현","forbidWords":["불안","자존심","증명"],"forbidDisplay":["불안","자존심","증명하다"],"forbidPassageCopy":true}'::jsonb
 where source_key = 'cc-night-shift';

-- cc-junk-dealer (requireAny 삭제)
update problems set
  type = 'continue',
  instruction = '셀라의 겉과 속을 한 장면에 담으시오. 셀라는 뭐든 값부터 매기는 냉정한 견습이다. 하지만 그 계산은 욕심이 아니라 지키는 방식이다 — 제값을 받아야 물건도 사람도 함부로 다뤄지지 않는다고 믿는다. 원문을 읽고 다음에 올 장면을, 차가운 겉과 지키려는 속이 둘 다 행동으로 보이게 작성하시오.',
  scoring_config = '{"maxChars":100,"minVerbs":3,"forbidLabel":"속마음을 직접 말하는 표현","forbidWords":["소중","다정"],"forbidDisplay":["소중하다","다정하다"],"forbidPassageCopy":true}'::jsonb
 where source_key = 'cc-junk-dealer';

-- cc-flash-crowd (requireAny 유지)
update problems set
  type = 'continue',
  instruction = '군중과 한시우를 갈라 세우시오. 한시우는 재능 대신 훈련량으로 버티는 B급 헌터다. 카메라보다 다음 훈련이 급한 사람이다. 원문을 읽고 다음에 올 장면을, 모두가 몰려가는 쪽과 한시우가 가는 쪽이 갈라지게 작성하시오.',
  scoring_config = '{"maxChars":100,"minVerbs":3,"requireAny":["한시우","시우"],"forbidPassageCopy":true}'::jsonb
 where source_key = 'cc-flash-crowd';

-- ── 활성 cc- 모범답안 12행 (박 님 견본 규격 반영으로 전면 교체) ──

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
  '호명된 서담은 손사래를 치며 반쯤 일어섰다. 팀장님이 다 하신 건데요, 하는 목소리가 끝까지 작았다. 그런데 자리로 돌아온 뒤에도 상장은 서류철에 못 들어갔다. 모니터 옆에 세워 둔 채, 오후 내내 그쪽으로 눈을 안 주는 척했다.'
 where problem_id = (select id from problems where source_key = 'cc-praise-callout')
   and ord = 1 and blank_key = '';

-- cc-praise-callout ord 2
update reference_answers set content =
  '서담은 상을 받는 내내 고개를 숙이고 있었다. 회식 자리에서 그 얘기가 나오자 화제부터 돌렸다. 그런데 그날 밤 서담은 상장을 서랍에 반듯하게 눕혔다. 모서리가 구겨질까 봐 파일까지 끼웠다.'
 where problem_id = (select id from problems where source_key = 'cc-praise-callout')
   and ord = 2 and blank_key = '';

-- cc-ace-siren ord 1
update reference_answers set content =
  '도현은 무전을 끊고 매니저에게 고개를 돌려 말했다. 인터뷰를 미뤄야겠다는 말투는 평소처럼 부드러웠다. 그러나 대답을 다 듣기도 전에 몸은 이미 차가 있는 방향으로 가고 있었다.'
 where problem_id = (select id from problems where source_key = 'cc-ace-siren')
   and ord = 1 and blank_key = '';

-- cc-ace-siren ord 2
update reference_answers set content =
  '무전이 끝나자 도현은 평온한 표정으로 인터뷰를 미뤄달라고 부탁했다. 사과 인사도 빠뜨리지 않았다. 병원에 도착하고 엘리베이터를 힐끔 보다 걸음을 돌렸다. 원체 엘리베이터만 고집하던 사람이 그날은 빠른 걸음으로 계단을 올랐다.'
 where problem_id = (select id from problems where source_key = 'cc-ace-siren')
   and ord = 2 and blank_key = '';

-- cc-night-shift ord 1
update reference_answers set content =
  '도련님이 새벽 경계도 서겠냐는 말에 웃음이 돌았다. 유겸은 더 크게 웃으며 명부에 제 이름을 적었다. 그게 얼마나 한다고요, 하는 목소리도 가벼웠다. 그러나 붓을 내려놓는 손등에는 힘줄이 서 있었다.'
 where problem_id = (select id from problems where source_key = 'cc-night-shift')
   and ord = 1 and blank_key = '';

-- cc-night-shift ord 2
update reference_answers set content =
  '유겸은 웃는 낯으로 새벽 구간에 손을 들었다. 잠이 안 와서 그런다며 너스레까지 떨었다. 그런데 그날 밤 순찰을 도는 걸음은 평소보다 배로 촘촘했다. 담장 아래 어둠을 살피는 눈에 웃음기가 없었다.'
 where problem_id = (select id from problems where source_key = 'cc-night-shift')
   and ord = 2 and blank_key = '';

-- cc-junk-dealer ord 1
update reference_answers set content =
  '셀라는 값을 듣자마자 목록을 덮었다. 은화 열 닢 아래로는 안 판다는 목소리에 흥정의 여지가 없었다. 돌아가는 길, 셀라는 수레 위 유품 보자기를 다시 여몄다. 매듭이 풀리지 않게 두 번을 더 조였다.'
 where problem_id = (select id from problems where source_key = 'cc-junk-dealer')
   and ord = 1 and blank_key = '';

-- cc-junk-dealer ord 2
update reference_answers set content =
  '셀라는 물건을 도로 싸며 값을 두 번 말하지 않았다. 장부에는 오늘 값만 짧게 적었다. 다만 상자를 드는 리안의 손이 느려지자, 셀라는 제 몫의 짐을 먼저 지고 앞서 걸었다. 재촉하는 말 대신 걸음만 늦췄다.'
 where problem_id = (select id from problems where source_key = 'cc-junk-dealer')
   and ord = 2 and blank_key = '';

-- cc-flash-crowd ord 1
update reference_answers set content =
  '카메라 앞으로 헌터들이 줄을 이뤘다. 한시우는 그 줄을 지나쳐 장비부터 쌌다. 등 뒤에서 인터뷰 소리가 커졌다 작아졌다. 훈련장 예약까지 십 분, 한시우의 걸음은 게이트 반대쪽으로 멀어지고 있었다.'
 where problem_id = (select id from problems where source_key = 'cc-flash-crowd')
   and ord = 1 and blank_key = '';

-- cc-flash-crowd ord 2
update reference_answers set content =
  '플래시가 터질 때마다 사람들의 고개가 그쪽으로 쏠렸다. 한시우만 무너진 방벽 앞에 쪼그려 앉았다. 제 검이 낸 흔적을 손끝으로 재고 수첩에 옮겨 적었다. 등 뒤의 환호는 한 번도 돌아보지 않았다.'
 where problem_id = (select id from problems where source_key = 'cc-flash-crowd')
   and ord = 2 and blank_key = '';

commit;

-- 눈으로 확인한다 — 활성 cc- 의 type·이름 요구 유무.
select p.source_key,
       p.type,
       p.scoring_config->>'requireAny' as require_any,
       p.scoring_config->>'requireAll' as require_all
  from problems p join stages s on s.id = p.stage_id
 where s.skill_key = 'contrast_char' and p.is_active is not false
 order by p.difficulty, p.source_key;
