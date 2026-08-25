// 7단계 rhythm 개행 판정 픽스처. 8문항 전체.
//
// 세션 6 에서 문항 여덟에 뚫기 12종과 모범답안 3종을 전수로 돌려 만든 것이다.
//
// 두 번 고쳤고 두 번 다 여덟 전체로 돌려서야 나왔다.
//   1) 흥부 하나만 볼 때는 "가장 짧은 문장을 여덟 줄로 복사"가 통과했다.
//      kongjwi 와 axe-pond 에서 분량 밴드 안에 들어왔다. 흥부가 막힌 것은
//      첫 문장이 짧아 하한 아래로 떨어진 우연이었지 설계가 막은 것이 아니었다.
//   2) 그래서 distinctLines(모든 줄이 서로 다를 것)를 넣었더니 rh-axe-pond 의
//      자연스러운 답안이 걸렸다. 문장마다 끊으면 '있었다.' 가 두 문장의 꼬리로
//      각각 떨어져 같은 줄이 된다. 단계 목적이 요구하는 답안을 막는 오탐이라
//      지시문 선언으로 덮을 수 없다 — 세션 5 4-1(짙/VA)과 같은 형태다.
//      줄마다 상한을 거는 안(maxSameLine 2)도 each-twice 에 뚫렸다.
//      답안 전체의 중복 줄 수를 세는 maxDuplicateLines 로 둘 다 잡힌다.
//
// 모범답안을 만드는 방식이 셋인 이유가 여기 있다. 세션 6 은 처음에 autoBreak
// 하나로만 만들었는데, 그 함수는 문장 경계를 무시하고 이어 채워서 문장 꼬리가
// 앞줄에 흡수된다. 그래서 중복이 생기지 않았고 오탐이 픽스처에서 보이지 않았다.
// 뚫기 표본을 늘리는 것만으로는 부족하다. 좋은 답안을 만드는 방식도 여러 개여야 한다.
//
// 뚫기 답안은 지문에서 생성한다. 손으로 적으면 지문이 바뀔 때 조용히 낡는다.
// 모범답안 중 clean 만 손으로 적는다 — 기계로 끊으면 '깃털이 흠뻑 / 젖은' 처럼
// 뜻이 끊긴 자리에서 잘려서, 오탐 감시가 감시해야 할 기준이 못 된다.
//
// 설정은 여덟 문항의 scoring_config 와 같아야 한다. 어긋나면 목록 일치 검사가 잡는다.

export const RHYTHM_CFG = {
    minChars: 111,
    maxChars: 131,
    maxLineChars: 18,
    minLines: 7,
    maxLines: 13,
    maxDuplicateLines: 2,
}

export interface RhythmItem {
    sourceKey: string
    difficulty: 1 | 2
    /** 반드시 남겨야 하는 말. requireAny 로 들어간다 */
    keyword: string
    /** 개행 0. 한 덩어리로 붙어 있는 것이 이 훈련의 재료다 */
    passage: string
    /**
     * 손으로 끊은 모범답안. 뜻이 이어지는 자리에서 끊는다.
     * 난이도 1 은 쉼표가 끊을 자리를 표시해 주고, 난이도 2 는 쉼표가 없어
     * 연결어미에서 스스로 찾아야 한다.
     */
    clean: string
}

export const RHYTHM_ITEMS: RhythmItem[] = [
    {
        sourceKey: 'rh-heungbu-yard', difficulty: 1, keyword: '제비',
        passage:
            '흥부가 마당으로 나서자, 밤새 내린 비에 땅이 질척거리고 있었다. '
            + '담장 아래에는 다리가 꺾인 채 깃털이 흠뻑 젖은 제비 한 마리가 떨어져 있었다. '
            + '흥부가 조심스럽게 두 손으로 제비를 들어 올리자, 손바닥 위에서 작은 몸이 파르르 떨렸다. '
            + '그는 제비를 감쌀 헝겊을 찾으려고 서둘러 방으로 들어갔다.',
        clean:
            '흥부가 마당으로 나서자,\n밤새 내린 비에 땅이 질척거리고 있었다.\n\n'
            + '담장 아래에는\n다리가 꺾인 채 깃털이 흠뻑 젖은\n제비 한 마리가 떨어져 있었다.\n\n'
            + '흥부가 조심스럽게 두 손으로\n제비를 들어 올리자,\n손바닥 위에서 작은 몸이 파르르 떨렸다.\n\n'
            + '그는 제비를 감쌀 헝겊을 찾으려고\n서둘러 방으로 들어갔다.',
    },
    {
        sourceKey: 'rh-simcheong-deck', difficulty: 1, keyword: '공양미',
        passage:
            '심청이 뱃전에 올라서자, 노를 젓던 뱃사람들이 하나둘 손을 멈추었다. '
            + '갑판 한쪽에는 아버지의 눈을 뜨게 해 줄 공양미 삼백 석이 그대로 쌓여 있었다. '
            + '심청이 아버지의 이름을 한 번 부르고 치마를 걷어쥐자, 바람이 돛을 크게 밀었다. '
            + '발밑에서 검은 물결이 소리 없이 갈라지고 있었다.',
        clean:
            '심청이 뱃전에 올라서자,\n노를 젓던 뱃사람들이\n하나둘 손을 멈추었다.\n\n'
            + '갑판 한쪽에는\n아버지의 눈을 뜨게 해 줄\n공양미 삼백 석이 그대로 쌓여 있었다.\n\n'
            + '심청이 아버지의 이름을 한 번 부르고\n치마를 걷어쥐자,\n바람이 돛을 크게 밀었다.\n\n'
            + '발밑에서 검은 물결이\n소리 없이 갈라지고 있었다.',
    },
    {
        sourceKey: 'rh-kongjwi-jar', difficulty: 1, keyword: '물동이',
        passage:
            '콩쥐가 물동이를 내려놓자, 독 바닥에 난 금 사이로 물이 소리 없이 새어 나가고 있었다. '
            + '부으면 부은 만큼 빠져나가는데도 마당에는 도와줄 사람이 아무도 없었다. '
            + '콩쥐가 손바닥으로 금을 눌러 보았지만, 물은 손가락 사이로 그대로 흘러내렸다. '
            + '해가 담장 위로 올라올 무렵 콩쥐는 다시 우물 쪽으로 걸어갔다.',
        clean:
            '콩쥐가 물동이를 내려놓자,\n독 바닥에 난 금 사이로\n물이 소리 없이 새어 나가고 있었다.\n\n'
            + '부으면 부은 만큼 빠져나가는데도\n마당에는 도와줄 사람이\n아무도 없었다.\n\n'
            + '콩쥐가 손바닥으로 금을 눌러 보았지만,\n물은 손가락 사이로\n그대로 흘러내렸다.\n\n'
            + '해가 담장 위로 올라올 무렵\n콩쥐는 다시 우물 쪽으로 걸어갔다.',
    },
    {
        sourceKey: 'rh-axe-pond', difficulty: 1, keyword: '나무꾼',
        passage:
            '나무꾼이 연못가에 주저앉자, 방금까지 흔들리던 물낯이 거짓말처럼 잔잔해져 있었다. '
            + '도끼는 이미 바닥까지 가라앉아 어디쯤 놓여 있는지 짐작조차 되지 않았다. '
            + '그가 소매를 팔꿈치까지 걷고 진흙 속을 더듬자, 손끝에 단단한 것이 걸렸다. '
            + '끌어올린 손바닥에 찬 기운이 오래 남아 있었다.',
        clean:
            '나무꾼이 연못가에 주저앉자,\n방금까지 흔들리던 물낯이\n거짓말처럼 잔잔해져 있었다.\n\n'
            + '도끼는 이미 바닥까지 가라앉아\n어디쯤 놓여 있는지\n짐작조차 되지 않았다.\n\n'
            + '그가 소매를 팔꿈치까지 걷고\n진흙 속을 더듬자,\n손끝에 단단한 것이 걸렸다.\n\n'
            + '끌어올린 손바닥에\n찬 기운이 오래 남아 있었다.',
    },
    {
        sourceKey: 'rh-siblings-tree', difficulty: 2, keyword: '오라비',
        passage:
            '오누이가 나무 꼭대기까지 올라간 뒤에도 호랑이는 밑동을 긁으며 좀처럼 물러가지 않았다. '
            + '가지가 크게 흔들릴 때마다 동생은 울음을 삼키며 오라비의 소매를 붙잡았다. '
            + '오라비가 하늘을 향해 두 손을 뻗어 무언가를 빌자 낡은 밧줄 하나가 소리 없이 내려왔다. '
            + '두 아이는 그것을 함께 붙잡았다.',
        clean:
            '오누이가 나무 꼭대기까지 올라간 뒤에도\n호랑이는 밑동을 긁으며\n좀처럼 물러가지 않았다.\n\n'
            + '가지가 크게 흔들릴 때마다\n동생은 울음을 삼키며\n오라비의 소매를 붙잡았다.\n\n'
            + '오라비가 하늘을 향해 두 손을 뻗어\n무언가를 빌자\n낡은 밧줄 하나가 소리 없이 내려왔다.\n\n'
            + '두 아이는 그것을 함께 붙잡았다.',
    },
    {
        sourceKey: 'rh-rabbit-gate', difficulty: 2, keyword: '문지기',
        passage:
            '토끼가 용궁 문 앞에 서자마자 문지기가 내린 창끝이 목 앞에서 아슬아슬하게 멈추었다. '
            + '토끼는 웃음을 거두지 않은 채 오히려 한 걸음을 더 내디뎠다. '
            + '안쪽에서 문이 천천히 열리며 복도 끝의 발소리가 점점 가까워졌다. '
            + '소매 속에 감춘 주먹만이 저도 모르게 단단히 쥐어지고 있었다.',
        clean:
            '토끼가 용궁 문 앞에 서자마자\n문지기가 내린 창끝이\n목 앞에서 아슬아슬하게 멈추었다.\n\n'
            + '토끼는 웃음을 거두지 않은 채\n오히려 한 걸음을 더 내디뎠다.\n\n'
            + '안쪽에서 문이 천천히 열리며\n복도 끝의 발소리가\n점점 가까워졌다.\n\n'
            + '소매 속에 감춘 주먹만이\n저도 모르게 단단히 쥐어지고 있었다.',
    },
    {
        sourceKey: 'rh-gyeonu-bridge', difficulty: 2, keyword: '까치들',
        passage:
            '견우가 강가에 나와 선 밤에도 물소리는 그치지 않고 밤새 이어졌다. '
            + '하늘이 검은 새떼로 뒤덮이더니 까치들이 서로 몸을 이어 강 위에 다리를 놓기 시작했다. '
            + '견우가 첫 발을 얹자 다리는 발밑에서 위태롭게 흔들렸지만 그는 걸음을 멈추지 않았다. '
            + '발밑에서 깃털 스치는 소리가 계속 올라왔다.',
        clean:
            '견우가 강가에 나와 선 밤에도\n물소리는 그치지 않고\n밤새 이어졌다.\n\n'
            + '하늘이 검은 새떼로 뒤덮이더니\n까치들이 서로 몸을 이어\n강 위에 다리를 놓기 시작했다.\n\n'
            + '견우가 첫 발을 얹자\n다리는 발밑에서 위태롭게 흔들렸지만\n그는 걸음을 멈추지 않았다.\n\n'
            + '발밑에서 깃털 스치는 소리가\n계속 올라왔다.',
    },
    {
        sourceKey: 'rh-goblin-club', difficulty: 2, keyword: '방망이',
        passage:
            '도깨비들이 마루에 둘러앉아 상 위에 놓인 방망이를 하나씩 돌려 가며 두드리기 시작했다. '
            + '방망이가 바닥을 칠 때마다 마루 위로 쌀이 한 무더기씩 쏟아져 내렸다. '
            + '기둥 뒤에 몸을 붙인 나무꾼이 숨을 죽이는 사이 발밑에서 마루가 삐걱 소리를 냈다. '
            + '도깨비들이 한꺼번에 고개를 돌렸다.',
        clean:
            '도깨비들이 마루에 둘러앉아\n상 위에 놓인 방망이를\n하나씩 돌려 가며 두드리기 시작했다.\n\n'
            + '방망이가 바닥을 칠 때마다\n마루 위로 쌀이\n한 무더기씩 쏟아져 내렸다.\n\n'
            + '기둥 뒤에 몸을 붙인 나무꾼이\n숨을 죽이는 사이\n발밑에서 마루가 삐걱 소리를 냈다.\n\n'
            + '도깨비들이 한꺼번에 고개를 돌렸다.',
    },
];

const noSpace = (t: string) => t.replace(/\s/g, '')
const lines = (t: string) => t.split('\n').map((l) => l.trim()).filter(Boolean)
const sentences = (t: string) =>
    t.split(/(?<=\.)\s+/).map((s) => s.trim()).filter(Boolean)

/**
 * 어절 경계를 지키며 limit 이하로 이어 채운다. 문장 경계를 넘어서도 채운다.
 * 그래서 문장 꼬리가 앞줄에 흡수되고 중복이 잘 안 생긴다 — 이 성질 때문에
 * 세션 6 이 distinctLines 오탐을 놓쳤다. sentenceFill 과 함께 써야 한다.
 */
export function autoBreak(t: string, limit = RHYTHM_CFG.maxLineChars): string {
    const out: string[] = []
    let cur = ''
    for (const w of t.split(/\s+/).filter(Boolean)) {
        const c = cur ? `${cur} ${w}` : w
        if (noSpace(c).length > limit && cur) {
            out.push(cur)
            cur = w
        } else {
            cur = c
        }
    }
    if (cur) out.push(cur)
    return out.join('\n')
}

/**
 * 문장마다 끊은 뒤 그 안에서 채운다. 학습자가 실제로 가장 많이 하는 방식이고,
 * 문장 꼬리가 홀로 떨어져 같은 줄이 되는 일이 여기서 생긴다.
 */
export function sentenceFill(t: string, limit = RHYTHM_CFG.maxLineChars): string {
    const out: string[] = []
    for (const s of sentences(t)) {
        let cur = ''
        for (const w of s.split(/\s+/).filter(Boolean)) {
            const c = cur ? `${cur} ${w}` : w
            if (noSpace(c).length > limit && cur) {
                out.push(cur)
                cur = w
            } else {
                cur = c
            }
        }
        if (cur) out.push(cur)
    }
    return out.join('\n')
}

/** 오탐 감시용 좋은 답안 셋. 전부 pass 여야 한다. */
export function cleanCases(item: RhythmItem): { key: string; note: string; text: string }[] {
    return [
        { key: 'clean-hand', note: '뜻이 이어지는 자리에서 손으로 끊었다', text: item.clean },
        { key: 'clean-auto', note: '어절 경계만 지키며 이어 채웠다. 통과해야 하는 최소 형태', text: autoBreak(item.passage) },
        { key: 'clean-sentence', note: '문장마다 끊고 채웠다. distinctLines 오탐이 여기서만 나왔다', text: sentenceFill(item.passage) },
    ]
}

const chop = (t: string, n: number) => {
    const body = noSpace(t)
    const out: string[] = []
    for (let i = 0; i < body.length; i += n) out.push(body.slice(i, i + n))
    return out.join('\n')
}

/** 뚫기 12종. 지문에서 생성하므로 지문을 고치면 함께 따라온다. 전부 fail 이어야 한다. */
export function bypassCases(item: RhythmItem): { key: string; note: string; text: string }[] {
    const p = item.passage
    const ss = sentences(p)
    const shortest = ss.reduce((a, b) => (noSpace(a).length <= noSpace(b).length ? a : b))
    const halfLines = lines(autoBreak(ss.slice(0, 2).join(' ')))
    const head = ss[0]
    return [
        { key: 'raw', note: '지문을 그대로 붙여넣었다', text: p },
        { key: 'enter-tail', note: '끝에 엔터만 연타했다. 빈 줄은 세지 않으므로 1줄 그대로다', text: `${p}\n\n\n\n\n\n` },
        {
            key: 'sentence-only',
            note:
                '문장 단위로만 끊었다. 이 문체에서는 모든 문장이 18자를 넘으므로 ' +
                '문장 안에서도 끊어야 한다 — [SE-01] 945행이 강제되는 자리다',
            text: ss.join('\n'),
        },
        { key: 'one-break', note: '한 번만 끊었다', text: `${ss.slice(0, 2).join(' ')}\n${ss.slice(2).join(' ')}` },
        { key: 'every-2', note: '두 글자마다 끊었다. 줄 수 상한과 requireAny 양쪽에 걸린다', text: chop(p, 2) },
        { key: 'every-word', note: '어절마다 끊었다', text: p.split(/\s+/).filter(Boolean).join('\n') },
        { key: 'chop-20', note: '읽지 않고 20자마다 잘랐다. 줄 상한을 넘겨 걸린다', text: chop(p, 20) },
        { key: 'half', note: '앞 두 문장만 옮기고 끊었다. 덜어내는 훈련이 아니라는 것을 minChars 가 잡는다', text: autoBreak(ss.slice(0, 2).join(' ')) },
        {
            key: 'repeat-pair',
            note: '첫 문장을 두 토막 내어 네 번 되풀이했다',
            text: Array(4).fill([head.slice(0, 17), head.slice(17, 34)]).flat().join('\n'),
        },
        {
            key: 'copy-short',
            note:
                '가장 짧은 문장을 여덟 줄로 복사했다. 줄 중복 검사를 넣은 이유가 이것이다 — ' +
                '없으면 kongjwi 와 axe-pond 가 분량 밴드 안에 들어와 통과했다',
            text: Array(8).fill(shortest).join('\n'),
        },
        {
            key: 'each-twice',
            note:
                '앞 두 문장만 끊어 통째로 두 번 되풀이했다. 각 줄이 정확히 두 번씩만 나와서 ' +
                '줄마다 건 상한(maxSameLine 2)은 안 넘는다. 답안 전체의 중복 줄 수를 세야 잡힌다.',
            text: [...halfLines, ...halfLines].join('\n'),
        },
        { key: 'blank-pad', note: '빈 줄만 잔뜩 넣어 길어 보이게 했다. 빈 줄을 세면 통과하고 안 세면 3줄이다', text: [ss[0], ss[1], ss.slice(2).join(' ')].join('\n\n\n\n') },
    ]
}

// ── 알려진 한계 ────────────────────────────────────────────────
//
// 세션 6 이 갈라 적은 세 갈래 중 세 번째다.
//
//   못 잡는다        누레졌다   태깅이 깨져 어떤 규칙으로도 안 된다   (selftest.py)
//   안 잡기로 정했다   드러나다   시각 전용이 아니라 오탐이 크다        (sensory-bypass.ts)
//   지금은 안 잡는다   아래       형태소 서버가 서면 켤 수 있다
//
// 어절 중간 개행은 순수 문자열로는 [SE-01] 945행의 "그리고 / 다음 문장"과 갈리지
// 않는다. Kiwi 토큰의 start/end 로는 갈린다. 형태소 서버가 배포되면(세션 5 3순위)
// 아래 검사가 실패하고 알려준다. 실패가 좋은 소식인 검사다.
export function knownGapCase(item: RhythmItem): { key: string; note: string; text: string } {
    return {
        key: 'chop-18',
        note: '어절을 무시하고 18자마다 잘랐는데 줄 상한 안쪽이라 통과한다. 알려진 한계',
        text: chop(item.passage, RHYTHM_CFG.maxLineChars),
    }
}