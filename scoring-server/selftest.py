# -*- coding: utf-8 -*-
"""
scoring-server 자기 테스트.

    cd scoring-server && source .venv/bin/activate
    SCORING_SECRET=dev python3 selftest.py
    SCORING_SECRET=dev python3 selftest.py --http    # 떠 있는 uvicorn 에 직접 던진다

    main.py 는 임포트 시점에 os.environ["SCORING_SECRET"] 을 요구한다.
    없으면 KeyError 로 죽는다. --http 모드는 서버도 같은 값으로 떠 있어야 한다.

왜 필요한가
-----------
verify.ts 102건은 main.py 를 전혀 검증하지 못한다.
morph.ts 가 순수 함수라 verify.ts 는 하드코딩된 MorphResult 만 본다.
Kiwi 태깅이 바뀌거나 main.py 가 깨져도 TS 테스트는 초록불을 유지한다.
6-2의 12번(테스트가 사본을 보던 문제)과 같은 계열이다.

여기서 단정하는 것은 Kiwi 의 태깅 사실이다. 그 태깅으로 무엇을 판정할지는
lib/scoring/ 이 정한다. 두 곳의 역할을 섞지 마라.

아래 케이스는 전부 실제로 겪은 함정이다. 하나가 빨간불이면 그 버그가 돌아온 것이다.
"""
from __future__ import annotations

import os
import sys

# ── main.py 의 분석 함수 이름 ─────────────────────────────────────────
# 이름이 다르면 여기만 고친다.
#
# main.analyze(r: Req, x_scoring_secret: str = Header(...)) 는 text 하나를
# 받는 형태가 아니라 FastAPI 핸들러다 (Pydantic 모델 + 헤더 인자).
# main.py 를 테스트 편의로 바꾸지 않고, 아래 resolve_local() 에서
# text -> main.Req(text=text) 로 감싸는 얇은 어댑터를 둔다.
ANALYZE_NAME: str | None = "analyze"
_CANDIDATES = ("analyze", "analyze_text", "morph", "run_analysis", "_analyze")

# main.py 의 실제 계약: POST /analyze, 바디 {"text": ...},
# 인증은 X-Scoring-Secret 헤더 하나뿐이다 (lib/scoring/remote.ts 와 동일).
# Authorization: Bearer 는 main.py 가 검사하지 않으므로 보내지 않는다.
HTTP_URL = os.environ.get("SELFTEST_URL", "http://localhost:8000/analyze")
HTTP_SECRET = os.environ.get("SELFTEST_SECRET", "dev")


# ── 케이스 ────────────────────────────────────────────────────────────
# (이름, 입력, 검사 함수, 이 케이스가 지키는 것)

CASES = [
    (
        "고유명사 오탐 없음",
        "겨울이 오면 날카로운 바람 속 사람을 잡아먹는 얼어붙은 세상이 펼쳐진다.",
        lambda r: (len(propers(r)) == 0, f"propers={propers(r)}"),
        "정규식으로 잡던 시절 잡아먹·얼어붙·세상·괴물·곡선 5개 오탐. Kiwi 는 0개가 정답",
    ),
    (
        "불규칙 형용사 표면형",
        "차가운 물에 날카로운 돌이 있다.",
        lambda r: (modifiers(r) == ["차가운", "날카로운"], f"modifiers={modifiers(r)}"),
        "6-2 #14 VA-I 누락, #16 surface() 가 len(form) 사용. "
        "날카롭[7:11]+은[10:11] 이라 len 으로 자르면 표면형이 깨진다",
    ),
    (
        "하다형 동사",
        "카일은 촌장에게 말했다. 나무를 조립한다.",
        lambda r: (verbs(r) == ["말했", "조립한"], f"verbs={verbs(r)}"),
        "6-2 #15 XSV 누락. VV 만 세면 말하다·조립하다가 동사에서 빠진다",
    ),
    (
        "반복 표제어 기준",
        "흥부는 제비를 안았다. 제비는 울었다. 제비가 날았다.",
        lambda r: (repeats(r).get("제비") == 3, f"repeats={repeats(r)}"),
        "6-2 #13. 제비를/제비는/제비가는 문자열로는 서로 다른 토큰이다",
    ),
    (
        "지시관형사 제외",
        "그 위에 발을 얹었다.",
        lambda r: (len(modifiers(r)) == 0, f"modifiers={modifiers(r)}"),
        "지시관형사는 걷어낼 관형형이 아니다. 세면 maxModifiers 예산을 헛되이 먹는다",
    ),
    (
        "-게 부사형",
        "흥부는 몹시 조심스럽게 제비의 다리를 아주 천천히 감쌌다. "
        "그는 정말 간절하게 제비가 얼른 낫기를 바랐다.",
        lambda r: (
            len(adverbs(r)) == 7
            and "조심스럽게" in adverbs(r)
            and "간절하게" in adverbs(r),
            f"adverbs={adverbs(r)}",
        ),
        "0-1 패치. 조심스럽게=조심(NNG)+스럽(XSA-I)+게(EC), 간절하게=간절(XR)+하(XSA)+게(EC). "
        "MAG 만 세면 1단계가 걷어내라고 지시한 바로 그 표현이 안 잡힌다",
    ),
    (
        "VV+게 제외",
        "아이가 밥을 먹게 했다.",
        lambda r: (len(adverbs(r)) == 0, f"adverbs={adverbs(r)}"),
        "0-1 패치. VV+게 는 방식이 아니라 목적·사동이다. 여기가 0이 아니면 패치가 과하다",
    ),
    # ── 아래 셋은 0-1 검증표에 있던 것. 패치 회귀 감시용 ──────────────
    (
        "-게 패치 · VA 계열",
        "그녀는 크게 웃으며 빠르게 걸었다.",
        lambda r: (adverbs(r) == ["크게", "빠르게"], f"adverbs={adverbs(r)}"),
        "0-1 검증표. 크/VA+게, 빠르/VA+게",
    ),
    (
        "-게 패치 · XR+XSA 계열",
        "조용하게 문을 닫았다.",
        lambda r: (adverbs(r) == ["조용하게"], f"adverbs={adverbs(r)}"),
        "0-1 검증표. 어절 시작까지 되짚어 조용하게 전체를 잡아야 한다",
    ),
    (
        "-게 패치 · 수식어·동사 회귀 없음",
        "흥부는 제비의 다리를 감쌌다. 부러진 뼈에 헝겊을 둘렀다.",
        lambda r: (
            len(adverbs(r)) == 0 and modifiers(r) == ["부러진"] and len(verbs(r)) >= 2,
            f"adverbs={adverbs(r)} modifiers={modifiers(r)} verbs={verbs(r)}",
        ),
        "1단계 모범답안. 패치가 부사 외의 집계를 건드리지 않았는지 본다",
    ),
    # ── 아래 다섯은 MAG+XSA / -게 되다 오탐 제거 검증용 ──────────────
    (
        "MAG+XSA 오탐 제외 · 캄캄했다",
        "눈앞이 캄캄했다.",
        lambda r: (len(adverbs(r)) == 0, f"adverbs={adverbs(r)}"),
        "캄캄/MAG[2:4]+하/XSA[4:5]는 붙어 있다. 형용사 캄캄하다의 어근이지 부사가 아니다",
    ),
    (
        "MAG+XSA 오탐 제외 · 깜깜하다",
        "방이 깜깜하다.",
        lambda r: (len(adverbs(r)) == 0, f"adverbs={adverbs(r)}"),
        "캄캄했다와 같은 계열. 깜깜/MAG+하/XSA",
    ),
    (
        "MAG+XSA 오작동 감시 · 천천히 했다",
        "천천히 했다.",
        lambda r: (len(adverbs(r)) == 1, f"adverbs={adverbs(r)}"),
        "천천히/MAG[0:3]+하/VV[4:5]는 어절이 떨어져 있다. 여기가 0이면 수정 A가 과하다",
    ),
    (
        "-게 되다 제외",
        "마을이 조용하게 되었다.",
        lambda r: (len(adverbs(r)) == 0, f"adverbs={adverbs(r)}"),
        "0-1 알려진 한계였던 -게 되다 과검출을 이번에 고쳤다. 상태 변화지 방식이 아니다",
    ),
    (
        "-게 되다 정탐 유지",
        "그는 아주 빨리 달렸다.",
        lambda r: (len(adverbs(r)) == 2, f"adverbs={adverbs(r)}"),
        "MAG 두 개(아주, 빨리)는 -게 되다 제외와 무관하게 그대로 잡혀야 한다",
    ),
    # ── 아래 다섯은 forbidLemmas 재료용 lemmas 필드 검증 ──────────────
    (
        "lemmas · 불규칙 축약 표면형 (쳐다봤다)",
        "아이가 그림자를 쳐다봤다.",
        lambda r: (
            any(e.get("lemma") == "쳐다보" and e.get("tag") == "VV"
                and e.get("surface") == "쳐다봤다" for e in lemmas(r)),
            f"lemmas={lemmas(r)}",
        ),
        "쳐다보/VV[9:12]+었/EP[11:12]는 축약으로 구간이 겹친다. "
        "'같을 때만' 을 곧이곧대로 쓰면 표면형이 '쳐다봤'에서 끊긴다",
    ),
    (
        "lemmas · 불규칙 축약 표면형 (봤다)",
        "창밖을 봤다.",
        lambda r: (
            any(e.get("lemma") == "보" and e.get("tag") == "VV"
                and e.get("surface") == "봤다" for e in lemmas(r)),
            f"lemmas={lemmas(r)}",
        ),
        "보/VV[4:5]+었/EP[4:5] 축약. 마침표(SF)는 간격이 없어도 어절이 아니므로 표면형에서 제외돼야 한다",
    ),
    (
        "lemmas · 보조용언 제외",
        "국을 한번 먹어 보았다.",
        lambda r: (
            not any(e.get("lemma") == "보" and e.get("tag") == "VV" for e in lemmas(r)),
            f"lemmas={lemmas(r)}",
        ),
        "'먹어 보았다'의 보조용언 '보'는 VX 다. 내용어가 아니므로 lemmas 에 없어야 한다. "
        "여기서 새면 forbidLemmas 가 '먹어 보았다'를 오탐한다",
    ),
    (
        "lemmas · VA-I 표면형 (날카로운)",
        "날카로운 소리가 들렸다.",
        lambda r: (
            any(e.get("lemma") == "날카롭" and e.get("tag") == "VA-I"
                and e.get("surface") == "날카로운" for e in lemmas(r)),
            f"lemmas={lemmas(r)}",
        ),
        "VA-I 를 VA 로 정규화하면 안 되고, surface 가 len(form)(2자)이 아니라 "
        "실제 표면 길이(3자)로 잘려야 한다",
    ),
    (
        "lemmas 추가 후 adverbs 회귀 없음",
        "흥부는 몹시 조심스럽게 제비의 다리를 아주 천천히 감쌌다. "
        "그는 정말 간절하게 제비가 얼른 낫기를 바랐다.",
        lambda r: (len(adverbs(r)) == 7, f"adverbs={adverbs(r)}"),
        "lemmas 는 순수 추가 필드다. 기존 집계 루프를 건드리지 않았는지 본다",
    ),
    # ── 아래 열다섯은 lib/scoring/fixtures/sensory-bypass.ts 의 lemmas 실측값이
    # 여전히 맞는지 보는 태깅 사실 회귀 감시다. verify.ts 는 그 픽스처에 박힌
    # 값으로만 판정 로직을 검사하므로, Kiwi 가 실제로 그렇게 태깅하는지는
    # 여기서만 본다. kiwipiepy 버전이 바뀌면 이 무리가 가장 먼저 흔들린다 ──
    (
        "태깅 사실 · 하얘졌다",
        "저고리가 하얘졌다.",
        lambda r: (
            any(e.get("lemma") == "하얘지" and e.get("tag") == "VV" for e in lemmas(r)),
            f"lemmas={lemmas(r)}",
        ),
        "하얘지다는 하얗+어지 가 한 표제어로 굳는다. 하얗/VA 로는 못 잡는다",
    ),
    (
        "태깅 사실 · 하얘지고 있었다",
        "치마가 하얘지고 있었다.",
        lambda r: (
            any(e.get("lemma") == "하얘지" and e.get("tag") == "VV" for e in lemmas(r)),
            f"lemmas={lemmas(r)}",
        ),
        "하얘졌다와 같은 표제어. 종결형이 아니라 진행형에서도 하얘지/VV 로 굳는지 본다",
    ),
    (
        "태깅 사실 · 붉어졌다 (대조군)",
        "하늘이 붉어졌다.",
        lambda r: (
            any(e.get("lemma") == "붉" and e.get("tag") == "VA" for e in lemmas(r)),
            f"lemmas={lemmas(r)}",
        ),
        "-어지다 정상형. 하얘지다와 달리 어간+어지다는 표제어가 어간 그대로 유지된다",
    ),
    (
        "태깅 사실 · 어두워졌다 (ㅂ불규칙)",
        "방이 어두워졌다.",
        lambda r: (
            any(e.get("lemma") == "어둡" and e.get("tag") == "VA-I" for e in lemmas(r)),
            f"lemmas={lemmas(r)}",
        ),
        "ㅂ불규칙 -어지다. 어둡/VA-I 로 잡혀야 한다. VA 로 정규화되면 forbidLemmas 접두 비교가 깨진다",
    ),
    (
        "태깅 사실 · 흐려졌다 (미등재 형용사)",
        "형체가 흐려졌다.",
        lambda r: (
            any(e.get("lemma") == "흐리" and e.get("tag") == "VA" for e in lemmas(r)),
            f"lemmas={lemmas(r)}",
        ),
        "흐리다는 사전 미등재에 가까운 형용사다. 그래도 흐리/VA 로 잡히는지 본다",
    ),
    (
        "태깅 사실 · 훤했다",
        "달이 훤했다.",
        lambda r: (
            any(e.get("lemma") == "훤하" and e.get("tag") == "VA" for e in lemmas(r)),
            f"lemmas={lemmas(r)}",
        ),
        "훤하다의 종결형은 훤하/VA 로 잡힌다",
    ),
    (
        "태깅 사실 · 훤한 (같은 단어의 다른 활용형)",
        "훤한 마당으로 나섰다.",
        lambda r: (
            any(e.get("lemma") == "훤" and e.get("tag") == "XR" for e in lemmas(r)),
            f"lemmas={lemmas(r)}",
        ),
        "훤했다는 훤하/VA 인데 훤한은 훤/XR + 하/XSA 다. 같은 단어가 활용형에 따라 갈리므로 "
        "표제어 둘을 다 넣어야 한다",
    ),
    (
        "태깅 사실 · 선명했다 (명사+접사)",
        "무늬가 선명했다.",
        lambda r: (
            any(e.get("lemma") == "선명" and e.get("tag") == "NNG" for e in lemmas(r)),
            f"lemmas={lemmas(r)}",
        ),
        "선명하다는 형용사 하나가 아니라 선명(NNG)+하(XSA)로 갈린다. 표제어는 NNG 로 잡힌다",
    ),
    (
        "태깅 사실 · 투명했다 (명사+접사)",
        "얼음이 투명했다.",
        lambda r: (
            any(e.get("lemma") == "투명" and e.get("tag") == "NNG" for e in lemmas(r)),
            f"lemmas={lemmas(r)}",
        ),
        "선명했다와 같은 계열. 투명(NNG)+하(XSA)",
    ),
    (
        "태깅 사실 · 반짝했다 (MAG+하다)",
        "물결이 반짝했다.",
        lambda r: (
            any(e.get("lemma") == "반짝" and e.get("tag") == "MAG" for e in lemmas(r)),
            f"lemmas={lemmas(r)}",
        ),
        "반짝하다는 부사 반짝(MAG)+하(XSA)로 갈린다. forbidWords가 아니라 forbidLemmas로는 못 막는다",
    ),
    (
        "태깅 사실 · 어른어른했다 (MAG+하다)",
        "물체가 어른어른했다.",
        lambda r: (
            any(e.get("lemma") == "어른어른" and e.get("tag") == "MAG" for e in lemmas(r)),
            f"lemmas={lemmas(r)}",
        ),
        "반짝했다와 같은 계열. 어른어른/MAG",
    ),
    (
        "태깅 사실 · 시야가 (어휘 누락 감시)",
        "시야가 좁아졌다.",
        lambda r: (
            any(e.get("lemma") == "시야" and e.get("tag") == "NNG" for e in lemmas(r)),
            f"lemmas={lemmas(r)}",
        ),
        "시야는 형태소 관점에서 평범한 NNG 다. forbidLemmas가 아니라 forbidWords로 막아야 하는 이유",
    ),
    (
        "태깅 사실 · 드러났다 (의도적 제외 감시)",
        "윤곽이 드러났다.",
        lambda r: (
            any(e.get("lemma") == "드러나" and e.get("tag") == "VV" for e in lemmas(r)),
            f"lemmas={lemmas(r)}",
        ),
        "드러나다는 VV로 정상 태깅된다. 그런데도 forbidLemmas에 넣지 않기로 한 것은 태깅 문제가 "
        "아니라 정책 결정이다 — 그 결정이 유효하려면 태깅 자체는 정상이어야 한다",
    ),
    (
        "태깅 사실 · 누레졌다는 못 잡는다 (알려진 한계)",
        "잎이 누레졌다.",
        lambda r: (
            not any(e.get("lemma") == "누렇" and e.get("tag") == "VA-I" for e in lemmas(r)),
            f"lemmas={lemmas(r)}",
        ),
        "누레졌다는 누/NNG 레/NNG 로 깨진다. 어떤 표제어로도 못 잡는다. Kiwi 가 이것을 고치면 "
        "이 검사가 실패하고, 그때 금지 목록에 누렇/VA-I 를 넣을 수 있게 된다",
    ),
    (
        "태깅 사실 · 훤칠한은 훤/XR로 안 잡힌다 (알려진 한계)",
        "그는 훤칠한 걸음으로 다가왔다.",
        lambda r: (
            not any(e.get("lemma") == "훤" and e.get("tag") == "XR" for e in lemmas(r)),
            f"lemmas={lemmas(r)}",
        ),
        "훤칠 이 한 덩어리(XR)로 잡혀 훤/XR 이 따로 나오지 않는다. 이 검사가 실패하면(훤/XR 이 "
        "다시 나타나면) 훤칠 계열과의 충돌을 다시 살펴야 한다 — 이 검사는 실패가 나쁜 소식이 "
        "아니라 좋은 소식인 유일한 검사다",
    ),
]


# ── 응답 필드 접근 (이름이 달라도 죽지 않게) ──────────────────────────

def _field(r, *names):
    for n in names:
        if isinstance(r, dict) and n in r:
            return r[n]
        if hasattr(r, n):
            return getattr(r, n)
    raise KeyError(f"응답에 {names} 중 어느 것도 없다. 실제 키: {_keys(r)}")


def _keys(r):
    return sorted(r.keys()) if isinstance(r, dict) else sorted(vars(r).keys())


def adverbs(r):
    return list(_field(r, "adverbs", "adverb"))


def modifiers(r):
    return list(_field(r, "modifiers", "modifier"))


def verbs(r):
    return list(_field(r, "verbs", "verb"))


def propers(r):
    return list(_field(r, "propers", "proper", "propernouns"))


def lemmas(r):
    return list(_field(r, "lemmas", "lemma"))


def repeats(r):
    """[{"lemma":"제비","count":3}] · {"제비":3} · [["제비",3]] 을 모두 받는다."""
    raw = _field(r, "repeats", "repeat")
    if isinstance(raw, dict):
        return dict(raw)
    out = {}
    for item in raw:
        if isinstance(item, dict):
            lemma = item.get("lemma") or item.get("form") or item.get("word")
            out[lemma] = item.get("count") or item.get("n")
        elif isinstance(item, (list, tuple)) and len(item) == 2:
            out[item[0]] = item[1]
        else:
            out[item] = out.get(item, 0) + 1
    return out


# ── 실행기 ────────────────────────────────────────────────────────────

def resolve_local():
    import main

    names = [ANALYZE_NAME] if ANALYZE_NAME else list(_CANDIDATES)
    for n in names:
        fn = getattr(main, n, None)
        if callable(fn):
            if n == "analyze":
                # main.analyze 는 FastAPI 핸들러라 Req 모델 + 시크릿 헤더를 받는다.
                # 여기서만 text 하나를 받는 형태로 감싼다. main.py 는 건드리지 않는다.
                def adapter(text, _fn=fn):
                    return _fn(main.Req(text=text), x_scoring_secret=main.SECRET)
                return n, adapter
            return n, fn
    public = [k for k in dir(main) if not k.startswith("__") and callable(getattr(main, k))]
    raise SystemExit(
        "main.py 에서 분석 함수를 찾지 못했다.\n"
        f"  찾아본 이름: {names}\n"
        f"  main.py 의 호출 가능한 이름: {public}\n"
        "  → 이 파일 위쪽 ANALYZE_NAME 을 실제 함수명으로 고친다."
    )


def resolve_http():
    import json
    import urllib.request

    def call(text):
        req = urllib.request.Request(
            HTTP_URL,
            data=json.dumps({"text": text}).encode(),
            headers={
                "Content-Type": "application/json",
                "X-Scoring-Secret": HTTP_SECRET,
            },
        )
        with urllib.request.urlopen(req, timeout=10) as res:
            return json.loads(res.read())

    return f"HTTP {HTTP_URL}", call


def main_():
    use_http = "--http" in sys.argv
    where, analyze = resolve_http() if use_http else resolve_local()

    print(f"scoring-server 자기 테스트 — {where}")
    print("─" * 62)

    failed = []
    for name, text, check, why in CASES:
        try:
            ok, detail = check(analyze(text))
        except Exception as exc:                      # noqa: BLE001
            ok, detail = False, f"{type(exc).__name__}: {exc}"
        print(f" {'○' if ok else '×'}  {name}")
        if not ok:
            print(f"      {detail}")
            print(f"      지키는 것: {why}")
            failed.append(name)

    print("─" * 62)
    if failed:
        print(f"{len(CASES) - len(failed)} 통과 / {len(failed)} 실패 — {', '.join(failed)}")
        return 1
    print(f"{len(CASES)} 통과 / 0 실패")
    return 0


if __name__ == "__main__":
    raise SystemExit(main_())
