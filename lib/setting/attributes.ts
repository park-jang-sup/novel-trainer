/**
 * lib/setting/attributes.ts — 속성 정규화층 (리뷰 A·B).
 *
 * 작가 쪽 원칙은 "속성 개방형" 이다. 원고가 '스킬' 이라 하든 '보유 스킬' 이라 하든 그대로 보여준다.
 * 검사기 쪽은 그 둘을 같은 것으로 봐야 한다. 그래서 저장 시
 *   attribute      원문 그대로 (화면용)
 *   attribute_key  정규화 키   (검사용)
 * 를 따로 둔다. 이 파일이 그 변환과, 속성마다 다른 두 가지 성질을 정한다.
 *
 *   cardinality  single | set    한 시점에 값이 하나인가(나이·거주지·생사), 여럿인가(스킬·무기·별칭)
 *   valueKind    number | text   값 정규화 방식
 *
 * 기본 동의어표는 작게 시작한다. 작품별 별칭(작가가 "내 작품에선 '직위'가 '계급'이다" 라고 등록)은
 * workAliases 로 앞에 겹친다. 여기 없는 속성은 원문을 공백·조사 제거한 것을 키로 쓴다.
 *
 * 정규화되지 않은 유사 속성명 쌍은 coverage 로 드러낸다 (similarUnmergedAttributePairs).
 * 조용한 미탐(P2)을 막는 것은 동의어표가 아니라 그 노출이다.
 */

export type Cardinality = "single" | "set";
export type ValueKind = "number" | "text";

export interface AttributeSpec {
  key: string;
  cardinality: Cardinality;
  valueKind: ValueKind;
  /** 시간이 흐르면 사건 없이 바뀌는 게 정상인 속성. 나이가 유일하다 (리뷰 H). */
  drifts_with_time?: boolean;
}

const DEFAULT_SPECS: AttributeSpec[] = [
  { key: "age", cardinality: "single", valueKind: "number", drifts_with_time: true },
  /**
   * 소속은 set 이다 (세션 55 ①-b, 박 님 결정). 겹소속은 정상이다 — 국정원 직원이면서 베나토르 팀원.
   * single 로 두면 "국정원 소속 김태진" 과 관계 "김태진 ∈ 베나토르" 가 같은 회차에서 카드가 된다(오탐).
   * 이적을 서술 없이 넘긴 것은 ①′(옛 소속 재등장)와 exclusive 관찰("이제 X 소속뿐")로 잡는다.
   */
  { key: "affiliation", cardinality: "set", valueKind: "text" },
  { key: "residence", cardinality: "single", valueKind: "text" },
  { key: "title", cardinality: "single", valueKind: "text" },
  { key: "alive", cardinality: "single", valueKind: "text" },
  { key: "gender", cardinality: "single", valueKind: "text" },
  { key: "naming", cardinality: "single", valueKind: "text" },   // 표기 (lexicon 병합 경로)
  { key: "skill", cardinality: "set", valueKind: "text" },
  { key: "weapon", cardinality: "set", valueKind: "text" },
  { key: "item", cardinality: "set", valueKind: "text" },
  { key: "alias", cardinality: "set", valueKind: "text" },
  { key: "appearance", cardinality: "set", valueKind: "text" },
  { key: "personality", cardinality: "set", valueKind: "text" },
];

const DEFAULT_SYNONYMS: Record<string, string> = {
  나이: "age", 연령: "age", 연세: "age", 살: "age",
  소속: "affiliation", 소속팀: "affiliation", 조직: "affiliation", 팀: "affiliation",
  거주지: "residence", 거주: "residence", 사는곳: "residence", 주거지: "residence", 고향: "residence",
  직업: "title", 직위: "title", 직책: "title", 계급: "title", 신분: "title",
  생사: "alive", 상태: "alive", 생존: "alive",
  성별: "gender",
  표기: "naming",
  스킬: "skill", 보유스킬: "skill", 능력: "skill", 기술: "skill", 마법: "skill", 특성: "skill",
  무기: "weapon", 주무기: "weapon", 사용무기: "weapon",
  소지품: "item", 아이템: "item", 장비: "item",
  별칭: "alias", 별명: "alias", 호칭: "alias",
  외모: "appearance", 생김새: "appearance",
  성격: "personality", 성향: "personality",
};

const SPEC_BY_KEY = new Map(DEFAULT_SPECS.map((s) => [s.key, s]));

/** 공백·중점·괄호를 걷어낸 비교용 형태. 조사는 떼지 않는다 — '나이' 의 '이' 가 조사가 아니다. */
export function foldAttributeName(attr: string): string {
  return attr
    .normalize("NFC")
    .replace(/[\s·・\-_/()]/g, "")
    .toLowerCase();
}

export function normalizeAttribute(attr: string, workAliases: Record<string, string> = {}): string {
  const folded = foldAttributeName(attr);
  return workAliases[folded] ?? workAliases[attr] ?? DEFAULT_SYNONYMS[folded] ?? folded;
}

/** 이 속성명이 동의어표(기본 + 작품별)에 있는가. 관계 술어를 상태로 물질화할지 가르는 기준 (store.ts). */
export function isKnownAttribute(attr: string, workAliases: Record<string, string> = {}): boolean {
  const folded = foldAttributeName(attr);
  return folded in workAliases || attr in workAliases || folded in DEFAULT_SYNONYMS;
}

export function specOf(key: string): AttributeSpec {
  return SPEC_BY_KEY.get(key) ?? { key, cardinality: "single", valueKind: "text" };
}

/**
 * 값 정규화. LLM 은 값을 문자열로만 낸다 (스키마). 여기서 속성 종류에 맞게 바꾼다.
 *   number: "19세" "19살" "만 19" "열아홉" → 19. 못 바꾸면 원문 그대로 (text 로 비교되고, 카드에 weak 힌트).
 *   text:   공백 접기, 조사 꼬리 제거.
 */
export function normalizeValue(key: string, raw: string | number | boolean): string | number {
  const spec = specOf(key);
  if (typeof raw === "number") return raw;
  if (typeof raw === "boolean") return raw ? "true" : "false";
  const s = raw.normalize("NFC").trim();
  if (spec.valueKind === "number") {
    const n = koreanOrArabicInt(s);
    if (n !== null) return n;
    return s;
  }
  const folded = s.replace(/\s+/g, " ");
  const stripped = folded.replace(/(은|는|이|가|을|를|의|이다)$/, "");
  return stripped.length >= 2 ? stripped : folded;
}

/** "19세" "만 19살" "19" "열아홉" "스물두" → 19 / 19 / 19 / 19 / 22. 아니면 null. 지수·빈 문자열은 null. */
export function koreanOrArabicInt(s: string): number | null {
  const t = s.replace(/^만\s*/, "").replace(/\s*(세|살|살배기|년생)$/, "").trim();
  if (/^\d{1,3}$/.test(t)) return Number(t);
  const TENS: Record<string, number> = { 열: 10, 스물: 20, 스무: 20, 서른: 30, 마흔: 40, 쉰: 50, 예순: 60, 일흔: 70, 여든: 80, 아흔: 90 };
  const ONES: Record<string, number> = { 한: 1, 하나: 1, 두: 2, 둘: 2, 세: 3, 셋: 3, 네: 4, 넷: 4, 다섯: 5, 여섯: 6, 일곱: 7, 여덟: 8, 아홉: 9 };
  for (const [ten, tv] of Object.entries(TENS)) {
    if (t === ten) return tv;
    if (t.startsWith(ten)) {
      const rest = t.slice(ten.length);
      if (rest in ONES) return tv + ONES[rest];
    }
  }
  if (t in ONES) return ONES[t];
  return null;
}

/**
 * 엄격한 값 비교 (리뷰 P5). 정규화는 normalizeValue 가 이미 했다고 가정한다.
 *   - 둘 다 number → ===
 *   - 하나만 number → 다른 쪽이 정확히 십진 정수 문자열일 때만 ("19" == 19). "" · "1e3" · "19세" 는 다르다
 *   - 둘 다 문자열 → 공백 접기 + 소문자
 */
export function sameValue(a: string | number | boolean, b: string | number | boolean): boolean {
  const asInt = (v: unknown): number | null => {
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    if (typeof v === "string" && /^\s*-?\d+\s*$/.test(v)) return Number(v);
    return null;
  };
  const na = asInt(a), nb = asInt(b);
  if (na !== null && nb !== null) return na === nb;
  if (na !== null || nb !== null) return false;
  return String(a).replace(/\s+/g, " ").trim().toLowerCase() === String(b).replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * 같은 개체 안에서, 키는 다른데 이름이 닮은 속성 쌍. coverage 에 낸다.
 * "닮음" = 한쪽이 다른 쪽을 포함 (스킬 ⊂ 보유스킬) 또는 접은 이름의 앞 2자가 같음.
 */
export function similarUnmergedAttributePairs(
  rows: { entity_id: string; attribute: string; attribute_key: string }[],
): { entity_id: string; a: string; b: string }[] {
  const byEntity = new Map<string, Map<string, string>>(); // entity → folded attr → key
  for (const r of rows) {
    const m = byEntity.get(r.entity_id) ?? byEntity.set(r.entity_id, new Map()).get(r.entity_id)!;
    m.set(foldAttributeName(r.attribute), r.attribute_key);
  }
  const out: { entity_id: string; a: string; b: string }[] = [];
  for (const [entity_id, m] of byEntity) {
    const names = [...m.keys()];
    for (let i = 0; i < names.length; i++)
      for (let j = i + 1; j < names.length; j++) {
        const a = names[i], b = names[j];
        if (m.get(a) === m.get(b)) continue;
        const similar = a.includes(b) || b.includes(a) || (a.length >= 2 && b.length >= 2 && a.slice(0, 2) === b.slice(0, 2));
        if (similar) out.push({ entity_id, a, b });
      }
  }
  return out;
}
