/**
 * 9단계 pov_lock — 조망→밀착.
 *
 * 근거는 웹소설_작법_정리.md:131~138 §2-3 한 자리다. 132행이 지문 예문을
 * 직접 준다 — pv-star-field의 gaze가 그 문장이다.
 *
 * 설계서 ch02_pov.json 드릴 2-01에서 8문항을 뽑았다. 설계서의 제약 셋을
 * 그대로 옮기면 미검출 5/10 · 오탐 2/8이 난다. require_sense_verb를
 * requireAny로 재는 축이 어긋나 있기 때문이다("보였다"의 유무는 밀착의
 * 지표가 아니다). 검사를 더하지 않고 재료를 바꿔서 미검출 1 · 오탐 0으로
 * 내렸다 — 8단계 keyword 방식과 같다.
 */

const noSpaceLen = (t: string) => t.replace(/\s/g, '').length

export const POV_CFG = {
    // 이름만 낸 답안("태윤", 2자)을 막는 최소한이다. 밴드로 내용을 재려는
    // 것이 아니다. 빈 구간은 2~29로 넓다(뚫기 최장 2자 · 좋은 답안 최단 29자).
    // 30으로 잡으면 29자짜리 좋은 답안 셋이 경계에 닿는다. 40이면 오탐 52/64다.
    minChars: 20,
    maxChars: 130,
}

/**
 * 조망 지시어. gaze는 이 중 하나로 시작한다.
 *
 * '저 '(뒤 공백)는 넣지 마라 — 덤프 129개 텍스트에 걸어 보면 오탐 2회다
 * (먼저 · 일어나는 저 방망이로). 아래 일곱은 전부 오탐 0회로 실측했다.
 */
export const DEICTIC = ['저기', '저쪽', '저 멀리', '저 너머', '저 위', '저 앞', '멀찍이']

/**
 * 검토를 마친 부분 문자열 충돌. 가드를 끄는 장치가 아니라 triage 기록이다.
 * convert-seeds.ts의 reviewedCollisions와 같은 자리다.
 *
 * findForbidden은 어간이 아니라 순수 부분 문자열이라(local.ts:17~35) 아래
 * 넷이 걸린다. 덤프 129건 + 좋은 답안 64건 = 193건에 걸어 보면 실제 발생은
 * 0건이지만, 사용자가 쓸 수는 있다. 새 충돌이 늘면 verify가 알려준다.
 */
export const DEICTIC_REVIEWED_COLLISIONS: { word: string; stem: string; why: string }[] = [
    { word: '여기저기', stem: '저기', why: '흩어진 것을 훑는 말이라 그 자체가 조망이다. 걸려도 훈련 취지에 맞는다' },
    { word: '이쪽저쪽', stem: '저쪽', why: '같은 이유. 한 사람 눈이 아니라 좌우를 훑는 시선이다' },
    { word: '저기압', stem: '저기', why: '날씨 용어. 여덟 장면 어디에도 안 나온다' },
    { word: '저기요', stem: '저기', why: '부르는 말. 9단계 답안은 서술이고 지문에 대사가 없다' },
]

/**
 * relic[0]이 '세는 표현'인지 보는 목록. 거칠다 — '하나같이' 같은 말에
 * 통과할 수 있으므로 눈으로도 본다.
 *
 * 이 요건이 9단계의 chain 자리다. 조망 표지를 종결 표현으로만 고르면
 * 미검출 3이고 세는 표현으로 고르면 미검출 1이다. 일하는 것은 수를
 * 세는 말이지 문장 끝이 아니다.
 */
export const COUNT_WORDS = [
    '하나', '둘', '셋', '넷', '다섯', '여섯', '일곱', '여덟', '아홉', '열',
    '스무', '스물', '서른', '마흔', '예닐곱', '여남은', '두', '세', '네', '백', '천',
]

/**
 * 좋은 답안이 gaze와 연속으로 겹칠 수 있는 최대 글자수.
 *
 * 실측(pv-star-field 표본 18건, 대조 대상은 gaze만):
 *   좋은 답안 최장   8자  "하늘에별이떠있고"
 *   베낀 표본 최소  10자  "이야기를나누고있었다"
 *   상한 5 → 오탐 3건. 5는 틀린 값이었다.
 *
 * ★ 빈 구간이 8~10 하나뿐이고 폭이 2다. 8단계 maxLineWordRepeat은
 *   3~15 사이에서 6을 골랐다(폭 12). 여기는 양쪽 여유가 1자씩뿐이다.
 *   함부로 조이지 마라. 아래 좋은 답안 64건의 실제 겹침 최대는 4자지만
 *   그 수를 믿고 6으로 내리면 안 된다 — 폭 2는 일부러 재사용을 넣은
 *   표본에서 나온 값이고, 화면에서 쓰는 사람은 그렇게 쓴다.
 *   어느 문항에서든 좋은 답안이 9에 닿으면 값을 다시 잰다. 조이기 전에
 *   좋은 답안 오탐을 반드시 함께 재라.
 *
 * 대조 대상은 gaze뿐이다. stage까지 넣으면 좋은 답안 최장과 베낀 최소가
 * 8~8로 붙어 빈 구간이 사라진다 — 무대 줄은 답안이 살려도 되는 부분이다.
 */
export const MAX_ECHO = 9

export interface PovItem {
    sourceKey: string
    difficulty: 1 | 2
    /** 난이도 축. gaze가 세는 무리가 1이면 난이도 1, 2면 난이도 2 */
    groups: 1 | 2
    /** gaze 첫머리의 지시어. DEICTIC 안에 있어야 한다 */
    deictic: string
    /** 시점 인물 이름. requireAny로 들어간다. 두 글자 이상 */
    pov: string
    /** 조망 구절. relic의 출처이자 겹침 검사의 대조 대상. 여기가 훈련 재료다 */
    gaze: string
    /** 무대 설정 줄. 시점 인물이 이름으로 여기 선다. 답안이 살려도 된다 */
    stage: string
    /** 조망 표지 둘. [0]은 반드시 세는 표현. forbidWords로 들어간다 */
    relic: [string, string]
    /**
     * 왜 그것이 조망인지 한 줄. 기계가 "누구의 눈인가"를 못 재니 사람이
     * 적게 강제하는 장치다. 8단계 chain과 같은 자리다. 지우지 마라 —
     * 적을 수 없는 지문은 조망이 아니다.
     */
    why: string
    /**
     * 좋은 답안 8건. 손으로 적었다.
     *
     * 8단계처럼 지문에서 생성할 수 없다. 8단계는 답안 ⊃ 지문(끼워넣기)이라
     * 파생이 됐지만, 9단계는 relic 검사가 지문 문장이 살아남는 것을 금지한다.
     * 즉 답안 ∩ 지문 = ∅ 이 검사의 요구라서 지문이 생성의 재료가 될 수 없다.
     * 세션 8의 "손으로 적지 마라"는 8단계 맥락의 규칙이고 여기엔 안 맞는다.
     */
    goods: string[]
    /**
     * 조망을 그대로 두되 지시어와 relic 둘을 모두 피해 다시 쓴 것. 이름이 없다.
     * 이것을 잡는 것은 requireAny(시점 인물 이름)뿐이다.
     *
     * 지문에서 생성할 수 없다 — 기계로 만든 뚫기는 gaze를 그대로 물려받아
     * relic이 늘 남고, 그러면 forbidWords가 먼저 잡아서 requireAny가 일하는지
     * 영영 모른다. goods를 손으로 적어야 하는 것과 같은 이유다.
     */
    bypassNoName: string
    /**
     * relic[0](세는 표현)만 남기고 relic[1]과 지시어는 피한 조망. 이름은 있다.
     * 이것을 잡는 것은 relic[0]뿐이다 — 종결 표현 쪽인 relic[1]만으로는
     * 못 막는다는 실측(미검출 3 대 1)이 서는 자리다. 역시 손으로 적는다.
     */
    bypassCounted: string
}

export const POV_ITEMS: PovItem[] = [
    {
        sourceKey: 'pv-star-field', difficulty: 1, groups: 1, deictic: '저기', pov: '태윤',
        gaze: '저기 하늘에 별이 떠 있고, 남자 둘 여자 하나가 지나가며 이야기를 나누고 있었다.',
        stage: '태윤은 담장 아래 서 있었다.',
        relic: ['남자 둘 여자 하나', '이야기를 나누고'],
        why: '세 사람을 수로 세는 것은 위에서 내려다본 사람의 셈이다. 곁에 선 사람은 수를 세지 않는다.',
        goods: [
            '태윤이 고개를 들자 별 하나가 눈에 들어왔다. 옆을 스치는 세 사람의 말소리가 들렸다.',
            '태윤은 걸음을 멈추고 하늘을 올려다보았다. 별빛이 유난히 낮게 걸려 있었다.\n어깨를 스치며 세 사람이 지나갔고, 웃음 섞인 말소리가 뒤늦게 들렸다.',
            '밤바람이 목덜미로 파고들어 태윤은 옷깃을 여몄다. 등 뒤로 남녀의 말소리가 가까워졌다가 멀어졌다.',
            '태윤은 하늘로 눈을 들었다. 별이 낮게 걸려 있었다. 세 사람이 어깨를 스치고 지나갔다.',
            '태윤은 걸음을 멈추고 목을 젖혔다. 구름이 걷힌 자리에 별 하나가 낮게 걸려 있는 것이 보였다.\n뒤에서 다가온 세 사람이 어깨를 스치고 지나갔다.',
            '태윤의 눈에 별 하나가 들어왔다. 곁을 스치는 말소리가 짧게 귀에 걸렸다.',
            '태윤이 목을 젖히자 낮게 걸린 별이 눈에 보였다. 세 사람이 곁을 지나쳤다.',
            '담장 아래 선 태윤의 눈에 별 하나가 들어왔다. 웃음소리가 곁을 스쳐 갔다.',
        ],
        bypassNoName: '하늘에는 별이 걸려 있었고, 세 사람이 나란히 지나가며 웃고 있었다.',
        bypassCounted: '태윤이 선 담장 아래로 남자 둘 여자 하나가 지나갔다. 하늘에는 별이 걸려 있었다.',
    },
    {
        sourceKey: 'pv-guild-desk', difficulty: 1, groups: 1, deictic: '저쪽', pov: '하람',
        gaze: '저쪽 길드 사무실에는 모험가 열둘이 모여 있었고, 벽에는 의뢰서가 빼곡히 붙어 있었다.',
        stage: '하람은 문턱에 서 있었다.',
        relic: ['모험가 열둘', '의뢰서가 빼곡히'],
        why: '열둘을 세려면 방 전체를 한눈에 담아야 한다. 문턱에 선 사람 눈에는 앞줄 몇만 든다.',
        goods: [
            '하람이 문턱을 넘자 종이 타는 냄새와 쇳내가 한꺼번에 몰려왔다. 앞에 선 사내의 등이 시야를 다 가렸다.',
            '하람은 손잡이를 놓지 못했다. 웅성거림이 문틈으로 새어 나왔고, 안에서 누군가 이름을 부르는 소리가 났다.',
            '하람의 눈에 먼저 든 것은 벽에 겹쳐 붙은 종이 귀퉁이였다. 그 아래로 사람들의 어깨가 촘촘히 이어졌다.',
            '하람은 문턱에서 한 발을 들였다가 도로 물렸다. 안쪽은 숨을 쉬기 어려울 만큼 더웠다.',
            '하람은 들어서다 말고 멈췄다. 가까운 탁자에서 칼날 가는 소리가 났고, 그 너머는 사람에 가려 보이지 않았다.',
            '하람의 어깨에 누군가 부딪치고 지나갔다. 사과하는 말이 등 뒤에서 들렸다.',
            '문턱에 선 하람에게는 앞사람 등판과 그 위로 흔들리는 종이 몇 장만 들어왔다.',
            '하람은 발끝으로 바닥을 문질렀다. 문 안쪽에서 밀려나온 열기가 얼굴을 덮었다.',
        ],
        bypassNoName: '길드 사무실에는 사람들이 가득 모여 있었고, 벽마다 종이가 겹겹이 붙어 있었다.',
        bypassCounted: '하람이 선 문턱 안으로 모험가 열둘이 모여 있었다. 벽에는 종이가 겹겹이 붙어 있었다.',
    },
    {
        sourceKey: 'pv-dawn-market', difficulty: 2, groups: 2, deictic: '저 앞', pov: '정순',
        gaze: '저 앞 시장에는 좌판 여덟이 늘어섰고, 짐꾼 셋이 상자를 나르며 고함을 주고받고 있었다.',
        stage: '정순은 골목 어귀에 서 있었다.',
        relic: ['좌판 여덟', '짐꾼 셋이'],
        why: '좌판과 짐꾼을 따로 세어 늘어놓는 것은 시장을 도면처럼 위에서 본 셈이다.',
        goods: [
            '정순이 골목을 벗어나자 비린내가 먼저 얼굴을 쳤다. 어디선가 고함이 터졌고 발밑으로 물이 흘렀다.',
            '정순은 첫 좌판 앞에서 걸음을 늦췄다. 얼음 위에 놓인 고등어가 아직 은빛이었다.',
            '어깨를 밀치고 지나간 사내의 상자 모서리가 정순의 팔을 스쳤다. 사과도 없이 등이 멀어졌다.',
            '정순의 귀에 값을 부르는 소리와 상자 내려놓는 소리가 겹쳐 들어왔다. 앞이 잘 보이지 않았다.',
            '정순은 사람 사이로 몸을 비집어 넣었다. 젖은 바닥이 신발 밑에서 미끄러졌고, 등 뒤에서 누가 비키라고 소리쳤다.',
            '정순은 소매를 잡아당겨 코를 막았다. 비린내가 골목 안까지 밀려와 있었다.',
            '골목 어귀에 선 정순에게는 맨 앞 대야와 그 위로 오르는 김만 들어왔다.',
            '정순이 한 걸음 내딛자 고함이 바로 옆에서 터졌다. 어깨가 저절로 움츠러들었다.',
        ],
        bypassNoName: '시장에는 좌판이 길게 늘어섰고, 사내들이 상자를 나르며 고함을 주고받았다.',
        bypassCounted: '정순이 선 골목 앞으로 좌판 여덟이 늘어서 있었다. 사내들이 상자를 날랐다.',
    },
    {
        sourceKey: 'pv-drill-yard', difficulty: 1, groups: 1, deictic: '저 멀리', pov: '무결',
        gaze: '저 멀리 연무장에서는 제자 스물이 목검을 휘둘렀고, 흙먼지가 담장 위로 피어올랐다.',
        stage: '무결은 회랑 기둥에 기대 있었다.',
        relic: ['제자 스물', '흙먼지가 담장 위로'],
        why: '스물을 세려면 마당 밖에서 봐야 한다. 안에 선 사람에게는 앞사람 등만 보인다.',
        goods: [
            '무결은 기둥에 기댄 채 눈을 감았다. 목검이 살을 때리는 소리가 박자처럼 이어졌다.',
            '무결의 콧속으로 마른 흙냄새가 밀려들었다. 회랑까지 먼지가 넘어와 소매에 앉았다.',
            '무결이 고개를 돌리자 맨 앞줄 어깨가 눈에 들어왔다. 그 뒤는 먼지에 가려 흐렸다.',
            '무결은 기둥에서 몸을 뗐다. 발바닥으로 마당이 울리는 것이 그대로 전해졌다.',
            '무결은 손끝을 쥐었다 폈다. 목검 부딪는 소리가 귀에 박힐 때마다 어깨가 저절로 따라 움직였다.',
            '땀내와 흙냄새가 섞여 무결의 얼굴로 끼얹혔다. 회랑 그늘도 시원하지 않았다.',
            '회랑에 선 무결에게는 앞줄 몇 명의 등과 흔들리는 목검 끝만 들어왔다.',
            '무결은 기침을 삼켰다. 마당에서 넘어온 먼지가 목구멍을 긁었고, 함성이 한 박자 늦게 따라왔다.',
        ],
        bypassNoName: '연무장에서는 제자들이 목검을 휘둘렀고, 마당에 먼지가 자욱하게 일었다.',
        bypassCounted: '무결이 기댄 기둥 너머 연무장에서 제자 스물이 목검을 휘둘렀다. 먼지가 자욱했다.',
    },
    {
        sourceKey: 'pv-lantern-night', difficulty: 2, groups: 2, deictic: '저 너머', pov: '소하',
        gaze: '저 너머 강가에는 등불 스무 개가 떠갔고, 다리 위에서 연인 넷이 난간에 기대 웃고 있었다.',
        stage: '소하는 버드나무 그늘에 서 있었다.',
        relic: ['등불 스무 개', '연인 넷이'],
        why: '등불과 사람을 각각 세는 시선은 강과 다리를 한 화면에 함께 올려놓은 시선이다.',
        goods: [
            '소하는 버드나무 가지를 걷고 강 쪽으로 몸을 내밀었다. 물 위로 흔들리는 불빛 하나가 눈에 들어왔다.',
            '소하의 볼에 물기 밴 바람이 닿았다. 다리 쪽에서 웃음소리가 끊겼다 이어졌다.',
            '소하는 가까운 불 하나를 눈으로 따라갔다. 그것이 돌에 걸려 맴도는 것을 한참 보았다.',
            '소하는 그늘에서 나오지 않았다. 다리 위 목소리가 바람을 타고 조각조각 넘어왔다.',
            '소하가 숨을 들이켜자 기름 타는 냄새가 섞여 들어왔다. 강물이 발치에서 낮게 찰랑였다.',
            '소하의 눈에 물빛과 불빛이 겹쳐 어른거렸다. 눈을 깜빡이자 다시 갈라졌다.',
            '버드나무 그늘에 선 소하에게는 가장 가까운 불 하나와 그 아래 일렁이는 물결만 들어왔다.',
            '소하는 손등으로 눈가를 눌렀다. 웃음소리가 들려올 때마다 어깨가 조금씩 굳었다.',
        ],
        bypassNoName: '강가에는 등불이 줄지어 떠갔고, 다리 위에서 사람들이 난간에 기대 웃었다.',
        bypassCounted: '소하가 선 강가에는 등불 스무 개가 떠갔다. 다리 위에서 웃음소리가 났다.',
    },
    {
        sourceKey: 'pv-banquet-hall', difficulty: 2, groups: 2, deictic: '저 위', pov: '유안',
        gaze: '저 위 연회장에는 촛대 열둘이 타올랐고, 귀족 예닐곱이 잔을 든 채 낮은 말을 주고받았다.',
        stage: '유안은 계단 아래 그늘에 서 있었다.',
        relic: ['촛대 열둘', '귀족 예닐곱이'],
        why: '촛대 수까지 세는 것은 방을 위에서 내려다본 사람의 시선이다. 계단 아래에서는 문틈만 보인다.',
        goods: [
            '유안은 계단 그늘에서 고개를 들었다. 문틈으로 새어 나온 불빛이 눈을 찔렀다.',
            '유안의 귀에 잔 부딪는 소리가 먼저 닿았다. 말소리는 뭉개져 뜻을 알 수 없었다.',
            '유안은 난간을 잡고 두 계단을 올랐다. 촛농 냄새와 향내가 한꺼번에 밀려 내려왔다.',
            '유안은 그늘에서 움직이지 않았다. 위에서 흘러나온 웃음이 계단을 타고 굴러떨어졌다.',
            '유안이 숨을 죽이자 제 심장 소리가 더 크게 들렸다. 위쪽 말소리는 여전히 낮았다.',
            '유안의 눈에 든 것은 문턱을 넘어온 빛 한 줄기뿐이었다. 그 위로 그림자가 몇 번 지나갔다.',
            '계단 아래 선 유안에게는 열린 문 사이로 든 불 하나와 흔들리는 그림자만 보였다.',
            '유안은 손바닥을 옷자락에 문질렀다. 위에서 내려온 더운 공기가 목덜미에 얹혔다.',
        ],
        bypassNoName: '연회장에는 촛대가 줄줄이 타올랐고, 사람들이 잔을 든 채 낮은 말을 주고받았다.',
        bypassCounted: '유안이 선 계단 위 연회장에는 촛대 열둘이 타올랐다. 낮은 말소리가 이어졌다.',
    },
    {
        sourceKey: 'pv-broken-gate', difficulty: 1, groups: 1, deictic: '멀찍이', pov: '규담',
        gaze: '멀찍이 무너진 성문 앞에 병사 열이 창을 세우고 늘어섰고, 깨진 돌이 길을 반쯤 막고 있었다.',
        stage: '규담은 마른 도랑에 엎드려 있었다.',
        relic: ['병사 열이', '길을 반쯤 막고'],
        why: '열이라는 수와 길이 막힌 정도를 한꺼번에 재는 것은 지도를 내려다보는 눈이다.',
        goods: [
            '규담은 도랑 바닥에 뺨을 붙였다. 흙냄새 사이로 쇠 비린내가 희미하게 섞였다.',
            '규담이 고개를 조금 들자 창끝 몇 개가 하늘을 찌르고 있는 것이 보였다.',
            '규담의 손끝에 마른 흙이 부스러졌다. 성문 쪽에서 발소리가 규칙적으로 났다.',
            '규담은 숨을 얕게 쉬었다. 도랑 위로 지나가는 그림자가 잠깐 빛을 가렸다.',
            '규담은 돌 틈으로 눈을 붙였다. 무너진 벽 사이로 창날이 한 번씩 번쩍였다.',
            '규담의 등에 식은땀이 배었다. 쇠붙이 부딪는 소리가 생각보다 가까웠다.',
            '도랑에 엎드린 규담에게는 눈앞의 마른 풀과 그 너머 흔들리는 창끝만 들어왔다.',
            '규담은 팔꿈치를 조금씩 당겼다. 흙이 소매 안으로 밀려들었고 목이 몹시 말랐다.',
        ],
        bypassNoName: '무너진 성문 앞에 병사들이 창을 세우고 늘어섰고, 깨진 돌이 길에 흩어져 있었다.',
        bypassCounted: '규담이 엎드린 도랑 너머 성문 앞에 병사 열이 창을 세우고 늘어섰다. 돌이 흩어져 있었다.',
    },
    {
        sourceKey: 'pv-frozen-lake', difficulty: 2, groups: 2, deictic: '저기', pov: '연희',
        gaze: '저기 얼어붙은 호수에는 낚시 구멍 열넷이 뚫려 있었고, 아이 셋이 얼음을 지치며 소리를 질렀다.',
        stage: '연희는 비탈 위 바위에 앉아 있었다.',
        relic: ['낚시 구멍 열넷', '아이 셋이'],
        why: '구멍 수와 아이 수를 함께 세는 것은 호수를 통째로 한 장면에 담은 셈이다.',
        goods: [
            '연희는 바위에 앉은 채 손을 겨드랑이에 끼웠다. 얼음 갈라지는 소리가 발밑까지 올라왔다.',
            '연희의 귀에 웃음소리가 바람에 실려 끊겼다 이어졌다. 볼이 얼얼했다.',
            '연희는 가까운 구멍 하나를 눈으로 좇았다. 검은 물이 그 안에서 조금씩 흔들렸다.',
            '연희는 비탈에서 내려가지 않았다. 얼음판 위 소리가 유난히 멀게 들렸다.',
            '연희가 숨을 내쉬자 흰 김이 눈앞을 가렸다. 김이 걷히자 얼음빛이 다시 눈을 찔렀다.',
            '연희의 손가락이 곱아 잘 펴지지 않았다. 바람이 목덜미로 자꾸 파고들었다.',
            '바위에 앉은 연희에게는 발치의 마른 갈대와 그 너머 번들거리는 얼음만 들어왔다.',
            '연희는 무릎을 끌어안았다. 어디선가 얼음이 쩍 하고 갈라졌고 심장이 한 번 뛰었다.',
        ],
        bypassNoName: '얼어붙은 호수에는 낚시 구멍이 드문드문 뚫려 있었고, 아이들이 얼음을 지치며 소리를 질렀다.',
        bypassCounted: '연희가 앉은 비탈 아래 호수에는 낚시 구멍 열넷이 뚫려 있었다. 웃음소리가 울렸다.',
    },
]

// 조망 줄과 무대 줄을 개행으로 나눈다. 화면에서 둘이 다른 역할이라는 것이
// 보이고, 덤프 passage도 이 문자열과 글자 하나까지 같아야 한다(verify 가드).
export const passageOf = (item: PovItem) => `${item.gaze}\n${item.stage}`
const noDeictic = (item: PovItem) => item.gaze.replace(item.deictic + ' ', '')

/** gaze와 연속으로 겹치는 최대 글자수. 공백을 뗀 뒤 잰다. */
export function echoLen(text: string, gaze: string): number {
    const a = text.replace(/\s/g, ''), b = gaze.replace(/\s/g, '')
    let best = 0
    const pv = new Array(b.length + 1).fill(0)
    const cu = new Array(b.length + 1).fill(0)
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            cu[j] = a[i - 1] === b[j - 1] ? pv[j - 1] + 1 : 0
            if (cu[j] > best) best = cu[j]
        }
        for (let j = 0; j <= b.length; j++) pv[j] = cu[j]
    }
    return best
}

/** 좋은 답안. 손으로 적은 8건을 그대로 낸다 — 지문에서 생성할 수 없다. */
export function povCleanCases(item: PovItem): { key: string; text: string }[] {
    return item.goods.map((text, i) => ({ key: `좋은 답안 ${i + 1}`, text }))
}

/** 뚫기. 지문에서 생성한다. 전부 fail이어야 한다. */
export function povBypassCases(item: PovItem): { key: string; text: string }[] {
    const full = passageOf(item)
    return [
        { key: '지문 그대로', text: full },
        { key: '지시어만 뺌', text: `${noDeictic(item)} ${item.stage}` },
        { key: '지문 + 감각동사 한 줄', text: full + '\n그 광경이 한눈에 보였다.' },
        { key: '지시어 빼고 감각동사', text: noDeictic(item) + ' 그 모습이 한눈에 들어왔다.' },
        { key: '1인칭으로 바꿈', text: '내가 고개를 들자 ' + noDeictic(item) },
        { key: '이름만 냄', text: item.pov },
        // 아래 둘은 손으로 적은 것이다. 기계로 만든 뚫기는 gaze를 물려받아
        // relic이 늘 남으므로 forbidWords가 먼저 잡는다 — requireAny와
        // relic[0]이 실제로 일하는지 보려면 그것들을 피한 표본이 있어야 한다.
        { key: '조망 유지 · 이름 없음', text: item.bypassNoName },
        { key: '세는 표현만 남김', text: item.bypassCounted },
        // 예시를 제 지문으로 되돌리면 이 뚫기가 모범 답안이 된다. 8단계가
        // 실측으로 확인한 자리다(미검출 8/8). 지금은 예시의 시점 인물이
        // 여덟 이름 어디에도 없어서 requireAny가 잡는다.
        { key: '지시문 예시 그대로', text: POV_INSTRUCTION_EXAMPLE },
    ]
}

/**
 * 알려진 한계. 이것은 미검출이고, 지금은 pass가 맞다.
 *
 * requireAny는 낱말 하나의 유무만 본다. 이름을 박고 내용을 통째로 바꾸면
 * 통과한다. local.ts:481~486이 이것을 서술형 채점 전체의 한계로 적어 뒀고,
 * 8단계도 같은 구멍을 안고 나갔다. 내용 판정은 AI 쪽 몫이다.
 *
 * 7단계 knownGapCase와 방향이 반대다 — 저기는 실패가 좋은 소식이지만
 * 여기서는 통과가 정상이고 실패가 경보다. 이것이 fail로 바뀌면 누군가
 * 규칙을 조인 것이다. 그때는 좋은 답안 오탐이 함께 늘었는지 반드시 재라.
 * 밴드를 40으로 올렸을 때 나온 오탐 52/64가 그 값이다.
 */
export function povKnownGapCase(item: PovItem): { key: string; note: string; text: string } {
    return {
        key: '내용 통째 교체',
        note: '이름만 박고 내용을 바꾼 답안. 규칙으로는 못 잡는다. 조이면 좋은 답안이 먼저 걸린다',
        text: `${item.pov}은 오늘 장이 열린다는 말을 들었다. 쌀값이 지난달보다 많이 올랐다.`,
    }
}

/** 9단계 전용 지문 규칙. 공용 규칙은 passage-rules.ts에 있다. */
export function validatePovItem(item: PovItem): string[] {
    const fails: string[] = []

    if (noSpaceLen(item.pov) < 2) fails.push(`시점 인물 이름이 두 글자 미만이다 (${item.pov})`)
    if (!DEICTIC.includes(item.deictic)) fails.push(`deictic이 목록 밖이다 (${item.deictic})`)
    if (!item.gaze.startsWith(item.deictic + ' ')) fails.push('gaze가 지시어로 시작하지 않는다')
    if (!item.stage.includes(item.pov)) fails.push('stage에 시점 인물 이름이 없다')
    // gaze에 이름이 있으면 "원문 그대로 + 지시어 제거"가 requireAny를 통과한다.
    if (item.gaze.includes(item.pov)) fails.push('gaze에 시점 인물 이름이 있다 — stage로 옮겨라')

    // 9단계 지문에는 대사가 없다. passage-rules의 종결어미 규칙 둘은
    // dialogueLines가 빈 배열이라 조용히 통과한다 — 그 '조용히'를 막는다.
    const quotes = (passageOf(item).match(/["']/g)?.length ?? 0)
    if (quotes > 0) fails.push(`지문에 따옴표가 있다 (${quotes}개)`)

    for (const r of item.relic) if (!item.gaze.includes(r)) fails.push(`relic이 gaze에 없다 (${r})`)
    if (!COUNT_WORDS.some((w) => item.relic[0].includes(w))) {
        fails.push(`relic[0]이 세는 표현이 아니다 (${item.relic[0]}) — 종결 표현만으로는 미검출 3이다`)
    }
    if (item.relic[0] === item.relic[1]) fails.push('relic 둘이 같다')

    if ((item.groups === 1) !== (item.difficulty === 1)) fails.push('groups와 난이도가 안 맞는다')

    if (item.goods.length !== 8) fails.push(`좋은 답안이 8건이 아니다 (${item.goods.length})`)
    if (item.why.length < 20) fails.push('why가 너무 짧다')
    for (const [i, g] of item.goods.entries()) {
        const e = echoLen(g, item.gaze)
        if (e >= MAX_ECHO) fails.push(`좋은 답안 ${i + 1}이 gaze와 ${e}자 겹친다 (${MAX_ECHO} 미만이어야)`)
    }

    // 손으로 적은 뚫기 둘이 제 일을 할 수 있는 꼴인지. 이것이 무너지면
    // requireAny·relic[0] 의존 감시가 조용히 무의미해진다.
    if (item.bypassNoName.includes(item.pov)) fails.push('bypassNoName에 시점 인물 이름이 있다')
    for (const r of item.relic) {
        if (item.bypassNoName.includes(r)) fails.push(`bypassNoName에 relic이 있다 (${r})`)
    }
    if (!item.bypassCounted.includes(item.pov)) fails.push('bypassCounted에 시점 인물 이름이 없다')
    if (!item.bypassCounted.includes(item.relic[0])) fails.push('bypassCounted에 relic[0]이 없다')
    if (item.bypassCounted.includes(item.relic[1])) fails.push('bypassCounted에 relic[1]이 있다')
    for (const d of DEICTIC) {
        if (item.bypassNoName.includes(d)) fails.push(`bypassNoName에 지시어가 있다 (${d})`)
        if (item.bypassCounted.includes(d)) fails.push(`bypassCounted에 지시어가 있다 (${d})`)
    }

    return fails
}

/**
 * 문항 사이 교차 검사.
 *
 * relic을 사람이 문항마다 고른다. 고르는 사람이 자기 지문의 결함을 못 본다 —
 * 교차로 세는 것이 유일한 방법이다. passage-rules.ts의 LEAK_PROBE와 같은 자리다.
 */
export function crossCheckPovItems(items: PovItem[]): string[] {
    const fails: string[] = []
    for (const a of items) {
        for (const b of items) {
            if (a.sourceKey === b.sourceKey) continue
            for (const g of b.goods) {
                for (const r of a.relic) {
                    if (g.includes(r)) fails.push(`${a.sourceKey}의 relic '${r}'이 ${b.sourceKey}의 좋은 답안에 걸린다`)
                }
                if (g.includes(a.pov)) fails.push(`${a.sourceKey}의 이름 '${a.pov}'이 ${b.sourceKey}의 좋은 답안에 있다`)
            }
        }
    }
    if (new Set(items.map((i) => i.pov)).size !== items.length) fails.push('시점 인물 이름이 겹친다')
    if (new Set(items.map((i) => i.sourceKey)).size !== items.length) fails.push('sourceKey가 겹친다')
    return fails
}

/**
 * 지시문 예시의 조망 쪽. 여덟 지문 어느 것도 아닌 중립 장면이다.
 *
 * 세션 8이 얻은 것: 예시를 제 지문으로 되돌리면 '지시문 예시 그대로' 뚫기가
 * 모범 답안이 되어 모든 검사를 통과한다. 그래서 예시는 여덟과 겹치면 안 되고,
 * 시점 인물 '덕수'도 여덟 이름 어디에도 없어야 한다(verify가 단정한다).
 */
export const POV_INSTRUCTION_BEFORE =
    '저 앞 나루에는 배 세 척이 묶여 있었고, 사공 둘이 그물을 손질하고 있었다.\n' +
    '덕수는 둑 위에 서 있었다.'

/** 지시문 예시의 밀착 쪽. 이것을 그대로 낸 답안은 여덟 문항 전부에서 fail이어야 한다. */
export const POV_INSTRUCTION_EXAMPLE =
    '덕수가 둑을 내려서자 젖은 밧줄 냄새가 먼저 올라왔다.\n' +
    '발치에서 물이 뱃전을 두드렸고, 등 뒤에서 그물 터는 소리가 났다.'

// 여덟 문항이 전부 이 문자열을 그대로 쓴다 — 덤프 instruction과 글자
// 하나까지 같아야 한다.
//
// 숫자(분량·금지어·필수어)를 여기 다시 적지 않는다. 전부 화면 오른쪽 기준
// 목록에 떠 있다. 남긴 두 문장은 그 목록이 못 전하는 것이다 — '1인칭으로
// 바꾸지 않습니다'는 검사로 재지 않고(이름 requireAny가 부수적으로 막을
// 뿐이다), '그 사람이 못 본 것은 쓰지 않습니다'는 애초에 규칙으로 잴 수
// 없는 항목이라 말로만 전할 수 있다. 그것이 이 단계의 알려진 한계다.
export const POV_INSTRUCTION =
    '한 사람의 눈에 든 것만 남기고 다시 쓰시오. 이렇게 됩니다.\n' +
    '\n' +
    POV_INSTRUCTION_BEFORE.split('\n').map((l) => `  ${l}`).join('\n') +
    '\n' +
    '\n' +
    '  ↓\n' +
    '\n' +
    POV_INSTRUCTION_EXAMPLE.split('\n').map((l) => `  ${l}`).join('\n') +
    '\n' +
    '\n' +
    '1인칭으로 바꾸지 않습니다. 그 사람이 못 본 것은 쓰지 않습니다.'
