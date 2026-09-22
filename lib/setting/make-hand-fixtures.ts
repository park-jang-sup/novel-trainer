/**
 * npx tsx lib/setting/make-hand-fixtures.ts
 * 골든이 요구하는 최소 추출 결과를 손으로 만들어 locate 에 태운 뒤 fixtures/prelim_ep{1,2}.hand.json 으로 저장한다.
 * LLM 이 없어도 "골든·스키마·검사기가 서로 맞는다" 를 재현하기 위한 것. 실제 추출이 되는지의 증거는 아니다.
 * 정규화층을 일부러 지나게 했다: 1화 attribute '스킬' / 2화 '보유 스킬', 값 "스물두 살".
 */
import { readFileSync, writeFileSync } from "node:fs";
import { ExtractionRaw } from "./schema";
import { locateAll } from "./locate";

const here = new URL(".", import.meta.url);
const t1 = readFileSync(new URL("fixtures/prelim_ep1.txt", here), "utf8"), t2 = readFileSync(new URL("fixtures/prelim_ep2.txt", here), "utf8");
const ev = (surface: string) => ({ surface });

const ep1 = ExtractionRaw.parse({
  episode: 1,
  narrator: { person: "mixed", entity: "jinhyuk" },
  branches: [{ id: "main", label: "현재" }, { id: "pre_regression", label: "회귀 전" }],
  scenes: [
    { ord: 0, opening: ev("1화 시산혈해"), branch: "pre_regression", anchor: { event: "탑 정상 도달", relation: "during" }, pov: "jinhyuk", summary: "탑 정상, 수정의 죽음, 소원" },
    { ord: 1, opening: ev("커튼 사이에 빠져나온 햇빛"), branch: "main", anchor: { event: "수능 종료", relation: "after" }, pov: "jinhyuk", summary: "수능 다음날, 약속" },
    { ord: 2, opening: ev("쿠르릉!서울 광화문 앞"), branch: "main", anchor: { event: "탑 등장", relation: "during" }, pov: "jinhyuk", summary: "탑 등장, 입장" },
    { ord: 3, opening: ev("‘분명 이 블록을 밟으면"), branch: "main", anchor: { event: "탑 등장", relation: "after" }, pov: "jinhyuk", summary: "튜토리얼" },
  ],
  entities: [
    { ref: "jinhyuk", kind: "character", name: "유진혁", aliases: ["진혁"], summary: null, first_mention: ev("....진혁아") },
    { ref: "sujeong", kind: "character", name: "김수정", aliases: ["수정"], summary: null, first_mention: ev("수정이의 목소리") },
    { ref: "tower", kind: "structure", name: "탑", aliases: [], summary: null, first_mention: ev("탑의 마지막 층") },
    { ref: "tutorial", kind: "term", name: "튜토리얼", aliases: [], summary: null, first_mention: ev("튜토리얼을 클리어 후") },
    { ref: "wish", kind: "item", name: "소원권", aliases: [], summary: null, first_mention: ev("소원권. 이를 얻어") },
    { ref: "quick", kind: "skill", name: "쾌속", aliases: [], summary: null, first_mention: ev("스킬 쾌속을 얻으셨습니다") },
    { ref: "contract", kind: "skill", name: "계약", aliases: [], summary: null, first_mention: ev("스킬을 하나 발동했다.[계약]") },
    { ref: "goblin", kind: "creature", name: "고블린", aliases: [], summary: null, first_mention: ev("고블린 2명을 죽이면 클리어") },
    { ref: "gwanghwamun", kind: "place", name: "광화문", aliases: [], summary: null, first_mention: ev("서울 광화문 앞") },
  ],
  states: [
    { entity: "jinhyuk", attribute: "나이", value: "19", branch: "main", certainty: "inferred", claimed_in_dialogue: false, evidence: ev("생일도 지난 나이라 합법적으로") },
    { entity: "jinhyuk", attribute: "스킬", value: "쾌속", branch: "main", certainty: "explicit", claimed_in_dialogue: false, evidence: ev("스킬 쾌속을 얻으셨습니다") },
    { entity: "sujeong", attribute: "생사", value: "사망", branch: "pre_regression", certainty: "explicit", claimed_in_dialogue: false, evidence: ev("죽어버린 그녀의 눈을") },
  ],
  events: [
    { kind: "occurrence", description: "광화문에 탑 등장", branch: "main", subject: null, attribute: null, before: null, after: null, evidence: ev("서울 광화문 앞 그 중심에 거대한 탑이") },
    { kind: "transition", description: "튜토리얼 보상으로 스킬 쾌속 획득", branch: "main", subject: "jinhyuk", attribute: "스킬", before: null, after: "쾌속", evidence: ev("스킬 쾌속을 얻으셨습니다") },
    { kind: "occurrence", description: "소원으로 탑 이전 과거로 회귀", branch: "pre_regression", subject: null, attribute: null, before: null, after: null, evidence: ev("탑이 생기기 전 과거로 돌려보네") },
  ],
  relations: [
    { subject: "jinhyuk", predicate: "짝사랑", object: "sujeong", branch: "main", claimed_in_dialogue: false, evidence: ev("첫눈에 반해 3년 내내") },
  ],
  rules: [
    { category: "system", statement: "탑은 총 100층", scope: null, branch: "main", evidence: ev("탑은 총 100층으로") },
    { category: "system", statement: "소원은 하나만, 복수 불가", scope: null, branch: "pre_regression", evidence: ev("소원 하나가 아닌 복수로") },
  ],
  timeline: [{ label: "탑 등장", branch: "main", order_hint: 2, evidence: ev("서울 광화문 앞") }],
  unclassified: [{ surface: "중학교 때부터 배워온 복싱", attach_to: "jinhyuk", note: null }],
  excluded: [{ surface: "여자친구도 사귀고", reason: "hypothetical" }],
});

const ep2 = ExtractionRaw.parse({
  episode: 2,
  narrator: { person: "mixed", entity: "jinhyuk" },
  branches: [{ id: "main", label: "현재" }],
  scenes: [
    { ord: 0, opening: ev("2화“뭐야 당신 누구야"), branch: "main", anchor: { event: "탑 등장", relation: "after" }, pov: "jinhyuk", summary: "불심검문" },
    { ord: 1, opening: ev("***치료와 조사를 받고"), branch: "main", anchor: { event: "불심검문", relation: "after" }, pov: "jinhyuk", summary: "귀가" },
    { ord: 2, opening: ev("***대통령 집무실"), branch: "main", anchor: null, pov: "leemujin", summary: "청와대" },
    { ord: 3, opening: ev("***세상이 혼란스러움과"), branch: "main", anchor: { event: "불심검문", relation: "after" }, pov: "jinhyuk", summary: "질풍 실험, 김태진 전화" },
    { ord: 4, opening: ev("***통화가 끝나고"), branch: "main", anchor: { event: "베나토르 합류", relation: "during" }, pov: "jinhyuk", summary: "합류" },
    { ord: 5, opening: ev("그래서 현재 준비를 마친"), branch: "main", anchor: { event: "베나토르 합류", relation: "after" }, pov: "jinhyuk", summary: "2차 입장" },
  ],
  entities: [
    { ref: "jinhyuk", kind: "character", name: "유진혁", aliases: ["진혁"], summary: null, first_mention: ev("유진혁씨 되시나요") },
    { ref: "magang", kind: "character", name: "마강혁", aliases: [], summary: null, first_mention: ev("종로경찰서 마강혁 형사입니다") },
    { ref: "kimtj", kind: "character", name: "김태진", aliases: [], summary: null, first_mention: ev("국정원 소속 김태진이라고 합니다") },
    { ref: "leemujin", kind: "character", name: "이무진", aliases: [], summary: null, first_mention: ev("대통력 이무진") },
    { ref: "kimjg", kind: "character", name: "김진규", aliases: [], summary: null, first_mention: ev("국방부장관 김진규와") },
    { ref: "parkmg", kind: "character", name: "박무건", aliases: [], summary: null, first_mention: ev("경찰청장 박무건") },
    { ref: "venator", kind: "organization", name: "베나토르", aliases: [], summary: null, first_mention: ev("일명 베나토르라는 팀을") },
    { ref: "nis", kind: "organization", name: "국정원", aliases: [], summary: null, first_mention: ev("국정원 소속 김태진") },
    { ref: "jongno", kind: "organization", name: "종로경찰서", aliases: [], summary: null, first_mention: ev("종로경찰서 마강혁") },
    { ref: "gale", kind: "skill", name: "질풍", aliases: [], summary: "등록명 쾌속 와 같은 대상일 수 있음", first_mention: ev("스킬 질풍을 실험") },
  ],
  states: [
    { entity: "jinhyuk", attribute: "나이", value: "스물두 살", branch: "main", certainty: "explicit", claimed_in_dialogue: false, evidence: ev("스물두 살 인생에") },
    { entity: "jinhyuk", attribute: "보유 스킬", value: "질풍", branch: "main", certainty: "explicit", claimed_in_dialogue: false, exclusive: true, evidence: ev("스킬 질풍을 실험") },
    { entity: "jinhyuk", attribute: "소속", value: "베나토르", branch: "main", certainty: "explicit", claimed_in_dialogue: false, evidence: ev("저희 팀의 일원이 되어주십쇼") },
    { entity: "magang", attribute: "소속", value: "종로경찰서", branch: "main", certainty: "explicit", claimed_in_dialogue: true, speaker: "magang", evidence: ev("종로경찰서 마강혁 형사입니다") },
    { entity: "kimtj", attribute: "소속", value: "국정원", branch: "main", certainty: "explicit", claimed_in_dialogue: true, speaker: "kimtj", evidence: ev("국정원 소속 김태진이라고 합니다") },
    { entity: "leemujin", attribute: "직위", value: "대통령", branch: "main", certainty: "explicit", claimed_in_dialogue: false, evidence: ev("대통력 이무진") },
  ],
  events: [
    { kind: "transition", description: "베나토르 합류", branch: "main", subject: "jinhyuk", attribute: "소속", before: null, after: "베나토르", evidence: ev("하.. 알겠습니다.") },
    { kind: "occurrence", description: "불심검문", branch: "main", subject: null, attribute: null, before: null, after: null, evidence: ev("불심검문 차 신분증 제시와") },
  ],
  relations: [
    { subject: "kimtj", predicate: "소속", object: "venator", branch: "main", claimed_in_dialogue: true, evidence: ev("이 팀에는 저를 포함해서") },
  ],
  rules: [
    { category: "system", statement: "무기로 인식되는 물건은 탑에 반입 불가", scope: null, branch: "main", evidence: ev("인류가 무기라 인식하는 모든 물건은 가지고 입장할 수 없다") },
    { category: "geography_physics", statement: "입구에 손을 대면 빛과 함께 사라진다", scope: null, branch: "main", evidence: ev("입구에 손을 대면 그대로 이상한 빛에 휘감겨 사라집니다") },
  ],
  timeline: [{ label: "베나토르 합류", branch: "main", order_hint: 5, evidence: ev("일명 베나토르라는 팀을") }],
  unclassified: [{ surface: "위기를 생각보다 즐기는 성격", attach_to: "jinhyuk", note: null }],
  excluded: [{ surface: "21세기 세상에서", reason: "unit_noise" }],
});

const L1 = locateAll(t1, ep1), L2 = locateAll(t2, ep2);
console.log("dropped ep1:", L1.dropped, " ep2:", L2.dropped);
writeFileSync(new URL("fixtures/prelim_ep1.hand.json", here), JSON.stringify(L1, null, 1)); writeFileSync(new URL("fixtures/prelim_ep2.hand.json", here), JSON.stringify(L2, null, 1));
console.log("saved fixtures/prelim_ep1.hand.json, prelim_ep2.hand.json");

// 환각 시험: 원고에 없는 근거를 넣으면 폐기되는가
const bad = { ...ep1, states: [...ep1.states, { entity: "jinhyuk", attribute: "혈액형", value: "AB", branch: "main", certainty: "explicit" as const, claimed_in_dialogue: false, speaker: null, exclusive: false, evidence: ev("혈액형은 AB형이었다") }] };
const LB = locateAll(t1, bad);
console.log("환각 근거 폐기:", LB.dropped.length === 1 && LB.states.length === ep1.states.length ? "OK" : "FAIL", LB.dropped);
