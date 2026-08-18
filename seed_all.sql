-- =====================================================================
-- novel-trainer 시드 (통합본)
--
-- 이 파일 하나만 실행한다. seed_problems / seed_patch_01 / seed_patch_02 는 쓰지 않는다.
-- 그 셋은 편집 이력이 만든 산물이고, 뒤의 것이 앞의 것을 고치는 구조라
-- 순서를 틀리면 조용히 어긋난다. 여기서는 처음부터 최종값으로 넣는다.
--
-- 실행 후 seed_convert.sql 을 이어서 실행한다.
--   (convert 문항 설정의 단일 출처는 lib/scoring/fixtures/convert-seeds.ts 이고,
--    npm run gen:seed 가 그 파일을 만든다)
--
-- 전체가 하나의 트랜잭션이다. 마지막 불변식 검사가 깨지면 전부 롤백된다.
-- delete 구문은 없다.
--
-- 재실행해도 안전하다.
-- =====================================================================

begin;

-- ── 0. 스키마 보강 ───────────────────────────────────────────────────
-- Day1 스키마에 없을 수 있는 것들만 방어적으로 추가한다. 기존 것은 건드리지 않는다.

alter table problems add column if not exists tone_tag   text;
alter table problems add column if not exists source_key text;

create unique index if not exists problems_source_key_uniq
  on problems (source_key) where source_key is not null;

create table if not exists problem_answers (
  problem_id uuid primary key references problems(id) on delete cascade,
  answer     jsonb not null
);
alter table problem_answers enable row level security;
-- 정책 없음 = service_role 전용. 정답이 클라이언트로 나가면 안 된다.

create table if not exists golden_cases (
  id         uuid primary key default gen_random_uuid(),
  problem_id uuid references problems(id) on delete cascade,
  content    text not null,
  expected   boolean not null,
  note       text
);
alter table golden_cases enable row level security;


-- ── 1. 단계 정의 ─────────────────────────────────────────────────────
insert into stages (track, order_no, title, skill_key, summary, is_free) values
  ('sentence',   1, '부사 줄이기',     'reduce_adverb',    '꾸미는 말을 걷어내고 동작으로 대신한다',   true),
  ('sentence',   2, '감정을 동작으로', 'emotion_action',   '감정을 서술하지 않고 몸으로 드러낸다',     true),
  ('sentence',   3, '군더더기 빼기',   'trim_padding',     '없어도 되는 문장을 알아본다',              true),
  ('sentence',   4, '반복 표현 제거',  'reduce_repeat',    '같은 말이 겹치는 것을 알아챈다',           true),
  ('sentence',   5, '감각 묘사',       'sensory',          '한 장면에서 두 가지 이상의 감각을 쓴다',   true),
  ('sentence',   6, '문장 리듬',       'rhythm',           '문장 길이를 고르지 않게 배치한다',         true),
  ('sentence',   7, '대사와 지문',     'dialogue_ratio',   '대사가 설명을 떠맡지 않게 한다',           true),
  ('sentence',   8, '시점 고정',       'pov_lock',         '한 인물의 눈에 보이는 것만 쓴다',          true),
  ('sentence',   9, '턴제 액션',       'action_turn',      '동작이 원인과 결과로 이어지게 한다',       true),
  ('sentence',  10, '절단신공',        'cliffhanger',      '마지막 줄이 다음을 부르게 한다',           true),

  ('structure', 11, '결핍 부여',       'lack',             '완벽한 인물을 만들지 않는다',              false),
  ('structure', 12, '대비 캐릭터',     'contrast_char',    '상반된 인물을 나란히 세운다',              false),
  ('structure', 13, '호감 확보',       'likability',       '초반에 응원할 이유를 만든다',              false),
  ('structure', 14, '궤도 이탈 찾기',  'off_track',        '장면 목적에 기여하지 않는 문장을 본다',    true),
  ('structure', 15, '정보 비대칭',     'info_gap',         '답답함을 기대감으로 바꾼다',               false),
  ('structure', 16, '절단신공 심화',   'cliffhanger_adv',  '끊기 전에 신호를 깐다',                    false),
  ('structure', 17, '역순 설계',       'reverse_design',   '목표에서 거꾸로 조건을 세운다',            true),
  ('structure', 18, '1화 훅',          'first_hook',       '다섯 줄 안에 세 요소를 넣는다',            false),
  ('structure', 19, '장르의 조어법',   'genre_coinage',    '장르마다 이름을 만드는 규칙이 있다',       true),
  ('structure', 20, '분량 역산',       'branch_estimate',  '분기점 수로 전체 분량을 가늠한다',         true),

  ('start',      1, '첫 문장 고르기',  'start_choose',     '어떤 첫 문장이 통하는지 안다',             true),
  ('start',      2, '첫 문장 쓰기',    'start_write',      '주인공의 감각에서 시작한다',               true),
  ('start',      3, '도입 잇기',       'start_extend',     '세 문장 안에 인물을 세운다',               true),
  ('start',      4, '1화 축약',        'start_episode',    '1화의 요소를 손에 쥔다',                   true)
on conflict (skill_key) do nothing;


-- ── 2. 1단계 · 부사 줄이기 (remove, 자동채점) ────────────────────────
--
-- maxChars 는 원문의 75%. 원문보다 크면 그대로 붙여넣어도 통과해
-- 제거 훈련이 성립하지 않는다. 아래 값은 모범답안을 직접 써서
-- Kiwi 로 측정한 뒤 여유 1을 더해 잡았다.
--
-- maxAdverbs(부사)와 maxModifiers(관형형)는 별개 예산이다.
-- "깨진 독", "부러진 뼈" 같은 관형형은 걷어낼 대상이 아니라 좋은 문장의 재료다.

insert into problems
  (stage_id, type, scoring_mode, instruction, passage, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'reduce_adverb'),
  'remove', 'auto', v.instruction, v.passage, v.cfg::jsonb,
  'folktale', v.genre, v.tone, v.diff, v.skey
from (values
  ('꾸미는 말을 걷어내고 다시 쓰시오. 뜻은 그대로 두되, 동작으로 대신할 것.',
   '흥부는 몹시 조심스럽게 제비의 다리를 아주 천천히 감쌌다. 그는 정말 간절하게 제비가 얼른 낫기를 바랐다.',
   '{"maxChars":34,"maxAdverbs":1,"maxModifiers":2,"minVerbs":2,"maxRepeat":2}',
   'fantasy', 'planned', 1, 'rm-heungbu-swallow'),

  ('꾸미는 말을 걷어내고 다시 쓰시오.',
   '심청은 아주 천천히 뱃전으로 걸어갔다. 사람들은 몹시 안타깝게 그녀를 바라보았고, 뱃사공은 굉장히 무겁게 고개를 돌렸다.',
   '{"maxChars":40,"maxAdverbs":1,"maxModifiers":1,"minVerbs":2,"maxRepeat":2}',
   'modern', 'planned', 1, 'rm-simcheong-deck'),

  ('꾸미는 말을 걷어내고 다시 쓰시오. 깨진 독은 그대로 두고, 콩쥐가 무엇을 하는지만 보이게 할 것.',
   '콩쥐는 깨진 독에 정말 열심히 물을 부었지만 물은 계속 아주 빠르게 새어 나갔다. 그녀는 몹시 지친 얼굴로 천천히 주저앉았다.',
   '{"maxChars":39,"maxAdverbs":1,"maxModifiers":2,"minVerbs":4,"maxRepeat":2}',
   'modern', 'planned', 1, 'rm-kongjwi-jar'),

  ('꾸미는 말을 걷어내고 다시 쓰시오.',
   '오누이는 굉장히 급하게 나무 위로 올라갔다. 호랑이는 아래에서 계속 아주 사납게 나무를 흔들었고, 아이들은 몹시 세게 가지를 붙잡았다.',
   '{"maxChars":44,"maxAdverbs":1,"maxModifiers":1,"minVerbs":2,"maxRepeat":2}',
   'fantasy', 'impulsive', 2, 'rm-siblings-tree'),

  ('꾸미는 말을 걷어내고 다시 쓰시오. 도끼가 물에 빠지는 순간만 남길 것.',
   '나무꾼은 정말 힘껏 도끼를 휘둘렀다. 자루가 갑자기 아주 쉽게 빠졌고, 도끼는 굉장히 빠르게 연못으로 떨어졌다.',
   '{"maxChars":36,"maxAdverbs":1,"maxModifiers":1,"minVerbs":2,"maxRepeat":2}',
   'fantasy', 'planned', 1, 'rm-axe-pond'),

  ('꾸미는 말을 걷어내고 다시 쓰시오.',
   '토끼는 아주 태연하게 웃으며 말했다. 용왕은 몹시 다급하게 몸을 일으켰고, 신하들은 정말 어리둥절하게 서로를 바라보았다.',
   '{"maxChars":40,"maxAdverbs":1,"maxModifiers":1,"minVerbs":3,"maxRepeat":2}',
   'martial', 'impulsive', 2, 'rm-rabbit-court'),

  ('꾸미는 말을 걷어내고 다시 쓰시오. 까치들이 다리를 만드는 장면만 남길 것.',
   '까치들은 굉장히 부지런하게 날아와 아주 촘촘하게 몸을 이었다. 견우는 정말 조심스럽게 그 위에 발을 얹었다.',
   '{"maxChars":34,"maxAdverbs":1,"maxModifiers":1,"minVerbs":2,"maxRepeat":2}',
   'romance', 'planned', 2, 'rm-magpie-bridge'),

  ('꾸미는 말을 걷어내고 다시 쓰시오. 남는 문장은 두 개 이하로.',
   '나무꾼은 아주 조심스럽게 방망이를 들었다. 그는 몹시 떨리는 손으로 천천히 그것을 내리쳤고, 곡식이 굉장히 갑자기 쏟아져 나왔다.',
   '{"maxChars":42,"maxAdverbs":1,"maxModifiers":2,"minVerbs":3,"maxRepeat":2}',
   'fantasy', 'impulsive', 3, 'rm-goblin-club')
) as v(instruction, passage, cfg, genre, tone, diff, skey)
where not exists (select 1 from problems p where p.source_key = v.skey);


-- ── 3. 2단계 · 감정을 동작으로 (convert, hybrid) ─────────────────────
--
-- forbidWords 에 걸리면 AI 를 호출하지 않는다. 비용 통제의 핵심이다.
-- 여기 값은 초기값일 뿐이고, seed_convert.sql 이 최종값으로 덮어쓴다.
-- 단일 출처는 lib/scoring/fixtures/convert-seeds.ts 다.

insert into problems
  (stage_id, type, scoring_mode, instruction, passage, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'emotion_action'),
  'convert', 'hybrid', v.instruction, v.passage, v.cfg::jsonb,
  'folktale', v.genre, 'planned', v.diff, v.skey
from (values
  ('''심청은 두려웠다''를 감정어 없이 쓰시오. 신체 동작만으로 두려움이 보이게 할 것.',
   '뱃사람들이 뱃전에 모여 그녀를 불렀다. 심청은 두려웠다.',
   '{"maxChars":60,"maxAdverbs":1,"maxModifiers":2,"minVerbs":1,"forbidWords":["두려","두렵","무서","겁먹","떨렸","공포","질렸"]}',
   'modern', 1, 'sim-cheong-fear'),

  ('''흥부는 기뻤다''를 감정어 없이 쓰시오.',
   '박이 갈라지고 안에서 금은보화가 쏟아졌다. 흥부는 기뻤다.',
   '{"maxChars":60,"maxAdverbs":1,"maxModifiers":2,"minVerbs":2,"forbidWords":["기뻤","기쁘","기뻐","기쁨","행복","신났","신나","즐거","좋았"]}',
   'fantasy', 1, 'heungbu-joy'),

  ('''콩쥐는 서러웠다''를 감정어 없이 쓰시오. 울음을 직접 쓰지 말 것.',
   '식구들은 잔치에 가고 마당에는 깨진 독만 남았다. 콩쥐는 서러웠다.',
   '{"maxChars":70,"maxAdverbs":1,"maxModifiers":2,"minVerbs":2,"forbidWords":["서러","서럽","슬프","슬펐","슬픔","눈물","흐느","비참","원망"]}',
   'modern', 2, 'kongjwi-grief'),

  ('''용왕은 화가 났다''를 감정어 없이 쓰시오.',
   '토끼가 간을 두고 왔다고 말했다. 용왕은 화가 났다.',
   '{"maxChars":60,"maxAdverbs":1,"maxModifiers":2,"minVerbs":2,"forbidWords":["화났","화가 났","화가 나서","화가 치밀","분노","노여","성났","격분","짜증","치밀어","치밀었"]}',
   'martial', 2, 'dragon-king-anger'),

  ('''나무꾼은 부끄러웠다''를 감정어 없이 쓰시오.',
   '산신령이 금도끼와 은도끼를 나란히 들어 보였다. 나무꾼은 부끄러웠다.',
   '{"maxChars":65,"maxAdverbs":1,"maxModifiers":2,"minVerbs":2,"forbidWords":["부끄","창피","민망","수치스","낯뜨거","뻘개"]}',
   'fantasy', 3, 'woodcutter-shame'),

  ('''견우는 그리웠다''를 감정어 없이 쓰시오. 직녀를 등장시키지 말 것.',
   '일 년에 한 번 다리가 놓이는 날이 아직 멀었다. 견우는 그리웠다.',
   '{"maxChars":70,"maxAdverbs":1,"maxModifiers":2,"minVerbs":2,"forbidWords":["그리웠","그리워","그리움","그립","보고 싶","외로","쓸쓸","사무치","애틋"]}',
   'romance', 3, 'gyeonu-longing')
) as v(instruction, passage, cfg, genre, diff, skey)
where not exists (select 1 from problems p where p.source_key = v.skey);


-- ── 4. 14단계 · 궤도 이탈 찾기 (choice, 형태소 불필요) ───────────────
insert into problems
  (stage_id, type, scoring_mode, instruction, choices, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'off_track'),
  'choice', 'auto', v.instruction, v.choices::jsonb, '{}'::jsonb,
  'original', v.genre, 'planned', v.diff, v.skey
from (values
  ('이 장면의 목적은 ''주인공이 마을 사람들에게 처음으로 인정받는 것''이다. 목적에 기여하지 않는 문장을 고르시오.',
   '["촌장이 지팡이를 내려놓고 그에게 자리를 내주었다.","이 마을은 삼백 년 전 소금 장수들이 터를 잡으며 생겨났다.","뒷줄에 섰던 아이들이 앞으로 몰려나와 그의 소매를 잡았다.","우물가에 모인 아낙들이 서로를 돌아보며 고개를 끄덕였다."]',
   'fantasy', 1, 'ch-village-approval'),

  ('이 장면의 목적은 ''두 사람이 서로를 오해하게 만드는 것''이다. 목적에 기여하지 않는 문장을 고르시오.',
   '["그가 문을 나서는 순간 그녀가 뒤돌아 다른 이름을 불렀다.","편지는 봉투째 서랍에 들어갔고 그는 그것을 보지 못했다.","창밖에는 사흘째 눈이 내려 처마 끝에 고드름이 자랐다.","그녀는 대답을 기다렸지만 그는 이미 계단을 내려가고 있었다."]',
   'romance', 2, 'ch-misunderstanding'),

  ('이 장면의 목적은 ''주인공이 이 검이 위험하다는 것을 알아채는 것''이다. 목적에 기여하지 않는 문장을 고르시오.',
   '["검을 쥔 손등의 핏줄이 검은빛으로 부풀었다.","앞서 이 검을 들었던 자들의 이름이 칼자루에 새겨져 있었다.","무기점 주인은 사흘 전 아들을 장에 보냈다고 했다.","검을 내려놓자 손끝의 저림이 그대로 남았다."]',
   'martial', 2, 'ch-cursed-sword'),

  ('이 장면의 목적은 ''독자에게 주인공의 배가 곧 침몰한다는 예감을 주는 것''이다. 목적에 기여하지 않는 문장을 고르시오.',
   '["갑판 아래에서 나무가 갈라지는 소리가 두 번 울렸다.","선장은 아무 말 없이 나침반을 주머니에 넣었다.","항구를 떠나던 날 아침에는 갈매기가 유난히 많았다.","선원들이 서로의 눈을 피하며 밧줄 쪽으로 움직였다."]',
   'modern', 3, 'ch-sinking-ship')
) as v(instruction, choices, genre, diff, skey)
where not exists (select 1 from problems p where p.source_key = v.skey);

insert into problem_answers (problem_id, answer)
select p.id, v.ans::jsonb
from problems p
join (values
  ('ch-village-approval', '{"kind":"choice","index":1}'),
  ('ch-misunderstanding', '{"kind":"choice","index":2}'),
  ('ch-cursed-sword',     '{"kind":"choice","index":2}'),
  ('ch-sinking-ship',     '{"kind":"choice","index":2}')
) as v(skey, ans) on p.source_key = v.skey
on conflict (problem_id) do nothing;


-- ── 5. 17단계 · 역순 설계 (order, 형태소 불필요) ─────────────────────
--
-- cards 는 섞인 상태로 저장한다. 정답 순서대로 저장하면
-- "아무것도 건드리지 않으면 정답"이 되어 문항이 성립하지 않는다.
--
-- sequence 의 숫자는 cards 의 원본 인덱스다. 화면 표시 순서와 무관하다.
-- UI 가 다시 섞으려면 displayOrder 를 따로 두고 제출 시 원본 인덱스로 되돌린다.

insert into problems
  (stage_id, type, scoring_mode, instruction, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'reverse_design'),
  'order', 'auto', v.instruction, v.cfg::jsonb,
  'original', v.genre, 'planned', v.diff, v.skey
from (values
  ('결말에서 거꾸로 짚어 순서를 세우시오. 맨 위가 최종 목표, 아래로 갈수록 먼저 일어나는 일이다.',
   '{"cards":["노인의 잃어버린 소를 찾아준다","산신에게 검을 받는다","장터에서 소 발자국을 알아본다","산신의 사당 위치를 노인에게 듣는다"]}',
   'fantasy', 1, 'od-mountain-sword'),

  ('결말에서 거꾸로 짚어 순서를 세우시오.',
   '{"cards":["그녀의 빈 책상을 본다","출근길에 그녀의 우산을 챙긴다","그가 먼저 사과한다","그녀가 떠났다는 것을 알게 된다"]}',
   'romance', 2, 'od-apology'),

  ('결말에서 거꾸로 짚어 순서를 세우시오. 각 단계는 다음 단계의 조건이 되어야 한다.',
   '{"cards":["전날 밤 주방 아이를 도와준다","보초의 교대 시각을 안다","성문을 안에서 연다","주방 심부름꾼으로 들어간다"]}',
   'modern', 3, 'od-open-gate')
) as v(instruction, cfg, genre, diff, skey)
where not exists (select 1 from problems p where p.source_key = v.skey);

insert into problem_answers (problem_id, answer)
select p.id, v.ans::jsonb
from problems p
join (values
  ('od-mountain-sword', '{"kind":"order","sequence":[1,3,0,2]}'),
  ('od-apology',        '{"kind":"order","sequence":[2,3,0,1]}'),
  ('od-open-gate',      '{"kind":"order","sequence":[2,1,3,0]}')
) as v(skey, ans) on p.source_key = v.skey
on conflict (problem_id) do nothing;


-- ── 6. 19단계 · 조어법 (coinage, 형태소 불필요) ──────────────────────
insert into problems
  (stage_id, type, scoring_mode, instruction, passage, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'genre_coinage'),
  'coinage', 'auto', v.instruction, v.note, v.cfg::jsonb,
  'original', v.genre, 'planned', v.diff, v.skey
from (values
  ('번개를 다루는 검법의 이름을 셋 지으시오. 조건: 각 두 자에서 넉 자, 서로 다른 글자로 시작할 것. 한 줄에 하나씩.',
   '무협의 이름은 자연현상과 움직임을 한자어로 붙여 만든다. 뇌·풍·염에 류·격·참을 붙이는 식이다.',
   '{"count":3,"minLen":2,"maxLen":4,"distinctInitial":true}',
   'martial', 1, 'cg-lightning-sword'),

  ('얼음을 다루는 마법의 이름을 셋 지으시오. 조건: 각 세 자에서 여섯 자, 서로 다른 글자로 시작할 것.',
   '정통 판타지는 외래어 음차나 속성과 현상을 붙이는 구조를 쓴다. 등급은 숫자로, 이름은 현상으로 부른다.',
   '{"count":3,"minLen":3,"maxLen":6,"distinctInitial":true}',
   'fantasy', 2, 'cg-ice-magic')
) as v(instruction, note, cfg, genre, diff, skey)
where not exists (select 1 from problems p where p.source_key = v.skey);


-- ── 7. 20단계 · 분량 역산 (count, 형태소 불필요) ─────────────────────
--
-- 문자열 수식을 쓰지 않는다. op 는 화이트리스트 키라 평가할 것이 없다.

insert into problems
  (stage_id, type, scoring_mode, instruction, passage, scoring_config,
   source_tag, genre_tag, tone_tag, difficulty, source_key)
select
  (select id from stages where skill_key = 'branch_estimate'),
  'count', 'auto', v.instruction, v.note, v.cfg::jsonb,
  'original', v.genre, 'planned', v.diff, v.skey
from (values
  ('현대 로맨스 70화 분량을 목표로 한다. 분기점 개수와 첫 분기점까지 걸리는 화수를 정하시오.',
   '반드시 일어나야 하는 핵심 사건을 분기점이라 한다. 분기점 개수와 도달 화수를 곱하면 전체 분량이 나온다.',
   '{"inputs":[{"key":"branchCount","label":"분기점 개수","min":3,"max":15},{"key":"chaptersToFirst","label":"첫 분기점까지 화수","min":5,"max":40}],"op":"multiply"}',
   'romance', 1, 'cn-romance-70'),

  ('남성향 장편 200화 분량을 목표로 한다. 분기점 개수와 첫 분기점까지 걸리는 화수를 정하시오.',
   '분량이 커지면 분기점 사이 간격도 길어진다. 첫 분기점이 너무 늦으면 초반 이탈이 생긴다.',
   '{"inputs":[{"key":"branchCount","label":"분기점 개수","min":3,"max":15},{"key":"chaptersToFirst","label":"첫 분기점까지 화수","min":5,"max":40}],"op":"multiply"}',
   'fantasy', 2, 'cn-fantasy-200')
) as v(instruction, note, cfg, genre, diff, skey)
where not exists (select 1 from problems p where p.source_key = v.skey);

insert into problem_answers (problem_id, answer)
select p.id, v.ans::jsonb
from problems p
join (values
  ('cn-romance-70',  '{"kind":"count","expected":70,"tolerance":0.15}'),
  ('cn-fantasy-200', '{"kind":"count","expected":200,"tolerance":0.15}')
) as v(skey, ans) on p.source_key = v.skey
on conflict (problem_id) do nothing;


-- ── 8. 골든셋 ────────────────────────────────────────────────────────
-- 프롬프트를 고칠 때마다 이것을 돌려 판정이 유지되는지 본다.

insert into golden_cases (problem_id, content, expected, note)
select p.id, v.content, v.expected, v.note
from problems p
join (values
  ('sim-cheong-fear', '심청은 뱃전을 붙잡은 손을 놓지 못했다. 발끝이 자꾸 뒤로 밀렸다.',
   true,  '감정어 없음 + 신체 동작 둘'),
  ('sim-cheong-fear', '심청은 숨을 삼켰다. 부름이 한 번 더 들렸고, 그녀는 뒤를 돌아보았다.',
   true,  '동작 중심. 감정을 이름 붙이지 않음'),
  ('sim-cheong-fear', '심청의 손끝이 뱃전을 긁었다. 가시가 손톱 밑으로 파고들었다.',
   true,  '감각으로 대체한 상급 답안'),
  ('sim-cheong-fear', '심청은 두렵게 뱃전을 붙잡았다.',
   false, 'ㅂ불규칙 회귀 테스트. 어간에 두렵이 없으면 이 케이스가 통과로 잘못 나온다'),
  ('sim-cheong-fear', '심청은 겁먹은 얼굴로 뱃전을 붙잡았다.',
   false, '감정어 우회 시도. 겁먹 어간으로 잡아야 한다'),
  ('dragon-king-anger', '용왕이 술잔을 바닥에 내려놓았다. 잔이 두 조각으로 갈라졌다.',
   true,  '동작으로 대체'),
  ('dragon-king-anger', '용왕은 화가 났다.',
   false, '띄어쓴 감정어. 화났 만으로는 안 잡히므로 화가 났 이 필요하다')
) as v(skey, content, expected, note) on p.source_key = v.skey
where not exists (
  select 1 from golden_cases g where g.problem_id = p.id and g.content = v.content
);


-- ── 9. 불변식 검사 ───────────────────────────────────────────────────
-- 깨지면 트랜잭션 전체가 롤백된다. 어느 문항인지 메시지로 알려준다.

do $$
declare v_bad text; v_cnt int;
begin
  -- (1) remove 문항의 지문은 maxChars 를 넘어야 한다.
  --     넘지 않으면 원문을 그대로 붙여넣어도 통과해 제거 훈련이 성립하지 않는다.
  select string_agg(p.source_key || ' (' ||
                    length(replace(p.passage, ' ', '')) || '자 vs 상한 ' ||
                    (p.scoring_config->>'maxChars') || ')', ', ') into v_bad
    from problems p
   where p.type = 'remove'
     and p.scoring_config ? 'maxChars'
     and length(replace(p.passage, ' ', '')) <= (p.scoring_config->>'maxChars')::int;
  if v_bad is not null then
    raise exception '[불변식 1] 지문이 maxChars 를 넘지 않음: %', v_bad;
  end if;

  -- (2) convert 문항의 지문은 자기 forbidWords 에 걸려야 한다.
  --     걸리지 않으면 지문을 복사해 제출한 답안이 통과하고 AI 까지 호출된다.
  select string_agg(p.source_key, ', ') into v_bad
    from problems p
   where p.type = 'convert'
     and p.scoring_config ? 'forbidWords'
     and not exists (
       select 1 from jsonb_array_elements_text(p.scoring_config->'forbidWords') w
        where p.passage like '%' || w || '%'
     );
  if v_bad is not null then
    raise exception '[불변식 2] 지문이 자기 forbidWords 에 걸리지 않음: %', v_bad;
  end if;

  -- (3) 정답이 필요한 유형에는 problem_answers 행이 있어야 한다.
  select string_agg(coalesce(p.source_key, p.id::text), ', ') into v_bad
    from problems p
   where p.type in ('choice', 'order', 'count')
     and not exists (select 1 from problem_answers a where a.problem_id = p.id);
  if v_bad is not null then
    raise exception '[불변식 3] 정답이 없는 문항: %', v_bad;
  end if;

  -- (4) order 정답은 cards 와 길이가 같고 0..n-1 을 한 번씩 써야 한다.
  select string_agg(p.source_key, ', ') into v_bad
    from problems p
    join problem_answers a on a.problem_id = p.id
   where p.type = 'order'
     and (
       jsonb_array_length(a.answer->'sequence') <> jsonb_array_length(p.scoring_config->'cards')
       or (select count(distinct x) from jsonb_array_elements_text(a.answer->'sequence') x)
          <> jsonb_array_length(p.scoring_config->'cards')
     );
  if v_bad is not null then
    raise exception '[불변식 4] order 정답이 cards 와 맞지 않음: %', v_bad;
  end if;

  select count(*) into v_cnt from problems;
  raise notice '불변식 4건 통과. 문항 % 개', v_cnt;
end $$;

commit;


-- ── 확인 쿼리 (실행 후 따로 돌린다) ──────────────────────────────────
--
-- select s.order_no, s.track, s.title, p.type, count(*)
--   from problems p join stages s on s.id = p.stage_id
--  group by s.order_no, s.track, s.title, p.type
--  order by s.track, s.order_no;
--
-- 형태소 없이 지금 채점 가능한 문항:
-- select count(*) from problems
--  where scoring_config->'maxAdverbs' is null
--    and scoring_config->'minVerbs'  is null;
-- → 11 이어야 한다 (choice 4 + order 3 + coinage 2 + count 2)
