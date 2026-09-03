-- 자동 생성 파일. 직접 고치지 말 것.
-- 원본: seed/dump/*.json
-- 재생성: npm run gen:seed
--
-- 적용 순서: seed_schema.sql → 이 파일 → seed_verify.sql
--
-- 재실행해도 안전하다. delete 문은 없다.
-- 문항은 source_key로, 단계는 skill_key로 매칭한다. stages.id는 여기
-- 박아 넣지 않는다. id와 order_no는 일치하지 않고, 재구축하면 id가
-- 달라진다.
--
-- 마지막 문장이 select인 것은 의도다. Supabase 편집기가 NOTICE를
-- 안 띄워서, raise notice로 끝내면 "통과"와 "파일이 잘려 안 돌았다"가
-- 둘 다 'Success. No rows returned'로 보인다. 행이 나오면 끝까지 돈 것이다.
-- 이 select 뒤에 다른 문장을 두지 마라 — 편집기는 마지막 결과만 보여준다.

begin;

-- ── 단계 ────────────────────────────────────────────────────────────
--
-- (track, order_no)에 유니크 제약이 걸려 있다. 이 시드가 밀어 올리는
-- 값(예: sensory가 5에서 6으로)을 한 번에 최종값으로 갱신하면, 아직
-- 갱신되지 않은 다른 행이 지금 들고 있는 order_no와 충돌할 수 있다.
-- 그래서 먼저 대상 행 전부를 order_no+1000으로 밀어 비켜 두고,
-- 그다음에야 각 행을 최종 값으로 내린다.
--
-- on conflict (skill_key) do nothing을 쓰지 않는다 — 그러면 이미 있는
-- 행의 order_no가 갱신되지 않아 지금과 같은 격차가 그대로 남는다.

update stages set order_no = order_no + 1000
 where skill_key in ('reduce_adverb', 'emotion_action', 'trim_padding', 'reduce_repeat', 'adverb_exception', 'sensory', 'rhythm', 'dialogue_ratio', 'pov_lock', 'action_reason', 'cliffhanger', 'action_turn', 'lack', 'contrast_char', 'likability', 'off_track', 'info_gap', 'cliffhanger_adv', 'reverse_design', 'first_hook', 'genre_coinage', 'branch_estimate', 'start_choose', 'start_write', 'start_extend', 'start_episode');

insert into stages
  (track, order_no, title, skill_key, summary, is_free, self_checks, intro, coach_intro, coach_line)
values ('sentence', 1, '부사 줄이기', 'reduce_adverb',
        '꾸미는 말을 걷어내고 동작으로 대신한다', true, array['부사가 하던 일을 동작이 하고 있는가']::text[], '',
        '이건 부사를 걷어내는 훈련이야. "정말 힘껏 휘둘렀다"는 말로 세게 친 거고, "머리 위로 들어 내리쳤다"는 진짜 세게 친 거거든. 여기선 일부러 부사를 다 막을게 — 부사가 나쁜 게 아니야, 언제 쓰는지는 5단계에서 알려줄게.', '부사가 하던 일을 동작한테 시켜 보자!')
on conflict (skill_key) do update set
  track = excluded.track,
  order_no = excluded.order_no,
  title = excluded.title,
  summary = excluded.summary,
  is_free = excluded.is_free,
  self_checks = excluded.self_checks,
  intro = excluded.intro,
  coach_intro = excluded.coach_intro,
  coach_line = excluded.coach_line;

insert into stages
  (track, order_no, title, skill_key, summary, is_free, self_checks, intro, coach_intro, coach_line)
values ('sentence', 2, '감정을 동작으로', 'emotion_action',
        '감정을 서술하지 않고 몸으로 드러낸다', true, array['이 동작만 보고도 무슨 감정인지 남이 맞힐 수 있는가']::text[], '',
        '이건 감정을 몸으로 보여주는 훈련이야. "기뻤다"라고 쓰면 독자는 정보를 받고, 주먹으로 입을 막으면 독자가 기쁨을 목격해. 감정 단어 없이 남이 그 감정을 맞히면 성공!', '감정 단어 없이, 몸이 말하게 해 보자!')
on conflict (skill_key) do update set
  track = excluded.track,
  order_no = excluded.order_no,
  title = excluded.title,
  summary = excluded.summary,
  is_free = excluded.is_free,
  self_checks = excluded.self_checks,
  intro = excluded.intro,
  coach_intro = excluded.coach_intro,
  coach_line = excluded.coach_line;

insert into stages
  (track, order_no, title, skill_key, summary, is_free, self_checks, intro, coach_intro, coach_line)
values ('sentence', 3, '군더더기 빼기', 'trim_padding',
        '없어도 되는 문장을 알아본다', true, array['지운 문장 중에 이야기가 잃은 것이 있는가']::text[], '',
        '이건 덜어내는 눈을 기르는 훈련이야. 웹소설 독자는 폰으로 빨리 읽어서, 이야기가 멈추는 문장에서 손가락도 멈춰. 사건이 움직이는 문장만 남기고 설명은 지워 봐. 단, 뒤 문장의 이유가 되는 정보(깨진 독!)는 군더더기가 아니야.', '이야기가 멈추는 문장을 찾아서 지워 보자!')
on conflict (skill_key) do update set
  track = excluded.track,
  order_no = excluded.order_no,
  title = excluded.title,
  summary = excluded.summary,
  is_free = excluded.is_free,
  self_checks = excluded.self_checks,
  intro = excluded.intro,
  coach_intro = excluded.coach_intro,
  coach_line = excluded.coach_line;

insert into stages
  (track, order_no, title, skill_key, summary, is_free, self_checks, intro, coach_intro, coach_line)
values ('sentence', 4, '반복 표현 제거', 'reduce_repeat',
        '같은 말이 겹치는 것을 알아챈다', true, array['같은 말이 두 번 넘게 안 나와? 소리 내서 읽어 봐!']::text[], '',
        '이건 겹친 말을 잡는 귀를 기르는 훈련이야. 같은 단어가 두 번 나오면 독자는 세 번째부터 그 단어만 보여. 조사만 바꾼 반복(제비를·제비는)도 반복이야.', '겹친 말을 찾아서 하나만 남겨 보자!')
on conflict (skill_key) do update set
  track = excluded.track,
  order_no = excluded.order_no,
  title = excluded.title,
  summary = excluded.summary,
  is_free = excluded.is_free,
  self_checks = excluded.self_checks,
  intro = excluded.intro,
  coach_intro = excluded.coach_intro,
  coach_line = excluded.coach_line;

insert into stages
  (track, order_no, title, skill_key, summary, is_free, self_checks, intro, coach_intro, coach_line)
values ('sentence', 5, '부사를 쓸 자리', 'adverb_exception',
        '부사를 언제 써도 되는지 안다', true, array[]::text[], '',
        '이제 푸는 법이야. 부사는 죄가 없어 — 동사가 연출하고 부사가 꾸미는 게 부사의 정당한 직무거든. 부사가 제값 하는 자리를 골라 봐.', '부사가 제값 하는 자리는 어디일까?')
on conflict (skill_key) do update set
  track = excluded.track,
  order_no = excluded.order_no,
  title = excluded.title,
  summary = excluded.summary,
  is_free = excluded.is_free,
  self_checks = excluded.self_checks,
  intro = excluded.intro,
  coach_intro = excluded.coach_intro,
  coach_line = excluded.coach_line;

insert into stages
  (track, order_no, title, skill_key, summary, is_free, self_checks, intro, coach_intro, coach_line)
values ('sentence', 6, '감각 묘사', 'sensory',
        '한 장면에서 두 가지 이상의 감각을 쓴다', true, array[]::text[], '',
        '이건 눈 말고 다른 감각을 깨우는 훈련이야. 초보의 묘사는 전부 눈이야: 보였다, 어두웠다, 빛났다. 눈을 막으면 소리·촉감·냄새가 일하기 시작해. 금지 목록이 길어 — 쓰기 전에 한 번 봐 줘.', '눈을 감고 다른 감각으로 써 보자!')
on conflict (skill_key) do update set
  track = excluded.track,
  order_no = excluded.order_no,
  title = excluded.title,
  summary = excluded.summary,
  is_free = excluded.is_free,
  self_checks = excluded.self_checks,
  intro = excluded.intro,
  coach_intro = excluded.coach_intro,
  coach_line = excluded.coach_line;

insert into stages
  (track, order_no, title, skill_key, summary, is_free, self_checks, intro, coach_intro, coach_line)
values ('sentence', 7, '문장 리듬', 'rhythm',
        '문단을 끊어 읽는 속도를 만든다', true, array[]::text[], '',
        '이건 읽는 속도를 만드는 훈련이야. 일반 소설은 문단 사이를 안 뛰는데 웹소설은 많이 뛰어. 가독성이 제일 중요한 장르라서야. 긴 덩어리를 끊어 보자.', '긴 덩어리를 끊어서 속도를 만들어 보자!')
on conflict (skill_key) do update set
  track = excluded.track,
  order_no = excluded.order_no,
  title = excluded.title,
  summary = excluded.summary,
  is_free = excluded.is_free,
  self_checks = excluded.self_checks,
  intro = excluded.intro,
  coach_intro = excluded.coach_intro,
  coach_line = excluded.coach_line;

insert into stages
  (track, order_no, title, skill_key, summary, is_free, self_checks, intro, coach_intro, coach_line)
values ('sentence', 8, '대사와 독백', 'dialogue_ratio',
        '대화 사이에 속마음을 끼워 넣는다', true, array[]::text[], '',
        '이건 입체적인 인물을 만드는 훈련이야. 말과 속마음이 다른 인물 — 대사 사이에 독백을 끼우면 생겨.', '말과 속마음 사이를 벌려 보자!')
on conflict (skill_key) do update set
  track = excluded.track,
  order_no = excluded.order_no,
  title = excluded.title,
  summary = excluded.summary,
  is_free = excluded.is_free,
  self_checks = excluded.self_checks,
  intro = excluded.intro,
  coach_intro = excluded.coach_intro,
  coach_line = excluded.coach_line;

insert into stages
  (track, order_no, title, skill_key, summary, is_free, self_checks, intro, coach_intro, coach_line)
values ('sentence', 9, '시점 고정', 'pov_lock',
        '한 인물의 눈에 보이는 것만 쓴다', true, array[]::text[], '',
        '이건 독자를 주인공에게 붙여 두는 훈련이야. 1인칭 화자는 자기 등을 못 봐. 화자가 볼 수 없는 걸 쓰는 순간 독자가 튕겨 나가.', '주인공 눈에 보이는 것만 쓰자!')
on conflict (skill_key) do update set
  track = excluded.track,
  order_no = excluded.order_no,
  title = excluded.title,
  summary = excluded.summary,
  is_free = excluded.is_free,
  self_checks = excluded.self_checks,
  intro = excluded.intro,
  coach_intro = excluded.coach_intro,
  coach_line = excluded.coach_line;

insert into stages
  (track, order_no, title, skill_key, summary, is_free, self_checks, intro, coach_intro, coach_line)
values ('sentence', 10, '동작에 이유 넣기', 'action_reason',
        '동작 사이에 왜 그렇게 했는지를 끼운다', true, array['마지막에 채운 칸이 그 뒤 결정타 줄의 이유가 되는가', '채운 칸들이 앞뒤 고정 줄과 끊기지 않고 이어지는가']::text[], '',
        '이건 동작에 판단을 끼우는 훈련이야. 동작만 나열하면 무술 시범이고, 사이에 ''왜''가 끼면 싸움이 돼. 전투씬이 안 써진다면 답이 여기 있어.', '동작 사이에 ''왜''를 채워 보자!')
on conflict (skill_key) do update set
  track = excluded.track,
  order_no = excluded.order_no,
  title = excluded.title,
  summary = excluded.summary,
  is_free = excluded.is_free,
  self_checks = excluded.self_checks,
  intro = excluded.intro,
  coach_intro = excluded.coach_intro,
  coach_line = excluded.coach_line;

insert into stages
  (track, order_no, title, skill_key, summary, is_free, self_checks, intro, coach_intro, coach_line)
values ('sentence', 11, '절단신공', 'cliffhanger',
        '마지막 줄이 다음을 부르게 한다', true, array[]::text[], '',
        '', '')
on conflict (skill_key) do update set
  track = excluded.track,
  order_no = excluded.order_no,
  title = excluded.title,
  summary = excluded.summary,
  is_free = excluded.is_free,
  self_checks = excluded.self_checks,
  intro = excluded.intro,
  coach_intro = excluded.coach_intro,
  coach_line = excluded.coach_line;

insert into stages
  (track, order_no, title, skill_key, summary, is_free, self_checks, intro, coach_intro, coach_line)
values ('sentence', 12, '전투 서사화', 'action_turn',
        '빌드업을 쌓고 마지막 한 줄로 승부를 가른다', true, array[]::text[], '',
        '', '')
on conflict (skill_key) do update set
  track = excluded.track,
  order_no = excluded.order_no,
  title = excluded.title,
  summary = excluded.summary,
  is_free = excluded.is_free,
  self_checks = excluded.self_checks,
  intro = excluded.intro,
  coach_intro = excluded.coach_intro,
  coach_line = excluded.coach_line;

insert into stages
  (track, order_no, title, skill_key, summary, is_free, self_checks, intro, coach_intro, coach_line)
values ('structure', 11, '결핍 부여', 'lack',
        '완벽한 인물을 만들지 않는다', false, array['결핍이라는 말 없이도, 이 사람이 뭐에 굶주렸는지 남이 맞힐 수 있어?']::text[], '',
        '여기서부턴 문장이 아니라 사람을 만들 거야. 완벽한 주인공은 매력이 없어 — 뭔가 빈 구석이 있어야 독자가 마음을 줘. 근데 ''그는 외로웠다''라고 쓰면 아무도 안 믿어. 결핍은 말이 아니라 버릇으로 새어 나오는 거야.', '결핍은 말하지 말고, 버릇으로 새게 해!')
on conflict (skill_key) do update set
  track = excluded.track,
  order_no = excluded.order_no,
  title = excluded.title,
  summary = excluded.summary,
  is_free = excluded.is_free,
  self_checks = excluded.self_checks,
  intro = excluded.intro,
  coach_intro = excluded.coach_intro,
  coach_line = excluded.coach_line;

insert into stages
  (track, order_no, title, skill_key, summary, is_free, self_checks, intro, coach_intro, coach_line)
values ('structure', 12, '입체 캐릭터', 'contrast_char',
        '겉과 속을 한 장면에 담는다', false, array['겉과 속이 각각 행동 하나씩으로 보여? 속을 말로 설명해 버리진 않았어?', '두 사람이 나오면 — 반응을 서로 바꿔 놓아도 어색하지 않은지 봐. 안 어색하면 아직 대비가 아니야.']::text[], '',
        '사람은 한 겹이 아니야. 겉으로 웃는 사람이 속으로 딴생각을 하고, 차가운 사람이 제일 따뜻한 일을 해. 그 두 겹이 한 장면에 같이 보일 때 독자는 ''이 사람 진짜다'' 하고 믿어. 겉 행동 하나, 속이 새는 행동 하나 — 둘 다 보여줘.', '겉 하나, 새는 속 하나!')
on conflict (skill_key) do update set
  track = excluded.track,
  order_no = excluded.order_no,
  title = excluded.title,
  summary = excluded.summary,
  is_free = excluded.is_free,
  self_checks = excluded.self_checks,
  intro = excluded.intro,
  coach_intro = excluded.coach_intro,
  coach_line = excluded.coach_line;

insert into stages
  (track, order_no, title, skill_key, summary, is_free, self_checks, intro, coach_intro, coach_line)
values ('structure', 13, '호감 확보', 'likability',
        '초반에 응원할 이유를 만든다', false, array[]::text[], '',
        '', '')
on conflict (skill_key) do update set
  track = excluded.track,
  order_no = excluded.order_no,
  title = excluded.title,
  summary = excluded.summary,
  is_free = excluded.is_free,
  self_checks = excluded.self_checks,
  intro = excluded.intro,
  coach_intro = excluded.coach_intro,
  coach_line = excluded.coach_line;

insert into stages
  (track, order_no, title, skill_key, summary, is_free, self_checks, intro, coach_intro, coach_line)
values ('structure', 14, '궤도 이탈 찾기', 'off_track',
        '장면 목적에 기여하지 않는 문장을 본다', true, array[]::text[], '',
        '', '')
on conflict (skill_key) do update set
  track = excluded.track,
  order_no = excluded.order_no,
  title = excluded.title,
  summary = excluded.summary,
  is_free = excluded.is_free,
  self_checks = excluded.self_checks,
  intro = excluded.intro,
  coach_intro = excluded.coach_intro,
  coach_line = excluded.coach_line;

insert into stages
  (track, order_no, title, skill_key, summary, is_free, self_checks, intro, coach_intro, coach_line)
values ('structure', 15, '정보 비대칭', 'info_gap',
        '답답함을 기대감으로 바꾼다', false, array[]::text[], '',
        '', '')
on conflict (skill_key) do update set
  track = excluded.track,
  order_no = excluded.order_no,
  title = excluded.title,
  summary = excluded.summary,
  is_free = excluded.is_free,
  self_checks = excluded.self_checks,
  intro = excluded.intro,
  coach_intro = excluded.coach_intro,
  coach_line = excluded.coach_line;

insert into stages
  (track, order_no, title, skill_key, summary, is_free, self_checks, intro, coach_intro, coach_line)
values ('structure', 16, '절단신공 심화', 'cliffhanger_adv',
        '끊기 전에 신호를 깐다', false, array[]::text[], '',
        '', '')
on conflict (skill_key) do update set
  track = excluded.track,
  order_no = excluded.order_no,
  title = excluded.title,
  summary = excluded.summary,
  is_free = excluded.is_free,
  self_checks = excluded.self_checks,
  intro = excluded.intro,
  coach_intro = excluded.coach_intro,
  coach_line = excluded.coach_line;

insert into stages
  (track, order_no, title, skill_key, summary, is_free, self_checks, intro, coach_intro, coach_line)
values ('structure', 17, '역순 설계', 'reverse_design',
        '목표에서 거꾸로 조건을 세운다', true, array[]::text[], '',
        '', '')
on conflict (skill_key) do update set
  track = excluded.track,
  order_no = excluded.order_no,
  title = excluded.title,
  summary = excluded.summary,
  is_free = excluded.is_free,
  self_checks = excluded.self_checks,
  intro = excluded.intro,
  coach_intro = excluded.coach_intro,
  coach_line = excluded.coach_line;

insert into stages
  (track, order_no, title, skill_key, summary, is_free, self_checks, intro, coach_intro, coach_line)
values ('structure', 18, '1화 훅', 'first_hook',
        '다섯 줄 안에 세 요소를 넣는다', false, array[]::text[], '',
        '', '')
on conflict (skill_key) do update set
  track = excluded.track,
  order_no = excluded.order_no,
  title = excluded.title,
  summary = excluded.summary,
  is_free = excluded.is_free,
  self_checks = excluded.self_checks,
  intro = excluded.intro,
  coach_intro = excluded.coach_intro,
  coach_line = excluded.coach_line;

insert into stages
  (track, order_no, title, skill_key, summary, is_free, self_checks, intro, coach_intro, coach_line)
values ('structure', 19, '장르의 조어법', 'genre_coinage',
        '장르마다 이름을 만드는 규칙이 있다', true, array[]::text[], '',
        '', '')
on conflict (skill_key) do update set
  track = excluded.track,
  order_no = excluded.order_no,
  title = excluded.title,
  summary = excluded.summary,
  is_free = excluded.is_free,
  self_checks = excluded.self_checks,
  intro = excluded.intro,
  coach_intro = excluded.coach_intro,
  coach_line = excluded.coach_line;

insert into stages
  (track, order_no, title, skill_key, summary, is_free, self_checks, intro, coach_intro, coach_line)
values ('structure', 20, '분량 역산', 'branch_estimate',
        '분기점 수로 전체 분량을 가늠한다', true, array[]::text[], '',
        '', '')
on conflict (skill_key) do update set
  track = excluded.track,
  order_no = excluded.order_no,
  title = excluded.title,
  summary = excluded.summary,
  is_free = excluded.is_free,
  self_checks = excluded.self_checks,
  intro = excluded.intro,
  coach_intro = excluded.coach_intro,
  coach_line = excluded.coach_line;

insert into stages
  (track, order_no, title, skill_key, summary, is_free, self_checks, intro, coach_intro, coach_line)
values ('start', 1, '첫 문장 고르기', 'start_choose',
        '어떤 첫 문장이 통하는지 안다', true, array[]::text[], '',
        '웹소설 독자는 첫 화면 다섯 줄만 보고 떠날지 정해. 그 다섯 줄에서 첫 문장이 할 일은 하나야 — 카메라를 주인공한테 붙이는 것. 세상 설명도, 분위기 잡기도 그다음이야. 첫 문장을 화려하게 쓰라는 게 아니야. 망치는 세 가지를 피하면 돼.', '다섯 줄의 승부. 카메라를 주인공에게!')
on conflict (skill_key) do update set
  track = excluded.track,
  order_no = excluded.order_no,
  title = excluded.title,
  summary = excluded.summary,
  is_free = excluded.is_free,
  self_checks = excluded.self_checks,
  intro = excluded.intro,
  coach_intro = excluded.coach_intro,
  coach_line = excluded.coach_line;

insert into stages
  (track, order_no, title, skill_key, summary, is_free, self_checks, intro, coach_intro, coach_line)
values ('start', 2, '첫 문장 쓰기', 'start_write',
        '주인공의 감각에서 시작한다', true, array['첫 문장만 읽고 머릿속에 장면이 그려져? 카메라가 주인공한테 붙어 있어?']::text[], '',
        '1단계에서 첫 문장을 골랐지? 이번엔 직접 써 보자! ''스산한 기운이 감돌았다''라고 쓰면 독자 머릿속엔 아무 그림도 안 떠. 주인공이 보고 만지는 것 하나를 보여주면, 분위기는 저절로 따라와.', '분위기는 말하지 말고, 보여줘!')
on conflict (skill_key) do update set
  track = excluded.track,
  order_no = excluded.order_no,
  title = excluded.title,
  summary = excluded.summary,
  is_free = excluded.is_free,
  self_checks = excluded.self_checks,
  intro = excluded.intro,
  coach_intro = excluded.coach_intro,
  coach_line = excluded.coach_line;

insert into stages
  (track, order_no, title, skill_key, summary, is_free, self_checks, intro, coach_intro, coach_line)
values ('start', 3, '도입 잇기', 'start_extend',
        '세 문장 안에 인물을 세운다', true, array['지문과 내 문장을 이어 읽으면 한 사람 이야기로 느껴져? 주인공이 나와서 뭐라도 하고 있어?']::text[], '',
        '세상 설명으로 시작했으면 빨리 착지해야 해. 독자가 기다려 주는 건 딱 세 문장. 설명이 끝나기 전에 주인공을 무대에 올려서 뭐라도 하게 만들어. 카메라는 하늘이 아니라 사람한테 붙이는 거야.', '세 문장 안에, 주인공 등장!')
on conflict (skill_key) do update set
  track = excluded.track,
  order_no = excluded.order_no,
  title = excluded.title,
  summary = excluded.summary,
  is_free = excluded.is_free,
  self_checks = excluded.self_checks,
  intro = excluded.intro,
  coach_intro = excluded.coach_intro,
  coach_line = excluded.coach_line;

insert into stages
  (track, order_no, title, skill_key, summary, is_free, self_checks, intro, coach_intro, coach_line)
values ('start', 4, '1화 축약', 'start_episode',
        '1화의 요소를 손에 쥔다', true, array[]::text[], '',
        '', '')
on conflict (skill_key) do update set
  track = excluded.track,
  order_no = excluded.order_no,
  title = excluded.title,
  summary = excluded.summary,
  is_free = excluded.is_free,
  self_checks = excluded.self_checks,
  intro = excluded.intro,
  coach_intro = excluded.coach_intro,
  coach_line = excluded.coach_line;

-- ── 문항 ────────────────────────────────────────────────────────────

-- cc-report-credit (order_no 1, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'contrast_char'),
  'convert', 'auto', '김하준과 서담을 대비시키시오. 김하준은 제 공을 앞세우고 싶어 하는 대리, 서담은 제 공을 남에게 돌리는 대리다. 아래 장면에서 두 사람은 똑같이 움직인다. 다시 써서, 같은 일에 두 사람이 서로 다르게 반응하게 하시오.',
  '결과 발표가 끝났다. 두 대리는 나란히 자리로 돌아와 다음 업무를 열었다.', null, '{"maxChars":60,"minVerbs":2,"requireAll":["김하준","서담"]}'::jsonb,
  'original', 'modern', 'planned',
  1, 'cc-report-credit'
where not exists (select 1 from problems p where p.source_key = 'cc-report-credit');

-- lk-desk-nine (order_no 1, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'lack'),
  'convert', 'auto', '김하준에게 인정 욕구를 얹으시오. 김하준은 기획팀 3년 차 대리다. 아래는 아무 결핍도 없는 무난한 장면이다. 다시 써서, 인정받고 싶다는 말 없이 행동과 버릇만으로 그 마음이 드러나게 하시오.',
  '기획팀 3년 차 대리는 오늘도 아홉 시 정각에 자리에 앉았다. 컴퓨터를 켜고 메일함을 열었다.', null, '{"maxChars":60,"minVerbs":2,"forbidLabel":"인정 욕구를 직접 말하는 표현","forbidWords":["인정","칭찬","알아주"],"forbidDisplay":["인정","칭찬","알아주다"],"requireAny":["김하준","하준"],"forbidPassageCopy":true}'::jsonb,
  'original', 'modern', 'planned',
  1, 'lk-desk-nine'
where not exists (select 1 from problems p where p.source_key = 'lk-desk-nine');

-- rm-axe-pond (order_no 1, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'reduce_adverb'),
  'remove', 'auto', '꾸미는 말을 걷어내고 다시 쓰시오. 도끼가 물에 빠지는 순간만 남길 것. 여기서는 일부러 부사를 전부 막습니다. 실제 소설에서는 쓰셔도 됩니다 — 언제 쓰는지는 뒤에서 다룹니다.',
  '나무꾼은 힘껏 도끼를 휘둘렀다. 자루가 갑자기 빠졌고, 도끼는 빠르게 연못으로 떨어졌다.', null, '{"maxChars":36,"minVerbs":2,"maxRepeat":2,"maxAdverbs":1,"maxModifiers":1}'::jsonb,
  'folktale', 'fantasy', 'planned',
  1, 'rm-axe-pond'
where not exists (select 1 from problems p where p.source_key = 'rm-axe-pond');

-- rm-heungbu-swallow (order_no 1, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'reduce_adverb'),
  'remove', 'auto', '꾸미는 말을 걷어내고 다시 쓰시오. 뜻은 그대로 두되, 동작으로 대신할 것. 여기서는 일부러 부사를 전부 막습니다. 실제 소설에서는 쓰셔도 됩니다 — 언제 쓰는지는 뒤에서 다룹니다.',
  '흥부는 조심스럽게 제비의 다리를 감쌌다. 그는 간절하게 제비가 얼른 낫기를 바랐다.', null, '{"maxChars":34,"minVerbs":2,"maxRepeat":2,"maxAdverbs":1,"maxModifiers":2}'::jsonb,
  'folktale', 'fantasy', 'planned',
  1, 'rm-heungbu-swallow'
where not exists (select 1 from problems p where p.source_key = 'rm-heungbu-swallow');

-- rm-kongjwi-jar (order_no 1, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'reduce_adverb'),
  'remove', 'auto', '꾸미는 말을 걷어내고 다시 쓰시오. 깨진 독은 그대로 두고, 콩쥐가 무엇을 하는지만 보이게 할 것. 여기서는 일부러 부사를 전부 막습니다. 실제 소설에서는 쓰셔도 됩니다 — 언제 쓰는지는 뒤에서 다룹니다.',
  '콩쥐는 깨진 독에 열심히 물을 부었지만 물은 계속 빠르게 새어 나갔다. 그녀는 몹시 지친 얼굴로 천천히 주저앉았다.', null, '{"maxChars":39,"minVerbs":4,"maxRepeat":2,"maxAdverbs":1,"maxModifiers":2}'::jsonb,
  'folktale', 'modern', 'planned',
  1, 'rm-kongjwi-jar'
where not exists (select 1 from problems p where p.source_key = 'rm-kongjwi-jar');

-- rm-simcheong-deck (order_no 1, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'reduce_adverb'),
  'remove', 'auto', '꾸미는 말을 걷어내고 다시 쓰시오. 여기서는 일부러 부사를 전부 막습니다. 실제 소설에서는 쓰셔도 됩니다 — 언제 쓰는지는 뒤에서 다룹니다.',
  '심청은 천천히 뱃전으로 걸어갔다. 사람들은 안타깝게 그녀를 바라보았고, 뱃사공은 무겁게 고개를 돌렸다.', null, '{"maxChars":40,"minVerbs":2,"maxRepeat":2,"maxAdverbs":1,"maxModifiers":1}'::jsonb,
  'folktale', 'modern', 'planned',
  1, 'rm-simcheong-deck'
where not exists (select 1 from problems p where p.source_key = 'rm-simcheong-deck');

-- sc-broken-vow (order_no 1, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'start_choose'),
  'choice', 'auto', '주인공은 결혼식 한 달 전 파혼을 통보받은 하은수다. 1화의 첫 문장으로, 독자를 주인공에게 붙드는 것을 고르시오.',
  null, '["하은수는 청첩장 견본을 반으로 접어 쓰레기통에 밀어 넣었다.","결혼이란 예로부터 두 집안이 맺는 가장 큰 거래였다.","웨딩홀의 김 실장은 오늘도 예약 장부를 한 장씩 넘기고 있었다.","무겁게 가라앉은 공기 속, 어딘지 서글픈 기운이 도는 오후였다."]'::jsonb, '{}'::jsonb,
  'original', 'romance', 'planned',
  1, 'sc-broken-vow'
where not exists (select 1 from problems p where p.source_key = 'sc-broken-vow');

-- sc-hunter-status (order_no 1, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'start_choose'),
  'choice', 'auto', '주인공은 최약체에서 회귀한 헌터 강도윤이다. 1화의 첫 문장으로, 독자를 주인공에게 붙드는 것을 고르시오.',
  null, '["대격변 이후 삼십 년, 게이트는 인류의 일상이 되었다.","강도윤은 손바닥에 떠오른 붉은 상태창을 천천히 문질러 보았다.","협회장 박무진은 아침부터 회의실 문을 박차고 들어섰다.","어딘가 불길하고 낯선 기운이 감도는 아침이었다."]'::jsonb, '{}'::jsonb,
  'original', 'modern', 'planned',
  1, 'sc-hunter-status'
where not exists (select 1 from problems p where p.source_key = 'sc-hunter-status');

-- sc-sword-ruin (order_no 1, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'start_choose'),
  'choice', 'auto', '주인공은 하룻밤에 멸문한 가문의 소년 진운이다. 1화의 첫 문장으로, 독자를 주인공에게 붙드는 것을 고르시오.',
  null, '["강호에는 오래전부터 다섯 세가가 천하를 나누어 다스려 왔다.","객잔 주인은 새벽부터 국솥을 걸며 콧노래를 흥얼거렸다.","부러진 검 자루를 끌어안은 채, 진운은 잿더미 속에서 눈을 떴다.","불타 버린 장원에는 말로 다 못 할 스산한 기운이 감돌았다."]'::jsonb, '{}'::jsonb,
  'original', 'martial', 'planned',
  1, 'sc-sword-ruin'
where not exists (select 1 from problems p where p.source_key = 'sc-sword-ruin');

-- se-hunter-gate (order_no 1, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'start_extend'),
  'continue', 'auto', '강도윤이 나오게 이어 쓰시오. 주인공은 최약체에서 회귀한 헌터 강도윤이다. 아래 문장은 세상 설명만 하고 아직 아무도 보여주지 않는다. 이어지는 한두 문장을 써서, 강도윤이 나타나 움직이게 하시오.',
  '대격변 이후 삼십 년, 게이트는 인류의 일상이 되었다.', null, '{"maxChars":60,"minVerbs":1,"requireAny":["강도윤","도윤"]}'::jsonb,
  'original', 'modern', 'planned',
  1, 'se-hunter-gate'
where not exists (select 1 from problems p where p.source_key = 'se-hunter-gate');

-- sw-hunter-dawn (order_no 1, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'start_write'),
  'convert', 'auto', '강도윤의 1화 첫 문장을 쓰시오. 주인공은 최약체에서 회귀한 헌터 강도윤이다. 아래는 분위기만 말하고 아무것도 보여주지 못한 잘못된 첫 문장이다. 저렇게 쓰지 말고, 강도윤이 보고 듣고 만지는 것 하나에서 시작하는 첫 문장을 새로 쓰시오.',
  '어딘가 불길하고 낯선 기운이 감도는 아침이었다.', null, '{"maxChars":60,"minVerbs":1,"forbidLabel":"분위기를 직접 말하는 표현","forbidWords":["기운","느낌","분위기","불길","기류","아우라","기색","낌새","기미"],"forbidLemmas":["오라/NNG"],"forbidDisplay":["기운","느낌","분위기","불길하다","기류","오라","아우라","기색","낌새","기미"],"requireAny":["강도윤","도윤"]}'::jsonb,
  'original', 'modern', 'planned',
  1, 'sw-hunter-dawn'
where not exists (select 1 from problems p where p.source_key = 'sw-hunter-dawn');

-- rm-magpie-bridge (order_no 1, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'reduce_adverb'),
  'remove', 'auto', '꾸미는 말을 걷어내고 다시 쓰시오. 까치들이 다리를 만드는 장면만 남길 것. 여기서는 일부러 부사를 전부 막습니다. 실제 소설에서는 쓰셔도 됩니다 — 언제 쓰는지는 뒤에서 다룹니다.',
  '까치들은 부지런하게 날아와 아주 촘촘하게 몸을 이었다. 견우는 조심스럽게 그 위에 발을 얹었다.', null, '{"maxChars":34,"minVerbs":2,"maxRepeat":2,"maxAdverbs":1,"maxModifiers":1}'::jsonb,
  'folktale', 'romance', 'planned',
  2, 'rm-magpie-bridge'
where not exists (select 1 from problems p where p.source_key = 'rm-magpie-bridge');

-- rm-rabbit-court (order_no 1, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'reduce_adverb'),
  'remove', 'auto', '꾸미는 말을 걷어내고 다시 쓰시오. 여기서는 일부러 부사를 전부 막습니다. 실제 소설에서는 쓰셔도 됩니다 — 언제 쓰는지는 뒤에서 다룹니다.',
  '토끼는 태연하게 웃으며 말했다. 용왕은 다급하게 몸을 일으켰고, 신하들은 어리둥절한 표정으로 서로를 바라보았다.', null, '{"maxChars":40,"minVerbs":3,"maxRepeat":2,"maxAdverbs":1,"maxModifiers":1}'::jsonb,
  'folktale', 'martial', 'impulsive',
  2, 'rm-rabbit-court'
where not exists (select 1 from problems p where p.source_key = 'rm-rabbit-court');

-- rm-siblings-tree (order_no 1, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'reduce_adverb'),
  'remove', 'auto', '꾸미는 말을 걷어내고 다시 쓰시오. 여기서는 일부러 부사를 전부 막습니다. 실제 소설에서는 쓰셔도 됩니다 — 언제 쓰는지는 뒤에서 다룹니다.',
  '오누이는 급하게 나무 위로 올라갔다. 호랑이는 아래에서 계속 사납게 나무를 흔들었고, 아이들은 몹시 세게 가지를 붙잡았다.', null, '{"maxChars":44,"minVerbs":2,"maxRepeat":2,"maxAdverbs":1,"maxModifiers":1}'::jsonb,
  'folktale', 'fantasy', 'impulsive',
  2, 'rm-siblings-tree'
where not exists (select 1 from problems p where p.source_key = 'rm-siblings-tree');

-- sc-boss-mirror (order_no 1, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'start_choose'),
  'choice', 'auto', '주인공 이재하는 자신이 만든 게임 속 중간보스의 몸에서 깨어났다. 1화의 첫 문장으로, 독자를 주인공에게 붙드는 것을 고르시오.',
  null, '["가상현실 게임 아르카디아는 출시 십 년 만에 대륙 전체를 삼켰다.","이재하는 거울 속 뿔 두 개 달린 낯선 얼굴과 눈을 맞췄다.","성채 아래에서는 병사들이 아침 점호로 분주하게 오가고 있었다.","무언가 단단히 잘못되었다는 느낌이 서늘하게 온몸을 감쌌다."]'::jsonb, '{}'::jsonb,
  'original', 'fantasy', 'planned',
  2, 'sc-boss-mirror'
where not exists (select 1 from problems p where p.source_key = 'sc-boss-mirror');

-- sc-villainess-chains (order_no 1, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'start_choose'),
  'choice', 'auto', '주인공은 소설 속 처형당하는 악녀 카리엘의 몸에서 깨어났다. 1화의 첫 문장으로, 독자를 주인공에게 붙드는 것을 고르시오.',
  null, '["제국력 사백팔십일 년, 황실은 건국 이래 가장 깊은 혼란에 빠져 있었다.","재판장을 맡은 대신관은 판결문을 펴기 전 길게 헛기침을 했다.","처형장에는 무어라 형언할 수 없는 팽팽한 긴장감이 흐르고 있었다.","카리엘은 제 목에 감긴 차가운 쇠사슬을 두 손으로 더듬었다."]'::jsonb, '{}'::jsonb,
  'original', 'fantasy', 'planned',
  2, 'sc-villainess-chains'
where not exists (select 1 from problems p where p.source_key = 'sc-villainess-chains');

-- rm-goblin-club (order_no 1, difficulty 3)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'reduce_adverb'),
  'remove', 'auto', '꾸미는 말을 걷어내고 다시 쓰시오. 남는 문장은 두 개 이하로. 여기서는 일부러 부사를 전부 막습니다. 실제 소설에서는 쓰셔도 됩니다 — 언제 쓰는지는 뒤에서 다룹니다.',
  '나무꾼은 조심스럽게 방망이를 들었다. 그는 몹시 떨리는 손으로 천천히 그것을 내리쳤고, 곡식이 갑자기 쏟아져 나왔다.', null, '{"maxChars":42,"minVerbs":3,"maxRepeat":2,"maxAdverbs":1,"maxModifiers":2}'::jsonb,
  'folktale', 'fantasy', 'impulsive',
  3, 'rm-goblin-club'
where not exists (select 1 from problems p where p.source_key = 'rm-goblin-club');

-- cc-street-night (order_no 2, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'contrast_char'),
  'convert', 'auto', '윤소민과 하늘을 대비시키시오. 윤소민은 곁을 그리는 사람, 하늘은 혼자가 편한 사람이다. 아래 장면에서 두 사람은 똑같이 움직인다. 다시 써서, 같은 일에 두 사람이 서로 다르게 반응하게 하시오.',
  '모임이 끝나고 두 사람은 각자 집으로 향했다. 거리에는 저녁 불이 켜지고 있었다.', null, '{"maxChars":60,"minVerbs":2,"requireAll":["윤소민","하늘"]}'::jsonb,
  'original', 'romance', 'planned',
  1, 'cc-street-night'
where not exists (select 1 from problems p where p.source_key = 'cc-street-night');

-- heungbu-joy (order_no 2, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'emotion_action'),
  'convert', 'hybrid', '''흥부는 기뻤다''를 감정어 없이 쓰시오.',
  '박이 갈라지고 안에서 금은보화가 쏟아졌다. 흥부는 기뻤다.', null, '{"maxChars":60,"minVerbs":2,"maxAdverbs":1,"forbidWords":["기뻤","기쁘","기뻐","기쁨","행복","신났","신나","즐거","좋았"],"maxModifiers":2,"forbidLabel":"기쁨을 직접 말하는 표현","forbidDisplay":["기쁘다","기쁨","행복하다","신나다","좋다","즐거워하다"]}'::jsonb,
  'folktale', 'fantasy', 'planned',
  1, 'heungbu-joy'
where not exists (select 1 from problems p where p.source_key = 'heungbu-joy');

-- lk-cafe-wait (order_no 2, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'lack'),
  'convert', 'auto', '윤소민에게 애정 결핍을 얹으시오. 윤소민은 카페에서 친구를 기다리는 중이다. 아래는 아무 결핍도 없는 무난한 장면이다. 다시 써서, 외롭다는 말 없이 행동과 버릇만으로 그 마음이 드러나게 하시오.',
  '카페 창가 자리에서 친구를 기다렸다. 창밖으로 오후의 사람들이 지나갔다.', null, '{"maxChars":60,"minVerbs":2,"forbidLabel":"외로움을 직접 말하는 표현","forbidWords":["사랑","애정","외로","쓸쓸","관심"],"forbidDisplay":["사랑","애정","외롭다","쓸쓸하다","관심"],"requireAny":["윤소민","소민"],"forbidPassageCopy":true}'::jsonb,
  'original', 'romance', 'planned',
  1, 'lk-cafe-wait'
where not exists (select 1 from problems p where p.source_key = 'lk-cafe-wait');

-- se-sword-five (order_no 2, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'start_extend'),
  'continue', 'auto', '진운이 나오게 이어 쓰시오. 주인공은 하룻밤에 멸문한 가문의 소년 진운이다. 아래 문장은 세상 설명만 하고 아직 아무도 보여주지 않는다. 이어지는 한두 문장을 써서, 진운이 나타나 움직이게 하시오.',
  '강호에는 오래전부터 다섯 세가가 천하를 나누어 다스려 왔다.', null, '{"maxChars":60,"minVerbs":1,"requireAny":["진운"]}'::jsonb,
  'original', 'martial', 'planned',
  1, 'se-sword-five'
where not exists (select 1 from problems p where p.source_key = 'se-sword-five');

-- sim-cheong-fear (order_no 2, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'emotion_action'),
  'convert', 'hybrid', '''심청은 두려웠다''를 감정어 없이 쓰시오. 신체 동작만으로 두려움이 보이게 할 것.',
  '뱃사람들이 뱃전에 모여 그녀를 불렀다. 심청은 두려웠다.', null, '{"maxChars":60,"minVerbs":1,"maxAdverbs":1,"forbidWords":["두려","두렵","무서","겁먹","떨렸","공포","질렸"],"maxModifiers":2,"forbidLabel":"두려움을 직접 말하는 표현","forbidDisplay":["두렵다","무서워하다","겁먹다","떨다","공포"]}'::jsonb,
  'folktale', 'modern', 'planned',
  1, 'sim-cheong-fear'
where not exists (select 1 from problems p where p.source_key = 'sim-cheong-fear');

-- sw-ruin-ash (order_no 2, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'start_write'),
  'convert', 'auto', '진운의 1화 첫 문장을 쓰시오. 주인공은 하룻밤에 멸문한 가문의 소년 진운이다. 아래는 분위기만 말하고 아무것도 보여주지 못한 잘못된 첫 문장이다. 저렇게 쓰지 말고, 진운이 보고 듣고 만지는 것 하나에서 시작하는 첫 문장을 새로 쓰시오.',
  '불타 버린 장원에는 말로 다 못 할 스산한 기운이 감돌았다.', null, '{"maxChars":60,"minVerbs":1,"forbidLabel":"분위기를 직접 말하는 표현","forbidWords":["기운","느낌","분위기","스산","기류","아우라","기색","낌새","기미"],"forbidLemmas":["오라/NNG"],"forbidDisplay":["기운","느낌","분위기","스산하다","기류","오라","아우라","기색","낌새","기미"],"requireAny":["진운"]}'::jsonb,
  'original', 'martial', 'planned',
  1, 'sw-ruin-ash'
where not exists (select 1 from problems p where p.source_key = 'sw-ruin-ash');

-- dragon-king-anger (order_no 2, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'emotion_action'),
  'convert', 'hybrid', '''용왕은 화가 났다''를 감정어 없이 쓰시오.',
  '토끼가 간을 두고 왔다고 말했다. 용왕은 화가 났다.', null, '{"maxChars":60,"minVerbs":2,"maxAdverbs":1,"forbidWords":["화났","화가 났","화가 나서","화가 치밀","분노","노여","성났","격분","짜증","치밀어","치밀었"],"maxModifiers":2,"forbidLabel":"분노를 직접 말하는 표현","forbidDisplay":["화나다","분노","짜증","치밀다","성나다","격분","노여워하다"]}'::jsonb,
  'folktale', 'martial', 'planned',
  2, 'dragon-king-anger'
where not exists (select 1 from problems p where p.source_key = 'dragon-king-anger');

-- kongjwi-grief (order_no 2, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'emotion_action'),
  'convert', 'hybrid', '''콩쥐는 서러웠다''를 감정어 없이 쓰시오. 울음을 직접 쓰지 말 것.',
  '식구들은 잔치에 가고 마당에는 깨진 독만 남았다. 콩쥐는 서러웠다.', null, '{"maxChars":70,"minVerbs":2,"maxAdverbs":1,"forbidWords":["서러","서럽","슬프","슬펐","슬픔","눈물","흐느","비참","원망"],"maxModifiers":2,"forbidLabel":"서러움을 직접 말하는 표현","forbidDisplay":["서럽다","슬프다","눈물","흐느끼다","비참하다","원망"]}'::jsonb,
  'folktale', 'modern', 'planned',
  2, 'kongjwi-grief'
where not exists (select 1 from problems p where p.source_key = 'kongjwi-grief');

-- gyeonu-longing (order_no 2, difficulty 3)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'emotion_action'),
  'convert', 'hybrid', '''견우는 그리웠다''를 감정어 없이 쓰시오. 직녀를 등장시키지 말 것.',
  '일 년에 한 번 다리가 놓이는 날이 아직 멀었다. 견우는 그리웠다.', null, '{"maxChars":70,"minVerbs":2,"maxAdverbs":1,"forbidWords":["그리웠","그리워","그리움","그립","보고 싶","외로","쓸쓸","사무치","애틋"],"maxModifiers":2,"forbidLabel":"그리움을 직접 말하는 표현","forbidDisplay":["그립다","그리움","보고 싶다","쓸쓸하다","사무치다","애틋하다"]}'::jsonb,
  'folktale', 'romance', 'planned',
  3, 'gyeonu-longing'
where not exists (select 1 from problems p where p.source_key = 'gyeonu-longing');

-- woodcutter-shame (order_no 2, difficulty 3)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'emotion_action'),
  'convert', 'hybrid', '''나무꾼은 부끄러웠다''를 감정어 없이 쓰시오.',
  '산신령이 금도끼와 은도끼를 나란히 들어 보였다. 나무꾼은 부끄러웠다.', null, '{"maxChars":65,"minVerbs":2,"maxAdverbs":1,"forbidWords":["부끄","창피","민망","수치스","낯뜨거","뻘개"],"maxModifiers":2,"forbidLabel":"부끄러움을 직접 말하는 표현","forbidDisplay":["부끄럽다","창피하다","민망하다","수치스럽다"]}'::jsonb,
  'folktale', 'fantasy', 'planned',
  3, 'woodcutter-shame'
where not exists (select 1 from problems p where p.source_key = 'woodcutter-shame');

-- cc-first-pay (order_no 3, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'contrast_char'),
  'continue', 'auto', '조평과 유겸을 대비시키시오. 조평은 배곯던 시절이 몸에 남아 제 것엔 인색해도 남의 끼니엔 아깝지 않은 호위다. 유겸은 신세를 지면 도련님 취급이 진짜가 될까 밥값부터 제가 내는 신참이다. 원문을 읽고 다음에 올 장면을, 같은 삯 앞에서 두 사람이 서로 다르게 움직이게 작성하시오.',
  '상단이 첫 삯을 나눠 주었다. 두 호위는 주머니를 받아 들고 숙소로 돌아갔다.', null, '{"maxChars":100,"minVerbs":3,"requireAll":["조평","유겸"],"forbidPassageCopy":true}'::jsonb,
  'original', 'martial', 'planned',
  1, 'cc-first-pay'
where not exists (select 1 from problems p where p.source_key = 'cc-first-pay');

-- lk-guard-dawn (order_no 3, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'lack'),
  'convert', 'auto', '조평에게 가난의 기억을 얹으시오. 조평은 상단의 호위 무사다. 아래는 아무 결핍도 없는 무난한 장면이다. 다시 써서, 가난했다는 말 없이 행동과 버릇만으로 그 기억이 드러나게 하시오.',
  '상단의 호위 무사는 새벽같이 일어나 검을 손질했다. 마당을 한 바퀴 돌고 아침상을 받았다.', null, '{"maxChars":60,"minVerbs":2,"forbidLabel":"가난을 직접 말하는 표현","forbidWords":["가난","굶","궁핍"],"forbidDisplay":["가난","굶다","궁핍"],"requireAny":["조평"],"forbidPassageCopy":true}'::jsonb,
  'original', 'martial', 'planned',
  1, 'lk-guard-dawn'
where not exists (select 1 from problems p where p.source_key = 'lk-guard-dawn');

-- se-vow-deal (order_no 3, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'start_extend'),
  'continue', 'auto', '하은수가 나오게 이어 쓰시오. 주인공은 결혼식 한 달 전 파혼을 통보받은 하은수다. 아래 문장은 세상 설명만 하고 아직 아무도 보여주지 않는다. 이어지는 한두 문장을 써서, 하은수가 나타나 움직이게 하시오.',
  '결혼이란 예로부터 두 집안이 맺는 가장 큰 거래였다.', null, '{"maxChars":60,"minVerbs":1,"requireAny":["하은수","은수"]}'::jsonb,
  'original', 'romance', 'planned',
  1, 'se-vow-deal'
where not exists (select 1 from problems p where p.source_key = 'se-vow-deal');

-- sw-vow-afternoon (order_no 3, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'start_write'),
  'convert', 'auto', '하은수의 1화 첫 문장을 쓰시오. 주인공은 결혼식 한 달 전 파혼을 통보받은 하은수다. 아래는 분위기만 말하고 아무것도 보여주지 못한 잘못된 첫 문장이다. 저렇게 쓰지 말고, 하은수가 보고 듣고 만지는 것 하나에서 시작하는 첫 문장을 새로 쓰시오.',
  '무겁게 가라앉은 공기 속, 어딘지 서글픈 기운이 도는 오후였다.', null, '{"maxChars":60,"minVerbs":1,"forbidLabel":"분위기를 직접 말하는 표현","forbidWords":["기운","느낌","분위기","서글","기류","아우라","기색","낌새","기미"],"forbidLemmas":["오라/NNG"],"forbidDisplay":["기운","느낌","분위기","서글프다","기류","오라","아우라","기색","낌새","기미"],"requireAny":["하은수","은수"]}'::jsonb,
  'original', 'romance', 'planned',
  1, 'sw-vow-afternoon'
where not exists (select 1 from problems p where p.source_key = 'sw-vow-afternoon');

-- tp-axe-water (order_no 3, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'trim_padding'),
  'remove', 'auto', '이야기가 멈추는 문장을 지우고 다시 쓰시오. 남길 것: 인물이 무엇을 하는 문장(사건). 지울 것: 장소나 사물을 설명하는 문장, 몰라도 되는 정보. 새로 쓰지 말고, 원문에서 문장째 지우기만 하십시오. 나무꾼이 손을 넣는 동작까지 남길 것.',
  '나무꾼은 연못가에 앉았다. 연못은 산 아래의 깊은 물이었다. 그날은 바람 한 점 없이 잔잔했다. 도끼는 물속에 보이지 않았다. 그는 소매를 걷고 물에 손을 넣었다.', null, '{"maxChars":42,"minVerbs":3,"maxRepeat":2}'::jsonb,
  'folktale', 'fantasy', 'planned',
  1, 'tp-axe-water'
where not exists (select 1 from problems p where p.source_key = 'tp-axe-water');

-- tp-heungbu-yard (order_no 3, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'trim_padding'),
  'remove', 'auto', '이야기가 멈추는 문장을 지우고 다시 쓰시오. 남길 것: 인물이 무엇을 하는 문장(사건). 지울 것: 장소나 사물을 설명하는 문장, 몰라도 되는 정보. 새로 쓰지 말고, 원문에서 문장째 지우기만 하십시오. 인물이 하는 동작은 하나도 빼지 말 것.',
  '흥부는 마당에 나갔다. 마당은 좁고 흙바닥이라 늘 먼지투성이였다. 제비 한 마리가 떨어져 있었다. 제비는 봄의 새다. 흥부는 제비를 두 손으로 들어 올렸다.', null, '{"maxChars":41,"minVerbs":3,"maxRepeat":2}'::jsonb,
  'folktale', 'fantasy', 'planned',
  1, 'tp-heungbu-yard'
where not exists (select 1 from problems p where p.source_key = 'tp-heungbu-yard');

-- tp-simcheong-rail (order_no 3, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'trim_padding'),
  'remove', 'auto', '이야기가 멈추는 문장을 지우고 다시 쓰시오. 남길 것: 인물이 무엇을 하는 문장(사건). 지울 것: 장소나 사물을 설명하는 문장, 몰라도 되는 정보. 새로 쓰지 말고, 원문에서 문장째 지우기만 하십시오.',
  '심청은 뱃전에 섰다. 그 배는 마을에서 가장 큰 배였다. 공양미 삼백 석이 이 배에 실려 있었다. 바다는 넓고 깊었다. 심청은 치마를 걷어쥐었다.', null, '{"maxChars":39,"minVerbs":3,"maxRepeat":2}'::jsonb,
  'folktale', 'modern', 'planned',
  1, 'tp-simcheong-rail'
where not exists (select 1 from problems p where p.source_key = 'tp-simcheong-rail');

-- tp-gyeonu-river (order_no 3, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'trim_padding'),
  'remove', 'auto', '이야기가 멈추는 문장을 지우고 다시 쓰시오. 남길 것: 인물이 무엇을 하는 문장(사건). 지울 것: 장소나 사물을 설명하는 문장, 몰라도 되는 정보. 새로 쓰지 말고, 원문에서 문장째 지우기만 하십시오.',
  '견우는 강가에 나왔다. 강은 일 년 내내 소리 없이 그대로였다. 까치들이 하늘을 덮었다. 까치는 검고 흰, 아주 흔한 새다. 견우는 강물에 발을 담갔다.', null, '{"maxChars":35,"minVerbs":2,"maxRepeat":2}'::jsonb,
  'folktale', 'romance', 'planned',
  2, 'tp-gyeonu-river'
where not exists (select 1 from problems p where p.source_key = 'tp-gyeonu-river');

-- tp-kongjwi-crack (order_no 3, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'trim_padding'),
  'remove', 'auto', '이야기가 멈추는 문장을 지우고 다시 쓰시오. 남길 것: 인물이 무엇을 하는 문장(사건). 지울 것: 장소나 사물을 설명하는 문장, 몰라도 되는 정보. 새로 쓰지 말고, 원문에서 문장째 지우기만 하십시오. 독의 상태와 콩쥐의 동작만 남길 것.',
  '콩쥐는 독 앞에 앉았다. 독은 마당 한가운데의 커다란 물건이었다. 바닥에 금이 가 있었다. 금은 손가락 하나 굵기였다. 콩쥐는 손바닥으로 그 자리를 눌렀다.', null, '{"maxChars":38,"minVerbs":2,"maxRepeat":2}'::jsonb,
  'folktale', 'modern', 'planned',
  2, 'tp-kongjwi-crack'
where not exists (select 1 from problems p where p.source_key = 'tp-kongjwi-crack');

-- tp-rabbit-gate (order_no 3, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'trim_padding'),
  'remove', 'auto', '이야기가 멈추는 문장을 지우고 다시 쓰시오. 남길 것: 인물이 무엇을 하는 문장(사건). 지울 것: 장소나 사물을 설명하는 문장, 몰라도 되는 정보. 새로 쓰지 말고, 원문에서 문장째 지우기만 하십시오.',
  '토끼는 용궁 문 앞에 섰다. 용궁은 바다 밑의 깊은 곳이었다. 문지기가 창을 내렸다. 문지기의 창은 길고 무거웠다. 토끼는 웃으며 한 걸음 나섰다.', null, '{"maxChars":36,"minVerbs":3,"maxRepeat":2}'::jsonb,
  'folktale', 'martial', 'impulsive',
  2, 'tp-rabbit-gate'
where not exists (select 1 from problems p where p.source_key = 'tp-rabbit-gate');

-- tp-siblings-floor (order_no 3, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'trim_padding'),
  'remove', 'auto', '이야기가 멈추는 문장을 지우고 다시 쓰시오. 남길 것: 인물이 무엇을 하는 문장(사건). 지울 것: 장소나 사물을 설명하는 문장, 몰라도 되는 정보. 새로 쓰지 말고, 원문에서 문장째 지우기만 하십시오.',
  '오누이는 마루 밑에 숨었다. 그 집은 마을에서 가장 낡은 초가집이었다. 문밖에서 발소리가 났다. 문밖은 달도 없이 어두웠다. 오라비가 동생의 입을 막았다.', null, '{"maxChars":38,"minVerbs":2,"maxRepeat":2}'::jsonb,
  'folktale', 'fantasy', 'impulsive',
  2, 'tp-siblings-floor'
where not exists (select 1 from problems p where p.source_key = 'tp-siblings-floor');

-- tp-goblin-mark (order_no 3, difficulty 3)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'trim_padding'),
  'remove', 'auto', '이야기가 멈추는 문장을 지우고 다시 쓰시오. 남길 것: 인물이 무엇을 하는 문장(사건). 지울 것: 장소나 사물을 설명하는 문장, 몰라도 되는 정보. 새로 쓰지 말고, 원문에서 문장째 지우기만 하십시오. 남는 문장은 세 개 이하로.',
  '나무꾼은 방망이를 상 위에 올렸다. 상은 다리 하나가 짧은 낡은 것이었다. 집 안은 조용했다. 방망이에 검은 자국이 남아 있었다. 그는 그것을 다시 집어 들었다.', null, '{"maxChars":45,"minVerbs":3,"maxRepeat":2}'::jsonb,
  'folktale', 'fantasy', 'impulsive',
  3, 'tp-goblin-mark'
where not exists (select 1 from problems p where p.source_key = 'tp-goblin-mark');

-- cc-raid-reward (order_no 4, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'contrast_char'),
  'convert', 'auto', '한시우와 도현을 대비시키시오. 한시우는 동기를 곁눈질하는 B급 헌터, 도현은 앞만 보는 S급 헌터다. 아래 장면에서 두 사람은 똑같이 움직인다. 다시 써서, 같은 일에 두 사람이 서로 다르게 반응하게 하시오.',
  '공략이 끝나고 보상이 분배되었다. 두 헌터는 장비를 정리해 게이트를 나섰다.', null, '{"maxChars":60,"minVerbs":2,"requireAll":["한시우","도현"]}'::jsonb,
  'original', 'modern', 'planned',
  1, 'cc-raid-reward'
where not exists (select 1 from problems p where p.source_key = 'cc-raid-reward');

-- lk-board-rank (order_no 4, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'lack'),
  'convert', 'auto', '한시우에게 열등감을 얹으시오. 한시우는 B급 헌터다. 아래는 아무 결핍도 없는 무난한 장면이다. 다시 써서, 부럽다는 말 없이 행동과 버릇만으로 그 마음이 드러나게 하시오.',
  'B급 헌터는 아침 훈련을 마치고 협회 게시판 앞을 지나쳤다. 오늘의 의뢰 목록이 붙어 있었다.', null, '{"maxChars":60,"minVerbs":2,"forbidLabel":"열등감을 직접 말하는 표현","forbidWords":["열등","부럽","부러워","질투","뒤처"],"forbidDisplay":["열등감","부럽다","질투","뒤처지다"],"requireAny":["한시우","시우"],"forbidPassageCopy":true}'::jsonb,
  'original', 'modern', 'planned',
  1, 'lk-board-rank'
where not exists (select 1 from problems p where p.source_key = 'lk-board-rank');

-- rp-axe-gold (order_no 4, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'reduce_repeat'),
  'remove', 'auto', '같은 말이 겹치는 곳을 찾아 다시 쓰시오.',
  '산신령이 번쩍이는 금도끼를 들어 보였다. "이 도끼가 네 도끼냐?" 나무꾼은 고개를 저었다. "그 도끼는 제 도끼가 아닙니다." 산신령은 이번에는 은도끼를 들어 보였다. 나무꾼은 이번에도 고개를 저었다.', null, '{"maxChars":88,"minVerbs":3,"maxRepeat":2,"repeatTargets":[{"word":"도끼","max":2},{"word":"나무꾼","max":2},{"word":"산신령","max":1}]}'::jsonb,
  'folktale', 'fantasy', 'planned',
  1, 'rp-axe-gold'
where not exists (select 1 from problems p where p.source_key = 'rp-axe-gold');

-- rp-heungbu-gourd (order_no 4, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'reduce_repeat'),
  'remove', 'auto', '같은 말이 겹치는 곳을 찾아 다시 쓰시오. 일어나는 일은 하나도 빼지 말 것.',
  '흥부는 박을 반으로 갈랐다. 박 속에서 쌀이 쏟아졌다. "여보, 박에서 쌀이 나와요!" 흥부는 두 번째 박도 갈랐다. 그 박에서는 비단이 쏟아져 나왔다.', null, '{"maxChars":64,"minVerbs":3,"maxRepeat":2,"repeatTargets":[{"word":"박","max":2},{"word":"흥부","max":1}]}'::jsonb,
  'folktale', 'fantasy', 'planned',
  1, 'rp-heungbu-gourd'
where not exists (select 1 from problems p where p.source_key = 'rp-heungbu-gourd');

-- rp-simcheong-sea (order_no 4, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'reduce_repeat'),
  'remove', 'auto', '같은 말이 겹치는 곳을 찾아 다시 쓰시오.',
  '심청은 뱃전에서 바다를 내려다보았다. 바다는 검은 물결로 일렁였다. 뱃사람들이 바다를 향해 북을 울렸다. 심청은 바다 앞에서 눈을 감았다. "아버지, 부디 눈을 뜨세요." 심청은 바다로 몸을 던졌다.', null, '{"maxChars":86,"minVerbs":3,"maxRepeat":2,"repeatTargets":[{"word":"바다","max":2},{"word":"심청","max":2}]}'::jsonb,
  'folktale', 'modern', 'planned',
  1, 'rp-simcheong-sea'
where not exists (select 1 from problems p where p.source_key = 'rp-simcheong-sea');

-- se-rose-heir (order_no 4, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'start_extend'),
  'continue', 'auto', '에스텔이 나오게 이어 쓰시오. 주인공은 몰락한 은빛 장미 가문의 마지막 후계 에스텔이다. 아래 문장은 세상 설명만 하고 아직 아무도 보여주지 않는다. 이어지는 한두 문장을 써서, 에스텔이 나타나 움직이게 하시오.',
  '왕국력 삼백 년, 은빛 장미 가문은 대대로 황실의 검을 맡아 왔다.', null, '{"maxChars":60,"minVerbs":1,"requireAny":["에스텔"]}'::jsonb,
  'original', 'fantasy', 'planned',
  1, 'se-rose-heir'
where not exists (select 1 from problems p where p.source_key = 'se-rose-heir');

-- sw-scaffold-morning (order_no 4, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'start_write'),
  'convert', 'auto', '카리엘의 1화 첫 문장을 쓰시오. 주인공은 소설 속 처형당하는 악녀 카리엘의 몸에서 깨어났다. 아래는 분위기만 말하고 아무것도 보여주지 못한 잘못된 첫 문장이다. 저렇게 쓰지 말고, 카리엘이 보고 듣고 만지는 것 하나에서 시작하는 첫 문장을 새로 쓰시오.',
  '처형장에는 무어라 형언할 수 없는 팽팽한 긴장감이 흐르고 있었다.', null, '{"maxChars":60,"minVerbs":1,"forbidLabel":"분위기를 직접 말하는 표현","forbidWords":["기운","느낌","분위기","긴장","형언","기류","아우라","기색","낌새","기미"],"forbidLemmas":["오라/NNG"],"forbidDisplay":["기운","느낌","분위기","긴장감","형언하다","기류","오라","아우라","기색","낌새","기미"],"requireAny":["카리엘"]}'::jsonb,
  'original', 'fantasy', 'planned',
  1, 'sw-scaffold-morning'
where not exists (select 1 from problems p where p.source_key = 'sw-scaffold-morning');

-- rp-kongjwi-jar (order_no 4, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'reduce_repeat'),
  'remove', 'auto', '같은 말이 겹치는 곳을 찾아 다시 쓰시오.',
  '콩쥐는 우물에서 물을 길어 왔다. 콩쥐가 물을 부으면 물은 독 밑으로 새어 나갔다. 물을 채워도 채워도 독은 차지 않았다. 콩쥐는 항아리를 안은 채 주저앉아 울었다.', null, '{"maxChars":68,"minVerbs":3,"maxRepeat":2,"repeatTargets":[{"word":"물","max":2},{"word":"콩쥐","max":2}]}'::jsonb,
  'folktale', 'modern', 'planned',
  2, 'rp-kongjwi-jar'
where not exists (select 1 from problems p where p.source_key = 'rp-kongjwi-jar');

-- rp-magpie-bridge (order_no 4, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'reduce_repeat'),
  'remove', 'auto', '같은 말이 겹치는 곳을 찾아 다시 쓰시오.',
  '까치들이 은하수 위로 다리를 놓았다. 다리는 강 건너까지 길게 이어졌다. 견우는 떨리는 발로 다리에 올랐다. 다리가 출렁일 때마다 까치들이 날개를 퍼덕였다. "직녀님!" 견우는 다리 위를 내달렸다.', null, '{"maxChars":85,"minVerbs":3,"maxRepeat":2,"repeatTargets":[{"word":"다리","max":2}]}'::jsonb,
  'folktale', 'romance', 'planned',
  2, 'rp-magpie-bridge'
where not exists (select 1 from problems p where p.source_key = 'rp-magpie-bridge');

-- rp-rabbit-liver (order_no 4, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'reduce_repeat'),
  'remove', 'auto', '같은 말이 겹치는 곳을 찾아 다시 쓰시오.',
  '용왕이 토끼의 간을 내놓으라고 명했다. 토끼는 침착하게 대답했다. "제 간은 워낙 귀한 간이라, 깊은 산속에 감추어 두고 왔습니다." 신하들이 웅성거렸다. 간도 없이 다니는 토끼가 어디 있느냐고 다그쳤지만, 토끼는 태연히 웃기만 했다.', null, '{"maxChars":101,"minVerbs":5,"maxRepeat":2,"repeatTargets":[{"word":"간","max":2},{"word":"토끼","max":2}]}'::jsonb,
  'folktale', 'martial', 'impulsive',
  2, 'rp-rabbit-liver'
where not exists (select 1 from problems p where p.source_key = 'rp-rabbit-liver');

-- rp-siblings-rope (order_no 4, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'reduce_repeat'),
  'remove', 'auto', '같은 말이 겹치는 곳을 찾아 다시 쓰시오. 동아줄이 튼튼하다는 것은 남길 것.',
  '오누이는 나무 꼭대기에서 두 손을 모아 빌었다. "하느님, 저희에게 튼튼한 동아줄을 내려 주세요." 하늘에서 동아줄이 스르르 내려왔다. 오누이는 동아줄을 꽉 잡았다. 동아줄은 오누이를 매단 채 하늘로 올라갔다.', null, '{"maxChars":91,"minVerbs":3,"maxRepeat":2,"repeatTargets":[{"word":"동아줄","max":2},{"word":"오누이","max":2}]}'::jsonb,
  'folktale', 'fantasy', 'impulsive',
  2, 'rp-siblings-rope'
where not exists (select 1 from problems p where p.source_key = 'rp-siblings-rope');

-- rp-goblin-club (order_no 4, difficulty 3)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'reduce_repeat'),
  'remove', 'auto', '같은 말이 겹치는 곳을 찾아 다시 쓰시오. 방망이가 멈추지 않는다는 것을 남길 것.',
  '도깨비들이 방망이를 휘두르며 외쳤다. "은 나와라, 뚝딱!" 방망이에서 은돈이 쏟아졌다. 도깨비들이 방망이를 다시 휘둘렀다. "금 나와라, 뚝딱!" 방망이는 멈추지 않고 보물을 쏟아 냈다.', null, '{"maxChars":83,"minVerbs":4,"maxRepeat":2,"repeatTargets":[{"word":"방망이","max":2},{"word":"도깨비","max":1}]}'::jsonb,
  'folktale', 'fantasy', 'impulsive',
  3, 'rp-goblin-club'
where not exists (select 1 from problems p where p.source_key = 'rp-goblin-club');

-- ae-gyeonu-bridge (order_no 5, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'adverb_exception'),
  'choice', 'auto', '뒤 문장의 부사가 앞 문장 덕분에 값을 얻는 것을 고르시오. 부사가 없거나, 부사가 앞에서 혼자 일하고 있으면 답이 아니다.',
  '까치 다리가 놓인 날이다.', '["까치들이 강 위로 몸을 이어 다리를 놓았다. 견우는 조심스럽게 첫 발을 얹었다.","까치들이 강 위로 몸을 이어 다리를 놓았다. 견우는 첫 발을 얹었다.","견우는 조심스럽게 강가에 나왔다. 까치들이 하늘을 덮었다.","강물이 아주 깊었다. 견우는 매우 두려웠다."]'::jsonb, '{}'::jsonb,
  'folktale', 'fantasy', 'planned',
  1, 'ae-gyeonu-bridge'
where not exists (select 1 from problems p where p.source_key = 'ae-gyeonu-bridge');

-- ae-rabbit-gate (order_no 5, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'adverb_exception'),
  'choice', 'auto', '뒤 문장의 부사가 앞 문장 덕분에 값을 얻는 것을 고르시오. 부사가 없거나, 부사가 앞에서 혼자 일하고 있으면 답이 아니다.',
  '토끼가 용궁 문 앞에 섰다.', '["문지기의 창끝이 토끼의 목 앞에서 멈췄다. 토끼는 천천히 한 걸음 나섰다.","문지기의 창끝이 토끼의 목 앞에서 멈췄다. 토끼는 한 걸음 나섰다.","토끼는 정말 용감하게 걸었다. 문지기가 창을 내렸다.","용궁 문이 열렸다. 토끼는 몹시 두려웠다."]'::jsonb, '{}'::jsonb,
  'folktale', 'fantasy', 'planned',
  1, 'ae-rabbit-gate'
where not exists (select 1 from problems p where p.source_key = 'ae-rabbit-gate');

-- cc-relic-box (order_no 5, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'contrast_char'),
  'convert', 'auto', '리안과 셀라를 대비시키시오. 리안은 스승의 유품을 못 놓는 견습, 셀라는 쓸모부터 따지는 견습이다. 아래 장면에서 두 사람은 똑같이 움직인다. 다시 써서, 같은 일에 두 사람이 서로 다르게 반응하게 하시오.',
  '서고 정리 중에 낡은 상자가 나왔다. 두 견습은 상자를 탁자로 옮겨 두었다.', null, '{"maxChars":60,"minVerbs":2,"requireAll":["리안","셀라"]}'::jsonb,
  'original', 'fantasy', 'planned',
  1, 'cc-relic-box'
where not exists (select 1 from problems p where p.source_key = 'cc-relic-box');

-- lk-tower-shelf (order_no 5, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'lack'),
  'convert', 'auto', '리안에게 그리움을 얹으시오. 리안은 스승을 잃은 마탑의 견습 마법사다. 아래는 아무 결핍도 없는 무난한 장면이다. 다시 써서, 그립다는 말 없이 행동과 버릇만으로 그 마음이 드러나게 하시오.',
  '마탑의 견습 마법사는 도서관에서 주문서를 정리했다. 서가 사이로 오후 햇살이 들었다.', null, '{"maxChars":60,"minVerbs":2,"forbidLabel":"그리움을 직접 말하는 표현","forbidWords":["그립","그리워"],"forbidDisplay":["그립다","그리워하다"],"requireAny":["리안"],"forbidPassageCopy":true}'::jsonb,
  'original', 'fantasy', 'planned',
  1, 'lk-tower-shelf'
where not exists (select 1 from problems p where p.source_key = 'lk-tower-shelf');

-- se-phoenix-mound (order_no 5, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'start_extend'),
  'continue', 'auto', '서준혁이 나오게 이어 쓰시오. 주인공은 방출 통보를 받은 서울 피닉스의 투수 서준혁이다. 아래 문장은 세상 설명만 하고 아직 아무도 보여주지 않는다. 이어지는 한두 문장을 써서, 서준혁이 나타나 움직이게 하시오.',
  '프로야구 최하위 구단 서울 피닉스는 창단 이후 우승이 없었다.', null, '{"maxChars":60,"minVerbs":1,"requireAny":["서준혁","준혁"]}'::jsonb,
  'original', 'modern', 'planned',
  1, 'se-phoenix-mound'
where not exists (select 1 from problems p where p.source_key = 'se-phoenix-mound');

-- sw-boss-wake (order_no 5, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'start_write'),
  'convert', 'auto', '이재하의 1화 첫 문장을 쓰시오. 주인공 이재하는 자신이 만든 게임 속 중간보스의 몸에서 깨어났다. 아래는 분위기만 말하고 아무것도 보여주지 못한 잘못된 첫 문장이다. 저렇게 쓰지 말고, 이재하가 보고 듣고 만지는 것 하나에서 시작하는 첫 문장을 새로 쓰시오.',
  '무언가 단단히 잘못되었다는 느낌이 서늘하게 온몸을 감쌌다.', null, '{"maxChars":60,"minVerbs":1,"forbidLabel":"분위기를 직접 말하는 표현","forbidWords":["기운","느낌","분위기","기류","아우라","기색","낌새","기미"],"forbidLemmas":["오라/NNG"],"forbidDisplay":["기운","느낌","분위기","기류","오라","아우라","기색","낌새","기미"],"requireAny":["이재하","재하"]}'::jsonb,
  'original', 'fantasy', 'planned',
  1, 'sw-boss-wake'
where not exists (select 1 from problems p where p.source_key = 'sw-boss-wake');

-- ae-axe-drop (order_no 5, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'adverb_exception'),
  'choice', 'auto', '부사가 동사에 얹혀 제 일을 하는 것을 고르시오. 부사가 없거나, 동사가 이미 품은 뜻을 되풀이하거나, 동사 대신 감정을 서술하고 있으면 답이 아니다.',
  null, '["나무꾼은 도끼를 물속으로 조심스럽게 내려놓았다.","나무꾼은 연못가로 황급히 내달렸다.","나무꾼은 몹시 안타깝게 연못을 바라보고 있었다.","나무꾼은 도끼를 물속으로 내려놓았다."]'::jsonb, '{}'::jsonb,
  'folktale', 'modern', 'planned',
  2, 'ae-axe-drop'
where not exists (select 1 from problems p where p.source_key = 'ae-axe-drop');

-- ae-kongjwi-jar (order_no 5, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'adverb_exception'),
  'choice', 'auto', '한 장면에 부사를 하나만 쓴다. 값이 가장 큰 자리에 놓은 것을 고르시오.',
  null, '["콩쥐는 독에 천천히 물을 부었다. 물이 바닥으로 새어 나갔다. 콩쥐는 물을 길어 왔다.","콩쥐는 독에 물을 부었다. 물이 바닥으로 빠르게 새어 나갔다. 콩쥐는 물을 길어 왔다.","콩쥐는 독에 물을 부었다. 물이 바닥으로 새어 나갔다. 콩쥐는 말없이 물을 길어 왔다.","콩쥐는 몹시 힘들게 독에 물을 부었다. 물이 바닥으로 새어 나갔다. 콩쥐는 물을 길어 왔다."]'::jsonb, '{}'::jsonb,
  'folktale', 'fantasy', 'planned',
  2, 'ae-kongjwi-jar'
where not exists (select 1 from problems p where p.source_key = 'ae-kongjwi-jar');

-- cc-praise-callout (order_no 6, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'contrast_char'),
  'continue', 'auto', '서담의 겉과 속을 한 장면에 담으시오. 서담은 칭찬을 받으면 손부터 내젓는 조용한 대리다. 하지만 싫어서가 아니다 — 그 칭찬을 누구보다 오래 마음에 담아 두는 사람이다. 원문을 읽고 다음에 올 장면을, 사양하는 겉과 좋아하는 속이 둘 다 행동으로 보이게 작성하시오.',
  '월례 회의에서 이달의 우수 사원이 발표되었다. 호명된 대리는 앞으로 나가 상을 받았다.', null, '{"maxChars":100,"minVerbs":3,"forbidLabel":"속마음을 직접 말하는 표현","forbidWords":["좋아","기쁘","기뻤","뿌듯"],"forbidDisplay":["좋아하다","기쁘다","뿌듯하다"],"forbidPassageCopy":true}'::jsonb,
  'original', 'modern', 'planned',
  1, 'cc-praise-callout'
where not exists (select 1 from problems p where p.source_key = 'cc-praise-callout');

-- sn-axe-pond (order_no 6, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'sensory'),
  'convert', 'auto', '연못 바닥에 손을 넣은 상태다. 눈에 기대는 말을 걷어내고 다른 감각으로 다시 쓰시오. 눈·빛·색·시선·시야·모습·얼굴·그림자·어둠·캄캄·깜깜·컴컴·흐릿·뚜렷·선명·투명·반짝·어른어른이 들어간 말은 전부 막습니다. 보다 계열(보이다·바라보다·살펴보다 등), 밝기와 색(밝다·어둡다·붉다·푸르다·하얗다·검다·노랗다·흐리다·훤하다), 빛의 움직임(빛나다·번쩍이다·반짝이다·어른거리다)도 막습니다.',
  '물빛이 탁해 아무것도 보이지 않았다. 나무꾼은 손끝을 살펴보았다.', null, '{"maxChars":70,"forbidWords":["눈","빛","색","시선","모습","그림자","어둠","캄캄","깜깜","컴컴","흐릿","뚜렷","얼굴","시야","선명","투명","반짝","어른어른"],"forbidLemmas":["보/VV","보이/VV","바라보/VV","쳐다보/VV","내려다보/VV","올려다보/VV","둘러보/VV","살펴보/VV","띄/VV","비치/VV","빛나/VV","번쩍이/VV","반짝이/VV","어른거리/VV","밝/VA","어둡/VA","붉/VA","푸르/VA","하얗/VA","희/VA","환하/VA","검/VA","노랗/VA","누렇/VA","하얘지/VV","흐리/VA","훤하/VA","훤/XR"],"forbidLabel":"눈에 기대는 표현","forbidDisplay":["눈","빛","색","시선","모습","그림자","어둠","보다","보이다","바라보다","쳐다보다","살펴보다","밝다","어둡다","붉다","푸르다","하얗다","검다","빛나다","번쩍이다","반짝이다"]}'::jsonb,
  'folktale', 'modern', 'planned',
  2, 'sn-axe-pond'
where not exists (select 1 from problems p where p.source_key = 'sn-axe-pond');

-- sn-heungbu-barn (order_no 6, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'sensory'),
  'convert', 'auto', '빛이 들지 않는 헛간 안이다. 눈에 기대는 말을 걷어내고 다른 감각으로 다시 쓰시오. 눈·빛·색·시선·시야·모습·얼굴·그림자·어둠·캄캄·깜깜·컴컴·흐릿·뚜렷·선명·투명·반짝·어른어른이 들어간 말은 전부 막습니다. 보다 계열(보이다·바라보다·살펴보다 등), 밝기와 색(밝다·어둡다·붉다·푸르다·하얗다·검다·노랗다·흐리다·훤하다), 빛의 움직임(빛나다·번쩍이다·반짝이다·어른거리다)도 막습니다.',
  '아무것도 보이지 않았다. 어둠 속에서 제비의 흰 배가 어렴풋이 눈에 띄었다.', null, '{"maxChars":70,"forbidWords":["눈","빛","색","시선","모습","그림자","어둠","캄캄","깜깜","컴컴","흐릿","뚜렷","얼굴","시야","선명","투명","반짝","어른어른"],"forbidLemmas":["보/VV","보이/VV","바라보/VV","쳐다보/VV","내려다보/VV","올려다보/VV","둘러보/VV","살펴보/VV","띄/VV","비치/VV","빛나/VV","번쩍이/VV","반짝이/VV","어른거리/VV","밝/VA","어둡/VA","붉/VA","푸르/VA","하얗/VA","희/VA","환하/VA","검/VA","노랗/VA","누렇/VA","하얘지/VV","흐리/VA","훤하/VA","훤/XR"],"forbidLabel":"눈에 기대는 표현","forbidDisplay":["눈","빛","색","시선","모습","그림자","어둠","보다","보이다","바라보다","쳐다보다","살펴보다","밝다","어둡다","붉다","푸르다","하얗다","검다","빛나다","번쩍이다","반짝이다"]}'::jsonb,
  'folktale', 'fantasy', 'planned',
  2, 'sn-heungbu-barn'
where not exists (select 1 from problems p where p.source_key = 'sn-heungbu-barn');

-- sn-kongjwi-night (order_no 6, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'sensory'),
  'convert', 'auto', '달도 없는 밤의 마당이다. 눈에 기대는 말을 걷어내고 다른 감각으로 다시 쓰시오. 눈·빛·색·시선·시야·모습·얼굴·그림자·어둠·캄캄·깜깜·컴컴·흐릿·뚜렷·선명·투명·반짝·어른어른이 들어간 말은 전부 막습니다. 보다 계열(보이다·바라보다·살펴보다 등), 밝기와 색(밝다·어둡다·붉다·푸르다·하얗다·검다·노랗다·흐리다·훤하다), 빛의 움직임(빛나다·번쩍이다·반짝이다·어른거리다)도 막습니다.',
  '깨진 독이 검게 보였다. 물이 흘러나온 자리가 어둡게 번들거렸다.', null, '{"maxChars":70,"forbidWords":["눈","빛","색","시선","모습","그림자","어둠","캄캄","깜깜","컴컴","흐릿","뚜렷","얼굴","시야","선명","투명","반짝","어른어른"],"forbidLemmas":["보/VV","보이/VV","바라보/VV","쳐다보/VV","내려다보/VV","올려다보/VV","둘러보/VV","살펴보/VV","띄/VV","비치/VV","빛나/VV","번쩍이/VV","반짝이/VV","어른거리/VV","밝/VA","어둡/VA","붉/VA","푸르/VA","하얗/VA","희/VA","환하/VA","검/VA","노랗/VA","누렇/VA","하얘지/VV","흐리/VA","훤하/VA","훤/XR"],"forbidLabel":"눈에 기대는 표현","forbidDisplay":["눈","빛","색","시선","모습","그림자","어둠","보다","보이다","바라보다","쳐다보다","살펴보다","밝다","어둡다","붉다","푸르다","하얗다","검다","빛나다","번쩍이다","반짝이다"]}'::jsonb,
  'folktale', 'modern', 'planned',
  2, 'sn-kongjwi-night'
where not exists (select 1 from problems p where p.source_key = 'sn-kongjwi-night');

-- sn-simcheong-water (order_no 6, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'sensory'),
  'convert', 'auto', '물에 잠긴 직후다. 눈에 기대는 말을 걷어내고 다른 감각으로 다시 쓰시오. 눈·빛·색·시선·시야·모습·얼굴·그림자·어둠·캄캄·깜깜·컴컴·흐릿·뚜렷·선명·투명·반짝·어른어른이 들어간 말은 전부 막습니다. 보다 계열(보이다·바라보다·살펴보다 등), 밝기와 색(밝다·어둡다·붉다·푸르다·하얗다·검다·노랗다·흐리다·훤하다), 빛의 움직임(빛나다·번쩍이다·반짝이다·어른거리다)도 막습니다.',
  '푸른 물빛이 눈앞을 가득 채웠다. 뱃사람들의 모습이 점점 멀어지는 것이 보였다.', null, '{"maxChars":70,"forbidWords":["눈","빛","색","시선","모습","그림자","어둠","캄캄","깜깜","컴컴","흐릿","뚜렷","얼굴","시야","선명","투명","반짝","어른어른"],"forbidLemmas":["보/VV","보이/VV","바라보/VV","쳐다보/VV","내려다보/VV","올려다보/VV","둘러보/VV","살펴보/VV","띄/VV","비치/VV","빛나/VV","번쩍이/VV","반짝이/VV","어른거리/VV","밝/VA","어둡/VA","붉/VA","푸르/VA","하얗/VA","희/VA","환하/VA","검/VA","노랗/VA","누렇/VA","하얘지/VV","흐리/VA","훤하/VA","훤/XR"],"forbidLabel":"눈에 기대는 표현","forbidDisplay":["눈","빛","색","시선","모습","그림자","어둠","보다","보이다","바라보다","쳐다보다","살펴보다","밝다","어둡다","붉다","푸르다","하얗다","검다","빛나다","번쩍이다","반짝이다"]}'::jsonb,
  'folktale', 'fantasy', 'planned',
  2, 'sn-simcheong-water'
where not exists (select 1 from problems p where p.source_key = 'sn-simcheong-water');

-- sn-goblin-club (order_no 6, difficulty 3)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'sensory'),
  'convert', 'auto', '도깨비들이 방망이를 두드린다. 등을 돌리고 있어 앞이 분간되지 않는다. 눈에 기대는 말을 걷어내고 다른 감각으로 다시 쓰시오. 눈·빛·색·시선·시야·모습·얼굴·그림자·어둠·캄캄·깜깜·컴컴·흐릿·뚜렷·선명·투명·반짝·어른어른이 들어간 말은 전부 막습니다. 보다 계열(보이다·바라보다·살펴보다 등), 밝기와 색(밝다·어둡다·붉다·푸르다·하얗다·검다·노랗다·흐리다·훤하다), 빛의 움직임(빛나다·번쩍이다·반짝이다·어른거리다)도 막습니다.',
  '도깨비의 모습이 어둠 속에서 어른거렸다. 방망이가 붉게 빛났다.', null, '{"maxChars":70,"forbidWords":["눈","빛","색","시선","모습","그림자","어둠","캄캄","깜깜","컴컴","흐릿","뚜렷","얼굴","시야","선명","투명","반짝","어른어른"],"forbidLemmas":["보/VV","보이/VV","바라보/VV","쳐다보/VV","내려다보/VV","올려다보/VV","둘러보/VV","살펴보/VV","띄/VV","비치/VV","빛나/VV","번쩍이/VV","반짝이/VV","어른거리/VV","밝/VA","어둡/VA","붉/VA","푸르/VA","하얗/VA","희/VA","환하/VA","검/VA","노랗/VA","누렇/VA","하얘지/VV","흐리/VA","훤하/VA","훤/XR"],"forbidLabel":"눈에 기대는 표현","forbidDisplay":["눈","빛","색","시선","모습","그림자","어둠","보다","보이다","바라보다","쳐다보다","살펴보다","밝다","어둡다","붉다","푸르다","하얗다","검다","빛나다","번쩍이다","반짝이다"]}'::jsonb,
  'folktale', 'martial', 'planned',
  3, 'sn-goblin-club'
where not exists (select 1 from problems p where p.source_key = 'sn-goblin-club');

-- sn-gyeonu-bridge (order_no 6, difficulty 3)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'sensory'),
  'convert', 'auto', '까치 다리 위다. 발밑이 분간되지 않는다. 눈에 기대는 말을 걷어내고 다른 감각으로 다시 쓰시오. 눈·빛·색·시선·시야·모습·얼굴·그림자·어둠·캄캄·깜깜·컴컴·흐릿·뚜렷·선명·투명·반짝·어른어른이 들어간 말은 전부 막습니다. 보다 계열(보이다·바라보다·살펴보다 등), 밝기와 색(밝다·어둡다·붉다·푸르다·하얗다·검다·노랗다·흐리다·훤하다), 빛의 움직임(빛나다·번쩍이다·반짝이다·어른거리다)도 막습니다.',
  '까치들의 검은 모습이 눈앞에 가득했다. 견우는 발밑을 내려다보았다.', null, '{"maxChars":70,"forbidWords":["눈","빛","색","시선","모습","그림자","어둠","캄캄","깜깜","컴컴","흐릿","뚜렷","얼굴","시야","선명","투명","반짝","어른어른"],"forbidLemmas":["보/VV","보이/VV","바라보/VV","쳐다보/VV","내려다보/VV","올려다보/VV","둘러보/VV","살펴보/VV","띄/VV","비치/VV","빛나/VV","번쩍이/VV","반짝이/VV","어른거리/VV","밝/VA","어둡/VA","붉/VA","푸르/VA","하얗/VA","희/VA","환하/VA","검/VA","노랗/VA","누렇/VA","하얘지/VV","흐리/VA","훤하/VA","훤/XR"],"forbidLabel":"눈에 기대는 표현","forbidDisplay":["눈","빛","색","시선","모습","그림자","어둠","보다","보이다","바라보다","쳐다보다","살펴보다","밝다","어둡다","붉다","푸르다","하얗다","검다","빛나다","번쩍이다","반짝이다"]}'::jsonb,
  'folktale', 'fantasy', 'planned',
  3, 'sn-gyeonu-bridge'
where not exists (select 1 from problems p where p.source_key = 'sn-gyeonu-bridge');

-- sn-rabbit-hall (order_no 6, difficulty 3)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'sensory'),
  'convert', 'auto', '용궁 복도에서 등불이 꺼졌다. 눈에 기대는 말을 걷어내고 다른 감각으로 다시 쓰시오. 눈·빛·색·시선·시야·모습·얼굴·그림자·어둠·캄캄·깜깜·컴컴·흐릿·뚜렷·선명·투명·반짝·어른어른이 들어간 말은 전부 막습니다. 보다 계열(보이다·바라보다·살펴보다 등), 밝기와 색(밝다·어둡다·붉다·푸르다·하얗다·검다·노랗다·흐리다·훤하다), 빛의 움직임(빛나다·번쩍이다·반짝이다·어른거리다)도 막습니다.',
  '붉은 기둥들이 어둠 속에 잠겨 보이지 않았다. 토끼는 앞을 바라보았다.', null, '{"maxChars":70,"forbidWords":["눈","빛","색","시선","모습","그림자","어둠","캄캄","깜깜","컴컴","흐릿","뚜렷","얼굴","시야","선명","투명","반짝","어른어른"],"forbidLemmas":["보/VV","보이/VV","바라보/VV","쳐다보/VV","내려다보/VV","올려다보/VV","둘러보/VV","살펴보/VV","띄/VV","비치/VV","빛나/VV","번쩍이/VV","반짝이/VV","어른거리/VV","밝/VA","어둡/VA","붉/VA","푸르/VA","하얗/VA","희/VA","환하/VA","검/VA","노랗/VA","누렇/VA","하얘지/VV","흐리/VA","훤하/VA","훤/XR"],"forbidLabel":"눈에 기대는 표현","forbidDisplay":["눈","빛","색","시선","모습","그림자","어둠","보다","보이다","바라보다","쳐다보다","살펴보다","밝다","어둡다","붉다","푸르다","하얗다","검다","빛나다","번쩍이다","반짝이다"]}'::jsonb,
  'folktale', 'fantasy', 'planned',
  3, 'sn-rabbit-hall'
where not exists (select 1 from problems p where p.source_key = 'sn-rabbit-hall');

-- sn-siblings-tree (order_no 6, difficulty 3)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'sensory'),
  'convert', 'auto', '나무 위다. 아래는 아무것도 분간되지 않는다. 눈에 기대는 말을 걷어내고 다른 감각으로 다시 쓰시오. 눈·빛·색·시선·시야·모습·얼굴·그림자·어둠·캄캄·깜깜·컴컴·흐릿·뚜렷·선명·투명·반짝·어른어른이 들어간 말은 전부 막습니다. 보다 계열(보이다·바라보다·살펴보다 등), 밝기와 색(밝다·어둡다·붉다·푸르다·하얗다·검다·노랗다·흐리다·훤하다), 빛의 움직임(빛나다·번쩍이다·반짝이다·어른거리다)도 막습니다.',
  '호랑이의 모습이 밑동 쪽에서 어른거렸다. 오누이는 아래를 내려다보았다.', null, '{"maxChars":70,"forbidWords":["눈","빛","색","시선","모습","그림자","어둠","캄캄","깜깜","컴컴","흐릿","뚜렷","얼굴","시야","선명","투명","반짝","어른어른"],"forbidLemmas":["보/VV","보이/VV","바라보/VV","쳐다보/VV","내려다보/VV","올려다보/VV","둘러보/VV","살펴보/VV","띄/VV","비치/VV","빛나/VV","번쩍이/VV","반짝이/VV","어른거리/VV","밝/VA","어둡/VA","붉/VA","푸르/VA","하얗/VA","희/VA","환하/VA","검/VA","노랗/VA","누렇/VA","하얘지/VV","흐리/VA","훤하/VA","훤/XR"],"forbidLabel":"눈에 기대는 표현","forbidDisplay":["눈","빛","색","시선","모습","그림자","어둠","보다","보이다","바라보다","쳐다보다","살펴보다","밝다","어둡다","붉다","푸르다","하얗다","검다","빛나다","번쩍이다","반짝이다"]}'::jsonb,
  'folktale', 'fantasy', 'planned',
  3, 'sn-siblings-tree'
where not exists (select 1 from problems p where p.source_key = 'sn-siblings-tree');

-- cc-ace-siren (order_no 7, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'contrast_char'),
  'continue', 'auto', '도현의 겉과 속을 한 장면에 담으시오. 도현은 누구에게나 똑같이 친절해 보이지만, 쉽게 곁을 주지 않는 S급 헌터다. 그가 진짜 마음을 준 사람은 몇 없고, 그 몇 사람 앞에서만 목석 같은 행동도 무너진다. 무전 속 부상자가 바로 그중 하나다. 원문을 읽고 다음에 올 장면을 친절한 겉과 무너지는 속이 둘 다 행동으로 보이게 작성하시오.',
  '레이드 중에 부상자가 나왔다는 무전이 들어왔다. 에이스는 예정된 인터뷰 장소로 이동하는 중이었다.', null, '{"maxChars":100,"minVerbs":3,"forbidLabel":"속마음을 직접 말하는 표현","forbidWords":["걱정","불안","초조"],"forbidDisplay":["걱정","불안","초조"],"forbidPassageCopy":true}'::jsonb,
  'original', 'modern', 'planned',
  1, 'cc-ace-siren'
where not exists (select 1 from problems p where p.source_key = 'cc-ace-siren');

-- rh-axe-pond (order_no 7, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'rhythm'),
  'convert', 'auto', '한 덩어리로 붙은 글을 끊어 읽히게 다시 쓰시오. 내용은 그대로 두고 줄만 나눕니다. 문장이 길어서 문장 단위로만 끊으면 줄이 넘칩니다. 문장 안에서도 끊으십시오. 7~13줄로 나누고, 한 줄은 18자를 넘기지 마십시오. 같은 줄을 되풀이해 채우지 마십시오. 분량은 111~131자로 유지합니다. 덜어내는 훈련이 아닙니다. ''나무꾼''는 반드시 남깁니다.',
  '나무꾼이 연못가에 주저앉자, 방금까지 흔들리던 물낯이 거짓말처럼 잔잔해져 있었다. 도끼는 이미 바닥까지 가라앉아 어디쯤 놓여 있는지 짐작조차 되지 않았다. 그가 소매를 팔꿈치까지 걷고 진흙 속을 더듬자, 손끝에 단단한 것이 걸렸다. 끌어올린 손바닥에 찬 기운이 오래 남아 있었다.', null, '{"maxChars":131,"maxLines":13,"minChars":111,"minLines":7,"requireAny":["나무꾼"],"maxLineChars":18,"maxDuplicateLines":2}'::jsonb,
  'folktale', 'fantasy', 'planned',
  1, 'rh-axe-pond'
where not exists (select 1 from problems p where p.source_key = 'rh-axe-pond');

-- rh-heungbu-yard (order_no 7, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'rhythm'),
  'convert', 'auto', '한 덩어리로 붙은 글을 끊어 읽히게 다시 쓰시오. 내용은 그대로 두고 줄만 나눕니다. 문장이 길어서 문장 단위로만 끊으면 줄이 넘칩니다. 문장 안에서도 끊으십시오. 7~13줄로 나누고, 한 줄은 18자를 넘기지 마십시오. 같은 줄을 되풀이해 채우지 마십시오. 분량은 111~131자로 유지합니다. 덜어내는 훈련이 아닙니다. ''제비''는 반드시 남깁니다.',
  '흥부가 마당으로 나서자, 밤새 내린 비에 땅이 질척거리고 있었다. 담장 아래에는 다리가 꺾인 채 깃털이 흠뻑 젖은 제비 한 마리가 떨어져 있었다. 흥부가 조심스럽게 두 손으로 제비를 들어 올리자, 손바닥 위에서 작은 몸이 파르르 떨렸다. 그는 제비를 감쌀 헝겊을 찾으려고 서둘러 방으로 들어갔다.', null, '{"maxChars":131,"maxLines":13,"minChars":111,"minLines":7,"requireAny":["제비"],"maxLineChars":18,"maxDuplicateLines":2}'::jsonb,
  'folktale', 'fantasy', 'planned',
  1, 'rh-heungbu-yard'
where not exists (select 1 from problems p where p.source_key = 'rh-heungbu-yard');

-- rh-kongjwi-jar (order_no 7, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'rhythm'),
  'convert', 'auto', '한 덩어리로 붙은 글을 끊어 읽히게 다시 쓰시오. 내용은 그대로 두고 줄만 나눕니다. 문장이 길어서 문장 단위로만 끊으면 줄이 넘칩니다. 문장 안에서도 끊으십시오. 7~13줄로 나누고, 한 줄은 18자를 넘기지 마십시오. 같은 줄을 되풀이해 채우지 마십시오. 분량은 111~131자로 유지합니다. 덜어내는 훈련이 아닙니다. ''물동이''는 반드시 남깁니다.',
  '콩쥐가 물동이를 내려놓자, 독 바닥에 난 금 사이로 물이 소리 없이 새어 나가고 있었다. 부으면 부은 만큼 빠져나가는데도 마당에는 도와줄 사람이 아무도 없었다. 콩쥐가 손바닥으로 금을 눌러 보았지만, 물은 손가락 사이로 그대로 흘러내렸다. 해가 담장 위로 올라올 무렵 콩쥐는 다시 우물 쪽으로 걸어갔다.', null, '{"maxChars":131,"maxLines":13,"minChars":111,"minLines":7,"requireAny":["물동이"],"maxLineChars":18,"maxDuplicateLines":2}'::jsonb,
  'folktale', 'modern', 'planned',
  1, 'rh-kongjwi-jar'
where not exists (select 1 from problems p where p.source_key = 'rh-kongjwi-jar');

-- rh-simcheong-deck (order_no 7, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'rhythm'),
  'convert', 'auto', '한 덩어리로 붙은 글을 끊어 읽히게 다시 쓰시오. 내용은 그대로 두고 줄만 나눕니다. 문장이 길어서 문장 단위로만 끊으면 줄이 넘칩니다. 문장 안에서도 끊으십시오. 7~13줄로 나누고, 한 줄은 18자를 넘기지 마십시오. 같은 줄을 되풀이해 채우지 마십시오. 분량은 111~131자로 유지합니다. 덜어내는 훈련이 아닙니다. ''공양미''는 반드시 남깁니다.',
  '심청이 뱃전에 올라서자, 노를 젓던 뱃사람들이 하나둘 손을 멈추었다. 갑판 한쪽에는 아버지의 눈을 뜨게 해 줄 공양미 삼백 석이 그대로 쌓여 있었다. 심청이 아버지의 이름을 한 번 부르고 치마를 걷어쥐자, 바람이 돛을 크게 밀었다. 발밑에서 검은 물결이 소리 없이 갈라지고 있었다.', null, '{"maxChars":131,"maxLines":13,"minChars":111,"minLines":7,"requireAny":["공양미"],"maxLineChars":18,"maxDuplicateLines":2}'::jsonb,
  'folktale', 'modern', 'planned',
  1, 'rh-simcheong-deck'
where not exists (select 1 from problems p where p.source_key = 'rh-simcheong-deck');

-- rh-goblin-club (order_no 7, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'rhythm'),
  'convert', 'auto', '한 덩어리로 붙은 글을 끊어 읽히게 다시 쓰시오. 내용은 그대로 두고 줄만 나눕니다. 문장이 길어서 문장 단위로만 끊으면 줄이 넘칩니다. 문장 안에서도 끊으십시오. 7~13줄로 나누고, 한 줄은 18자를 넘기지 마십시오. 같은 줄을 되풀이해 채우지 마십시오. 분량은 111~131자로 유지합니다. 덜어내는 훈련이 아닙니다. ''방망이''는 반드시 남깁니다.',
  '도깨비들이 마루에 둘러앉아 상 위에 놓인 방망이를 하나씩 돌려 가며 두드리기 시작했다. 방망이가 바닥을 칠 때마다 마루 위로 쌀이 한 무더기씩 쏟아져 내렸다. 기둥 뒤에 몸을 붙인 나무꾼이 숨을 죽이는 사이 발밑에서 마루가 삐걱 소리를 냈다. 도깨비들이 한꺼번에 고개를 돌렸다.', null, '{"maxChars":131,"maxLines":13,"minChars":111,"minLines":7,"requireAny":["방망이"],"maxLineChars":18,"maxDuplicateLines":2}'::jsonb,
  'folktale', 'fantasy', 'impulsive',
  2, 'rh-goblin-club'
where not exists (select 1 from problems p where p.source_key = 'rh-goblin-club');

-- rh-gyeonu-bridge (order_no 7, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'rhythm'),
  'convert', 'auto', '한 덩어리로 붙은 글을 끊어 읽히게 다시 쓰시오. 내용은 그대로 두고 줄만 나눕니다. 문장이 길어서 문장 단위로만 끊으면 줄이 넘칩니다. 문장 안에서도 끊으십시오. 7~13줄로 나누고, 한 줄은 18자를 넘기지 마십시오. 같은 줄을 되풀이해 채우지 마십시오. 분량은 111~131자로 유지합니다. 덜어내는 훈련이 아닙니다. ''까치들''는 반드시 남깁니다.',
  '견우가 강가에 나와 선 밤에도 물소리는 그치지 않고 밤새 이어졌다. 하늘이 검은 새떼로 뒤덮이더니 까치들이 서로 몸을 이어 강 위에 다리를 놓기 시작했다. 견우가 첫 발을 얹자 다리는 발밑에서 위태롭게 흔들렸지만 그는 걸음을 멈추지 않았다. 발밑에서 깃털 스치는 소리가 계속 올라왔다.', null, '{"maxChars":131,"maxLines":13,"minChars":111,"minLines":7,"requireAny":["까치들"],"maxLineChars":18,"maxDuplicateLines":2}'::jsonb,
  'folktale', 'romance', 'planned',
  2, 'rh-gyeonu-bridge'
where not exists (select 1 from problems p where p.source_key = 'rh-gyeonu-bridge');

-- rh-rabbit-gate (order_no 7, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'rhythm'),
  'convert', 'auto', '한 덩어리로 붙은 글을 끊어 읽히게 다시 쓰시오. 내용은 그대로 두고 줄만 나눕니다. 문장이 길어서 문장 단위로만 끊으면 줄이 넘칩니다. 문장 안에서도 끊으십시오. 7~13줄로 나누고, 한 줄은 18자를 넘기지 마십시오. 같은 줄을 되풀이해 채우지 마십시오. 분량은 111~131자로 유지합니다. 덜어내는 훈련이 아닙니다. ''문지기''는 반드시 남깁니다.',
  '토끼가 용궁 문 앞에 서자마자 문지기가 내린 창끝이 목 앞에서 아슬아슬하게 멈추었다. 토끼는 웃음을 거두지 않은 채 오히려 한 걸음을 더 내디뎠다. 안쪽에서 문이 천천히 열리며 복도 끝의 발소리가 점점 가까워졌다. 소매 속에 감춘 주먹만이 저도 모르게 단단히 쥐어지고 있었다.', null, '{"maxChars":131,"maxLines":13,"minChars":111,"minLines":7,"requireAny":["문지기"],"maxLineChars":18,"maxDuplicateLines":2}'::jsonb,
  'folktale', 'martial', 'impulsive',
  2, 'rh-rabbit-gate'
where not exists (select 1 from problems p where p.source_key = 'rh-rabbit-gate');

-- rh-siblings-tree (order_no 7, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'rhythm'),
  'convert', 'auto', '한 덩어리로 붙은 글을 끊어 읽히게 다시 쓰시오. 내용은 그대로 두고 줄만 나눕니다. 문장이 길어서 문장 단위로만 끊으면 줄이 넘칩니다. 문장 안에서도 끊으십시오. 7~13줄로 나누고, 한 줄은 18자를 넘기지 마십시오. 같은 줄을 되풀이해 채우지 마십시오. 분량은 111~131자로 유지합니다. 덜어내는 훈련이 아닙니다. ''오라비''는 반드시 남깁니다.',
  '오누이가 나무 꼭대기까지 올라간 뒤에도 호랑이는 밑동을 긁으며 좀처럼 물러가지 않았다. 가지가 크게 흔들릴 때마다 동생은 울음을 삼키며 오라비의 소매를 붙잡았다. 오라비가 하늘을 향해 두 손을 뻗어 무언가를 빌자 낡은 밧줄 하나가 소리 없이 내려왔다. 두 아이는 그것을 함께 붙잡았다.', null, '{"maxChars":131,"maxLines":13,"minChars":111,"minLines":7,"requireAny":["오라비"],"maxLineChars":18,"maxDuplicateLines":2}'::jsonb,
  'folktale', 'fantasy', 'impulsive',
  2, 'rh-siblings-tree'
where not exists (select 1 from problems p where p.source_key = 'rh-siblings-tree');

-- cc-night-shift (order_no 8, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'contrast_char'),
  'continue', 'auto', '유겸의 겉과 속을 한 장면에 담으시오. 유겸은 부잣집에서 나와 제 힘을 시험하러 온 신참 호위다. 도련님 소리가 제일 싫어서, 실력을 의심받으면 웃는 얼굴로 제일 험한 일을 자원한다. 원문을 읽고 다음에 올 장면을, 웃는 겉과 이를 무는 속이 둘 다 행동으로 보이게 작성하시오.',
  '밤길 호위 순번을 정하는 자리였다. 가장 험한 새벽 구간은 아무도 맡으려 하지 않았다.', null, '{"maxChars":100,"minVerbs":3,"forbidLabel":"속마음을 직접 말하는 표현","forbidWords":["불안","자존심","증명"],"forbidDisplay":["불안","자존심","증명하다"],"forbidPassageCopy":true}'::jsonb,
  'original', 'martial', 'planned',
  1, 'cc-night-shift'
where not exists (select 1 from problems p where p.source_key = 'cc-night-shift');

-- mo-axe-pond (order_no 8, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'dialogue_ratio'),
  'convert', 'auto', E'대사 사이에 속마음을 한 줄 끼워 넣으시오. 이렇게 됩니다.\n\n  사공이 노를 놓고 물끄러미 강 건너를 보았다.\n  "오늘은 배를 안 띄우려 하오."\n  ''이 물살이면 반도 못 가서 뒤집힌다.''\n  "삯은 이미 받으셨잖습니까."\n  "받은 것은 내일 돌려드리리다."\n\n원래 서술과 대사는 그대로 둡니다. 속마음은 작은따옴표로 감쌉니다.',
  E'산신이 물속에서 금도끼를 건져 올려 나무꾼 앞에 놓았다.\n"네가 빠뜨린 것이 이것이냐."\n"아닙니다. 제 것은 낡은 쇠도끼입니다."\n"그 말이 참이면 셋을 다 가져가거라."', null, '{"maxChars":200,"minChars":75,"requireAny":["쇠도끼"],"minSpeeches":3,"minMonologues":1,"maxDuplicateLines":0,"maxLineWordRepeat":6,"maxNarrationLines":3,"minMonologueChars":8,"requireMonologueBetween":true}'::jsonb,
  'folktale', 'fantasy', 'planned',
  1, 'mo-axe-pond'
where not exists (select 1 from problems p where p.source_key = 'mo-axe-pond');

-- mo-heungbu-swallow (order_no 8, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'dialogue_ratio'),
  'convert', 'auto', E'대사 사이에 속마음을 한 줄 끼워 넣으시오. 이렇게 됩니다.\n\n  사공이 노를 놓고 물끄러미 강 건너를 보았다.\n  "오늘은 배를 안 띄우려 하오."\n  ''이 물살이면 반도 못 가서 뒤집힌다.''\n  "삯은 이미 받으셨잖습니까."\n  "받은 것은 내일 돌려드리리다."\n\n원래 서술과 대사는 그대로 둡니다. 속마음은 작은따옴표로 감쌉니다.',
  E'흥부가 마당으로 나서자 담장 아래 제비 한 마리가 떨어져 있었다.\n"다리가 부러졌소. 데려다 거둡시다."\n"아이들 먹일 것도 없어요."\n"그래도 눈앞에서 죽게 둘 수야 없지."', null, '{"maxChars":200,"minChars":75,"requireAny":["제비"],"minSpeeches":3,"minMonologues":1,"maxDuplicateLines":0,"maxLineWordRepeat":6,"maxNarrationLines":3,"minMonologueChars":8,"requireMonologueBetween":true}'::jsonb,
  'folktale', 'fantasy', 'planned',
  1, 'mo-heungbu-swallow'
where not exists (select 1 from problems p where p.source_key = 'mo-heungbu-swallow');

-- mo-kongjwi-shoe (order_no 8, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'dialogue_ratio'),
  'convert', 'auto', E'대사 사이에 속마음을 한 줄 끼워 넣으시오. 이렇게 됩니다.\n\n  사공이 노를 놓고 물끄러미 강 건너를 보았다.\n  "오늘은 배를 안 띄우려 하오."\n  ''이 물살이면 반도 못 가서 뒤집힌다.''\n  "삯은 이미 받으셨잖습니까."\n  "받은 것은 내일 돌려드리리다."\n\n원래 서술과 대사는 그대로 둡니다. 속마음은 작은따옴표로 감쌉니다.',
  E'원님이 뜰에 놓인 신 한 짝을 턱으로 가리켰다.\n"저것이 네 것이냐."\n"제 것이 맞습니다."\n"신어 보아라. 발이 맞지 않으면 도둑으로 다스린다."', null, '{"maxChars":200,"minChars":75,"requireAny":["도둑"],"minSpeeches":3,"minMonologues":1,"maxDuplicateLines":0,"maxLineWordRepeat":6,"maxNarrationLines":3,"minMonologueChars":8,"requireMonologueBetween":true}'::jsonb,
  'folktale', 'modern', 'impulsive',
  1, 'mo-kongjwi-shoe'
where not exists (select 1 from problems p where p.source_key = 'mo-kongjwi-shoe');

-- mo-simcheong-rice (order_no 8, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'dialogue_ratio'),
  'convert', 'auto', E'대사 사이에 속마음을 한 줄 끼워 넣으시오. 이렇게 됩니다.\n\n  사공이 노를 놓고 물끄러미 강 건너를 보았다.\n  "오늘은 배를 안 띄우려 하오."\n  ''이 물살이면 반도 못 가서 뒤집힌다.''\n  "삯은 이미 받으셨잖습니까."\n  "받은 것은 내일 돌려드리리다."\n\n원래 서술과 대사는 그대로 둡니다. 속마음은 작은따옴표로 감쌉니다.',
  E'심청이 아버지 앞에 무릎을 접고 앉았다.\n"공양미 삼백 석이면 눈을 뜨신다 합니다."\n"그 많은 쌀을 어디서 구한단 말이냐."\n"이미 마련해 두었으니 묻지 마십시오."', null, '{"maxChars":200,"minChars":75,"requireAny":["공양미"],"minSpeeches":3,"minMonologues":1,"maxDuplicateLines":0,"maxLineWordRepeat":6,"maxNarrationLines":3,"minMonologueChars":8,"requireMonologueBetween":true}'::jsonb,
  'folktale', 'modern', 'planned',
  1, 'mo-simcheong-rice'
where not exists (select 1 from problems p where p.source_key = 'mo-simcheong-rice');

-- mo-goblin-club (order_no 8, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'dialogue_ratio'),
  'convert', 'auto', E'대사 사이에 속마음을 한 줄 끼워 넣으시오. 이렇게 됩니다.\n\n  사공이 노를 놓고 물끄러미 강 건너를 보았다.\n  "오늘은 배를 안 띄우려 하오."\n  ''이 물살이면 반도 못 가서 뒤집힌다.''\n  "삯은 이미 받으셨잖습니까."\n  "받은 것은 내일 돌려드리리다."\n\n원래 서술과 대사는 그대로 둡니다. 속마음은 작은따옴표로 감쌉니다.',
  E'도깨비들이 방망이를 두드리다 말고 노인 쪽으로 고개를 돌렸다.\n"그 고운 노래가 어디서 나오느냐."\n"이 혹에서 나옵니다."\n"거짓이면 저 방망이로 다스리겠다."', null, '{"maxChars":200,"minChars":75,"requireAny":["방망이"],"minSpeeches":3,"minMonologues":1,"maxDuplicateLines":0,"maxLineWordRepeat":6,"maxNarrationLines":3,"minMonologueChars":8,"requireMonologueBetween":true}'::jsonb,
  'folktale', 'fantasy', 'impulsive',
  2, 'mo-goblin-club'
where not exists (select 1 from problems p where p.source_key = 'mo-goblin-club');

-- mo-gyeonu-bridge (order_no 8, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'dialogue_ratio'),
  'convert', 'auto', E'대사 사이에 속마음을 한 줄 끼워 넣으시오. 이렇게 됩니다.\n\n  사공이 노를 놓고 물끄러미 강 건너를 보았다.\n  "오늘은 배를 안 띄우려 하오."\n  ''이 물살이면 반도 못 가서 뒤집힌다.''\n  "삯은 이미 받으셨잖습니까."\n  "받은 것은 내일 돌려드리리다."\n\n원래 서술과 대사는 그대로 둡니다. 속마음은 작은따옴표로 감쌉니다.',
  E'까치들이 은하 위로 몰려들었으나 다리는 좀처럼 이어지지 않았다.\n"올해는 비가 늦게 그쳤습니다."\n"그러면 만날 날이 하루 줄어들겠군요."\n"줄어든 하루는 내년에 갚으면 되오."', null, '{"maxChars":200,"minChars":75,"requireAny":["까치"],"minSpeeches":3,"minMonologues":1,"maxDuplicateLines":0,"maxLineWordRepeat":6,"maxNarrationLines":3,"minMonologueChars":8,"requireMonologueBetween":true}'::jsonb,
  'folktale', 'romance', 'planned',
  2, 'mo-gyeonu-bridge'
where not exists (select 1 from problems p where p.source_key = 'mo-gyeonu-bridge');

-- mo-rabbit-gate (order_no 8, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'dialogue_ratio'),
  'convert', 'auto', E'대사 사이에 속마음을 한 줄 끼워 넣으시오. 이렇게 됩니다.\n\n  사공이 노를 놓고 물끄러미 강 건너를 보았다.\n  "오늘은 배를 안 띄우려 하오."\n  ''이 물살이면 반도 못 가서 뒤집힌다.''\n  "삯은 이미 받으셨잖습니까."\n  "받은 것은 내일 돌려드리리다."\n\n원래 서술과 대사는 그대로 둡니다. 속마음은 작은따옴표로 감쌉니다.',
  E'용왕이 옥좌에서 몸을 앞으로 기울였다.\n"네 간이 어디에 있느냐."\n"뭍에 두고 왔사옵니다."\n"용궁까지 온 놈의 혀를 어찌 믿으시렵니까."', null, '{"maxChars":200,"minChars":75,"requireAny":["용궁"],"minSpeeches":3,"minMonologues":1,"maxDuplicateLines":0,"maxLineWordRepeat":6,"maxNarrationLines":3,"minMonologueChars":8,"requireMonologueBetween":true}'::jsonb,
  'folktale', 'martial', 'planned',
  2, 'mo-rabbit-gate'
where not exists (select 1 from problems p where p.source_key = 'mo-rabbit-gate');

-- mo-siblings-rope (order_no 8, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'dialogue_ratio'),
  'convert', 'auto', E'대사 사이에 속마음을 한 줄 끼워 넣으시오. 이렇게 됩니다.\n\n  사공이 노를 놓고 물끄러미 강 건너를 보았다.\n  "오늘은 배를 안 띄우려 하오."\n  ''이 물살이면 반도 못 가서 뒤집힌다.''\n  "삯은 이미 받으셨잖습니까."\n  "받은 것은 내일 돌려드리리다."\n\n원래 서술과 대사는 그대로 둡니다. 속마음은 작은따옴표로 감쌉니다.',
  E'문 밖에서 발소리가 멎고 낮은 목소리가 들려왔다.\n"얘들아, 문을 열어라. 밖이 몹시 춥구나."\n"어머니 목소리가 아니야."\n"손을 들이밀어 보라고 해."', null, '{"maxChars":200,"minChars":75,"requireAny":["어머니"],"minSpeeches":3,"minMonologues":1,"maxDuplicateLines":0,"maxLineWordRepeat":6,"maxNarrationLines":3,"minMonologueChars":8,"requireMonologueBetween":true}'::jsonb,
  'folktale', 'fantasy', 'impulsive',
  2, 'mo-siblings-rope'
where not exists (select 1 from problems p where p.source_key = 'mo-siblings-rope');

-- cc-junk-dealer (order_no 9, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'contrast_char'),
  'continue', 'auto', '셀라의 겉과 속을 한 장면에 담으시오. 셀라는 뭐든 값부터 매기는 냉정한 견습이다. 하지만 그 계산은 욕심이 아니라 지키는 방식이다 — 제값을 받아야 물건도 사람도 함부로 다뤄지지 않는다고 믿는다. 원문을 읽고 다음에 올 장면을, 차가운 겉과 지키려는 속이 둘 다 행동으로 보이게 작성하시오.',
  '고물상이 유품 값을 반으로 후려쳤다. 견습들은 물건을 다시 싸서 돌아갈 채비를 했다.', null, '{"maxChars":100,"minVerbs":3,"forbidLabel":"속마음을 직접 말하는 표현","forbidWords":["소중","다정"],"forbidDisplay":["소중하다","다정하다"],"forbidPassageCopy":true}'::jsonb,
  'original', 'fantasy', 'planned',
  1, 'cc-junk-dealer'
where not exists (select 1 from problems p where p.source_key = 'cc-junk-dealer');

-- pv-broken-gate (order_no 9, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'pov_lock'),
  'convert', 'auto', E'한 사람의 눈에 든 것만 남기고 다시 쓰시오. 이렇게 됩니다.\n\n  저 앞 나루에는 배 세 척이 묶여 있었고, 사공 둘이 그물을 손질하고 있었다.\n  덕수는 둑 위에 서 있었다.\n\n  ↓\n\n  덕수가 둑을 내려서자 젖은 밧줄 냄새가 먼저 올라왔다.\n  발치에서 물이 뱃전을 두드렸고, 등 뒤에서 그물 터는 소리가 났다.\n\n1인칭으로 바꾸지 않습니다. 그 사람이 못 본 것은 쓰지 않습니다.',
  E'멀찍이 무너진 성문 앞에 병사 열이 창을 세우고 늘어섰고, 깨진 돌이 길을 반쯤 막고 있었다.\n규담은 마른 도랑에 엎드려 있었다.', null, '{"minChars":20,"maxChars":130,"forbidWords":["저기","저쪽","저 멀리","저 너머","저 위","저 앞","멀찍이","병사 열이","길을 반쯤 막고"],"requireAny":["규담"]}'::jsonb,
  'original', 'fantasy', 'planned',
  1, 'pv-broken-gate'
where not exists (select 1 from problems p where p.source_key = 'pv-broken-gate');

-- pv-drill-yard (order_no 9, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'pov_lock'),
  'convert', 'auto', E'한 사람의 눈에 든 것만 남기고 다시 쓰시오. 이렇게 됩니다.\n\n  저 앞 나루에는 배 세 척이 묶여 있었고, 사공 둘이 그물을 손질하고 있었다.\n  덕수는 둑 위에 서 있었다.\n\n  ↓\n\n  덕수가 둑을 내려서자 젖은 밧줄 냄새가 먼저 올라왔다.\n  발치에서 물이 뱃전을 두드렸고, 등 뒤에서 그물 터는 소리가 났다.\n\n1인칭으로 바꾸지 않습니다. 그 사람이 못 본 것은 쓰지 않습니다.',
  E'저 멀리 연무장에서는 제자 스물이 목검을 휘둘렀고, 흙먼지가 담장 위로 피어올랐다.\n무결은 회랑 기둥에 기대 있었다.', null, '{"minChars":20,"maxChars":130,"forbidWords":["저기","저쪽","저 멀리","저 너머","저 위","저 앞","멀찍이","제자 스물","흙먼지가 담장 위로"],"requireAny":["무결"]}'::jsonb,
  'original', 'martial', 'impulsive',
  1, 'pv-drill-yard'
where not exists (select 1 from problems p where p.source_key = 'pv-drill-yard');

-- pv-guild-desk (order_no 9, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'pov_lock'),
  'convert', 'auto', E'한 사람의 눈에 든 것만 남기고 다시 쓰시오. 이렇게 됩니다.\n\n  저 앞 나루에는 배 세 척이 묶여 있었고, 사공 둘이 그물을 손질하고 있었다.\n  덕수는 둑 위에 서 있었다.\n\n  ↓\n\n  덕수가 둑을 내려서자 젖은 밧줄 냄새가 먼저 올라왔다.\n  발치에서 물이 뱃전을 두드렸고, 등 뒤에서 그물 터는 소리가 났다.\n\n1인칭으로 바꾸지 않습니다. 그 사람이 못 본 것은 쓰지 않습니다.',
  E'저쪽 길드 사무실에는 모험가 열둘이 모여 있었고, 벽에는 의뢰서가 빼곡히 붙어 있었다.\n하람은 문턱에 서 있었다.', null, '{"minChars":20,"maxChars":130,"forbidWords":["저기","저쪽","저 멀리","저 너머","저 위","저 앞","멀찍이","모험가 열둘","의뢰서가 빼곡히"],"requireAny":["하람"]}'::jsonb,
  'original', 'fantasy', 'planned',
  1, 'pv-guild-desk'
where not exists (select 1 from problems p where p.source_key = 'pv-guild-desk');

-- pv-star-field (order_no 9, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'pov_lock'),
  'convert', 'auto', E'한 사람의 눈에 든 것만 남기고 다시 쓰시오. 이렇게 됩니다.\n\n  저 앞 나루에는 배 세 척이 묶여 있었고, 사공 둘이 그물을 손질하고 있었다.\n  덕수는 둑 위에 서 있었다.\n\n  ↓\n\n  덕수가 둑을 내려서자 젖은 밧줄 냄새가 먼저 올라왔다.\n  발치에서 물이 뱃전을 두드렸고, 등 뒤에서 그물 터는 소리가 났다.\n\n1인칭으로 바꾸지 않습니다. 그 사람이 못 본 것은 쓰지 않습니다.',
  E'저기 하늘에 별이 떠 있고, 남자 둘 여자 하나가 지나가며 이야기를 나누고 있었다.\n태윤은 담장 아래 서 있었다.', null, '{"minChars":20,"maxChars":130,"forbidWords":["저기","저쪽","저 멀리","저 너머","저 위","저 앞","멀찍이","남자 둘 여자 하나","이야기를 나누고"],"requireAny":["태윤"]}'::jsonb,
  'original', 'modern', 'planned',
  1, 'pv-star-field'
where not exists (select 1 from problems p where p.source_key = 'pv-star-field');

-- pv-banquet-hall (order_no 9, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'pov_lock'),
  'convert', 'auto', E'한 사람의 눈에 든 것만 남기고 다시 쓰시오. 이렇게 됩니다.\n\n  저 앞 나루에는 배 세 척이 묶여 있었고, 사공 둘이 그물을 손질하고 있었다.\n  덕수는 둑 위에 서 있었다.\n\n  ↓\n\n  덕수가 둑을 내려서자 젖은 밧줄 냄새가 먼저 올라왔다.\n  발치에서 물이 뱃전을 두드렸고, 등 뒤에서 그물 터는 소리가 났다.\n\n1인칭으로 바꾸지 않습니다. 그 사람이 못 본 것은 쓰지 않습니다.',
  E'저 위 연회장에는 촛대 열둘이 타올랐고, 귀족 예닐곱이 잔을 든 채 낮은 말을 주고받았다.\n유안은 계단 아래 그늘에 서 있었다.', null, '{"minChars":20,"maxChars":130,"forbidWords":["저기","저쪽","저 멀리","저 너머","저 위","저 앞","멀찍이","촛대 열둘","귀족 예닐곱이"],"requireAny":["유안"]}'::jsonb,
  'original', 'fantasy', 'planned',
  2, 'pv-banquet-hall'
where not exists (select 1 from problems p where p.source_key = 'pv-banquet-hall');

-- pv-dawn-market (order_no 9, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'pov_lock'),
  'convert', 'auto', E'한 사람의 눈에 든 것만 남기고 다시 쓰시오. 이렇게 됩니다.\n\n  저 앞 나루에는 배 세 척이 묶여 있었고, 사공 둘이 그물을 손질하고 있었다.\n  덕수는 둑 위에 서 있었다.\n\n  ↓\n\n  덕수가 둑을 내려서자 젖은 밧줄 냄새가 먼저 올라왔다.\n  발치에서 물이 뱃전을 두드렸고, 등 뒤에서 그물 터는 소리가 났다.\n\n1인칭으로 바꾸지 않습니다. 그 사람이 못 본 것은 쓰지 않습니다.',
  E'저 앞 시장에는 좌판 여덟이 늘어섰고, 짐꾼 셋이 상자를 나르며 고함을 주고받고 있었다.\n정순은 골목 어귀에 서 있었다.', null, '{"minChars":20,"maxChars":130,"forbidWords":["저기","저쪽","저 멀리","저 너머","저 위","저 앞","멀찍이","좌판 여덟","짐꾼 셋이"],"requireAny":["정순"]}'::jsonb,
  'original', 'modern', 'impulsive',
  2, 'pv-dawn-market'
where not exists (select 1 from problems p where p.source_key = 'pv-dawn-market');

-- pv-frozen-lake (order_no 9, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'pov_lock'),
  'convert', 'auto', E'한 사람의 눈에 든 것만 남기고 다시 쓰시오. 이렇게 됩니다.\n\n  저 앞 나루에는 배 세 척이 묶여 있었고, 사공 둘이 그물을 손질하고 있었다.\n  덕수는 둑 위에 서 있었다.\n\n  ↓\n\n  덕수가 둑을 내려서자 젖은 밧줄 냄새가 먼저 올라왔다.\n  발치에서 물이 뱃전을 두드렸고, 등 뒤에서 그물 터는 소리가 났다.\n\n1인칭으로 바꾸지 않습니다. 그 사람이 못 본 것은 쓰지 않습니다.',
  E'저기 얼어붙은 호수에는 낚시 구멍 열넷이 뚫려 있었고, 아이 셋이 얼음을 지치며 소리를 질렀다.\n연희는 비탈 위 바위에 앉아 있었다.', null, '{"minChars":20,"maxChars":130,"forbidWords":["저기","저쪽","저 멀리","저 너머","저 위","저 앞","멀찍이","낚시 구멍 열넷","아이 셋이"],"requireAny":["연희"]}'::jsonb,
  'original', 'fantasy', 'impulsive',
  2, 'pv-frozen-lake'
where not exists (select 1 from problems p where p.source_key = 'pv-frozen-lake');

-- pv-lantern-night (order_no 9, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'pov_lock'),
  'convert', 'auto', E'한 사람의 눈에 든 것만 남기고 다시 쓰시오. 이렇게 됩니다.\n\n  저 앞 나루에는 배 세 척이 묶여 있었고, 사공 둘이 그물을 손질하고 있었다.\n  덕수는 둑 위에 서 있었다.\n\n  ↓\n\n  덕수가 둑을 내려서자 젖은 밧줄 냄새가 먼저 올라왔다.\n  발치에서 물이 뱃전을 두드렸고, 등 뒤에서 그물 터는 소리가 났다.\n\n1인칭으로 바꾸지 않습니다. 그 사람이 못 본 것은 쓰지 않습니다.',
  E'저 너머 강가에는 등불 스무 개가 떠갔고, 다리 위에서 연인 넷이 난간에 기대 웃고 있었다.\n소하는 버드나무 그늘에 서 있었다.', null, '{"minChars":20,"maxChars":130,"forbidWords":["저기","저쪽","저 멀리","저 너머","저 위","저 앞","멀찍이","등불 스무 개","연인 넷이"],"requireAny":["소하"]}'::jsonb,
  'original', 'romance', 'planned',
  2, 'pv-lantern-night'
where not exists (select 1 from problems p where p.source_key = 'pv-lantern-night');

-- ar-cracked-ice (order_no 10, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'action_reason'),
  'fill', 'auto', E'고정된 줄 사이에 뚫린 빈칸을 채우시오. 이렇게 됩니다.\n\n  덕수가 장터에서 자신을 밀친 사내와 맞붙습니다.\n  사내는 앞서 오른쪽 다리를 절뚝였습니다.\n\n  사내가 어깨를 들이밀며 다가왔다.\n  ①\n  덕수는 왼발을 반 보 뒤로 뺐다.\n  ②\n  덕수의 발이 사내의 절뚝인 걸음을 걸어 넘겼다.\n\n  ↓\n\n  ①  주먹을 쥐어 봐야 힘에서 진다. 덕수는 다른 것을 보기로 했다.\n  ②  사내는 걸음마다 오른쪽이 반 박자 늦었다. 덕수는 그것을 세 번 세었다.\n\n빈칸마다 한 문장에서 두 문장으로 씁니다.\n앞뒤 줄을 그대로 옮겨 적지 않습니다.\n무엇을 했는지가 아니라 왜 그렇게 했는지를 씁니다.\n[상황]·[복선]·[결정타]는 힌트일 뿐이고, 답에 그 대괄호를 쓰지 않습니다.',
  E'[상황] 도경이 얼어붙은 강을 건너다 늑대 무리에 둘러싸인다. 강 한가운데는 물살이 빨라 얼음이 얇고 색이 검다. 도경은 그 자리를 지나왔다. 늑대는 여섯이고, 무리로 붙어 몰아붙인다.\n[복선] 지나오며 발밑에서 들은 금 가는 소리\n[결정타] 갈라진 얼음\n\n늑대 여섯이 원을 좁혀 왔다.\n①\n도경은 강 한가운데로 물러섰다.\n②\n갈라진 얼음이 늑대를 삼켰다.', null, '{"blanks":[{"key":"①","label":"도경이 물러설 곳을 어떻게 골랐는지","minSentences":1,"maxSentences":2,"maxChars":60},{"key":"②","label":"늑대가 왜 따라 들어왔는지","minSentences":1,"maxSentences":2,"maxChars":60}],"forbidWords":["[상황]","[복선]","[결정타]"],"forbidCopyOfFixedLines":true,"fixedLines":["늑대 여섯이 원을 좁혀 왔다.","도경은 강 한가운데로 물러섰다.","갈라진 얼음이 늑대를 삼켰다."]}'::jsonb,
  'original', 'fantasy', 'impulsive',
  1, 'ar-cracked-ice'
where not exists (select 1 from problems p where p.source_key = 'ar-cracked-ice');

-- ar-dragon-jaw (order_no 10, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'action_reason'),
  'fill', 'auto', E'고정된 줄 사이에 뚫린 빈칸을 채우시오. 이렇게 됩니다.\n\n  덕수가 장터에서 자신을 밀친 사내와 맞붙습니다.\n  사내는 앞서 오른쪽 다리를 절뚝였습니다.\n\n  사내가 어깨를 들이밀며 다가왔다.\n  ①\n  덕수는 왼발을 반 보 뒤로 뺐다.\n  ②\n  덕수의 발이 사내의 절뚝인 걸음을 걸어 넘겼다.\n\n  ↓\n\n  ①  주먹을 쥐어 봐야 힘에서 진다. 덕수는 다른 것을 보기로 했다.\n  ②  사내는 걸음마다 오른쪽이 반 박자 늦었다. 덕수는 그것을 세 번 세었다.\n\n빈칸마다 한 문장에서 두 문장으로 씁니다.\n앞뒤 줄을 그대로 옮겨 적지 않습니다.\n무엇을 했는지가 아니라 왜 그렇게 했는지를 씁니다.\n[상황]·[복선]·[결정타]는 힌트일 뿐이고, 답에 그 대괄호를 쓰지 않습니다.',
  E'[상황] 각성자 태윤이 던전에서 용의 형상을 한 괴물과 마주친다. 괴물은 크고 팔이 길어 정면에서는 닿지 않는다. 태윤의 각성 등급으로는 한 방을 제대로 넣어야 끝난다.\n[복선] 괴물이 팔을 휘두를 때마다 턱이 앞으로 나오는 것\n[결정타] 턱\n\n괴물이 팔을 휘두르며 덮쳐 왔다.\n①\n태윤은 고개를 숙여 그 아래로 들어갔다.\n②\n주먹이 괴물의 턱에 꽂혔다.', null, '{"blanks":[{"key":"①","label":"태윤이 이 순간 무엇을 하는지","minSentences":1,"maxSentences":2,"maxChars":60,"optional":true},{"key":"②","label":"태윤이 무엇을 보고 턱을 노렸는지","minSentences":1,"maxSentences":2,"maxChars":60}],"forbidWords":["[상황]","[복선]","[결정타]"],"forbidCopyOfFixedLines":true,"fixedLines":["괴물이 팔을 휘두르며 덮쳐 왔다.","태윤은 고개를 숙여 그 아래로 들어갔다.","주먹이 괴물의 턱에 꽂혔다."]}'::jsonb,
  'original', 'modern', 'planned',
  1, 'ar-dragon-jaw'
where not exists (select 1 from problems p where p.source_key = 'ar-dragon-jaw');

-- ar-dull-blade (order_no 10, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'action_reason'),
  'fill', 'auto', E'고정된 줄 사이에 뚫린 빈칸을 채우시오. 이렇게 됩니다.\n\n  덕수가 장터에서 자신을 밀친 사내와 맞붙습니다.\n  사내는 앞서 오른쪽 다리를 절뚝였습니다.\n\n  사내가 어깨를 들이밀며 다가왔다.\n  ①\n  덕수는 왼발을 반 보 뒤로 뺐다.\n  ②\n  덕수의 발이 사내의 절뚝인 걸음을 걸어 넘겼다.\n\n  ↓\n\n  ①  주먹을 쥐어 봐야 힘에서 진다. 덕수는 다른 것을 보기로 했다.\n  ②  사내는 걸음마다 오른쪽이 반 박자 늦었다. 덕수는 그것을 세 번 세었다.\n\n빈칸마다 한 문장에서 두 문장으로 씁니다.\n앞뒤 줄을 그대로 옮겨 적지 않습니다.\n무엇을 했는지가 아니라 왜 그렇게 했는지를 씁니다.\n[상황]·[복선]·[결정타]는 힌트일 뿐이고, 답에 그 대괄호를 쓰지 않습니다.',
  E'[상황] 무결이 사부와 대련한다. 사부는 중검을 쓴다. 빠르지 않고 무겁기만 한 검이다. 무결은 그 느린 검을 막을 수 있다고 생각했다.\n[복선] 막을 수 있다는 생각\n[결정타] 목젖 — 사부의 검이 닿는다\n\n중검의 묘리를 담은 칼이 천천히 위에서 아래로 떨어졌다.\n①\n무결은 검을 들어 받아쳤다.\n②\n사부의 검이 무결의 목젖 위에 있었다.', null, '{"blanks":[{"key":"①","label":"무결이 무엇을 하기로 했는지","minSentences":1,"maxSentences":2,"maxChars":60},{"key":"②","label":"받아친 뒤에 무엇이 일어났는지","minSentences":1,"maxSentences":2,"maxChars":60}],"forbidWords":["[상황]","[복선]","[결정타]"],"forbidCopyOfFixedLines":true,"fixedLines":["중검의 묘리를 담은 칼이 천천히 위에서 아래로 떨어졌다.","무결은 검을 들어 받아쳤다.","사부의 검이 무결의 목젖 위에 있었다."]}'::jsonb,
  'original', 'martial', 'planned',
  1, 'ar-dull-blade'
where not exists (select 1 from problems p where p.source_key = 'ar-dull-blade');

-- ar-left-feeler (order_no 10, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'action_reason'),
  'fill', 'auto', E'고정된 줄 사이에 뚫린 빈칸을 채우시오. 이렇게 됩니다.\n\n  덕수가 장터에서 자신을 밀친 사내와 맞붙습니다.\n  사내는 앞서 오른쪽 다리를 절뚝였습니다.\n\n  사내가 어깨를 들이밀며 다가왔다.\n  ①\n  덕수는 왼발을 반 보 뒤로 뺐다.\n  ②\n  덕수의 발이 사내의 절뚝인 걸음을 걸어 넘겼다.\n\n  ↓\n\n  ①  주먹을 쥐어 봐야 힘에서 진다. 덕수는 다른 것을 보기로 했다.\n  ②  사내는 걸음마다 오른쪽이 반 박자 늦었다. 덕수는 그것을 세 번 세었다.\n\n빈칸마다 한 문장에서 두 문장으로 씁니다.\n앞뒤 줄을 그대로 옮겨 적지 않습니다.\n무엇을 했는지가 아니라 왜 그렇게 했는지를 씁니다.\n[상황]·[복선]·[결정타]는 힌트일 뿐이고, 답에 그 대괄호를 쓰지 않습니다.',
  E'[상황] 연희가 좁은 갱도에서 마수와 마주친다. 갱도는 등불 하나뿐이라 어둡다. 마수는 눈이 퇴화했고 머리 양옆의 더듬이로 공기의 흔들림을 읽는다. 연희는 광부라 그 짐승을 안다.\n[복선] 앞서 마수가 오른쪽 벽만 훑고 지나간 것\n[결정타] 곡괭이로 잘라 낸 왼쪽 더듬이\n\n마수가 머리를 흔들며 갱도를 좁혀 왔다.\n①\n연희는 등불을 오른쪽 벽으로 던졌다.\n②\n곡괭이가 왼쪽 더듬이를 잘라 냈다.', null, '{"blanks":[{"key":"①","label":"연희가 어느 쪽으로 붙을지 어떻게 정했는지","minSentences":1,"maxSentences":2,"maxChars":60},{"key":"②","label":"등불을 던진 것이 무엇을 만들었는지","minSentences":1,"maxSentences":2,"maxChars":60}],"forbidWords":["[상황]","[복선]","[결정타]"],"forbidCopyOfFixedLines":true,"fixedLines":["마수가 머리를 흔들며 갱도를 좁혀 왔다.","연희는 등불을 오른쪽 벽으로 던졌다.","곡괭이가 왼쪽 더듬이를 잘라 냈다."]}'::jsonb,
  'original', 'fantasy', 'impulsive',
  1, 'ar-left-feeler'
where not exists (select 1 from problems p where p.source_key = 'ar-left-feeler');

-- at-cracked-ice (order_no 10, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'action_turn'),
  'convert', 'auto', E'빌드업 세 줄 뒤에 결정타 한 줄을 쓰시오. 이렇게 됩니다.\n\n  덕수가 장터에서 자신을 밀친 사내와 맞붙습니다.\n  결정타로 쓸 것은 사내가 앞서 절뚝인 걸음입니다.\n\n  ↓\n\n  덕수는 주먹을 쥐지 않았다.\n  사내가 걸음을 옮길 때마다 오른쪽이 반 박자 늦었다.\n  덕수는 그것을 세 번 세었다.\n  덕수의 발이 그 절뚝인 걸음을 걸어 넘겼다.\n\n네 줄로 씁니다. [결정타] 요소는 마지막 줄에 옵니다.\n동작을 낱낱이 늘어놓지 않습니다.\n무엇을 했는지보다 왜 그렇게 했는지가 빌드업입니다.',
  E'[상황] 도경이 얼어붙은 강 위에서 늑대 무리에 둘러싸인다.\n[결정타] 발밑에서 갈라진 얼음', null, '{"minLines":4,"maxLines":4,"maxLineChars":30,"requireAny":["갈라진 얼음"],"requireInLastLine":["갈라진 얼음"],"forbidWords":["[상황]","[복선]","[결정타]"]}'::jsonb,
  'original', 'fantasy', 'impulsive',
  1, 'at-cracked-ice'
where not exists (select 1 from problems p where p.source_key = 'at-cracked-ice');

-- at-left-feeler (order_no 10, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'action_turn'),
  'convert', 'auto', E'빌드업 세 줄 뒤에 결정타 한 줄을 쓰시오. 이렇게 됩니다.\n\n  덕수가 장터에서 자신을 밀친 사내와 맞붙습니다.\n  결정타로 쓸 것은 사내가 앞서 절뚝인 걸음입니다.\n\n  ↓\n\n  덕수는 주먹을 쥐지 않았다.\n  사내가 걸음을 옮길 때마다 오른쪽이 반 박자 늦었다.\n  덕수는 그것을 세 번 세었다.\n  덕수의 발이 그 절뚝인 걸음을 걸어 넘겼다.\n\n네 줄로 씁니다. [결정타] 요소는 마지막 줄에 옵니다.\n동작을 낱낱이 늘어놓지 않습니다.\n무엇을 했는지보다 왜 그렇게 했는지가 빌드업입니다.',
  E'[상황] 연희가 좁은 갱도에서 마수와 갑자기 마주친다.\n[결정타] 움직임을 읽는 마수의 왼쪽 더듬이', null, '{"minLines":4,"maxLines":4,"maxLineChars":30,"requireAny":["왼쪽 더듬이"],"requireInLastLine":["왼쪽 더듬이"],"forbidWords":["[상황]","[복선]","[결정타]"]}'::jsonb,
  'original', 'fantasy', 'impulsive',
  1, 'at-left-feeler'
where not exists (select 1 from problems p where p.source_key = 'at-left-feeler');

-- at-left-feint (order_no 10, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'action_turn'),
  'convert', 'auto', E'빌드업 세 줄 뒤에 결정타 한 줄을 쓰시오. 이렇게 됩니다.\n\n  덕수가 장터에서 자신을 밀친 사내와 맞붙습니다.\n  결정타로 쓸 것은 사내가 앞서 절뚝인 걸음입니다.\n\n  ↓\n\n  덕수는 주먹을 쥐지 않았다.\n  사내가 걸음을 옮길 때마다 오른쪽이 반 박자 늦었다.\n  덕수는 그것을 세 번 세었다.\n  덕수의 발이 그 절뚝인 걸음을 걸어 넘겼다.\n\n네 줄로 씁니다. [결정타] 요소는 마지막 줄에 옵니다.\n동작을 낱낱이 늘어놓지 않습니다.\n무엇을 했는지보다 왜 그렇게 했는지가 빌드업입니다.',
  E'[상황] 태윤이 자신보다 머리 하나 큰 상대와 맞붙는다.\n[결정타] 상대가 앞서 한 번 보인 왼발 페인트', null, '{"minLines":4,"maxLines":4,"maxLineChars":30,"requireAny":["왼발 페인트"],"requireInLastLine":["왼발 페인트"],"forbidWords":["[상황]","[복선]","[결정타]"]}'::jsonb,
  'original', 'modern', 'planned',
  1, 'at-left-feint'
where not exists (select 1 from problems p where p.source_key = 'at-left-feint');

-- at-look-back (order_no 10, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'action_turn'),
  'convert', 'auto', E'빌드업 세 줄 뒤에 결정타 한 줄을 쓰시오. 이렇게 됩니다.\n\n  덕수가 장터에서 자신을 밀친 사내와 맞붙습니다.\n  결정타로 쓸 것은 사내가 앞서 절뚝인 걸음입니다.\n\n  ↓\n\n  덕수는 주먹을 쥐지 않았다.\n  사내가 걸음을 옮길 때마다 오른쪽이 반 박자 늦었다.\n  덕수는 그것을 세 번 세었다.\n  덕수의 발이 그 절뚝인 걸음을 걸어 넘겼다.\n\n네 줄로 씁니다. [결정타] 요소는 마지막 줄에 옵니다.\n동작을 낱낱이 늘어놓지 않습니다.\n무엇을 했는지보다 왜 그렇게 했는지가 빌드업입니다.',
  E'[상황] 수하가 저승 문턱에서 자신을 돌려보내려는 문지기와 마주 선다.\n[결정타] 뒤를 돌아보지 않겠다는 말', null, '{"minLines":4,"maxLines":4,"maxLineChars":30,"requireAny":["돌아보지 않겠다"],"requireInLastLine":["돌아보지 않겠다"],"forbidWords":["[상황]","[복선]","[결정타]"]}'::jsonb,
  'original', 'romance', 'planned',
  1, 'at-look-back'
where not exists (select 1 from problems p where p.source_key = 'at-look-back');

-- ar-bell-rope (order_no 10, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'action_reason'),
  'fill', 'auto', E'고정된 줄 사이에 뚫린 빈칸을 채우시오. 이렇게 됩니다.\n\n  덕수가 장터에서 자신을 밀친 사내와 맞붙습니다.\n  사내는 앞서 오른쪽 다리를 절뚝였습니다.\n\n  사내가 어깨를 들이밀며 다가왔다.\n  ①\n  덕수는 왼발을 반 보 뒤로 뺐다.\n  ②\n  덕수의 발이 사내의 절뚝인 걸음을 걸어 넘겼다.\n\n  ↓\n\n  ①  주먹을 쥐어 봐야 힘에서 진다. 덕수는 다른 것을 보기로 했다.\n  ②  사내는 걸음마다 오른쪽이 반 박자 늦었다. 덕수는 그것을 세 번 세었다.\n\n빈칸마다 한 문장에서 두 문장으로 씁니다.\n앞뒤 줄을 그대로 옮겨 적지 않습니다.\n무엇을 했는지가 아니라 왜 그렇게 했는지를 씁니다.\n[상황]·[복선]·[결정타]는 힌트일 뿐이고, 답에 그 대괄호를 쓰지 않습니다.',
  E'[상황] 서린이 종탑 꼭대기에서 추격자와 마주 선다. 추격자의 이마에는 검은 표식이 있다. 누이를 죽인 자다. 이 마을에는 오래된 설화가 있다. 종이 울리면 마을의 수호신이 내려와 성 안의 부정한 것을 거둔다. 서린과 누이는 어릴 적부터 그 종탑에 공물을 올렸다. 아무도 그 설화를 믿지 않는다. 서린도 믿지 않았다.\n[복선] 누이와 함께 종탑에 공물을 올리던 일\n[결정타] 종줄\n\n추격자가 등 뒤로 바짝 쫓아오고 있다.\n①\n칼끝이 서린의 볼을 스치고 벽에 부딪쳤다.\n②\n서린은 뒤로 물러서며 막다른 벽에 등을 붙였다.\n③\n종줄이 당겨지고 종이 울렸다.', null, '{"blanks":[{"key":"①","label":"서린이 이 순간 무엇을 하는지","minSentences":1,"maxSentences":3,"maxChars":60},{"key":"②","label":"볼을 베인 서린이 무엇을 느끼거나 깨닫는지","minSentences":1,"maxSentences":3,"maxChars":60},{"key":"③","label":"서린의 손이 무엇에 닿았는지","minSentences":1,"maxSentences":3,"maxChars":60}],"forbidWords":["[상황]","[복선]","[결정타]"],"forbidCopyOfFixedLines":true,"fixedLines":["추격자가 등 뒤로 바짝 쫓아오고 있다.","칼끝이 서린의 볼을 스치고 벽에 부딪쳤다.","서린은 뒤로 물러서며 막다른 벽에 등을 붙였다.","종줄이 당겨지고 종이 울렸다."]}'::jsonb,
  'original', 'fantasy', 'impulsive',
  2, 'ar-bell-rope'
where not exists (select 1 from problems p where p.source_key = 'ar-bell-rope');

-- ar-broken-gate (order_no 10, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'action_reason'),
  'fill', 'auto', E'고정된 줄 사이에 뚫린 빈칸을 채우시오. 이렇게 됩니다.\n\n  덕수가 장터에서 자신을 밀친 사내와 맞붙습니다.\n  사내는 앞서 오른쪽 다리를 절뚝였습니다.\n\n  사내가 어깨를 들이밀며 다가왔다.\n  ①\n  덕수는 왼발을 반 보 뒤로 뺐다.\n  ②\n  덕수의 발이 사내의 절뚝인 걸음을 걸어 넘겼다.\n\n  ↓\n\n  ①  주먹을 쥐어 봐야 힘에서 진다. 덕수는 다른 것을 보기로 했다.\n  ②  사내는 걸음마다 오른쪽이 반 박자 늦었다. 덕수는 그것을 세 번 세었다.\n\n빈칸마다 한 문장에서 두 문장으로 씁니다.\n앞뒤 줄을 그대로 옮겨 적지 않습니다.\n무엇을 했는지가 아니라 왜 그렇게 했는지를 씁니다.\n[상황]·[복선]·[결정타]는 힌트일 뿐이고, 답에 그 대괄호를 쓰지 않습니다.',
  E'[상황] 세연이 무너진 성문 아래서 마수와 마주친다. 그 마수가 지나간 자리에는 번개 모양 자국이 남는다. 작년 동생의 시신 옆 나무에도 그 자국이 있었다. 세연은 숲 어귀에서 같은 자국을 찾아 사흘을 따라 들어왔다.\n[복선] 사흘을 따라온 번개 모양 자국\n[결정타] 목 — 비늘 사이의 역린\n\n마수의 앞발이 세연을 성문 잔해로 밀어붙였다.\n①\n세연은 부러진 창끝을 두 손으로 고쳐 쥐었다.\n마수가 몸을 낮추고 머리를 들이밀었다.\n②\n창끝이 마수의 목을 찔렀다.', null, '{"blanks":[{"key":"①","label":"세연이 이 순간 무엇을 하는지","minSentences":1,"maxSentences":2,"maxChars":60,"optional":true},{"key":"②","label":"세연이 무엇을 보고 목을 노리기로 했는지","minSentences":1,"maxSentences":2,"maxChars":60}],"forbidWords":["[상황]","[복선]","[결정타]"],"forbidCopyOfFixedLines":true,"fixedLines":["마수의 앞발이 세연을 성문 잔해로 밀어붙였다.","세연은 부러진 창끝을 두 손으로 고쳐 쥐었다.","마수가 몸을 낮추고 머리를 들이밀었다.","창끝이 마수의 목을 찔렀다."]}'::jsonb,
  'original', 'martial', 'planned',
  2, 'ar-broken-gate'
where not exists (select 1 from problems p where p.source_key = 'ar-broken-gate');

-- ar-left-draw (order_no 10, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'action_reason'),
  'fill', 'auto', E'고정된 줄 사이에 뚫린 빈칸을 채우시오. 이렇게 됩니다.\n\n  덕수가 장터에서 자신을 밀친 사내와 맞붙습니다.\n  사내는 앞서 오른쪽 다리를 절뚝였습니다.\n\n  사내가 어깨를 들이밀며 다가왔다.\n  ①\n  덕수는 왼발을 반 보 뒤로 뺐다.\n  ②\n  덕수의 발이 사내의 절뚝인 걸음을 걸어 넘겼다.\n\n  ↓\n\n  ①  주먹을 쥐어 봐야 힘에서 진다. 덕수는 다른 것을 보기로 했다.\n  ②  사내는 걸음마다 오른쪽이 반 박자 늦었다. 덕수는 그것을 세 번 세었다.\n\n빈칸마다 한 문장에서 두 문장으로 씁니다.\n앞뒤 줄을 그대로 옮겨 적지 않습니다.\n무엇을 했는지가 아니라 왜 그렇게 했는지를 씁니다.\n[상황]·[복선]·[결정타]는 힌트일 뿐이고, 답에 그 대괄호를 쓰지 않습니다.',
  E'[상황] 무결이 저번 싸움에서 자신을 벤 상대와 다시 마주한다. 그때 오른팔 힘줄이 끊겼다. 검은 왼손에 있다. 상대도 그것을 안다.\n[복선] 힘이 안 들어가는 오른팔\n[결정타] 왼손이 목을 찌른다\n\n상대가 무결의 오른쪽으로 크게 돌아 들어왔다.\n①\n무결은 오른팔을 들어 올렸다.\n②\n왼손의 검이 상대의 목으로 들어갔다.', null, '{"blanks":[{"key":"①","label":"무결이 오른쪽으로 도는 상대를 보고 무엇을 생각하는지","minSentences":1,"maxSentences":2,"maxChars":60},{"key":"②","label":"오른팔이 이 순간 무엇을 하는지","minSentences":1,"maxSentences":2,"maxChars":60}],"forbidWords":["[상황]","[복선]","[결정타]"],"forbidCopyOfFixedLines":true,"fixedLines":["상대가 무결의 오른쪽으로 크게 돌아 들어왔다.","무결은 오른팔을 들어 올렸다.","왼손의 검이 상대의 목으로 들어갔다."]}'::jsonb,
  'original', 'martial', 'planned',
  2, 'ar-left-draw'
where not exists (select 1 from problems p where p.source_key = 'ar-left-draw');

-- ar-wind-gate (order_no 10, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'action_reason'),
  'fill', 'auto', E'고정된 줄 사이에 뚫린 빈칸을 채우시오. 이렇게 됩니다.\n\n  덕수가 장터에서 자신을 밀친 사내와 맞붙습니다.\n  사내는 앞서 오른쪽 다리를 절뚝였습니다.\n\n  사내가 어깨를 들이밀며 다가왔다.\n  ①\n  덕수는 왼발을 반 보 뒤로 뺐다.\n  ②\n  덕수의 발이 사내의 절뚝인 걸음을 걸어 넘겼다.\n\n  ↓\n\n  ①  주먹을 쥐어 봐야 힘에서 진다. 덕수는 다른 것을 보기로 했다.\n  ②  사내는 걸음마다 오른쪽이 반 박자 늦었다. 덕수는 그것을 세 번 세었다.\n\n빈칸마다 한 문장에서 두 문장으로 씁니다.\n앞뒤 줄을 그대로 옮겨 적지 않습니다.\n무엇을 했는지가 아니라 왜 그렇게 했는지를 씁니다.\n[상황]·[복선]·[결정타]는 힌트일 뿐이고, 답에 그 대괄호를 쓰지 않습니다.',
  E'[상황] 마법사 연희가 아군이 밀리는 전장에 선다. 적은 성문 뒤에 진을 치고 화살을 쏟아붓는다. 성문을 뚫지 못하면 아군이 오늘 안에 무너진다.\n[복선] 적의 진형이 성문 앞에 몰려 있는 것\n[결정타] 성문\n\n화살이 아군 머리 위로 쏟아졌다.\n①\n바람의 칼날이 적의 진형을 갈랐다.\n②\n압축한 바람이 성문을 뚫었다.', null, '{"blanks":[{"key":"①","label":"연희가 먼저 무엇을 했는지","minSentences":1,"maxSentences":2,"maxChars":60},{"key":"②","label":"진형이 무너진 것이 무엇을 만들었는지","minSentences":1,"maxSentences":2,"maxChars":60}],"forbidWords":["[상황]","[복선]","[결정타]"],"forbidCopyOfFixedLines":true,"fixedLines":["화살이 아군 머리 위로 쏟아졌다.","바람의 칼날이 적의 진형을 갈랐다.","압축한 바람이 성문을 뚫었다."]}'::jsonb,
  'original', 'fantasy', 'planned',
  2, 'ar-wind-gate'
where not exists (select 1 from problems p where p.source_key = 'ar-wind-gate');

-- at-bell-rope (order_no 10, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'action_turn'),
  'convert', 'auto', E'빌드업 세 줄 뒤에 결정타 한 줄을 쓰시오. 이렇게 됩니다.\n\n  덕수가 장터에서 자신을 밀친 사내와 맞붙습니다.\n  앞서 깔린 것은 지난겨울 덕수의 짐을 엎은 손입니다.\n  결정타로 쓸 것은 사내가 앞서 절뚝인 걸음입니다.\n\n  ↓\n\n  덕수는 그 손을 알아보았다. 지난겨울 자기 짐을 엎은 손이었다.\n  사내는 걸음마다 오른쪽이 반 박자 늦었다.\n  덕수는 그것을 세 번 세었다.\n  덕수의 발이 그 절뚝인 걸음을 걸어 넘겼다.\n\n네 줄로 씁니다. [결정타] 요소는 마지막 줄에, [복선]은 그 앞 어딘가에 옵니다.\n동작을 낱낱이 늘어놓지 않습니다.\n이 싸움을 왜 봐야 하는지가 [복선]에 있습니다.',
  E'[상황] 서린이 종탑 꼭대기에서 추격자와 마주 선다.\n[복선] 추격자가 죽인 누이\n[결정타] 마지막 층의 종줄', null, '{"minLines":4,"maxLines":4,"maxLineChars":30,"requireAny":["종줄"],"requireInLastLine":["종줄"],"forbidWords":["[상황]","[복선]","[결정타]"]}'::jsonb,
  'original', 'fantasy', 'planned',
  2, 'at-bell-rope'
where not exists (select 1 from problems p where p.source_key = 'at-bell-rope');

-- at-broken-gate (order_no 10, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'action_turn'),
  'convert', 'auto', E'빌드업 세 줄 뒤에 결정타 한 줄을 쓰시오. 이렇게 됩니다.\n\n  덕수가 장터에서 자신을 밀친 사내와 맞붙습니다.\n  앞서 깔린 것은 지난겨울 덕수의 짐을 엎은 손입니다.\n  결정타로 쓸 것은 사내가 앞서 절뚝인 걸음입니다.\n\n  ↓\n\n  덕수는 그 손을 알아보았다. 지난겨울 자기 짐을 엎은 손이었다.\n  사내는 걸음마다 오른쪽이 반 박자 늦었다.\n  덕수는 그것을 세 번 세었다.\n  덕수의 발이 그 절뚝인 걸음을 걸어 넘겼다.\n\n네 줄로 씁니다. [결정타] 요소는 마지막 줄에, [복선]은 그 앞 어딘가에 옵니다.\n동작을 낱낱이 늘어놓지 않습니다.\n이 싸움을 왜 봐야 하는지가 [복선]에 있습니다.',
  E'[상황] 세연이 무너진 성문 아래서 마수와 갑자기 마주친다.\n[복선] 작년에 동생을 문 이빨\n[결정타] 잔해에서 주운 부러진 창끝', null, '{"minLines":4,"maxLines":4,"maxLineChars":30,"requireAny":["창끝"],"requireInLastLine":["창끝"],"forbidWords":["[상황]","[복선]","[결정타]"]}'::jsonb,
  'original', 'fantasy', 'impulsive',
  2, 'at-broken-gate'
where not exists (select 1 from problems p where p.source_key = 'at-broken-gate');

-- at-edit-log (order_no 10, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'action_turn'),
  'convert', 'auto', E'빌드업 세 줄 뒤에 결정타 한 줄을 쓰시오. 이렇게 됩니다.\n\n  덕수가 장터에서 자신을 밀친 사내와 맞붙습니다.\n  앞서 깔린 것은 지난겨울 덕수의 짐을 엎은 손입니다.\n  결정타로 쓸 것은 사내가 앞서 절뚝인 걸음입니다.\n\n  ↓\n\n  덕수는 그 손을 알아보았다. 지난겨울 자기 짐을 엎은 손이었다.\n  사내는 걸음마다 오른쪽이 반 박자 늦었다.\n  덕수는 그것을 세 번 세었다.\n  덕수의 발이 그 절뚝인 걸음을 걸어 넘겼다.\n\n네 줄로 씁니다. [결정타] 요소는 마지막 줄에, [복선]은 그 앞 어딘가에 옵니다.\n동작을 낱낱이 늘어놓지 않습니다.\n이 싸움을 왜 봐야 하는지가 [복선]에 있습니다.',
  E'[상황] 민재가 기획안을 가로챈 팀장과 마주 앉는다.\n[복선] 회의 전에 공유해 둔 초안\n[결정타] 초안에 남은 수정 기록', null, '{"minLines":4,"maxLines":4,"maxLineChars":30,"requireAny":["수정 기록"],"requireInLastLine":["수정 기록"],"forbidWords":["[상황]","[복선]","[결정타]"]}'::jsonb,
  'original', 'modern', 'planned',
  2, 'at-edit-log'
where not exists (select 1 from problems p where p.source_key = 'at-edit-log');

-- at-left-draw (order_no 10, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'action_turn'),
  'convert', 'auto', E'빌드업 세 줄 뒤에 결정타 한 줄을 쓰시오. 이렇게 됩니다.\n\n  덕수가 장터에서 자신을 밀친 사내와 맞붙습니다.\n  앞서 깔린 것은 지난겨울 덕수의 짐을 엎은 손입니다.\n  결정타로 쓸 것은 사내가 앞서 절뚝인 걸음입니다.\n\n  ↓\n\n  덕수는 그 손을 알아보았다. 지난겨울 자기 짐을 엎은 손이었다.\n  사내는 걸음마다 오른쪽이 반 박자 늦었다.\n  덕수는 그것을 세 번 세었다.\n  덕수의 발이 그 절뚝인 걸음을 걸어 넘겼다.\n\n네 줄로 씁니다. [결정타] 요소는 마지막 줄에, [복선]은 그 앞 어딘가에 옵니다.\n동작을 낱낱이 늘어놓지 않습니다.\n이 싸움을 왜 봐야 하는지가 [복선]에 있습니다.',
  E'[상황] 무결이 지난달 자신을 벤 상대와 다시 마주한다.\n[복선] 그때 부러진 오른팔\n[결정타] 한 달을 감춘 왼손 발도', null, '{"minLines":4,"maxLines":4,"maxLineChars":30,"requireAny":["왼손 발도"],"requireInLastLine":["왼손 발도"],"forbidWords":["[상황]","[복선]","[결정타]"]}'::jsonb,
  'original', 'martial', 'planned',
  2, 'at-left-draw'
where not exists (select 1 from problems p where p.source_key = 'at-left-draw');

-- cc-flash-crowd (order_no 10, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'contrast_char'),
  'continue', 'auto', '군중과 한시우를 갈라 세우시오. 한시우는 재능 대신 훈련량으로 버티는 B급 헌터다. 카메라보다 다음 훈련이 급한 사람이다. 원문을 읽고 다음에 올 장면을, 모두가 몰려가는 쪽과 한시우가 가는 쪽이 갈라지게 작성하시오.',
  '게이트 공략이 끝나고 취재진이 몰려들었다. 헌터들이 카메라 앞으로 모여들었다.', null, '{"maxChars":100,"minVerbs":3,"requireAny":["한시우","시우"],"forbidPassageCopy":true}'::jsonb,
  'original', 'modern', 'planned',
  2, 'cc-flash-crowd'
where not exists (select 1 from problems p where p.source_key = 'cc-flash-crowd');

-- ch-village-approval (order_no 14, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'off_track'),
  'choice', 'auto', '이 장면의 목적은 ''주인공이 마을 사람들에게 처음으로 인정받는 것''이다. 목적에 기여하지 않는 문장을 고르시오.',
  null, '["촌장이 지팡이를 내려놓고 그에게 자리를 내주었다.","이 마을은 삼백 년 전 소금 장수들이 터를 잡으며 생겨났다.","뒷줄에 섰던 아이들이 앞으로 몰려나와 그의 소매를 잡았다.","우물가에 모인 아낙들이 서로를 돌아보며 고개를 끄덕였다."]'::jsonb, '{}'::jsonb,
  'original', 'fantasy', 'planned',
  1, 'ch-village-approval'
where not exists (select 1 from problems p where p.source_key = 'ch-village-approval');

-- ch-cursed-sword (order_no 14, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'off_track'),
  'choice', 'auto', '이 장면의 목적은 ''주인공이 이 검이 위험하다는 것을 알아채는 것''이다. 목적에 기여하지 않는 문장을 고르시오.',
  null, '["검을 쥔 손등의 핏줄이 검은빛으로 부풀었다.","앞서 이 검을 들었던 자들의 이름이 칼자루에 새겨져 있었다.","무기점 주인은 사흘 전 아들을 장에 보냈다고 했다.","검을 내려놓자 손끝의 저림이 그대로 남았다."]'::jsonb, '{}'::jsonb,
  'original', 'martial', 'planned',
  2, 'ch-cursed-sword'
where not exists (select 1 from problems p where p.source_key = 'ch-cursed-sword');

-- ch-misunderstanding (order_no 14, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'off_track'),
  'choice', 'auto', '이 장면의 목적은 ''두 사람이 서로를 오해하게 만드는 것''이다. 목적에 기여하지 않는 문장을 고르시오.',
  null, '["그가 문을 나서는 순간 그녀가 뒤돌아 다른 이름을 불렀다.","편지는 봉투째 서랍에 들어갔고 그는 그것을 보지 못했다.","창밖에는 사흘째 눈이 내려 처마 끝에 고드름이 자랐다.","그녀는 대답을 기다렸지만 그는 이미 계단을 내려가고 있었다."]'::jsonb, '{}'::jsonb,
  'original', 'romance', 'planned',
  2, 'ch-misunderstanding'
where not exists (select 1 from problems p where p.source_key = 'ch-misunderstanding');

-- ch-sinking-ship (order_no 14, difficulty 3)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'off_track'),
  'choice', 'auto', '이 장면의 목적은 ''독자에게 주인공의 배가 곧 침몰한다는 예감을 주는 것''이다. 목적에 기여하지 않는 문장을 고르시오.',
  null, '["갑판 아래에서 나무가 갈라지는 소리가 두 번 울렸다.","선장은 아무 말 없이 나침반을 주머니에 넣었다.","항구를 떠나던 날 아침에는 갈매기가 유난히 많았다.","선원들이 서로의 눈을 피하며 밧줄 쪽으로 움직였다."]'::jsonb, '{}'::jsonb,
  'original', 'modern', 'planned',
  3, 'ch-sinking-ship'
where not exists (select 1 from problems p where p.source_key = 'ch-sinking-ship');

-- od-mountain-sword (order_no 17, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'reverse_design'),
  'order', 'auto', '결말에서 거꾸로 짚어 순서를 세우시오. 맨 위가 최종 목표, 아래로 갈수록 먼저 일어나는 일이다.',
  null, null, '{"cards":["노인의 잃어버린 소를 찾아준다","산신에게 검을 받는다","장터에서 소 발자국을 알아본다","산신의 사당 위치를 노인에게 듣는다"]}'::jsonb,
  'original', 'fantasy', 'planned',
  1, 'od-mountain-sword'
where not exists (select 1 from problems p where p.source_key = 'od-mountain-sword');

-- od-apology (order_no 17, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'reverse_design'),
  'order', 'auto', '결말에서 거꾸로 짚어 순서를 세우시오.',
  null, null, '{"cards":["그녀의 빈 책상을 본다","출근길에 그녀의 우산을 챙긴다","그가 먼저 사과한다","그녀가 떠났다는 것을 알게 된다"]}'::jsonb,
  'original', 'romance', 'planned',
  2, 'od-apology'
where not exists (select 1 from problems p where p.source_key = 'od-apology');

-- od-open-gate (order_no 17, difficulty 3)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'reverse_design'),
  'order', 'auto', '결말에서 거꾸로 짚어 순서를 세우시오. 각 단계는 다음 단계의 조건이 되어야 한다.',
  null, null, '{"cards":["전날 밤 주방 아이를 도와준다","보초의 교대 시각을 안다","성문을 안에서 연다","주방 심부름꾼으로 들어간다"]}'::jsonb,
  'original', 'modern', 'planned',
  3, 'od-open-gate'
where not exists (select 1 from problems p where p.source_key = 'od-open-gate');

-- cg-lightning-sword (order_no 19, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'genre_coinage'),
  'coinage', 'auto', '번개를 다루는 검법의 이름을 셋 지으시오. 조건: 각 두 자에서 넉 자, 서로 다른 글자로 시작할 것. 한 줄에 하나씩.',
  '무협의 이름은 자연현상과 움직임을 한자어로 붙여 만든다. 뇌·풍·염에 류·격·참을 붙이는 식이다.', null, '{"count":3,"maxLen":4,"minLen":2,"distinctInitial":true}'::jsonb,
  'original', 'martial', 'planned',
  1, 'cg-lightning-sword'
where not exists (select 1 from problems p where p.source_key = 'cg-lightning-sword');

-- cg-ice-magic (order_no 19, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'genre_coinage'),
  'coinage', 'auto', '얼음을 다루는 마법의 이름을 셋 지으시오. 조건: 각 세 자에서 여섯 자, 서로 다른 글자로 시작할 것.',
  '정통 판타지는 외래어 음차나 속성과 현상을 붙이는 구조를 쓴다. 등급은 숫자로, 이름은 현상으로 부른다.', null, '{"count":3,"maxLen":6,"minLen":3,"distinctInitial":true}'::jsonb,
  'original', 'fantasy', 'planned',
  2, 'cg-ice-magic'
where not exists (select 1 from problems p where p.source_key = 'cg-ice-magic');

-- cn-romance-70 (order_no 20, difficulty 1)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'branch_estimate'),
  'count', 'auto', '현대 로맨스 70화 분량을 목표로 한다. 분기점 개수와 첫 분기점까지 걸리는 화수를 정하시오.',
  '반드시 일어나야 하는 핵심 사건을 분기점이라 한다. 분기점 개수와 도달 화수를 곱하면 전체 분량이 나온다.', null, '{"op":"multiply","inputs":[{"key":"branchCount","max":15,"min":3,"label":"분기점 개수"},{"key":"chaptersToFirst","max":40,"min":5,"label":"첫 분기점까지 화수"}]}'::jsonb,
  'original', 'romance', 'planned',
  1, 'cn-romance-70'
where not exists (select 1 from problems p where p.source_key = 'cn-romance-70');

-- cn-fantasy-200 (order_no 20, difficulty 2)
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'branch_estimate'),
  'count', 'auto', '남성향 장편 200화 분량을 목표로 한다. 분기점 개수와 첫 분기점까지 걸리는 화수를 정하시오.',
  '분량이 커지면 분기점 사이 간격도 길어진다. 첫 분기점이 너무 늦으면 초반 이탈이 생긴다.', null, '{"op":"multiply","inputs":[{"key":"branchCount","max":15,"min":3,"label":"분기점 개수"},{"key":"chaptersToFirst","max":40,"min":5,"label":"첫 분기점까지 화수"}]}'::jsonb,
  'original', 'fantasy', 'planned',
  2, 'cn-fantasy-200'
where not exists (select 1 from problems p where p.source_key = 'cn-fantasy-200');

-- ── 정답 ────────────────────────────────────────────────────────────

-- sc-broken-vow
insert into problem_answers (problem_id, answer)
select p.id, '{"kind":"choice","index":0}'::jsonb
from problems p
where p.source_key = 'sc-broken-vow'
on conflict (problem_id) do nothing;

-- sc-hunter-status
insert into problem_answers (problem_id, answer)
select p.id, '{"kind":"choice","index":1}'::jsonb
from problems p
where p.source_key = 'sc-hunter-status'
on conflict (problem_id) do nothing;

-- sc-sword-ruin
insert into problem_answers (problem_id, answer)
select p.id, '{"kind":"choice","index":2}'::jsonb
from problems p
where p.source_key = 'sc-sword-ruin'
on conflict (problem_id) do nothing;

-- sc-boss-mirror
insert into problem_answers (problem_id, answer)
select p.id, '{"kind":"choice","index":1}'::jsonb
from problems p
where p.source_key = 'sc-boss-mirror'
on conflict (problem_id) do nothing;

-- sc-villainess-chains
insert into problem_answers (problem_id, answer)
select p.id, '{"kind":"choice","index":3}'::jsonb
from problems p
where p.source_key = 'sc-villainess-chains'
on conflict (problem_id) do nothing;

-- ae-gyeonu-bridge
insert into problem_answers (problem_id, answer)
select p.id, '{"kind":"choice","index":0}'::jsonb
from problems p
where p.source_key = 'ae-gyeonu-bridge'
on conflict (problem_id) do nothing;

-- ae-rabbit-gate
insert into problem_answers (problem_id, answer)
select p.id, '{"kind":"choice","index":0}'::jsonb
from problems p
where p.source_key = 'ae-rabbit-gate'
on conflict (problem_id) do nothing;

-- ae-axe-drop
insert into problem_answers (problem_id, answer)
select p.id, '{"kind":"choice","index":0}'::jsonb
from problems p
where p.source_key = 'ae-axe-drop'
on conflict (problem_id) do nothing;

-- ae-kongjwi-jar
insert into problem_answers (problem_id, answer)
select p.id, '{"kind":"choice","index":2}'::jsonb
from problems p
where p.source_key = 'ae-kongjwi-jar'
on conflict (problem_id) do nothing;

-- ch-village-approval
insert into problem_answers (problem_id, answer)
select p.id, '{"kind":"choice","index":1}'::jsonb
from problems p
where p.source_key = 'ch-village-approval'
on conflict (problem_id) do nothing;

-- ch-cursed-sword
insert into problem_answers (problem_id, answer)
select p.id, '{"kind":"choice","index":2}'::jsonb
from problems p
where p.source_key = 'ch-cursed-sword'
on conflict (problem_id) do nothing;

-- ch-misunderstanding
insert into problem_answers (problem_id, answer)
select p.id, '{"kind":"choice","index":2}'::jsonb
from problems p
where p.source_key = 'ch-misunderstanding'
on conflict (problem_id) do nothing;

-- ch-sinking-ship
insert into problem_answers (problem_id, answer)
select p.id, '{"kind":"choice","index":2}'::jsonb
from problems p
where p.source_key = 'ch-sinking-ship'
on conflict (problem_id) do nothing;

-- od-mountain-sword
insert into problem_answers (problem_id, answer)
select p.id, '{"kind":"order","sequence":[1,3,0,2]}'::jsonb
from problems p
where p.source_key = 'od-mountain-sword'
on conflict (problem_id) do nothing;

-- od-apology
insert into problem_answers (problem_id, answer)
select p.id, '{"kind":"order","sequence":[2,3,0,1]}'::jsonb
from problems p
where p.source_key = 'od-apology'
on conflict (problem_id) do nothing;

-- od-open-gate
insert into problem_answers (problem_id, answer)
select p.id, '{"kind":"order","sequence":[2,1,3,0]}'::jsonb
from problems p
where p.source_key = 'od-open-gate'
on conflict (problem_id) do nothing;

-- cn-romance-70
insert into problem_answers (problem_id, answer)
select p.id, '{"kind":"count","expected":70,"tolerance":0.15}'::jsonb
from problems p
where p.source_key = 'cn-romance-70'
on conflict (problem_id) do nothing;

-- cn-fantasy-200
insert into problem_answers (problem_id, answer)
select p.id, '{"kind":"count","expected":200,"tolerance":0.15}'::jsonb
from problems p
where p.source_key = 'cn-fantasy-200'
on conflict (problem_id) do nothing;

-- ── 골든셋 ──────────────────────────────────────────────────────────

-- sim-cheong-fear: 감정어 우회 시도. 겁먹 어간으로 잡아야 한다
insert into golden_cases (problem_id, content, expected, note)
select p.id, '심청은 겁먹은 얼굴로 뱃전을 붙잡았다.', false, '감정어 우회 시도. 겁먹 어간으로 잡아야 한다'
from problems p
where p.source_key = 'sim-cheong-fear'
  and not exists (
    select 1 from golden_cases gc
     where gc.problem_id = p.id and gc.content = '심청은 겁먹은 얼굴로 뱃전을 붙잡았다.'
  );

-- sim-cheong-fear: ㅂ불규칙 회귀 테스트. 어간에 두렵이 없으면 이 케이스가 통과로 잘못 나온다
insert into golden_cases (problem_id, content, expected, note)
select p.id, '심청은 두렵게 뱃전을 붙잡았다.', false, 'ㅂ불규칙 회귀 테스트. 어간에 두렵이 없으면 이 케이스가 통과로 잘못 나온다'
from problems p
where p.source_key = 'sim-cheong-fear'
  and not exists (
    select 1 from golden_cases gc
     where gc.problem_id = p.id and gc.content = '심청은 두렵게 뱃전을 붙잡았다.'
  );

-- sim-cheong-fear: 감정어 없음 + 신체 동작 둘
insert into golden_cases (problem_id, content, expected, note)
select p.id, '심청은 뱃전을 붙잡은 손을 놓지 못했다. 발끝이 자꾸 뒤로 밀렸다.', true, '감정어 없음 + 신체 동작 둘'
from problems p
where p.source_key = 'sim-cheong-fear'
  and not exists (
    select 1 from golden_cases gc
     where gc.problem_id = p.id and gc.content = '심청은 뱃전을 붙잡은 손을 놓지 못했다. 발끝이 자꾸 뒤로 밀렸다.'
  );

-- sim-cheong-fear: 동작 중심. 감정을 이름 붙이지 않음
insert into golden_cases (problem_id, content, expected, note)
select p.id, '심청은 숨을 삼켰다. 부름이 한 번 더 들렸고, 그녀는 뒤를 돌아보았다.', true, '동작 중심. 감정을 이름 붙이지 않음'
from problems p
where p.source_key = 'sim-cheong-fear'
  and not exists (
    select 1 from golden_cases gc
     where gc.problem_id = p.id and gc.content = '심청은 숨을 삼켰다. 부름이 한 번 더 들렸고, 그녀는 뒤를 돌아보았다.'
  );

-- sim-cheong-fear: 감각으로 대체한 상급 답안
insert into golden_cases (problem_id, content, expected, note)
select p.id, '심청의 손끝이 뱃전을 긁었다. 가시가 손톱 밑으로 파고들었다.', true, '감각으로 대체한 상급 답안'
from problems p
where p.source_key = 'sim-cheong-fear'
  and not exists (
    select 1 from golden_cases gc
     where gc.problem_id = p.id and gc.content = '심청의 손끝이 뱃전을 긁었다. 가시가 손톱 밑으로 파고들었다.'
  );

-- dragon-king-anger: 띄어쓴 감정어. 화났 만으로는 안 잡히므로 화가 났 이 필요하다
insert into golden_cases (problem_id, content, expected, note)
select p.id, '용왕은 화가 났다.', false, '띄어쓴 감정어. 화났 만으로는 안 잡히므로 화가 났 이 필요하다'
from problems p
where p.source_key = 'dragon-king-anger'
  and not exists (
    select 1 from golden_cases gc
     where gc.problem_id = p.id and gc.content = '용왕은 화가 났다.'
  );

-- dragon-king-anger: 동작으로 대체
insert into golden_cases (problem_id, content, expected, note)
select p.id, '용왕이 술잔을 바닥에 내려놓았다. 잔이 두 조각으로 갈라졌다.', true, '동작으로 대체'
from problems p
where p.source_key = 'dragon-king-anger'
  and not exists (
    select 1 from golden_cases gc
     where gc.problem_id = p.id and gc.content = '용왕이 술잔을 바닥에 내려놓았다. 잔이 두 조각으로 갈라졌다.'
  );

-- ── fill 모범답안 ──────────────────────────────────────────────────
--
-- problem_answers 가 아니다 — 채점 정답이 아니라 stage2 자기점검이
-- 화면에 보여줄 것이다(재설계안 11-2 4번). RLS 는 seed_schema.sql 이
-- 건다: 그 문항에 제출 기록이 있는 학습자만 읽는다.

-- cc-report-credit ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '발표가 끝나기 무섭게 김하준은 부장 쪽으로 걸어갔다. 서담은 밤새운 막내의 어깨를 먼저 두드렸다.'
from problems p
where p.source_key = 'cc-report-credit'
on conflict (problem_id, ord, blank_key) do nothing;

-- cc-report-credit ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '김하준은 회의록의 제 이름에 밑줄을 그었다. 서담은 제 이름을 지우고 팀 이름으로 고쳐 적었다.'
from problems p
where p.source_key = 'cc-report-credit'
on conflict (problem_id, ord, blank_key) do nothing;

-- lk-desk-nine ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '회식 자리에서 김하준은 지난 분기 계약 얘기를 또 꺼냈다. 그거 사실 제가 그린 그림이라고, 잔을 채우며 말했다.'
from problems p
where p.source_key = 'lk-desk-nine'
on conflict (problem_id, ord, blank_key) do nothing;

-- lk-desk-nine ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '보고서를 올린 뒤 김하준은 메신저 창을 열어 두었다. 팀장의 확인했다는 한 줄을 새로 고치며 기다렸다.'
from problems p
where p.source_key = 'lk-desk-nine'
on conflict (problem_id, ord, blank_key) do nothing;

-- rm-axe-pond ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '나무꾼이 도끼를 휘둘렀다. 자루가 빠지고 도끼가 연못에 떨어졌다.'
from problems p
where p.source_key = 'rm-axe-pond'
on conflict (problem_id, ord, blank_key) do nothing;

-- rm-axe-pond ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '나무꾼은 도끼를 머리 위로 들어 내리쳤다. 자루만 손에 남고 날은 연못에 박혔다.'
from problems p
where p.source_key = 'rm-axe-pond'
on conflict (problem_id, ord, blank_key) do nothing;

-- rm-heungbu-swallow ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '흥부는 제비의 다리를 감쌌다. 부러진 뼈에 헝겊을 둘렀다.'
from problems p
where p.source_key = 'rm-heungbu-swallow'
on conflict (problem_id, ord, blank_key) do nothing;

-- rm-heungbu-swallow ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '흥부는 숨을 죽이고 제비 다리를 헝겊으로 감았다. 매듭을 두 번 확인했다.'
from problems p
where p.source_key = 'rm-heungbu-swallow'
on conflict (problem_id, ord, blank_key) do nothing;

-- rm-kongjwi-jar ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '콩쥐는 깨진 독에 물을 부었다. 물이 새어 나갔다. 그녀는 주저앉았다.'
from problems p
where p.source_key = 'rm-kongjwi-jar'
on conflict (problem_id, ord, blank_key) do nothing;

-- rm-kongjwi-jar ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '콩쥐는 깨진 독에 물을 부었다. 물이 바닥으로 빠졌다. 콩쥐는 바가지를 놓고 주저앉았다.'
from problems p
where p.source_key = 'rm-kongjwi-jar'
on conflict (problem_id, ord, blank_key) do nothing;

-- rm-simcheong-deck ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '심청은 뱃전으로 걸어갔다. 사람들은 그녀를 바라보았고, 뱃사공은 고개를 돌렸다.'
from problems p
where p.source_key = 'rm-simcheong-deck'
on conflict (problem_id, ord, blank_key) do nothing;

-- rm-simcheong-deck ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '심청이 뱃전에 섰다. 사람들이 입을 다물었다. 뱃사공은 고개를 돌려 노를 잡았다.'
from problems p
where p.source_key = 'rm-simcheong-deck'
on conflict (problem_id, ord, blank_key) do nothing;

-- sc-broken-vow ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '하은수가 청첩장을 접어 버린다. 행동 하나로 상황까지 전한다.'
from problems p
where p.source_key = 'sc-broken-vow'
on conflict (problem_id, ord, blank_key) do nothing;

-- sc-broken-vow ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '결혼론 강의로 시작한다. 이야기가 아니라 설명이다.'
from problems p
where p.source_key = 'sc-broken-vow'
on conflict (problem_id, ord, blank_key) do nothing;

-- sc-broken-vow ord 3 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 3, '', '카메라가 김 실장에게 가 있다. 주인공이 등장하지 못했다.'
from problems p
where p.source_key = 'sc-broken-vow'
on conflict (problem_id, ord, blank_key) do nothing;

-- sc-broken-vow ord 4 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 4, '', '''서글픈 기운''을 말로 알려준다. 보여주는 게 없다.'
from problems p
where p.source_key = 'sc-broken-vow'
on conflict (problem_id, ord, blank_key) do nothing;

-- sc-hunter-status ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '세상 설명부터 시작한다. 독자는 아직 누구를 따라가야 할지 모른다.'
from problems p
where p.source_key = 'sc-hunter-status'
on conflict (problem_id, ord, blank_key) do nothing;

-- sc-hunter-status ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '주인공이 구체적인 사물(상태창)을 만진다. 카메라가 강도윤에게 붙는다.'
from problems p
where p.source_key = 'sc-hunter-status'
on conflict (problem_id, ord, blank_key) do nothing;

-- sc-hunter-status ord 3 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 3, '', '카메라가 협회장에게 가 있다. 독자가 붙을 사람이 바뀐다.'
from problems p
where p.source_key = 'sc-hunter-status'
on conflict (problem_id, ord, blank_key) do nothing;

-- sc-hunter-status ord 4 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 4, '', '분위기를 말로 설명한다. 그릴 수 있는 사물이 없다.'
from problems p
where p.source_key = 'sc-hunter-status'
on conflict (problem_id, ord, blank_key) do nothing;

-- sc-sword-ruin ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '세력 지도부터 그린다. 주인공은 아직 화면에 없다.'
from problems p
where p.source_key = 'sc-sword-ruin'
on conflict (problem_id, ord, blank_key) do nothing;

-- sc-sword-ruin ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '카메라가 객잔 주인에게 가 있다. 진운의 이야기가 아니게 된다.'
from problems p
where p.source_key = 'sc-sword-ruin'
on conflict (problem_id, ord, blank_key) do nothing;

-- sc-sword-ruin ord 3 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 3, '', '부러진 검, 잿더미 — 만질 수 있는 사물 속에서 진운이 깨어난다.'
from problems p
where p.source_key = 'sc-sword-ruin'
on conflict (problem_id, ord, blank_key) do nothing;

-- sc-sword-ruin ord 4 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 4, '', '''스산한 기운''은 그림이 안 된다. 사물이 없다.'
from problems p
where p.source_key = 'sc-sword-ruin'
on conflict (problem_id, ord, blank_key) do nothing;

-- se-hunter-gate ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '그 일상 한복판에서 강도윤은 폐쇄 구역 철조망을 넘고 있었다. 장갑 낀 손이 녹슨 철망을 움켜쥐었다.'
from problems p
where p.source_key = 'se-hunter-gate'
on conflict (problem_id, ord, blank_key) do nothing;

-- se-hunter-gate ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '강도윤에게는 아니었다. 그는 오늘도 출입 금지 표지판 아래에서 헌터 면허증을 만지작거렸다.'
from problems p
where p.source_key = 'se-hunter-gate'
on conflict (problem_id, ord, blank_key) do nothing;

-- sw-hunter-dawn ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '강도윤은 식은땀에 젖은 베개에서 머리를 들었다. 창밖 하늘이 게이트가 열리던 그날처럼 붉었다.'
from problems p
where p.source_key = 'sw-hunter-dawn'
on conflict (problem_id, ord, blank_key) do nothing;

-- sw-hunter-dawn ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '알람이 울리기도 전에 강도윤은 눈을 떴다. 왼쪽 손목의 오래된 흉터가 밤새 욱신거렸다.'
from problems p
where p.source_key = 'sw-hunter-dawn'
on conflict (problem_id, ord, blank_key) do nothing;

-- rm-magpie-bridge ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '까치들이 날아와 몸을 이었다. 견우는 그 위에 발을 얹었다.'
from problems p
where p.source_key = 'rm-magpie-bridge'
on conflict (problem_id, ord, blank_key) do nothing;

-- rm-magpie-bridge ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '까치들이 날아와 몸을 이었다. 견우는 발끝으로 다리를 눌러 보았다.'
from problems p
where p.source_key = 'rm-magpie-bridge'
on conflict (problem_id, ord, blank_key) do nothing;

-- rm-rabbit-court ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '토끼는 웃으며 말했다. 용왕은 몸을 일으켰고, 신하들은 서로를 바라보았다.'
from problems p
where p.source_key = 'rm-rabbit-court'
on conflict (problem_id, ord, blank_key) do nothing;

-- rm-rabbit-court ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '토끼가 웃으며 말했다. 용왕이 자리를 박차고 일어섰다. 신하들이 서로를 돌아보았다.'
from problems p
where p.source_key = 'rm-rabbit-court'
on conflict (problem_id, ord, blank_key) do nothing;

-- rm-siblings-tree ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '오누이는 나무 위로 올라갔다. 호랑이는 아래에서 나무를 흔들었고, 아이들은 가지를 붙잡았다.'
from problems p
where p.source_key = 'rm-siblings-tree'
on conflict (problem_id, ord, blank_key) do nothing;

-- rm-siblings-tree ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '오누이가 나무 위로 기어올랐다. 호랑이가 밑동을 들이받았다. 아이들은 가지를 끌어안았다.'
from problems p
where p.source_key = 'rm-siblings-tree'
on conflict (problem_id, ord, blank_key) do nothing;

-- sc-boss-mirror ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '게임 소개문으로 시작한다. 주인공은 아직 없다.'
from problems p
where p.source_key = 'sc-boss-mirror'
on conflict (problem_id, ord, blank_key) do nothing;

-- sc-boss-mirror ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '거울 속 낯선 얼굴과 눈을 맞춘다. 빙의 상황이 행동 하나로 보인다.'
from problems p
where p.source_key = 'sc-boss-mirror'
on conflict (problem_id, ord, blank_key) do nothing;

-- sc-boss-mirror ord 3 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 3, '', '카메라가 병사들에게 가 있다. 이재하가 화면 밖이다.'
from problems p
where p.source_key = 'sc-boss-mirror'
on conflict (problem_id, ord, blank_key) do nothing;

-- sc-boss-mirror ord 4 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 4, '', '''잘못되었다는 느낌''은 설명이다. 무엇이 보이는지가 없다.'
from problems p
where p.source_key = 'sc-boss-mirror'
on conflict (problem_id, ord, blank_key) do nothing;

-- sc-villainess-chains ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '연호와 정세부터 푼다. ''제국력 ○년''은 역사서의 첫 줄이다.'
from problems p
where p.source_key = 'sc-villainess-chains'
on conflict (problem_id, ord, blank_key) do nothing;

-- sc-villainess-chains ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '카메라가 대신관에게 가 있다. 깨어난 건 카리엘인데.'
from problems p
where p.source_key = 'sc-villainess-chains'
on conflict (problem_id, ord, blank_key) do nothing;

-- sc-villainess-chains ord 3 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 3, '', '''형언할 수 없는 긴장감''은 독자가 그릴 수 없다.'
from problems p
where p.source_key = 'sc-villainess-chains'
on conflict (problem_id, ord, blank_key) do nothing;

-- sc-villainess-chains ord 4 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 4, '', '목에 감긴 쇠사슬을 더듬는다 — 처형 직전임이 사물로 전해진다.'
from problems p
where p.source_key = 'sc-villainess-chains'
on conflict (problem_id, ord, blank_key) do nothing;

-- rm-goblin-club ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '나무꾼은 방망이를 들어 내리쳤다. 곡식이 쏟아져 나왔다.'
from problems p
where p.source_key = 'rm-goblin-club'
on conflict (problem_id, ord, blank_key) do nothing;

-- rm-goblin-club ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '나무꾼은 방망이를 들었다. 손이 떨렸다. 그가 내리치자 곡식이 쏟아졌다.'
from problems p
where p.source_key = 'rm-goblin-club'
on conflict (problem_id, ord, blank_key) do nothing;

-- cc-street-night ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '윤소민은 헤어지자마자 잘 들어갔냐고 문자를 보냈다. 하늘은 휴대폰을 끄고 이어폰을 꽂았다.'
from problems p
where p.source_key = 'cc-street-night'
on conflict (problem_id, ord, blank_key) do nothing;

-- cc-street-night ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '하늘이 먼저 손을 흔들고 돌아섰다. 윤소민은 그 뒷모습이 골목을 다 빠져나갈 때까지 서 있었다.'
from problems p
where p.source_key = 'cc-street-night'
on conflict (problem_id, ord, blank_key) do nothing;

-- heungbu-joy ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '흥부는 금은보화를 한 움큼 쥐었다가 놓쳤다. 손이 자꾸 벌어졌다.'
from problems p
where p.source_key = 'heungbu-joy'
on conflict (problem_id, ord, blank_key) do nothing;

-- heungbu-joy ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '흥부는 주먹으로 입을 막았다. 어깨가 들썩이는 것을 누르지 못했다.'
from problems p
where p.source_key = 'heungbu-joy'
on conflict (problem_id, ord, blank_key) do nothing;

-- lk-cafe-wait ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '윤소민은 친구가 오기 전에 휴대폰을 계속 만지작거렸다. 벌써 세 번이었다. 답장 없는 대화창을 열었다가 덮었다.'
from problems p
where p.source_key = 'lk-cafe-wait'
on conflict (problem_id, ord, blank_key) do nothing;

-- lk-cafe-wait ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '윤소민은 점원이 물잔을 채워 주자 몇 번째인지 모를 고맙다는 인사와 동시에 물잔을 비웠다. 그러고는 문이 열릴 때마다 고개를 들었다.'
from problems p
where p.source_key = 'lk-cafe-wait'
on conflict (problem_id, ord, blank_key) do nothing;

-- se-sword-five ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '그 다섯 어디에도 진운의 자리는 없었다. 소년은 세가의 높은 담 아래에서 목검을 고쳐 쥐었다.'
from problems p
where p.source_key = 'se-sword-five'
on conflict (problem_id, ord, blank_key) do nothing;

-- se-sword-five ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '진운은 그 이름들을 땔감 패듯 외웠다. 도끼가 장작에 박힐 때마다 하나씩.'
from problems p
where p.source_key = 'se-sword-five'
on conflict (problem_id, ord, blank_key) do nothing;

-- sim-cheong-fear ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '심청은 치맛자락을 움켜쥐었다. 발이 뱃전 앞에서 멈췄다.'
from problems p
where p.source_key = 'sim-cheong-fear'
on conflict (problem_id, ord, blank_key) do nothing;

-- sim-cheong-fear ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '심청은 숨을 들이켰다. 손끝이 하얗게 되도록 치마를 쥐었다.'
from problems p
where p.source_key = 'sim-cheong-fear'
on conflict (problem_id, ord, blank_key) do nothing;

-- sw-ruin-ash ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '진운은 무너진 대문 기둥에 손을 짚었다. 손바닥에 아직 식지 않은 재의 온기가 묻어났다.'
from problems p
where p.source_key = 'sw-ruin-ash'
on conflict (problem_id, ord, blank_key) do nothing;

-- sw-ruin-ash ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '진운이 마당을 가로지르자 발밑에서 그을린 기왓장이 바스러졌다.'
from problems p
where p.source_key = 'sw-ruin-ash'
on conflict (problem_id, ord, blank_key) do nothing;

-- dragon-king-anger ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '용왕이 옥좌의 팔걸이를 내리쳤다. 산호 술잔이 바닥에 굴렀다.'
from problems p
where p.source_key = 'dragon-king-anger'
on conflict (problem_id, ord, blank_key) do nothing;

-- dragon-king-anger ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '용왕은 수염을 부르르 떨며 일어섰다. 목소리가 대전 기둥을 울렸다.'
from problems p
where p.source_key = 'dragon-king-anger'
on conflict (problem_id, ord, blank_key) do nothing;

-- kongjwi-grief ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '콩쥐는 깨진 독의 조각을 하나씩 주워 모았다. 조각이 손에서 자꾸 미끄러졌다.'
from problems p
where p.source_key = 'kongjwi-grief'
on conflict (problem_id, ord, blank_key) do nothing;

-- kongjwi-grief ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '콩쥐는 마당 한가운데 섰다. 잔치 소리가 담 너머에서 들려왔다. 그녀는 깨진 독을 바라보았다.'
from problems p
where p.source_key = 'kongjwi-grief'
on conflict (problem_id, ord, blank_key) do nothing;

-- gyeonu-longing ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '견우는 소를 몰다 말고 강가에 앉았다. 물에 비친 하늘만 오래 바라보았다.'
from problems p
where p.source_key = 'gyeonu-longing'
on conflict (problem_id, ord, blank_key) do nothing;

-- gyeonu-longing ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '견우는 달력 대신 강물을 보러 갔다. 다리가 놓일 자리를 손가락으로 그어 보았다.'
from problems p
where p.source_key = 'gyeonu-longing'
on conflict (problem_id, ord, blank_key) do nothing;

-- woodcutter-shame ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '나무꾼은 고개를 들지 못했다. 손이 제 낡은 도끼자루만 만지작거렸다.'
from problems p
where p.source_key = 'woodcutter-shame'
on conflict (problem_id, ord, blank_key) do nothing;

-- woodcutter-shame ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '나무꾼은 두 도끼에서 눈을 돌렸다. 목덜미가 달아올라 뒷걸음질을 쳤다.'
from problems p
where p.source_key = 'woodcutter-shame'
on conflict (problem_id, ord, blank_key) do nothing;

-- cc-first-pay ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '유겸은 첫 삯을 받자마자 술자리부터 잡았다. 얻어먹은 밥값을 갚는 자리라며 조평의 잔부터 채웠다. 조평은 그 잔을 두 손으로 받고, 제 삯 절반을 전대 바닥에 꿰매 넣었다. 남은 반에서 신참들 안주 한 접시를 더 시킨 것도 조평이었다.'
from problems p
where p.source_key = 'cc-first-pay'
on conflict (problem_id, ord, blank_key) do nothing;

-- cc-first-pay ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '조평은 제 잔에는 가장 싼 술을 시켰다. 그러면서 신참들 상에는 고기 한 접시를 말없이 올려 보냈다. 그 값을 셈하려는 조평의 손을 유겸이 웃으며 눌렀다. 오늘은 갚는 날이라고, 여기부터는 제 몫이라고 했다.'
from problems p
where p.source_key = 'cc-first-pay'
on conflict (problem_id, ord, blank_key) do nothing;

-- lk-guard-dawn ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '조평은 아침상의 밥알 한 톨까지 긁어 먹었다. 남은 찬은 종이에 싸서 봇짐 안쪽에 넣었다.'
from problems p
where p.source_key = 'lk-guard-dawn'
on conflict (problem_id, ord, blank_key) do nothing;

-- lk-guard-dawn ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '조평은 새 검집을 받고도 헌 검집을 버리지 못했다. 손잡이의 해진 끈을 다시 감아 맸다.'
from problems p
where p.source_key = 'lk-guard-dawn'
on conflict (problem_id, ord, blank_key) do nothing;

-- se-vow-deal ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '하은수는 그 큰 거래를 한 달 앞두고 물렀다. 웨딩홀 위약금 안내문을 두 번 접으면서.'
from problems p
where p.source_key = 'se-vow-deal'
on conflict (problem_id, ord, blank_key) do nothing;

-- se-vow-deal ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '하은수는 방금 그 거래에서 풀려났다. 손에는 계약금 환불 확인서가 들려 있었다.'
from problems p
where p.source_key = 'se-vow-deal'
on conflict (problem_id, ord, blank_key) do nothing;

-- sw-vow-afternoon ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '하은수는 왼손 약지의 반지를 돌려 뺐다. 반지가 있던 자리만 하얗게 남아 있었다.'
from problems p
where p.source_key = 'sw-vow-afternoon'
on conflict (problem_id, ord, blank_key) do nothing;

-- sw-vow-afternoon ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '하은수는 예식장 상담 전화를 끊고 휴대폰을 엎어 두었다. 식탁 위 커피가 다 식어 있었다.'
from problems p
where p.source_key = 'sw-vow-afternoon'
on conflict (problem_id, ord, blank_key) do nothing;

-- tp-axe-water ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '나무꾼은 연못가에 앉았다. 도끼는 보이지 않았다. 소매를 걷고 물에 손을 넣었다.'
from problems p
where p.source_key = 'tp-axe-water'
on conflict (problem_id, ord, blank_key) do nothing;

-- tp-axe-water ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '나무꾼은 연못가에 앉아 소매를 걷었다. 도끼가 안 보이는 물에 손을 넣었다.'
from problems p
where p.source_key = 'tp-axe-water'
on conflict (problem_id, ord, blank_key) do nothing;

-- tp-heungbu-yard ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '흥부는 마당에 나갔다. 제비 한 마리가 떨어져 있었다. 흥부는 제비를 들어 올렸다.'
from problems p
where p.source_key = 'tp-heungbu-yard'
on conflict (problem_id, ord, blank_key) do nothing;

-- tp-heungbu-yard ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '마당에 제비 한 마리가 떨어져 있었다. 흥부는 두 손으로 들어 올렸다.'
from problems p
where p.source_key = 'tp-heungbu-yard'
on conflict (problem_id, ord, blank_key) do nothing;

-- tp-simcheong-rail ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '심청은 뱃전에 섰다. 심청은 치마를 걷어쥐었다.'
from problems p
where p.source_key = 'tp-simcheong-rail'
on conflict (problem_id, ord, blank_key) do nothing;

-- tp-simcheong-rail ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '심청은 뱃전에 서서 치마를 걷어쥐었다.'
from problems p
where p.source_key = 'tp-simcheong-rail'
on conflict (problem_id, ord, blank_key) do nothing;

-- tp-gyeonu-river ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '견우는 강가에 나왔다. 까치들이 하늘을 덮었다. 견우는 강물에 발을 담갔다.'
from problems p
where p.source_key = 'tp-gyeonu-river'
on conflict (problem_id, ord, blank_key) do nothing;

-- tp-gyeonu-river ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '견우가 강가에 나오자 까치들이 하늘을 덮었다. 그는 강물에 발을 담갔다.'
from problems p
where p.source_key = 'tp-gyeonu-river'
on conflict (problem_id, ord, blank_key) do nothing;

-- tp-kongjwi-crack ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '콩쥐는 독 앞에 앉았다. 바닥에 금이 가 있었다. 콩쥐는 손바닥으로 눌렀다.'
from problems p
where p.source_key = 'tp-kongjwi-crack'
on conflict (problem_id, ord, blank_key) do nothing;

-- tp-kongjwi-crack ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '독 바닥에 금이 가 있었다. 콩쥐는 그 자리를 손바닥으로 눌렀다.'
from problems p
where p.source_key = 'tp-kongjwi-crack'
on conflict (problem_id, ord, blank_key) do nothing;

-- tp-rabbit-gate ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '토끼는 용궁 문 앞에 섰다. 문지기가 창을 내렸다. 토끼는 웃으며 나섰다.'
from problems p
where p.source_key = 'tp-rabbit-gate'
on conflict (problem_id, ord, blank_key) do nothing;

-- tp-rabbit-gate ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '문지기가 창을 내렸다. 토끼는 웃으며 한 걸음 나섰다.'
from problems p
where p.source_key = 'tp-rabbit-gate'
on conflict (problem_id, ord, blank_key) do nothing;

-- tp-siblings-floor ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '오누이는 마루 밑에 숨었다. 문밖에서 발소리가 났다. 오라비가 동생의 입을 막았다.'
from problems p
where p.source_key = 'tp-siblings-floor'
on conflict (problem_id, ord, blank_key) do nothing;

-- tp-siblings-floor ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '마루 밑에서 발소리를 들었다. 오라비가 동생의 입을 막았다.'
from problems p
where p.source_key = 'tp-siblings-floor'
on conflict (problem_id, ord, blank_key) do nothing;

-- tp-goblin-mark ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '나무꾼은 방망이를 상 위에 올렸다. 검은 자국이 남아 있었다. 그는 다시 집어 들었다.'
from problems p
where p.source_key = 'tp-goblin-mark'
on conflict (problem_id, ord, blank_key) do nothing;

-- tp-goblin-mark ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '방망이에 검은 자국이 남아 있었다. 나무꾼은 그것을 다시 집어 들었다.'
from problems p
where p.source_key = 'tp-goblin-mark'
on conflict (problem_id, ord, blank_key) do nothing;

-- cc-raid-reward ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '보상 목록이 뜨자 한시우는 도현의 몫부터 훑었다. 도현은 제 몫을 확인도 않고 다음 일정을 물었다.'
from problems p
where p.source_key = 'cc-raid-reward'
on conflict (problem_id, ord, blank_key) do nothing;

-- cc-raid-reward ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '도현이 먼저 수고했다며 손을 내밀었다. 한시우는 그 손을 잡으며 상대의 장갑 등급을 읽고 있었다.'
from problems p
where p.source_key = 'cc-raid-reward'
on conflict (problem_id, ord, blank_key) do nothing;

-- lk-board-rank ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '한시우는 협회 게시판의 승급 명단을 끝까지 읽었다. 동기의 이름에서 손가락이 한 번 멈췄다.'
from problems p
where p.source_key = 'lk-board-rank'
on conflict (problem_id, ord, blank_key) do nothing;

-- lk-board-rank ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '한시우는 동기의 인터뷰 영상을 소리 없이 돌려 보았다. 화면에 반사된 얼굴이 동기의 모습과 상반되어 있었다.'
from problems p
where p.source_key = 'lk-board-rank'
on conflict (problem_id, ord, blank_key) do nothing;

-- rp-axe-gold ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '산신령이 번쩍이는 금도끼를 들어 보였다. "이것이 네 것이냐?" 나무꾼은 고개를 저었다. "제 것이 아닙니다." 은도끼가 나왔을 때도 나무꾼은 고개를 저었다.'
from problems p
where p.source_key = 'rp-axe-gold'
on conflict (problem_id, ord, blank_key) do nothing;

-- rp-axe-gold ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '산신령이 금도끼와 은도끼를 차례로 들어 보였다. 나무꾼은 그때마다 고개를 저으며 제 것이 아니라고 답했다.'
from problems p
where p.source_key = 'rp-axe-gold'
on conflict (problem_id, ord, blank_key) do nothing;

-- rp-heungbu-gourd ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '흥부는 박을 반으로 갈랐다. 속에서 쌀이 쏟아졌다. "여보, 쌀이에요!" 두 번째 박을 가르자 이번에는 비단이 나왔다.'
from problems p
where p.source_key = 'rp-heungbu-gourd'
on conflict (problem_id, ord, blank_key) do nothing;

-- rp-heungbu-gourd ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '첫 박에서는 쌀이, 두 번째 박에서는 비단이 쏟아져 나왔다. "여보, 우리 이제 살았어요!" 흥부는 톱을 놓고 웃었다.'
from problems p
where p.source_key = 'rp-heungbu-gourd'
on conflict (problem_id, ord, blank_key) do nothing;

-- rp-simcheong-sea ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '심청은 뱃전에서 검게 일렁이는 바다를 내려다보았다. 뱃사람들이 북을 울렸다. 심청은 눈을 감았다. "아버지, 부디 눈을 뜨세요." 그리고 바다로 몸을 던졌다.'
from problems p
where p.source_key = 'rp-simcheong-sea'
on conflict (problem_id, ord, blank_key) do nothing;

-- rp-simcheong-sea ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '검은 물결이 일렁이는 인당수 앞에서 심청은 눈을 감았다. "아버지, 부디 눈을 뜨세요." 북소리가 울리는 가운데 심청은 바다로 몸을 던졌다.'
from problems p
where p.source_key = 'rp-simcheong-sea'
on conflict (problem_id, ord, blank_key) do nothing;

-- se-rose-heir ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '그 삼백 년의 마지막에 에스텔이 서 있었다. 압류 딱지가 붙은 대문 앞에서, 가문의 검을 등에 고쳐 멨다.'
from problems p
where p.source_key = 'se-rose-heir'
on conflict (problem_id, ord, blank_key) do nothing;

-- se-rose-heir ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '에스텔은 그 오랜 이름값을 오늘 치렀다. 황궁에서 온 소환장이 손안에서 구겨졌다.'
from problems p
where p.source_key = 'se-rose-heir'
on conflict (problem_id, ord, blank_key) do nothing;

-- sw-scaffold-morning ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '카리엘은 손목을 묶은 밧줄을 비틀어 보았다. 거친 올이 살갗을 파고들었다.'
from problems p
where p.source_key = 'sw-scaffold-morning'
on conflict (problem_id, ord, blank_key) do nothing;

-- sw-scaffold-morning ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '계단을 오르는 카리엘의 맨발 밑에서 돌의 한기가 올라왔다.'
from problems p
where p.source_key = 'sw-scaffold-morning'
on conflict (problem_id, ord, blank_key) do nothing;

-- rp-kongjwi-jar ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '콩쥐는 물을 길어다 독에 부었다. 그러나 밑으로 다 새어 나가, 채워도 채워도 독은 차지 않았다. 콩쥐는 항아리를 안은 채 주저앉아 울었다.'
from problems p
where p.source_key = 'rp-kongjwi-jar'
on conflict (problem_id, ord, blank_key) do nothing;

-- rp-kongjwi-jar ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '콩쥐가 아무리 길어다 부어도 독은 차지 않았다. 물은 깨진 밑으로 다 새어 나갔다. 콩쥐는 빈 독 앞에 주저앉아 울고 말았다.'
from problems p
where p.source_key = 'rp-kongjwi-jar'
on conflict (problem_id, ord, blank_key) do nothing;

-- rp-magpie-bridge ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '까치들이 은하수 위로 다리를 놓았고, 강 건너까지 길게 이어졌다. 견우는 떨리는 발로 올랐다. 다리가 출렁일 때마다 까치들이 날개를 퍼덕였다. "직녀님!" 견우는 직녀를 향해 내달렸다.'
from problems p
where p.source_key = 'rp-magpie-bridge'
on conflict (problem_id, ord, blank_key) do nothing;

-- rp-magpie-bridge ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '까치들이 놓은 다리가 은하수를 가로질렀다. 견우는 출렁이는 그 길 위를 내달리며 외쳤다. "직녀님!" 발밑에서 까치들의 날개가 퍼덕였다.'
from problems p
where p.source_key = 'rp-magpie-bridge'
on conflict (problem_id, ord, blank_key) do nothing;

-- rp-rabbit-liver ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '용왕이 간을 내놓으라고 명했다. 토끼는 침착하게 대답했다. "워낙 귀한 것이라, 깊은 산속에 감추어 두고 왔습니다." 신하들이 그런 짐승이 어디 있느냐고 다그쳤지만, 토끼는 태연히 웃기만 했다.'
from problems p
where p.source_key = 'rp-rabbit-liver'
on conflict (problem_id, ord, blank_key) do nothing;

-- rp-rabbit-liver ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '간을 내놓으라는 용왕의 명에 토끼는 태연히 답했다. "귀한 것이라 산속에 감추어 두고 왔지요." 신하들이 다그쳐도 토끼는 웃기만 했다.'
from problems p
where p.source_key = 'rp-rabbit-liver'
on conflict (problem_id, ord, blank_key) do nothing;

-- rp-siblings-rope ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '오누이는 나무 꼭대기에서 두 손을 모아 빌었다. "하느님, 튼튼한 동아줄을 내려 주세요." 하늘에서 스르르 내려온 줄을 오누이는 꽉 잡았다. 동아줄은 둘을 매단 채 하늘로 올라갔다.'
from problems p
where p.source_key = 'rp-siblings-rope'
on conflict (problem_id, ord, blank_key) do nothing;

-- rp-siblings-rope ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '"하느님, 튼튼한 동아줄을 내려 주세요." 오누이의 기도에 하늘에서 줄이 스르르 내려왔다. 둘은 그것을 꽉 잡고 하늘로 올라갔다.'
from problems p
where p.source_key = 'rp-siblings-rope'
on conflict (problem_id, ord, blank_key) do nothing;

-- rp-goblin-club ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '도깨비들이 방망이를 휘두르며 외쳤다. "은 나와라, 뚝딱!" 은돈이 쏟아졌다. "금 나와라, 뚝딱!" 방망이는 멈추지 않고 보물을 쏟아 냈다.'
from problems p
where p.source_key = 'rp-goblin-club'
on conflict (problem_id, ord, blank_key) do nothing;

-- rp-goblin-club ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '도깨비들이 방망이를 휘두를 때마다 은돈과 금돈이 쏟아졌다. "나와라, 뚝딱!" 외침이 이어질수록 보물은 멈추지 않고 쌓여 갔다.'
from problems p
where p.source_key = 'rp-goblin-club'
on conflict (problem_id, ord, blank_key) do nothing;

-- cc-relic-box ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '셀라는 상자 속 지팡이에 감정가부터 매겼다. 리안은 손잡이의 닳은 자리에 제 손을 포개 보았다.'
from problems p
where p.source_key = 'cc-relic-box'
on conflict (problem_id, ord, blank_key) do nothing;

-- cc-relic-box ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '리안은 상자를 여는 데 한참이 걸렸다. 셀라는 그사이 목록 양피지에 품목을 두 줄 적었다.'
from problems p
where p.source_key = 'cc-relic-box'
on conflict (problem_id, ord, blank_key) do nothing;

-- lk-tower-shelf ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '리안은 스승의 낡은 지팡이를 새 지팡이 옆에 세워 두었다. 먼지는 낡은 쪽부터 닦았다.'
from problems p
where p.source_key = 'lk-tower-shelf'
on conflict (problem_id, ord, blank_key) do nothing;

-- lk-tower-shelf ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '리안은 주문서를 정리하다 여백의 손글씨 앞에서 멈췄다. 그 갈피만 끈으로 따로 묶어 두었다.'
from problems p
where p.source_key = 'lk-tower-shelf'
on conflict (problem_id, ord, blank_key) do nothing;

-- se-phoenix-mound ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '그 구단의 불펜에서 서준혁은 혼자 공을 던지고 있었다. 방출 통보서가 글러브 옆에 접혀 있었다.'
from problems p
where p.source_key = 'se-phoenix-mound'
on conflict (problem_id, ord, blank_key) do nothing;

-- se-phoenix-mound ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '서준혁은 그 기록의 끝자리에 이름을 올린 투수였다. 그는 빈 마운드의 흙을 스파이크로 골랐다.'
from problems p
where p.source_key = 'se-phoenix-mound'
on conflict (problem_id, ord, blank_key) do nothing;

-- sw-boss-wake ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '이재하는 제 손등을 덮은 검은 비늘을 손톱으로 긁어 보았다. 비늘은 꿈쩍도 하지 않았다.'
from problems p
where p.source_key = 'sw-boss-wake'
on conflict (problem_id, ord, blank_key) do nothing;

-- sw-boss-wake ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '몸을 일으키던 이재하는 돌 천장에 머리를 박았다. 침대가 제 방 것보다 두 뼘은 높았다.'
from problems p
where p.source_key = 'sw-boss-wake'
on conflict (problem_id, ord, blank_key) do nothing;

-- cc-praise-callout ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '호명된 서담은 손사래를 치며 반쯤 일어섰다. 팀장님이 다 하신 건데요, 하는 목소리가 끝까지 작았다. 그런데 자리로 돌아온 뒤에도 상장은 서류철에 못 들어갔다. 모니터 옆에 세워 둔 채, 오후 내내 그쪽으로 눈을 안 주는 척했다.'
from problems p
where p.source_key = 'cc-praise-callout'
on conflict (problem_id, ord, blank_key) do nothing;

-- cc-praise-callout ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '서담은 상을 받는 내내 고개를 숙이고 있었다. 회식 자리에서 그 얘기가 나오자 화제부터 돌렸다. 그런데 그날 밤 서담은 상장을 서랍에 반듯하게 눕혔다. 모서리가 구겨질까 봐 파일까지 끼웠다.'
from problems p
where p.source_key = 'cc-praise-callout'
on conflict (problem_id, ord, blank_key) do nothing;

-- cc-ace-siren ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '도현은 무전을 끊고 매니저에게 고개를 돌려 말했다. 인터뷰를 미뤄야겠다는 말투는 평소처럼 부드러웠다. 그러나 대답을 다 듣기도 전에 몸은 이미 차가 있는 방향으로 가고 있었다.'
from problems p
where p.source_key = 'cc-ace-siren'
on conflict (problem_id, ord, blank_key) do nothing;

-- cc-ace-siren ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '무전이 끝나자 도현은 평온한 표정으로 인터뷰를 미뤄달라고 부탁했다. 사과 인사도 빠뜨리지 않았다. 병원에 도착하고 엘리베이터를 힐끔 보다 걸음을 돌렸다. 원체 엘리베이터만 고집하던 사람이 그날은 빠른 걸음으로 계단을 올랐다.'
from problems p
where p.source_key = 'cc-ace-siren'
on conflict (problem_id, ord, blank_key) do nothing;

-- cc-night-shift ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '도련님이 새벽 경계도 서겠냐는 말에 웃음이 돌았다. 유겸은 더 크게 웃으며 명부에 제 이름을 적었다. 그게 얼마나 한다고요, 하는 목소리도 가벼웠다. 그러나 붓을 내려놓는 손등에는 힘줄이 서 있었다.'
from problems p
where p.source_key = 'cc-night-shift'
on conflict (problem_id, ord, blank_key) do nothing;

-- cc-night-shift ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '유겸은 웃는 낯으로 새벽 구간에 손을 들었다. 잠이 안 와서 그런다며 너스레까지 떨었다. 그런데 그날 밤 순찰을 도는 걸음은 평소보다 배로 촘촘했다. 담장 아래 어둠을 살피는 눈에 웃음기가 없었다.'
from problems p
where p.source_key = 'cc-night-shift'
on conflict (problem_id, ord, blank_key) do nothing;

-- cc-junk-dealer ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '셀라는 값을 듣자마자 목록을 덮었다. 은화 열 닢 아래로는 안 판다는 목소리에 흥정의 여지가 없었다. 돌아가는 길, 셀라는 수레 위 유품 보자기를 다시 여몄다. 매듭이 풀리지 않게 두 번을 더 조였다.'
from problems p
where p.source_key = 'cc-junk-dealer'
on conflict (problem_id, ord, blank_key) do nothing;

-- cc-junk-dealer ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '셀라는 물건을 도로 싸며 값을 두 번 말하지 않았다. 장부에는 오늘 값만 짧게 적었다. 다만 상자를 드는 리안의 손이 느려지자, 셀라는 제 몫의 짐을 먼저 지고 앞서 걸었다. 재촉하는 말 대신 걸음만 늦췄다.'
from problems p
where p.source_key = 'cc-junk-dealer'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-cracked-ice ord 1 ①
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '①', '건너올 때 저 자리에서 발밑이 울렸다. 도경은 그 소리를 기억했다.'
from problems p
where p.source_key = 'ar-cracked-ice'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-cracked-ice ord 1 ②
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '②', '늑대는 물러서는 먹이를 그냥 두지 않는다. 여섯이 한 덩어리로 따라붙었다.'
from problems p
where p.source_key = 'ar-cracked-ice'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-cracked-ice ord 2 ①
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '①', '강 한가운데만 얼음이 검었다. 아래로 물이 흐르고 있다는 뜻이다.'
from problems p
where p.source_key = 'ar-cracked-ice'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-cracked-ice ord 2 ②
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '②', '도경이 등을 보이자 늑대들이 거리를 좁혔다. 무리는 흩어질 줄을 몰랐다.'
from problems p
where p.source_key = 'ar-cracked-ice'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-cracked-ice ord 3 ①
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 3, '①', '도경은 발을 헛디딘 척 뒤로 밀렸다. 물러서는 것처럼 보여야 했다.'
from problems p
where p.source_key = 'ar-cracked-ice'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-cracked-ice ord 3 ②
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 3, '②', '앞선 두 마리가 뛰어들자 나머지도 따라붙었다. 여섯이 한 자리에 모였다.'
from problems p
where p.source_key = 'ar-cracked-ice'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-dragon-jaw ord 1 ②
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '②', '휘두른 팔을 따라 상체가 앞으로 쏠렸다. 턱이 그만큼 내려와 있었다.'
from problems p
where p.source_key = 'ar-dragon-jaw'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-dragon-jaw ord 2 ①
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '①', '태윤은 숨을 멈추고 발끝에 무게를 옮겼다.'
from problems p
where p.source_key = 'ar-dragon-jaw'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-dragon-jaw ord 2 ②
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '②', '주변 소리가 멀어질 만큼 집중이 올라갔다. 느리게 흐르는 시야 안에서 턱이 눈앞에 있었다.'
from problems p
where p.source_key = 'ar-dragon-jaw'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-dragon-jaw ord 3 ①
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 3, '①', '한 방을 제대로 넣지 못하면 끝난다. 거리를 좁혀 안으로 파고 들어간다.'
from problems p
where p.source_key = 'ar-dragon-jaw'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-dragon-jaw ord 3 ②
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 3, '②', '괴물은 팔을 휘두를 때마다 턱을 앞으로 내밀었다. 세 번을 세었다.'
from problems p
where p.source_key = 'ar-dragon-jaw'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-dull-blade ord 1 ①
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '①', '느린 검이었다. 받아치면 막을 수 있다고 보았다.'
from problems p
where p.source_key = 'ar-dull-blade'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-dull-blade ord 1 ②
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '②', '가공할 힘이 검을 짓눌렀다. 자세가 무너지는 데 한 호흡도 걸리지 않았다.'
from problems p
where p.source_key = 'ar-dull-blade'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-dull-blade ord 2 ①
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '①', '사부의 검은 빠르지 않다. 무결은 정면으로 맞받기로 했다.'
from problems p
where p.source_key = 'ar-dull-blade'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-dull-blade ord 2 ②
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '②', '검을 통해 내려온 무게가 손목을 꺾고 무릎을 땅에 붙였다.'
from problems p
where p.source_key = 'ar-dull-blade'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-dull-blade ord 3 ①
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 3, '①', '무결은 피하는 대신 검을 세웠다. 여기서 물러서면 배울 것이 없었다.'
from problems p
where p.source_key = 'ar-dull-blade'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-dull-blade ord 3 ②
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 3, '②', '검에 중검의 묘리가 스며들었다. 그것을 알았을 때는 이미 늦었다.'
from problems p
where p.source_key = 'ar-dull-blade'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-bell-rope ord 1 ①
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '①', '서린은 몸을 낮추고 옆으로 굴렀다. 등 뒤는 이미 벽이었다.'
from problems p
where p.source_key = 'ar-bell-rope'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-bell-rope ord 1 ②
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '②', '뺨을 타고 뜨거운 것이 흘러내렸다.'
from problems p
where p.source_key = 'ar-bell-rope'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-bell-rope ord 1 ③
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '③', '등이 닿은 자리에 굵은 줄이 걸려 있었다. 누이와 공물을 올리던 날에도 이 줄은 그 자리에 있었다.'
from problems p
where p.source_key = 'ar-bell-rope'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-bell-rope ord 2 ①
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '①', '서린은 두 팔로 머리를 감싸고 벽을 따라 돌았다.'
from problems p
where p.source_key = 'ar-bell-rope'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-bell-rope ord 2 ②
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '②', '피가 턱을 타고 내려왔다. 맞서 봐야 이길 수 없다. 어릴 적 누이가 해 준 이야기가 그때 떠올랐다.'
from problems p
where p.source_key = 'ar-bell-rope'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-bell-rope ord 2 ③
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '③', '벽을 더듬던 손끝에 젖은 삼줄이 걸렸다. 서린은 두 손으로 그것을 감았다.'
from problems p
where p.source_key = 'ar-bell-rope'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-broken-gate ord 1 ①
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '①', '등이 돌무더기에 처박혔다. 숨이 한 번에 빠져나갔다.'
from problems p
where p.source_key = 'ar-broken-gate'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-broken-gate ord 1 ②
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '②', '목을 덮은 비늘 사이로 역린이 드러났다.'
from problems p
where p.source_key = 'ar-broken-gate'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-broken-gate ord 2 ①
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '①', '세연은 잔해에 손을 짚고 몸을 일으켰다. 팔이 말을 듣지 않았다.'
from problems p
where p.source_key = 'ar-broken-gate'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-broken-gate ord 2 ②
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '②', '들이미는 머리에 따라 빈틈이 보였다. 목 아래 비늘이 얇은 자리가 거기였다.'
from problems p
where p.source_key = 'ar-broken-gate'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-left-draw ord 1 ①
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '①', '저 칼을 한 손으로는 버틸 수 없다. 상대도 그걸 알고 도는 것이다.'
from problems p
where p.source_key = 'ar-left-draw'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-left-draw ord 1 ②
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '②', '무결은 팔뚝을 세워 검을 받았다. 반쯤 베였지만 검은 거기서 멈췄다.'
from problems p
where p.source_key = 'ar-left-draw'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-left-draw ord 2 ①
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '①', '저번과 같은 자세다. 같은 기술이 온다.'
from problems p
where p.source_key = 'ar-left-draw'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-left-draw ord 2 ②
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '②', '무결은 끊긴 힘줄에 내공을 밀어 넣어 억지로 손을 접었다. 억지로 이어 붙인 자리가 타들어가는 느낌이 들었다.'
from problems p
where p.source_key = 'ar-left-draw'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-left-draw ord 3 ①
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 3, '①', '저 칼을 막을 수 없다. 그러면 막지 않으면 된다.'
from problems p
where p.source_key = 'ar-left-draw'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-left-draw ord 3 ②
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 3, '②', '무결은 오른팔을 상대의 검 앞으로 들이밀었다. 팔이 베이며 생긴 그 짧은 틈에 왼손이 들어갔다.'
from problems p
where p.source_key = 'ar-left-draw'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-wind-gate ord 1 ①
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '①', '연희는 바람을 벽처럼 세워 화살을 막고, 그 바람을 그대로 앞으로 밀었다.'
from problems p
where p.source_key = 'ar-wind-gate'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-wind-gate ord 1 ②
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '②', '갈라진 자리로 성문까지 곧게 길이 났다.'
from problems p
where p.source_key = 'ar-wind-gate'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-wind-gate ord 2 ①
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '①', '머리 위로 손을 뻗어 공기를 눕히자 화살이 방향을 잃었다. 연희는 그 공기를 모아 날을 세웠다.'
from problems p
where p.source_key = 'ar-wind-gate'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-wind-gate ord 2 ②
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '②', '성문 앞을 메우던 병사들이 물러났다. 남은 것은 문 하나였다.'
from problems p
where p.source_key = 'ar-wind-gate'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-wind-gate ord 3 ①
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 3, '①', '막기만 해서는 오늘을 못 넘긴다. 연희는 화살을 걷어 내며 손을 앞으로 뻗었다.'
from problems p
where p.source_key = 'ar-wind-gate'
on conflict (problem_id, ord, blank_key) do nothing;

-- ar-wind-gate ord 3 ②
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 3, '②', '진형이 흩어지자 성문이 그대로 드러났다.'
from problems p
where p.source_key = 'ar-wind-gate'
on conflict (problem_id, ord, blank_key) do nothing;

-- cc-flash-crowd ord 1 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 1, '', '카메라 앞으로 헌터들이 줄을 이뤘다. 한시우는 그 줄을 지나쳐 장비부터 쌌다. 등 뒤에서 인터뷰 소리가 커졌다 작아졌다. 훈련장 예약까지 십 분, 한시우의 걸음은 게이트 반대쪽으로 멀어지고 있었다.'
from problems p
where p.source_key = 'cc-flash-crowd'
on conflict (problem_id, ord, blank_key) do nothing;

-- cc-flash-crowd ord 2 
insert into reference_answers (problem_id, ord, blank_key, content)
select p.id, 2, '', '플래시가 터질 때마다 사람들의 고개가 그쪽으로 쏠렸다. 한시우만 무너진 방벽 앞에 쪼그려 앉았다. 제 검이 낸 흔적을 손끝으로 재고 수첩에 옮겨 적었다. 등 뒤의 환호는 한 번도 돌아보지 않았다.'
from problems p
where p.source_key = 'cc-flash-crowd'
on conflict (problem_id, ord, blank_key) do nothing;

-- ── 비활성 ─────────────────────────────────────────────────────────
-- 옛 action_turn convert 8건(재설계안 11-4·세션 18. 재료·픽스처는 11-5 픽스처 갈아엎기 때 삭제) + 구성 12 재설계로 밀려난 대비형 cc- 4건(세션 32 후기 — '입체 캐릭터'로 교체. cc-first-pay 는 활성 유지). 제출 이력 보존, 행 삭제 안 함.

update problems set is_active = false
 where source_key in ('at-left-feint', 'at-left-draw', 'at-left-feeler', 'at-broken-gate', 'at-cracked-ice', 'at-bell-rope', 'at-look-back', 'at-edit-log', 'cc-report-credit', 'cc-street-night', 'cc-raid-reward', 'cc-relic-box');

commit;

select '시드 적용 완료. 다음: seed_check.sql' as 결과,
       (select count(*) from problems) as 문항수,
       (select count(*) from stages) as 단계수;
