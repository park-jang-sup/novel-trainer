/**
 * npx tsx lib/setting/conflicts.test.ts
 * 검사 ①·①′ 의 물기 시험. 네트워크·LLM 없음. 전부 결정적.
 * 1~10: 처음 골격. P1~P7: 리뷰 탐침 (probe.ts) 을 기대값으로 옮긴 것. 18~: 정규화층. P8: locate 3단계.
 */
import assert from "node:assert/strict";
import { detectStateChangeWithoutEvent, makeDismissKey, toStoredState, type StoredEvent, type StoredState } from "./conflicts";
import { koreanOrArabicInt, normalizeAttribute, sameValue, similarUnmergedAttributePairs } from "./attributes";

let seq = 0;
const S = (o: Partial<StoredState> & Pick<StoredState, "entity_id" | "attribute" | "value" | "episode">): StoredState =>
  toStoredState({ id: `s${++seq}`, branch: "main", pos: 0, certainty: "explicit", claimed_in_dialogue: false, speaker_id: null, exclusive: false, status: "observed", surface: String(o.value), ...o, value: String(o.value) });
const E = (o: Partial<StoredEvent> & Pick<StoredEvent, "subject_id" | "episode"> & { attribute?: string | null }): StoredEvent => ({
  id: `e${++seq}`, kind: "transition", branch: "main", pos: 0, description: "", surface: "", value_before: null, value_after: null, elapsed_years: null,
  ...o, attribute_key: o.attribute ? normalizeAttribute(o.attribute) : (o.attribute_key ?? null),
});
const run = (s: StoredState[], e: StoredEvent[] = [], d: Parameters<typeof detectStateChangeWithoutEvent>[2] = []) => detectStateChangeWithoutEvent(s, e, d);
const vals = (r: ReturnType<typeof run>) => r.cards.map((c) => `${c.kind === "state_reappears_after_transition" ? "①′" : "①"}${c.attribute_key}:${String(c.evidence[0].value)}→${String(c.evidence[1].value)}`);

let n = 0;
const t = (name: string, fn: () => void) => { fn(); console.log(`  ok   ${name}`); n++; };

// ── 처음 골격 ──
t("1 값이 바뀌고 사건이 없으면 카드", () => {
  const r = run([S({ entity_id: "A", attribute: "나이", value: 19, episode: 1 }), S({ entity_id: "A", attribute: "나이", value: 22, episode: 2 })]);
  assert.deepEqual(vals(r), ["①age:19→22"]);
});
t("2 같은 값이면 카드 없음 (\"19\" 와 19 도 같다)", () => {
  assert.equal(run([S({ entity_id: "A", attribute: "나이", value: "19", episode: 1 }), S({ entity_id: "A", attribute: "나이", value: 19, episode: 5 })]).cards.length, 0);
});
t("3 사이에 전이 사건이 있으면 카드 없음 — 검이 부러진 경우", () => {
  const r = run([S({ entity_id: "A", attribute: "무기", value: "검", episode: 3 }), S({ entity_id: "A", attribute: "무기", value: "도끼", episode: 4, exclusive: true })],
    [E({ subject_id: "A", attribute: "무기", episode: 3, pos: 500, value_before: "검", description: "검이 부러짐" })]);
  assert.equal(r.cards.length, 0);
});
t("4 앞 값을 만든 사건은 앞→뒤 변화의 설명이 아니다 — 쾌속 획득이 쾌속→질풍을 덮지 않는다", () => {
  const r = run([S({ entity_id: "A", attribute: "스킬", value: "쾌속", episode: 1, pos: 300 }), S({ entity_id: "A", attribute: "스킬", value: "질풍", episode: 2, pos: 300, exclusive: true })],
    [E({ subject_id: "A", attribute: "스킬", episode: 1, pos: 300, value_after: "쾌속", description: "쾌속 획득" })]);
  assert.deepEqual(vals(r), ["①skill:쾌속→질풍"]);
});
t("5 사건의 after 값이 뒤 값과 다르면 설명이 아니다 (single — 거주지. 소속은 ①-b 에서 set 이 됐다)", () => {
  const r = run([S({ entity_id: "A", attribute: "거주지", value: "서울", episode: 1 }), S({ entity_id: "A", attribute: "거주지", value: "부산", episode: 3 })],
    [E({ subject_id: "A", attribute: "거주지", episode: 2, value_after: "대전" })]);
  assert.equal(r.cards.length, 1);
});
t("6 갈래가 다르면 비교하지 않는다 — 회귀 전 32세와 현재 19세", () => {
  assert.equal(run([S({ entity_id: "A", attribute: "나이", value: 32, episode: 1, branch: "pre_regression" }), S({ entity_id: "A", attribute: "나이", value: 19, episode: 1 })]).cards.length, 0);
});
t("7 대사 속 타인 주장은 빠지지 않고 weak 로 남는다 (리뷰 G)", () => {
  const r = run([S({ entity_id: "A", attribute: "나이", value: 19, episode: 1 }), S({ entity_id: "A", attribute: "나이", value: 25, episode: 2, claimed_in_dialogue: true, speaker_id: "B" })]);
  assert.equal(r.cards.length, 1); assert.equal(r.cards[0].weak, true); assert.equal(r.weak_dialogue_claims, 1);
});
t("7b 자기 진술(발화자=주체)은 정상 비교 — '종로경찰서 마강혁 형사입니다'", () => {
  const r = run([S({ entity_id: "A", attribute: "나이", value: 19, episode: 1 }), S({ entity_id: "A", attribute: "나이", value: 25, episode: 2, claimed_in_dialogue: true, speaker_id: "A" })]);
  assert.equal(r.cards[0].weak, false);
});
t("8 둘 다 inferred 면 weak", () => {
  const r = run([S({ entity_id: "A", attribute: "나이", value: 19, episode: 1, certainty: "inferred" }), S({ entity_id: "A", attribute: "나이", value: 20, episode: 2, certainty: "inferred" })]);
  assert.equal(r.cards[0].weak, true);
});
t("9 작가가 dismiss 한 쌍은 다시 나오지 않는다", () => {
  const states = [S({ entity_id: "A", attribute: "나이", value: 19, episode: 1 }), S({ entity_id: "A", attribute: "나이", value: 22, episode: 2 })];
  assert.equal(run(states, [], [{ action: "dismiss", key: makeDismissKey("A", "age", 19, 22) }]).cards.length, 0);
});
t("10 세 값이면 인접 쌍만 — 카드 2장, 3장 아님", () => {
  const r = run([S({ entity_id: "A", attribute: "거주지", value: "2A", episode: 1 }), S({ entity_id: "A", attribute: "거주지", value: "2B", episode: 2 }), S({ entity_id: "A", attribute: "거주지", value: "2A", episode: 3 })]);
  assert.equal(r.cards.length, 2);
});

// ── 리뷰 탐침 ──
t("P1 set 속성: 스킬 쾌속·질풍·계약 셋 보유는 카드 0. 질풍이 exclusive('유일한 스킬')면 쾌속→질풍 1장만", () => {
  const base = [S({ entity_id: "A", attribute: "스킬", value: "쾌속", episode: 1 }), S({ entity_id: "A", attribute: "스킬", value: "질풍", episode: 2, pos: 300 }), S({ entity_id: "A", attribute: "스킬", value: "계약", episode: 2, pos: 500 })];
  assert.equal(run(base).cards.length, 0);
  const excl = [base[0], { ...base[1], exclusive: true }, base[2]];
  assert.deepEqual(vals(run(excl)), ["①skill:쾌속→질풍"]);
});
t("P2 속성명이 회차마다 달라도(스킬/보유 스킬) 같은 키로 묶인다", () => {
  const r = run([S({ entity_id: "A", attribute: "스킬", value: "쾌속", episode: 1 }), S({ entity_id: "A", attribute: "보유 스킬", value: "질풍", episode: 2, exclusive: true })]);
  assert.deepEqual(vals(r), ["①skill:쾌속→질풍"]);
});
t("P2b 동의어표에 없는 유사 속성명 쌍은 coverage 에 드러난다", () => {
  const rows = [S({ entity_id: "A", attribute: "무공", value: "천뢰검법", episode: 1 }), S({ entity_id: "A", attribute: "무공 계열", value: "뇌", episode: 2 })];
  const pairs = similarUnmergedAttributePairs(rows);
  assert.equal(pairs.length, 1);
});
t("P3 같은 장면 안에서 관찰 → 전이 순서: 위치가 (회차, 오프셋) 이라 사건이 '뒤' 로 잡힌다", () => {
  const r = run([S({ entity_id: "A", attribute: "무기", value: "검", episode: 3, pos: 5000 }), S({ entity_id: "A", attribute: "무기", value: "도끼", episode: 4, pos: 0, exclusive: true })],
    [E({ subject_id: "A", attribute: "무기", episode: 3, pos: 5200, value_before: "검", description: "검이 부러짐" })]);
  assert.equal(r.cards.length, 0);
});
t("P4 ①′ 전이 뒤에 옛 값이 다시 나오면 카드 — 부러진 검이 5화에 다시 나온다", () => {
  const r = run([S({ entity_id: "A", attribute: "무기", value: "검", episode: 1 }), S({ entity_id: "A", attribute: "무기", value: "검", episode: 5 })],
    [E({ subject_id: "A", attribute: "무기", episode: 3, value_before: "검", description: "검이 부러짐" })]);
  assert.deepEqual(vals(r), ["①′weapon:검→검"]);
  assert.equal(r.cards[0].cause_event?.description, "검이 부러짐");
});
t("P4b 되돌리는 사건(after=검)이 있으면 ①′ 카드 없음 — 검을 다시 얻음", () => {
  const r = run([S({ entity_id: "A", attribute: "무기", value: "검", episode: 1 }), S({ entity_id: "A", attribute: "무기", value: "검", episode: 5 })],
    [E({ subject_id: "A", attribute: "무기", episode: 3, value_before: "검" }), E({ subject_id: "A", attribute: "무기", episode: 4, value_after: "검", description: "새 검 구입" })]);
  assert.equal(r.cards.length, 0);
});
t("P5 sameValue 엄격: '' ≠ 0, '1e3' ≠ 1000, '19세' 는 정규화층에서 19", () => {
  assert.equal(sameValue("", 0), false);
  assert.equal(sameValue("1e3", 1000), false);
  assert.equal(sameValue("19세", 19), false);            // 비교기는 엄격
  assert.equal(S({ entity_id: "A", attribute: "나이", value: "19세", episode: 1 }).value, 19);   // 정규화가 흡수
  assert.equal(koreanOrArabicInt("스물두"), 22);
  assert.equal(koreanOrArabicInt("만 19살"), 19);
  assert.equal(koreanOrArabicInt("열댓"), null);
});
t("P6 같은 회차·오프셋 두 값: 입력 순서와 무관하게 같은 카드, 같은 dismiss_key, ambiguous_order", () => {
  const a = S({ entity_id: "A", attribute: "나이", value: 19, episode: 2, pos: 3000 }), b = S({ entity_id: "A", attribute: "나이", value: 22, episode: 2, pos: 3000 });
  const r1 = run([a, b]), r2 = run([b, a]);
  assert.equal(r1.cards[0].dismiss_key, r2.cards[0].dismiss_key);
  assert.deepEqual(vals(r1), vals(r2));
  assert.equal(r1.cards[0].ambiguous_order, true); assert.equal(r1.ambiguous_order, 1);
});
// P7 은 locate 시험 (아래 별도)

// ── 정규화층·시간 ──
t("18 나이: 시간 도약 사건이 사이에 있으면 카드 없음 — '3년 후' 19→22", () => {
  const r = run([S({ entity_id: "A", attribute: "나이", value: 19, episode: 1 }), S({ entity_id: "A", attribute: "나이", value: 22, episode: 30 })],
    [E({ subject_id: null, kind: "occurrence", episode: 10, elapsed_years: 3, description: "3년 후" })]);
  assert.equal(r.cards.length, 0);
});
t("19 나이 ±1 은 카드에 힌트 + 규칙 등록 액션", () => {
  const r = run([S({ entity_id: "A", attribute: "나이", value: 19, episode: 1 }), S({ entity_id: "A", attribute: "나이", value: 20, episode: 2 })]);
  assert.match(r.cards[0].hint ?? "", /만 나이/); assert.ok(r.cards[0].actions.includes("register_rule"));
});
t("20 숫자화 실패한 나이('열댓 살')가 끼면 weak", () => {
  const r = run([S({ entity_id: "A", attribute: "나이", value: 19, episode: 1 }), S({ entity_id: "A", attribute: "나이", value: "열댓 살", episode: 2 })]);
  assert.equal(r.cards[0].weak, true);
});
t("21 rejected 상태는 비교하지 않는다", () => {
  assert.equal(run([S({ entity_id: "A", attribute: "나이", value: 19, episode: 1 }), S({ entity_id: "A", attribute: "나이", value: 22, episode: 2, status: "rejected" })]).cards.length, 0);
});
t("22 작품별 속성 별칭이 기본표보다 우선한다", () => {
  assert.equal(normalizeAttribute("계급", { 계급: "skill" }), "skill");
  assert.equal(normalizeAttribute("계급"), "title");
});

// ── P7 locate 출현 횟수 ──
import { locate } from "./locate";
t("P7 locate: 같은 문장이 2회면 첫 번째를 쓰되 occurrences=2 로 모호함이 남는다", () => {
  const text = "나는 탑에 들어갔다. 고블린이 나왔다.\n\n한참 뒤였다. 나는 탑에 들어갔다. 이번엔 조용했다.";
  const loc = locate(text, "나는 탑에 들어갔다");
  assert.equal(loc?.start, 0); assert.equal(loc?.occurrences, 2);
});

// ── P8 locate 3단계: 공백 제거 + 따옴표·말줄임 정규화 (원고는 문장이 붙어 있고 따옴표가 전부 곱은따옴표) ──
t("P8a locate: 모델이 마침표 뒤에 공백을 넣어 내도 붙은 원고에서 찾는다 — 위치는 원본 인덱스", () => {
  const text = "그는 천천히 다가갔다.쿠르릉!서울 광화문 앞 그 중심에 거대한 탑이 솟았다.";
  const loc = locate(text, "다가갔다. 쿠르릉! 서울 광화문");
  assert.ok(loc); assert.equal(text.slice(loc.start, loc.end), "다가갔다.쿠르릉!서울 광화문"); assert.equal(loc.occurrences, 1);
});
t("P8b locate: 곧은따옴표 surface 가 곱은따옴표 원고에서 찾힌다", () => {
  const text = "2화“뭐야 당신 누구야?! 여기 어떻게 들어왔어!”경찰이 소리쳤다. ‘설마’ 하는 생각이 들었다.";
  const d = locate(text, "\"뭐야 당신 누구야?!");
  assert.ok(d); assert.equal(text.slice(d.start, d.end), "“뭐야 당신 누구야?!");
  const s = locate(text, "'설마' 하는");
  assert.ok(s); assert.equal(text.slice(s.start, s.end), "‘설마’ 하는");
});
t("P8c locate: \"…\" 는 길이가 달라지는 유일한 경우 — 양방향 모두 end 가 원본 끝을 가리킨다", () => {
  const dots = "말이야... 그래 알겠다.", ell = "말이야… 그래 알겠다.";
  const a = locate(dots, "말이야… 그래");                          // surface 가 … (1자), 원고가 ... (3자)
  assert.ok(a); assert.equal(dots.slice(a.start, a.end), "말이야... 그래");
  const b = locate(ell, "말이야... 그래");                          // surface 가 ... (3자), 원고가 … (1자)
  assert.ok(b); assert.equal(ell.slice(b.start, b.end), "말이야… 그래");
  const c = locate(ell, "알겠다…");                                  // surface 끝이 … 인데 원고는 . 하나 → 없다 (정확 일치 유지)
  assert.equal(c, null);
});
t("P8d locate: 3단계도 정확 일치다 — 한 글자 다르면 폐기", () => {
  assert.equal(locate("다가갔다.쿠르릉!서울 광화문", "다가갔다. 쿠르릉! 서울 광화문역"), null);
});

// ── P9 first_mention 대체 (세션 55 ①-3) ──
import { locateAll } from "./locate";
import { ExtractionRaw } from "./schema";
import { materializeRelationStates } from "./store";
const rawWith = (entities: unknown[], extra: Record<string, unknown> = {}) => ExtractionRaw.parse({
  episode: 1, narrator: { person: "first", entity: null }, branches: [{ id: "main", label: "현재" }],
  scenes: [{ ord: 0, opening: { surface: "탑에 들어갔다" }, branch: "main", anchor: null, pov: null, summary: "" }],
  entities, states: [], events: [], relations: [], rules: [], timeline: [], unclassified: [], excluded: [], ...extra,
});
t("P9a first_mention 이 원고에 없어도 name 이 있으면 살린다 — first_mention_fallback 1, 폐기 0, 근거는 이름 자리", () => {
  const text = "탑에 들어갔다. 고블린 두 마리가 나왔다.";
  const ex = locateAll(text, rawWith([{ ref: "g", kind: "creature", name: "고블린", aliases: [], summary: null, first_mention: { surface: "고블린 2명이 나왔다" } }]));
  assert.equal(ex.first_mention_fallback, 1); assert.equal(ex.dropped.length, 0); assert.equal(ex.entities.length, 1);
  assert.equal(ex.entities[0].first_mention.surface, "고블린"); assert.equal(text.slice(ex.entities[0].first_mention.span.start, ex.entities[0].first_mention.span.end), "고블린");
});
t("P9b name 도 aliases 도 원고에 없으면 폐기 — 대체는 정확 일치뿐", () => {
  const text = "탑에 들어갔다. 고블린 두 마리가 나왔다.";
  const ex = locateAll(text, rawWith([{ ref: "o", kind: "creature", name: "오크", aliases: ["오우거"], summary: null, first_mention: { surface: "오크가 나왔다" } }],
    { states: [{ entity: "o", attribute: "생사", value: "생존", branch: "main", certainty: "explicit", evidence: { surface: "나왔다" } }] }));
  assert.equal(ex.first_mention_fallback, 0); assert.equal(ex.entities.length, 0);
  assert.deepEqual(ex.dropped.map((d) => d.reason), ["surface_not_found", "orphan_ref"]);   // 개체 폐기 + 그걸 가리키던 상태
});

// ── P10 관계 → 상태 물질화 (세션 55 ①-4) ──
t("P10 술어가 동의어표에 있고 객체가 사람이 아니면 상태로 물질화. 사람 객체·표 밖 술어는 관계로만", () => {
  const ents = [{ id: "A", name: "김태진", kind: "character" }, { id: "V", name: "베나토르", kind: "organization" }, { id: "B", name: "유진혁", kind: "character" }];
  const rel = (predicate: string, object_id: string) => ({ subject_id: "A", predicate, object_id, branch: "main", episode: 2, pos: 10, surface: "s", claimed_in_dialogue: true });
  const out = materializeRelationStates([rel("소속", "V"), rel("동료", "B"), rel("소속", "B"), rel("짝사랑", "V")], ents);
  assert.equal(out.length, 1);
  assert.equal(out[0].entity_id, "A"); assert.equal(out[0].attribute, "소속"); assert.equal(out[0].value, "베나토르"); assert.equal(out[0].claimed_in_dialogue, true);
  const st = toStoredState({ id: "x", ...out[0] });
  assert.equal(st.attribute_key, "affiliation"); assert.equal(st.value, "베나토르");
  // 소속은 set — 대사 "국정원 소속" 과 물질화된 "베나토르" 가 같은 회차에 있어도 카드가 아니다(겹소속). exclusive 면 카드.
  const nis = S({ entity_id: "A", attribute: "소속", value: "국정원", episode: 2, pos: 5 });
  assert.equal(run([nis, st]).cards.length, 0);
  assert.deepEqual(vals(run([nis, { ...st, exclusive: true }])), ["①affiliation:국정원→베나토르"]);
});

console.log(`\n통과 ${n} / 실패 0`);
