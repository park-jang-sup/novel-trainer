// 7단계 rhythm 개행 판정 픽스처.
//
// 세션 6 에서 답안 15건으로 실측했다. 손으로 확인한 표본을 문서에만 적고
// 코드에 안 심으면 다음 사람이 그 숫자를 현재 상태로 읽는다 (세션 5 2-3).
//
// 설정은 rh-heungbu-yard 의 scoring_config 와 같아야 한다. 어긋나면
// 목록 일치 검사가 잡는다 (세션 5 3-1 과 같은 구조).

export const RHYTHM_CFG = {
    minChars: 94,
    maxChars: 110,
    maxLineChars: 18,
    minLines: 6,
    maxLines: 10,
    requireAny: ['제비'],
}

/** rh-heungbu-yard 의 지문. 101자 · 7문장 · 개행 0 */
export const RHYTHM_PASSAGE =
    '흥부는 마당으로 나갔다. 간밤에 내린 비로 흙이 질척했다. 담장 아래 제비 한 마리가 떨어져 있었다. ' +
    '다리가 꺾여 있었고 깃털이 젖어 있었다. 흥부는 두 손으로 그것을 들어 올렸다. 제비가 몸을 떨었다. ' +
    '흥부는 헝겊을 찾으러 방으로 들어갔다.'

const BODY = RHYTHM_PASSAGE.replace(/ /g, '')

/** 읽지 않고 n자마다 기계적으로 자른 답안을 만든다. 손으로 적으면 드리프트한다. */
function chop(n: number): string {
    const out: string[] = []
    for (let i = 0; i < BODY.length; i += n) out.push(BODY.slice(i, i + n))
    return out.join('\n')
}

export interface RhythmCase {
    key: string
    expect: 'pass' | 'fail'
    /** 실측값. 읽는 사람을 위한 것이고 판정에는 쓰지 않는다 */
    chars: number
    lines: number
    note: string
    text: string
}

// ── 오탐 감시 3건 · 좋은 답안이 안 걸리는가 ────────────────────────
export const RHYTHM_CLEAN: RhythmCase[] = [
    {
        key: 'rb-good-sentence', expect: 'pass', chars: 101, lines: 7,
        note: '문장마다 끊었다. 가장 흔한 모범 형태',
        text:
            '흥부는 마당으로 나갔다.\n' +
            '\n' +
            '간밤에 내린 비로 흙이 질척했다.\n' +
            '\n' +
            '담장 아래 제비 한 마리가 떨어져 있었다.\n' +
            '다리가 꺾여 있었고 깃털이 젖어 있었다.\n' +
            '\n' +
            '흥부는 두 손으로 그것을 들어 올렸다.\n' +
            '제비가 몸을 떨었다.\n' +
            '\n' +
            '흥부는 헝겊을 찾으러 방으로 들어갔다.',
    },
    {
        key: 'rb-good-midline', expect: 'pass', chars: 99, lines: 8,
        note:
            '문장이 끝나지 않은 자리에서 끊었다. 02강의 [SE-01] 945행이 시범 보인 형태다. ' +
            '줄당 글자수 하한을 두면 이 답안의 "담장 아래."(5자)가 막힌다 — ' +
            '그래서 하한을 줄 길이가 아니라 줄 개수에 걸었다. 이 픽스처가 그 결정을 지킨다.',
        text:
            '흥부는 마당으로 나갔다.\n' +
            '\n' +
            '간밤에 내린 비로 흙이 질척했다.\n' +
            '\n' +
            '담장 아래.\n' +
            '제비 한 마리가 떨어져 있었다.\n' +
            '\n' +
            '다리가 꺾여 있었고 깃털이 젖어 있었다.\n' +
            '\n' +
            '흥부는 두 손으로 그것을 들어 올렸다.\n' +
            '제비가 몸을 떨었다.\n' +
            '\n' +
            '흥부는 헝겊을 찾으러 들어갔다.',
    },
    {
        key: 'rb-good-chunks', expect: 'pass', chars: 96, lines: 8,
        note: '크게 세 덩이로 묶고 마지막을 한 줄로 떨어뜨렸다',
        text:
            '흥부는 마당으로 나갔다.\n' +
            '간밤에 내린 비로 흙이 질척했다.\n' +
            '\n' +
            '담장 아래 제비 한 마리가 떨어져 있었다.\n' +
            '다리가 꺾여 있었다.\n' +
            '깃털이 젖어 있었다.\n' +
            '\n' +
            '흥부는 두 손으로 그것을 들어 올렸다.\n' +
            '제비가 몸을 떨었다.\n' +
            '\n' +
            '흥부는 방으로 들어갔다.',
    },
]

// ── 뚫기 표본 11건 · 나쁜 답안이 검출되는가 ─────────────────────────
export const RHYTHM_BYPASS: RhythmCase[] = [
    {
        key: 'rb-raw', expect: 'fail', chars: 101, lines: 1,
        note: '지문을 그대로 붙여넣었다. minLines 와 maxLineChars 양쪽에 걸린다',
        text: RHYTHM_PASSAGE,
    },
    {
        key: 'rb-enter-tail', expect: 'fail', chars: 101, lines: 1,
        note: '끝에 엔터만 연타했다. 빈 줄은 세지 않으므로 1줄 그대로다',
        text: RHYTHM_PASSAGE + '\n\n\n\n\n\n',
    },
    {
        key: 'rb-one-break', expect: 'fail', chars: 101, lines: 2,
        note: '한 번만 끊었다',
        text:
            '흥부는 마당으로 나갔다. 간밤에 내린 비로 흙이 질척했다. 담장 아래 제비 한 마리가 떨어져 있었다.\n' +
            '다리가 꺾여 있었고 깃털이 젖어 있었다. 흥부는 두 손으로 그것을 들어 올렸다. 제비가 몸을 떨었다. 흥부는 헝겊을 찾으러 방으로 들어갔다.',
    },
    {
        key: 'rb-every-2', expect: 'fail', chars: 101, lines: 51,
        note: '두 글자마다 끊었다. maxLines 와 requireAny 양쪽에 걸린다 — 어절이 깨져 제비가 사라진다',
        text: chop(2),
    },
    {
        key: 'rb-every-word', expect: 'fail', chars: 101, lines: 35,
        note: '어절마다 끊었다. maxLines 가 잡는다',
        text: RHYTHM_PASSAGE.split(' ').join('\n'),
    },
    {
        key: 'rb-chop-20', expect: 'fail', chars: 101, lines: 6,
        note: '읽지 않고 20자마다 잘랐다. 줄 상한 18자를 넘겨 걸린다',
        text: chop(20),
    },
    {
        key: 'rb-half', expect: 'fail', chars: 56, lines: 5,
        note:
            '지문 절반만 옮기고 끊었다. 덜어내는 훈련이 아니라는 것을 minChars 가 잡는다. ' +
            'minChars 를 실제로 쓰는 첫 문항이다 (세션 5 6-2 가 노는 기능으로 적어둔 것)',
        text:
            '흥부는 마당으로 나갔다.\n' +
            '\n' +
            '간밤에 내린 비로 흙이 질척했다.\n' +
            '\n' +
            '담장 아래 제비가 떨어져 있었다.\n' +
            '\n' +
            '흥부는 그것을 들었다.\n' +
            '\n' +
            '제비가 떨었다.',
    },
    {
        key: 'rb-copy-line', expect: 'fail', chars: 73, lines: 7,
        note: '같은 줄을 복사해 줄 수만 채웠다',
        text:
            '흥부는 마당으로 나갔다.\n'.repeat(5) +
            '제비가 몸을 떨었다.\n제비가 몸을 떨었다.',
    },
    {
        key: 'rb-swap-short', expect: 'fail', chars: 74, lines: 7,
        note: '내용을 통째로 바꾸고 제비만 한 번 박았다',
        text:
            '심청은 뱃전에 섰다.\n\n바람이 돛을 밀었다.\n\n뱃사람들이 노를 저었다.\n\n' +
            '공양미 삼백 석이 실려 있었다.\n\n심청은 치마를 걷어쥐었다.\n\n' +
            '제비 한 마리가 지나갔다.\n\n심청은 물을 보았다.',
    },
    {
        key: 'rb-swap-sized', expect: 'fail', chars: 84, lines: 8,
        note:
            '내용 치환에 분량까지 맞추려 한 것. 84자로 minChars 에 걸린다. ' +
            '다만 규칙이 잡는 것은 분량이지 내용이 아니다. 분량 밴드 안에서 내용을 ' +
            '통째로 바꾼 답안은 규칙으로 못 잡는다 — 서술형 문항 전부가 안고 있는 한계이고 ' +
            '이 단계가 새로 만드는 구멍이 아니다.',
        text:
            '심청은 뱃전에 섰다.\n\n바람이 돛을 밀었다.\n\n뱃사람들이 노를 저었다.\n\n' +
            '공양미 삼백 석이 실렸다.\n\n심청은 치마를 걷어쥐었다.\n\n' +
            '제비 한 마리가 지나갔다.\n\n심청은 한 걸음 내디뎠다.\n\n물결이 뱃전을 때렸다.',
    },
    {
        key: 'rb-blank-pad', expect: 'fail', chars: 101, lines: 3,
        note:
            '빈 줄만 잔뜩 넣어 길어 보이게 했다. 빈 줄을 세면 통과하고 안 세면 3줄이다. ' +
            '"빈 줄은 세지 않는다"는 규칙을 이 픽스처가 지킨다',
        text:
            '흥부는 마당으로 나갔다. 간밤에 내린 비로 흙이 질척했다.\n\n\n\n' +
            '담장 아래 제비 한 마리가 떨어져 있었다. 다리가 꺾여 있었고 깃털이 젖어 있었다.\n\n\n\n' +
            '흥부는 두 손으로 그것을 들어 올렸다. 제비가 몸을 떨었다. 흥부는 헝겊을 찾으러 방으로 들어갔다.',
    },
]

// ── 알려진 한계 1건 · 지금은 통과하는 것이 맞다 ─────────────────────
//
// 세션 6 이 갈라 적은 세 갈래 중 세 번째다.
//
//   못 잡는다        누레졌다   태깅이 깨져 어떤 규칙으로도 안 된다   (selftest.py)
//   안 잡기로 정했다   드러나다   시각 전용이 아니라 오탐이 크다        (sensory-bypass.ts)
//   지금은 안 잡는다   아래       형태소 서버가 서면 켤 수 있다
//
// 어절 중간 개행은 순수 문자열로는 [SE-01] 945행의 "그리고 / 다음 문장"과
// 갈리지 않는다. Kiwi 토큰의 start/end 로는 갈린다. 형태소 서버가 배포되면
// (세션 5 7장 3순위) 이 검사가 실패하고 알려준다. 실패가 좋은 소식인 검사다 —
// selftest.py 의 누레졌다와 같은 자리다. 그때 어절 경계 판정을 켠다.
export const RHYTHM_KNOWN_GAP: RhythmCase[] = [
    {
        key: 'rb-chop-18', expect: 'pass', chars: 101, lines: 6,
        note: '어절을 무시하고 18자마다 잘랐는데 줄 상한 안쪽이라 통과한다. 알려진 한계',
        text: chop(18),
    },
]
