// 8단계 dialogue_ratio(독백 끼워넣기) 판정 픽스처. 8문항. v2.
//
// [SE-02] 953~959행 근거: 큰따옴표 대사를 이어 쓰다가 한 번씩 사이에
// 작은따옴표 독백을 끼워 넣는 기법이 몰입도를 끌어올린다. 957행의
// "사이에"가 requireMonologueBetween의 근거다.
//
// skill_key는 dialogue_ratio지만 이 단계는 비율을 재지 않는다.
// 웹소설_작법_정리.md:156이 대사·서술 비율의 기계적 분석을 직접 지목했다.
// 비율 검사를 만들지 않는다.
//
// v1 → v2: 화면에서 사람이 직접 풀어 보고 걸렸다. 대사 3줄만 있던 지문은
// 맥락이 없어 학습자가 서술을 직접 지어 넣었다. 서술 1줄을 지문에 넣어
// 무대를 세워 준다. 그 서술이 학습자가 답안에 더할 반응 서술의 자리를
// 만들었고, 그래서 maxNarrationLines가 신설됐다(local.ts).
//
// v2 → v3: 화면에서 쓴 실제 답안이 147자로 상한(135)에 걸렸다. 독백을
// 46자로 길게 썼기 때문이다 — 밴드를 잡을 때 쓴 독백 재료가 16~18자라
// 135는 짧은 독백을 쓸 때나 맞는 숫자였다. 감정선을 살리는 연습을 막으면
// 안 되므로 200으로 넓힌다. 넓히자 "같은 어절을 30번 이어 붙인 독백"이
// 여덟 문항 전부를 통과시켰다 — 좁은 상한이 그 뚫기를 대신 막고 있었다.
// maxLineWordRepeat를 신설해 그 자리를 메운다.
//
// 좋은 답안·뚫기 표본은 여기 두지 않는다. 손으로 적으면 지문이 바뀔 때
// 조용히 낡는다. verify.ts가 이 지문에서 생성한다.

export const MONOLOGUE_CFG = {
    minChars: 75,
    maxChars: 200,
    maxDuplicateLines: 0,
    maxLineWordRepeat: 6,
    maxNarrationLines: 2,
    minSpeeches: 3,
    minMonologues: 1,
    minMonologueChars: 8,
    // 넷째 판정을 켠다. 8문항 전부 켠 채로 쓴다 — 값 자체는 boolean이라
    // true 말고는 의미가 없다.
    requireMonologueBetween: true,
}
// requireAny 는 문항마다 다르므로 CFG 에 넣지 않는다.
// 쓸 때 합친다:  { ...MONOLOGUE_CFG, requireAny: [item.keyword] }
// 7단계가 같은 방식이다. 합치는 것을 잊으면 keyword 필드가 선언만 되고
// 아무 일도 안 하는 상태가 된다 — 다음 사람은 그것을 '이미 걸려 있다'고 읽는다.
//
// 상한 200: 지문 75자를 빼면 학습자 몫이 125자다(v2는 60자였다). 250까지
// 재봤지만 200과 같은 결과였다 — 상한으로 막을 문제가 아니었다.
// 하한 75는 그대로 둔다. 지문이 75자라 낮추면 지문을 지우고 낸 답안이
// 통과한다.
//
// maxLineWordRepeat: 6의 근거. 좋은 답안 표본(짧은/긴/강조 독백)의 줄 안
// 최대 반복은 1~3, 뚫기(같은 어절을 20~30번)는 15 이상이다. 3~10 어느 값도
// 지금 표본을 갈랐지만, 좋은 답안 표본이 이 저장소가 만든 것이라 실제보다
// 좁을 수 있어(이번 세션에서 이미 세 번 겪었다) 여유를 뒀다. "안 된다.
// 안 된다. 정말로 안 된다." 같은 서너 번 강조는 웹소설에서 흔하고, 뚫기는
// 최소 반복이 20이라 6에서도 멀리 있다.
//
// maxNarrationLines: 2의 근거는 둘이다.
//   지문이 장면 서술 1줄을 준다. 학습자가 더할 만한 것은 반응 서술 하나다
//     — 실제로 사람이 그렇게 썼다.
//   서술이 대사 3줄을 넘으면 안 된다 — 웹소설_작법_정리.md:35
//     "설명·묘사보다 대화·독백 위주로 서술해"

export interface MonologueItem {
    sourceKey: string
    difficulty: 1 | 2
    /** 난이도 축. 2명이면 난이도 1, 3명이면 난이도 2 */
    speakers: 2 | 3
    /** 반드시 남겨야 하는 말. requireAny 로 들어간다. 두 글자 이상 */
    keyword: string
    /** 서술 1줄 + 대사 3줄. 독백 0. 이것이 훈련의 재료다 */
    passage: string
    /**
     * 대사 셋이 왜 그 순서로 이어지는지. 기계가 논리 구멍을 못 잡으니
     * 사람이 적게 강제하는 장치다. 지우지 마라 — v1의 구멍은 이걸
     * 적어보려 하자마자 드러났다.
     */
    chain: [string, string, string]
    /** 끼워 넣을 독백 두 개. 검사가 이걸로 좋은 답안을 생성한다 */
    monologues: [string, string]
    /** 반응 서술. 좋은 답안 후반부(+반응서술판) 생성에 쓴다 */
    reaction: string
}

export const MONOLOGUE_ITEMS: MonologueItem[] = [
    {
        sourceKey: 'mo-heungbu-swallow', difficulty: 1, speakers: 2, keyword: '제비',
        passage:
            '흥부가 마당으로 나서자 담장 아래 제비 한 마리가 떨어져 있었다.\n' +
            '"다리가 부러졌소. 데려다 거둡시다."\n' +
            '"아이들 먹일 것도 없어요."\n' +
            '"그래도 눈앞에서 죽게 둘 수야 없지."',
        chain: [
            '흥부가 거두자고 제안한다',
            '아내는 먹일 것이 없다는 이유로 반대한다 — 거두자는 말이 있어야 성립한다',
            '흥부가 이유를 인정하면서도 강행한다',
        ],
        monologues: [
            "'형님한테 쫓겨난 주제에 무슨 짐승인가.'",
            "'저 날개로는 오늘 밤을 넘기지 못한다.'",
        ],
        reaction: '아내는 더 말하지 않고 부엌으로 들어갔다.',
    },
    {
        sourceKey: 'mo-simcheong-rice', difficulty: 1, speakers: 2, keyword: '공양미',
        passage:
            '심청이 아버지 앞에 무릎을 접고 앉았다.\n' +
            '"공양미 삼백 석이면 눈을 뜨신다 합니다."\n' +
            '"그 많은 쌀을 어디서 구한단 말이냐."\n' +
            '"이미 마련해 두었으니 묻지 마십시오."',
        chain: [
            '심청이 조건을 꺼낸다',
            '아버지가 실현 가능성을 의심한다 — 삼백 석이라는 수가 앞에 있어야 성립한다',
            '심청이 이미 됐다고 답하며 출처를 막는다',
        ],
        monologues: [
            "'뱃사람들이 오늘 저녁에 다시 온다.'",
            "'여기서 밝히면 아버지가 나를 붙잡는다.'",
        ],
        reaction: '아버지가 더듬어 딸의 손목을 잡았다.',
    },
    {
        sourceKey: 'mo-kongjwi-shoe', difficulty: 1, speakers: 2, keyword: '도둑',
        passage:
            '원님이 뜰에 놓인 신 한 짝을 턱으로 가리켰다.\n' +
            '"저것이 네 것이냐."\n' +
            '"제 것이 맞습니다."\n' +
            '"신어 보아라. 발이 맞지 않으면 도둑으로 다스린다."',
        chain: [
            '원님이 소유를 확인한다',
            '콩쥐가 제 것이라 주장한다',
            '원님이 검증 방법과 벌을 함께 내건다 — 주장이 있어야 검증이 성립한다',
        ],
        monologues: [
            "'맞지 않으면 오늘 저녁에 매를 맞는다.'",
            "'저 어른은 답을 정해 두고 묻는다.'",
        ],
        reaction: '뜰에 모인 사람들이 숨을 죽였다.',
    },
    {
        sourceKey: 'mo-axe-pond', difficulty: 1, speakers: 2, keyword: '쇠도끼',
        passage:
            '산신이 물속에서 금도끼를 건져 올려 나무꾼 앞에 놓았다.\n' +
            '"네가 빠뜨린 것이 이것이냐."\n' +
            '"아닙니다. 제 것은 낡은 쇠도끼입니다."\n' +
            '"그 말이 참이면 셋을 다 가져가거라."',
        chain: [
            '산신이 건져 올린 것을 두고 확인한다',
            '나무꾼이 부인하며 제 것을 밝힌다',
            '산신이 정직을 조건으로 보상을 내건다 — 부인이 있어야 보상이 성립한다',
        ],
        monologues: [
            "'금이라 하면 오늘 하루는 편하다.'",
            "'저 어른이 웃지 않는 것이 걸린다.'",
        ],
        reaction: '나무꾼은 선뜻 손을 뻗지 못했다.',
    },
    {
        sourceKey: 'mo-siblings-rope', difficulty: 2, speakers: 3, keyword: '어머니',
        passage:
            '문 밖에서 발소리가 멎고 낮은 목소리가 들려왔다.\n' +
            '"얘들아, 문을 열어라. 밖이 몹시 춥구나."\n' +
            '"어머니 목소리가 아니야."\n' +
            '"손을 들이밀어 보라고 해."',
        chain: [
            '밖에서 문을 열라고 요구한다',
            '누나가 목소리를 근거로 의심한다 — 요구가 있어야 의심이 성립한다',
            '동생이 확인할 방법을 댄다',
        ],
        monologues: [
            "'저 손은 어머니 손이 아니다.'",
            "'먼저 알아챈 것을 들키면 안 된다.'",
        ],
        reaction: '문 밖에서 한참 아무 소리도 나지 않았다.',
    },
    {
        sourceKey: 'mo-rabbit-gate', difficulty: 2, speakers: 3, keyword: '용궁',
        passage:
            '용왕이 옥좌에서 몸을 앞으로 기울였다.\n' +
            '"네 간이 어디에 있느냐."\n' +
            '"뭍에 두고 왔사옵니다."\n' +
            '"용궁까지 온 놈의 혀를 어찌 믿으시렵니까."',
        chain: [
            '용왕이 간의 소재를 추궁한다',
            '토끼가 뭍에 두고 왔다고 변명한다',
            '별주부가 그 변명을 반박한다 — 변명이 있어야 반박이 성립한다',
        ],
        monologues: [
            "'여기서 없다고 하면 오늘 목이 달아난다.'",
            "'거북이 저러는 것을 보니 아직 기회가 있다.'",
        ],
        reaction: '용왕이 손가락으로 옥좌를 두드렸다.',
    },
    {
        sourceKey: 'mo-gyeonu-bridge', difficulty: 2, speakers: 3, keyword: '까치',
        passage:
            '까치들이 은하 위로 몰려들었으나 다리는 좀처럼 이어지지 않았다.\n' +
            '"올해는 비가 늦게 그쳤습니다."\n' +
            '"그러면 만날 날이 하루 줄어들겠군요."\n' +
            '"줄어든 하루는 내년에 갚으면 되오."',
        chain: [
            '까치가 다리가 늦은 사정을 알린다',
            '직녀가 그 사정에서 결과를 셈한다 — 사정이 있어야 셈이 성립한다',
            '견우가 셈을 받아 위로한다',
        ],
        monologues: [
            "'저 사람 얼굴이 작년보다 여위었다.'",
            "'내년을 말할 수 있는 것도 올해뿐이다.'",
        ],
        reaction: '까치들이 다시 날개를 폈다.',
    },
    {
        sourceKey: 'mo-goblin-club', difficulty: 2, speakers: 3, keyword: '방망이',
        passage:
            '도깨비들이 방망이를 두드리다 말고 노인 쪽으로 고개를 돌렸다.\n' +
            '"그 고운 노래가 어디서 나오느냐."\n' +
            '"이 혹에서 나옵니다."\n' +
            '"거짓이면 저 방망이로 다스리겠다."',
        chain: [
            '도깨비가 노래의 출처를 묻는다',
            '노인이 혹이라고 둘러댄다',
            '다른 도깨비가 거짓일 경우의 벌을 건다 — 둘러댄 말이 있어야 벌이 성립한다',
        ],
        monologues: [
            "'저것들이 정말로 믿는 눈치다.'",
            "'혹을 떼어 준다면 손해 볼 일은 없다.'",
        ],
        reaction: '노인은 저도 모르게 혹을 감쌌다.',
    },
]

const linesOf = (t: string) => t.split('\n').map((l) => l.trim()).filter(Boolean)
const noSpaceLen = (t: string) => t.replace(/\s/g, '').length

/** passage의 대사 줄(첫 서술 줄을 뗀 나머지). passage-rules.ts에 넘길 때 쓴다 */
export function dialogueLinesOf(item: MonologueItem): string[] {
    return linesOf(item.passage).slice(1)
}

/**
 * 8단계 전용 지문 규칙. 재사용되지 않는다 — 공용 규칙은 passage-rules.ts에 있다.
 * 실패 메시지 목록을 낸다(빈 배열이면 통과).
 */
export function validateMonologueItem(item: MonologueItem): string[] {
    const fails: string[] = []
    const ls = linesOf(item.passage)

    if (ls.length !== 4) fails.push(`줄이 4가 아니다 (${ls.length})`)
    if (ls[0] !== undefined && (ls[0].startsWith('"') || ls[0].startsWith("'"))) {
        fails.push('첫 줄이 서술이 아니다')
    }
    if (!ls.slice(1).every((l) => l.startsWith('"'))) fails.push('2~4줄이 전부 대사가 아니다')
    if ((item.passage.match(/'/g)?.length ?? 0) > 0) fails.push('지문에 작은따옴표가 있다')

    if (item.chain.length !== 3) fails.push('chain이 3개가 아니다')
    if (!item.chain.every((c) => c.length >= 10)) fails.push('chain이 너무 짧다')

    if ((item.speakers === 2) !== (item.difficulty === 1)) fails.push('화자 수와 난이도가 안 맞는다')

    if (item.monologues.length !== 2) fails.push('monologues가 2개가 아니다')
    for (const m of item.monologues) {
        if (!(m.startsWith("'") && m.endsWith("'"))) fails.push(`독백이 작은따옴표로 안 감싸였다 (${m})`)
        if (noSpaceLen(m) - 2 < 8) fails.push(`독백이 8자 미만이다 (${m})`)
    }

    return fails
}

// 긴 독백. 감정선을 살려 길게 쓴 경우를 흉내 낸다. 실제 사용자가 46자짜리
// 독백을 써서 135자 상한에 걸렸다 — 좋은 답안 표본에 짧은 독백(16~18자)만
// 있어서는 상한이 좁은지 영영 모른다. 지문·keyword와 무관해 여덟이 함께
// 쓴다(requireAny는 지문이 이미 채운다).
export const MONOLOGUE_LONG =
    "'그 순간 가슴 한쪽이 무너지듯 저릿해졌고, 지금 물러서면 평생 후회할 것 같아 " +
    "손끝까지 떨려 왔다. 이대로 물러나면 다시는 이런 기회가 오지 않을 것 같아서 " +
    "온몸이 떨릴 만큼 두려웠다.'"

// 강조 반복. 웹소설에서 흔한 서너 번짜리 되풀이다. maxLineWordRepeat(6)
// 안쪽에 있어야 좋은 답안으로 통과한다 — 못 넘으면 6이 너무 빡빡한 것이다.
export const MONOLOGUE_EMPHASIS = "'안 된다. 안 된다. 정말로 안 된다.'"

// 내용 통째 교체 뚫기. 지문과 무관한 것이 정의라 지문에서 생성할 수 없다.
// 상수 하나를 여덟이 함께 쓴다. 밴드(75~200) 안에 있어야 requireAny가
// 일하는지 볼 수 있다.
export const MONOLOGUE_SWAP =
    '"오늘 장이 열린다고 하니 일찍 나서 보십시다."\n' +
    "'값을 더 받을 수 있을지도 모른다.'\n" +
    '"쌀값이 지난달보다 많이 올랐다더군요."\n' +
    '"내일 다시 와서 값을 물어보겠습니다."\n' +
    '"그때 뵙지요."'

// 서술 뚫기에 쓰는 상수.
export const MONOLOGUE_NARRATION_FILLER = '그는 잠시 말을 멈추었다.'
