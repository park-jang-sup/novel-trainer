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

아래 케이스는 전부 실제로 겪은 함정이다. 하나가 빨간불이면 그 버그가 돌아온 것이다.
"""
from __future__ import annotations

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
HTTP_URL = "http://localhost:8000/analyze"
HTTP_SECRET = "dev"


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
