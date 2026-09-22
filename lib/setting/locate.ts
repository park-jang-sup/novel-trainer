/**
 * lib/setting/locate.ts — LLM 이 낸 surface 를 원고에서 찾아 span 을 붙인다.
 *
 * 원칙 6: 근거가 원고에 문자열로 없으면 그 항목은 저장소에 들어가지 못한다.
 * 이 파일이 그 문지기다. 여기서 살아남은 것만 Extraction 이 된다.
 *
 * 찾기 규칙
 *   1. 정확 일치 (indexOf)
 *   2. 실패 시 공백 정규화 후 일치 — 원고와 surface 의 공백·개행 차이만 흡수
 *   3. 실패 시 3단계 접기 후 일치 — 공백을 전부 떼고, 곱은따옴표를 곧은따옴표로, "…" 를 "..." 로.
 *      prelim 원고는 문장이 붙어 있고("다가갔다.쿠르릉!서울") 따옴표가 전부 곱은따옴표라, 모델이 마침표 뒤에
 *      공백을 넣거나 따옴표를 곧게 펴서 내면 2단계로는 못 찾는다. 접은 문자열끼리도 **정확 일치**다.
 *   4. 그래도 실패 → dropped. 유사 일치·부분 일치는 하지 않는다 (느슨하게 하면 환각이 들어온다)
 *   5. 같은 surface 가 여러 번 나오면 첫 번째. (같은 문장이 반복되는 원고는 드물고,
 *      드러나면 작가가 [원문] 점프에서 바로 알 수 있다)
 */
import type { ExtractionRaw, Extraction } from "./schema";

export interface Located {
  start: number;
  end: number;
  /** 원고 안 출현 횟수. 2 이상이면 첫 번째를 쓰되 모호함을 남긴다 (P7). */
  occurrences: number;
}

/** 공백·개행을 하나로 접은 문자열과, 접힌 인덱스 → 원본 인덱스 매핑. */
function foldWhitespace(text: string): { folded: string; map: number[] } {
  const folded: string[] = [];
  const map: number[] = [];
  let prevSpace = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const isSpace = /\s/.test(ch);
    if (isSpace) {
      if (prevSpace) continue;
      folded.push(" ");
      map.push(i);
      prevSpace = true;
    } else {
      folded.push(ch);
      map.push(i);
      prevSpace = false;
    }
  }
  return { folded: folded.join(""), map };
}

const DOUBLE_QUOTES = "“”„\"";   // “ ” „ "
const SINGLE_QUOTES = "‘’‚'";    // ‘ ’ ‚ '

/**
 * 3단계 접기. 공백은 버리고(map 에 안 넣음), 따옴표는 곧은 것으로, "…" 는 "..." 로.
 * "…" 만 한 글자가 셋으로 늘어나므로 같은 원본 인덱스를 세 번 넣는다 — end 계산이 그 마지막 것을 쓴다.
 * 그 밖의 문자는 한 글자씩 NFC 를 거쳐 그대로. (한 글자 NFC 는 결합을 못 하니 실질 무변환이고,
 * 원고 쪽은 이미 NFC 다. surface 쪽은 통째로 NFC 를 한 뒤 접는다.)
 */
export function fold3(text: string): { folded: string; map: number[] } {
  const out: string[] = [];
  const map: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (/\s/.test(ch)) continue;
    if (DOUBLE_QUOTES.includes(ch)) { out.push("\""); map.push(i); continue; }
    if (SINGLE_QUOTES.includes(ch)) { out.push("'"); map.push(i); continue; }
    if (ch === "…") { out.push("..."); map.push(i, i, i); continue; }
    out.push(ch.normalize("NFC"));
    map.push(i);
  }
  return { folded: out.join(""), map };
}

export interface FoldedText {
  ws: ReturnType<typeof foldWhitespace>;
  f3: ReturnType<typeof fold3>;
}
export const foldText = (text: string): FoldedText => ({ ws: foldWhitespace(text), f3: fold3(text) });

export function locate(text: string, surface: string, folded?: FoldedText): Located | null {
  const s = surface.trim();
  if (s.length < 2) return null;

  // 1. 정확 일치
  const exact = text.indexOf(s);
  if (exact >= 0) return { start: exact, end: exact + s.length, occurrences: countOccurrences(text, s) };

  const f = folded ?? foldText(text);

  // 2. 공백 접기
  const sf = foldWhitespace(s).folded;
  const idx = f.ws.folded.indexOf(sf);
  if (idx >= 0) return { start: f.ws.map[idx], end: f.ws.map[idx + sf.length - 1] + 1, occurrences: countOccurrences(f.ws.folded, sf) };

  // 3. 공백 제거 + 따옴표·말줄임 정규화
  const s3 = fold3(s.normalize("NFC")).folded;
  if (s3.length < 2) return null;
  const idx3 = f.f3.folded.indexOf(s3);
  if (idx3 < 0) return null;
  return { start: f.f3.map[idx3], end: f.f3.map[idx3 + s3.length - 1] + 1, occurrences: countOccurrences(f.f3.folded, s3) };
}

function countOccurrences(hay: string, needle: string): number {
  let n = 0, i = 0;
  while ((i = hay.indexOf(needle, i)) >= 0) { n++; i += needle.length; }
  return n;
}

/** 장면 경계: 각 장면의 opening 위치가 시작, 다음 장면 시작이 끝. */
function sceneOf(pos: number, sceneStarts: number[]): number {
  let s = 0;
  for (let i = 0; i < sceneStarts.length; i++) {
    if (sceneStarts[i] <= pos) s = i;
    else break;
  }
  return s;
}

/**
 * ExtractionRaw → Extraction.
 * 장면부터 위치를 잡고, 나머지 항목은 장면 번호까지 붙인다.
 */
export function locateAll(text: string, raw: ExtractionRaw): Extraction {
  const folded = foldText(text);
  const dropped: Extraction["dropped"] = [];
  const ep = raw.episode;

  // 장면
  const scenesLocated = raw.scenes
    .map((sc) => {
      const loc = locate(text, sc.opening.surface, folded);
      if (!loc) {
        dropped.push({ table: "scenes", surface: sc.opening.surface, reason: "surface_not_found" });
        return null;
      }
      return { sc, start: loc.start, openingEnd: loc.end, occ: loc.occurrences };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.start - b.start);

  // 장면이 하나도 안 잡히면 원고 전체를 장면 0 으로 둔다 — 빈 결과를 통과로 읽지 않기 위해 명시적으로.
  if (scenesLocated.length === 0) {
    scenesLocated.push({
      sc: { ord: 0, opening: { surface: text.slice(0, 20) }, branch: raw.branches[0]?.id ?? "main", anchor: null, pov: null, summary: "(장면 분할 실패 — 전체를 한 장면으로)" },
      start: 0,
      openingEnd: Math.min(20, text.length),
      occ: 1,
    });
  }
  const sceneStarts = scenesLocated.map((x) => x.start);

  const scenes: Extraction["scenes"] = scenesLocated.map((x, i) => ({
    ...x.sc,
    ord: i,
    opening: { surface: x.sc.opening.surface, episode: ep, span: { start: x.start, end: x.openingEnd }, scene: i, occurrences: x.occ },
    span: { start: x.start, end: i + 1 < scenesLocated.length ? scenesLocated[i + 1].start : text.length },
  }));

  const withEvidence = <T extends { evidence: { surface: string } }>(
    table: Extraction["dropped"][number]["table"],
    rows: T[],
  ) =>
    rows.flatMap((row) => {
      const loc = locate(text, row.evidence.surface, folded);
      if (!loc) {
        dropped.push({ table, surface: row.evidence.surface, reason: "surface_not_found" });
        return [];
      }
      return [{ ...row, evidence: { surface: row.evidence.surface, episode: ep, span: { start: loc.start, end: loc.end }, scene: sceneOf(loc.start, sceneStarts), occurrences: loc.occurrences } }];
    });

  // 개체는 first_mention 이 안 잡혀도 이름 → 별칭 순으로 **정확 일치** 대체를 한 번 더 본다.
  // 이름이 원고에 있는데 근거 문장이 한 글자 어긋났다고 개체째 버리면 그 개체를 가리키는 상태·관계가
  // 전부 orphan 이 된다. 대체는 폐기가 아니라 first_mention_fallback 으로 센다 — 조용히 살리지 않는다.
  let first_mention_fallback = 0;
  const entities = raw.entities.flatMap((e) => {
    let loc = locate(text, e.first_mention.surface, folded);
    let surface = e.first_mention.surface;
    if (!loc) {
      for (const cand of [e.name, ...e.aliases]) {
        const idx = text.indexOf(cand);
        if (idx >= 0) { loc = { start: idx, end: idx + cand.length, occurrences: countOccurrences(text, cand) }; surface = cand; break; }
      }
      if (loc) first_mention_fallback++;
    }
    if (!loc) {
      dropped.push({ table: "entities", surface: e.first_mention.surface, reason: "surface_not_found" });
      return [];
    }
    return [{ ...e, first_mention: { surface, episode: ep, span: { start: loc.start, end: loc.end }, scene: sceneOf(loc.start, sceneStarts), occurrences: loc.occurrences } }];
  });

  // 개체가 폐기되면 그 ref 를 가리키는 상태·관계도 같이 폐기한다. 조용히가 아니라 orphan_ref 로 세어서.
  const liveRefs = new Set(entities.map((e) => e.ref));
  const refOk = (r: string | null | undefined) => r == null || liveRefs.has(r);
  const keep = <T extends { evidence: { surface: string } }>(table: Extraction["dropped"][number]["table"], rows: T[], ok: (r: T) => boolean) =>
    rows.filter((r) => { const k = ok(r); if (!k) dropped.push({ table, surface: r.evidence.surface, reason: "orphan_ref" }); return k; });

  return {
    ...raw,
    scenes,
    entities,
    states: withEvidence("states", keep("states", raw.states, (s) => refOk(s.entity))),
    events: withEvidence("events", keep("events", raw.events, (e) => refOk(e.subject))),
    relations: withEvidence("relations", keep("relations", raw.relations, (r) => refOk(r.subject) && refOk(r.object))),
    rules: withEvidence("rules", keep("rules", raw.rules, (r) => refOk(r.scope))),
    timeline: withEvidence("timeline", raw.timeline),
    dropped,
    first_mention_fallback,
  };
}
