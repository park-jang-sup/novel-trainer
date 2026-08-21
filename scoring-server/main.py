# 형태소 기반 규칙은 전부 여기에만 둔다.
# lib/scoring/ 에 같은 규칙을 다시 구현하지 않는다. (Day1 실행판 C장)
#
# Day1 원안에서 바뀐 것:
#   - modifiers: 관형형 수식어. 클라이언트가 토큰 순서를 몰라도 되게 서버가 센다.
#   - repeats:   표제어 기준 반복 횟수. 조사 변화(제비를/제비는/제비가)를 여기서 흡수한다.
#
# 태그 처리에서 실제로 걸렸던 두 함정:
#   1) 불규칙 활용은 VA-I / VV-I 로 나온다. "날카롭", "차갑"이 여기 해당한다.
#      태그를 == 로 비교하면 전부 놓친다. 반드시 접두 비교를 쓴다.
#   2) "말했다", "조립한다"는 NNG + XSV 다. VV 만 세면 하다형 동사가 전부 빠진다.

import os
import secrets
from collections import Counter

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field
from kiwipiepy import Kiwi

app = FastAPI()
kiwi = Kiwi()                        # 모듈 로드 시 1회. 요청마다 만들면 안 된다
SECRET = os.environ["SCORING_SECRET"]

# 지시·의문 관형사는 꾸미는 말로 세지 않는다.
# "그 위에", "이 마을"의 '그'/'이'는 걷어낼 수식어가 아니다.
MM_STOP = {"이", "그", "저", "요", "어느", "무슨", "몇", "여러", "온갖", "모든", "각"}

REPEAT_STOP = {"것", "수", "때", "곳", "사람", "말", "일", "나", "너",
               "그", "그녀", "자신", "때문", "동안", "정도"}


def is_verb(tag: str) -> bool:
    return tag.startswith("VV")          # VV, VV-I, VV-R


def is_adj(tag: str) -> bool:
    return tag.startswith("VA")          # VA, VA-I, VA-R


def is_adj_suffix(tag: str) -> bool:
    return tag.startswith("XSA")         # XSA, XSA-I


class Req(BaseModel):
    text: str = Field(max_length=4000)


@app.post("/analyze")
def analyze(r: Req, x_scoring_secret: str = Header(default="")):
    if not secrets.compare_digest(x_scoring_secret, SECRET):
        raise HTTPException(401)

    text = r.text
    tokens = kiwi.tokenize(text)

    # 사용자에게 근거로 보여줄 것은 원문 표면형이어야 한다.
    # 형태소를 이어붙이면 "차갑은"이 되는데 사용자가 쓴 것은 "차가운"이다.
    # 토큰의 end를 쓴다. form 길이로 계산하면 안 된다.
    # "차가운"의 VA-I 토큰은 form이 '차갑'(2자)인데 표면 길이는 3이다.
    # len(form)이 표면 길이와 일치하는 것은 우연이며, 불규칙 활용에서 깨진다.
    def surface(i: int, j: int) -> str:
        # b.form은 형태소 표기라 표면 길이와 다를 수 있다.
        # len(form)으로 계산하면 우연히 맞는 경우에만 동작한다. end를 쓴다.
        return text[tokens[i].start:tokens[j].end]

    # 부사: MAG/MAJ 에 -게 부사형을 더한다.
    #
    # Kiwi 는 "조심스럽게"를 조심(NNG)+스럽(XSA-I)+게(EC),
    # "간절하게"를 간절(XR)+하(XSA)+게(EC) 로 태깅한다. MAG 가 아니다.
    # MAG 만 세면 1단계 문항이 걷어내라고 지시한 바로 그 표현이 지적되지 않는다.
    #
    # VV + 게 ("밥을 먹게 했다") 는 방식이 아니라 목적·사동이므로 제외한다.
    # -게 되다 ("조용하게 되었다") 도 방식이 아니라 상태 변화이므로 제외한다.
    #
    # MAG 뒤에 XSA 가 붙어 오면 부사가 아니다: "캄캄했다"의 캄캄/MAG[2:4]+하/XSA[4:5]는
    # 형용사 캄캄하다의 어근이지 부사가 아니다. 진짜 부사는 뒤에 오는 용언과 어절이
    # 떨어져 있다 ("천천히 했다"의 천천히/MAG[0:3]+하/VV[4:5]). 위치(어절 인접)와
    # 품사(XSA) 두 조건을 모두 만족할 때만 제외한다.
    adverbs = []
    for i, t in enumerate(tokens):
        if t.tag not in ("MAG", "MAJ"):
            continue
        nxt = tokens[i + 1] if i + 1 < len(tokens) else None
        if nxt is not None and nxt.start == t.end and is_adj_suffix(nxt.tag):
            continue
        adverbs.append(t.form)

    for i, t in enumerate(tokens):
        if t.tag != "EC" or t.form != "게" or i == 0:
            continue
        nxt = tokens[i + 1] if i + 1 < len(tokens) else None
        if nxt is not None and nxt.tag.startswith("VV") and nxt.form == "되":
            continue
        prev = tokens[i - 1]
        if not (is_adj(prev.tag) or is_adj_suffix(prev.tag)):
            continue
        # 어절 시작까지 되짚는다. 붙어 있는 토큰만 따라간다.
        j = i - 1
        while j > 0:
            p = tokens[j - 1]
            if p.end != tokens[j].start:
                break
            if p.tag in ("NNG", "XR", "XPN") or is_adj(p.tag) or is_adj_suffix(p.tag):
                j -= 1
            else:
                break
        adverbs.append(text[tokens[j].start:t.end])

    adjectives = [t.form for t in tokens if is_adj(t.tag)]
    propers = [t.form for t in tokens if t.tag == "NNP"]

    # 동사: 순수 동사 + 하다형 파생동사(NNG + XSV)
    verbs = []
    for i, t in enumerate(tokens):
        if is_verb(t.tag):
            verbs.append(t.form)
        elif t.tag == "XSV" and i > 0 and tokens[i - 1].tag.startswith("NN"):
            verbs.append(surface(i - 1, i))             # 말하, 조립하

    # 관형형 수식어: 용언 어간 + 관형사형 전성어미(ETM), 그리고 관형사(MM)
    modifiers = []
    for i, t in enumerate(tokens):
        if t.tag == "ETM" and i > 0:
            prev = tokens[i - 1]
            if is_adj(prev.tag) or is_verb(prev.tag):
                modifiers.append(surface(i - 1, i))     # 차가운, 날카로운
    modifiers += [t.form for t in tokens if t.tag == "MM" and t.form not in MM_STOP]

    # 반복 어휘: 표제어 기준. 조사가 달라도 같은 단어로 센다.
    lemmas = [
        t.form for t in tokens
        if (t.tag in ("NNG", "NNP") or is_verb(t.tag) or is_adj(t.tag) or t.tag == "MAG")
        and len(t.form) >= 2
        and t.form not in REPEAT_STOP
    ]
    repeats = [
        {"word": w, "count": c}
        for w, c in Counter(lemmas).most_common()
        if c >= 2
    ]

    return {
        "adverbs": adverbs,
        "modifiers": modifiers,
        "adjectives": adjectives,
        "verbs": verbs,
        "propers": propers,
        "repeats": repeats,
        "sentences": len([t for t in tokens if t.tag == "SF"]),
    }


@app.get("/healthz")
def healthz():
    return {"ok": True}
