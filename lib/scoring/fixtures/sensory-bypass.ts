export const SENSORY_FORBID_WORDS = ["눈", "빛", "색", "시선", "모습", "그림자", "어둠", "캄캄", "깜깜", "컴컴", "흐릿", "뚜렷", "얼굴", "시야", "선명", "투명", "반짝", "어른어른"]

export const SENSORY_FORBID_LEMMAS = ["보/VV", "보이/VV", "바라보/VV", "쳐다보/VV", "내려다보/VV", "올려다보/VV", "둘러보/VV", "살펴보/VV", "띄/VV", "비치/VV", "빛나/VV", "번쩍이/VV", "반짝이/VV", "어른거리/VV", "밝/VA", "어둡/VA", "붉/VA", "푸르/VA", "하얗/VA", "희/VA", "환하/VA", "검/VA", "노랗/VA", "누렇/VA", "하얘지/VV", "흐리/VA", "훤하/VA", "훤/XR"]

export const SENSORY_BYPASS = [
    // 축약 불규칙  → forbidWords 없음 / forbidLemmas ['하얘지/VV']
    { key: 'bp-hayaeji-1', category: '축약 불규칙', text: '저고리가 하얘졌다.', expectDetected: true,
        lemmas: [{"lemma": "저고리", "tag": "NNG", "surface": "저고리가"}, {"lemma": "하얘지", "tag": "VV", "surface": "하얘졌다"}] },
    // 축약 불규칙  → forbidWords 없음 / forbidLemmas ['하얘지/VV']
    { key: 'bp-hayaeji-2', category: '축약 불규칙', text: '치마가 하얘지고 있었다.', expectDetected: true,
        lemmas: [{"lemma": "치마", "tag": "NNG", "surface": "치마가"}, {"lemma": "하얘지", "tag": "VV", "surface": "하얘지고"}] },
    // -어지다 정상형(대조군)  → forbidWords 없음 / forbidLemmas ['붉/VA']
    { key: 'bp-eojida-1', category: '-어지다 정상형(대조군)', text: '하늘이 붉어졌다.', expectDetected: true,
        lemmas: [{"lemma": "하늘", "tag": "NNG", "surface": "하늘이"}, {"lemma": "붉", "tag": "VA", "surface": "붉어졌다"}] },
    // -어지다 정상형(대조군)  → forbidWords 없음 / forbidLemmas ['어둡/VA-I']
    { key: 'bp-eojida-2', category: '-어지다 정상형(대조군)', text: '방이 어두워졌다.', expectDetected: true,
        lemmas: [{"lemma": "방", "tag": "NNG", "surface": "방이"}, {"lemma": "어둡", "tag": "VA-I", "surface": "어두워졌다"}] },
    // 태깅 붕괴  → forbidWords 없음 / forbidLemmas 없음
    { key: 'bp-nure', category: '태깅 붕괴', text: '잎이 누레졌다.', expectDetected: false,
        lemmas: [{"lemma": "잎", "tag": "NNG", "surface": "잎이"}, {"lemma": "누", "tag": "NNG", "surface": "누레졌다"}, {"lemma": "레", "tag": "NNG", "surface": "누레졌다"}, {"lemma": "지", "tag": "VV", "surface": "누레졌다"}] },
    // 미등재 형용사  → forbidWords 없음 / forbidLemmas ['흐리/VA']
    { key: 'bp-heuri', category: '미등재 형용사', text: '형체가 흐려졌다.', expectDetected: true,
        lemmas: [{"lemma": "형체", "tag": "NNG", "surface": "형체가"}, {"lemma": "흐리", "tag": "VA", "surface": "흐려졌다"}] },
    // 미등재 형용사  → forbidWords 없음 / forbidLemmas ['훤하/VA']
    { key: 'bp-hwonha-1', category: '미등재 형용사', text: '달이 훤했다.', expectDetected: true,
        lemmas: [{"lemma": "달", "tag": "NNG", "surface": "달이"}, {"lemma": "훤하", "tag": "VA", "surface": "훤했다"}] },
    // 미등재 형용사  → forbidWords 없음 / forbidLemmas ['훤/XR']
    { key: 'bp-hwonha-2', category: '미등재 형용사', text: '훤한 마당으로 나섰다.', expectDetected: true,
        lemmas: [{"lemma": "훤", "tag": "XR", "surface": "훤한"}, {"lemma": "마당", "tag": "NNG", "surface": "마당으로"}, {"lemma": "나서", "tag": "VV", "surface": "나섰다"}] },
    // 미등재 형용사  → forbidWords ['선명'] / forbidLemmas 없음
    { key: 'bp-seonmyeong', category: '미등재 형용사', text: '무늬가 선명했다.', expectDetected: true,
        lemmas: [{"lemma": "무늬", "tag": "NNG", "surface": "무늬가"}, {"lemma": "선명", "tag": "NNG", "surface": "선명했다"}] },
    // 미등재 형용사  → forbidWords ['투명'] / forbidLemmas 없음
    { key: 'bp-tumyeong', category: '미등재 형용사', text: '얼음이 투명했다.', expectDetected: true,
        lemmas: [{"lemma": "얼음", "tag": "NNG", "surface": "얼음이"}, {"lemma": "투명", "tag": "NNG", "surface": "투명했다"}] },
    // MAG + 하다  → forbidWords ['반짝'] / forbidLemmas 없음
    { key: 'bp-banjjak', category: 'MAG + 하다', text: '물결이 반짝했다.', expectDetected: true,
        lemmas: [{"lemma": "물결", "tag": "NNG", "surface": "물결이"}, {"lemma": "반짝", "tag": "MAG", "surface": "반짝했다"}] },
    // MAG + 하다  → forbidWords ['어른어른'] / forbidLemmas 없음
    { key: 'bp-eoreun', category: 'MAG + 하다', text: '물체가 어른어른했다.', expectDetected: true,
        lemmas: [{"lemma": "물체", "tag": "NNG", "surface": "물체가"}, {"lemma": "어른어른", "tag": "MAG", "surface": "어른어른했다"}] },
    // 어휘 누락  → forbidWords ['시야'] / forbidLemmas 없음
    { key: 'bp-siya-1', category: '어휘 누락', text: '시야가 좁아졌다.', expectDetected: true,
        lemmas: [{"lemma": "시야", "tag": "NNG", "surface": "시야가"}, {"lemma": "좁", "tag": "VA-R", "surface": "좁아졌다"}] },
    // 어휘 누락  → forbidWords ['시야'] / forbidLemmas 없음
    { key: 'bp-siya-2', category: '어휘 누락', text: '그는 시야를 돌렸다.', expectDetected: true,
        lemmas: [{"lemma": "시야", "tag": "NNG", "surface": "시야를"}, {"lemma": "돌리", "tag": "VV", "surface": "돌렸다"}] },
    // 의도적 제외  → forbidWords 없음 / forbidLemmas 없음
    { key: 'bp-deureona', category: '의도적 제외', text: '윤곽이 드러났다.', expectDetected: false,
        lemmas: [{"lemma": "윤곽", "tag": "NNG", "surface": "윤곽이"}, {"lemma": "드러나", "tag": "VV", "surface": "드러났다"}] },
]
export const SENSORY_CLEAN = [
    // 청각
    { category: '청각', text: '나뭇가지가 우지끈 꺾였다.',
        lemmas: [{"lemma": "나뭇가지", "tag": "NNG", "surface": "나뭇가지가"}, {"lemma": "우지끈", "tag": "MAG", "surface": "우지끈"}, {"lemma": "꺾이", "tag": "VV", "surface": "꺾였다"}] },
    // 청각
    { category: '청각', text: '마룻바닥이 발밑에서 삐걱였다.',
        lemmas: [{"lemma": "마룻바닥", "tag": "NNG", "surface": "마룻바닥이"}, {"lemma": "발밑", "tag": "NNG", "surface": "발밑에서"}, {"lemma": "삐걱이", "tag": "VV", "surface": "삐걱였다"}] },
    // 촉각
    { category: '촉각', text: '젖은 옷이 등에 들러붙었다.',
        lemmas: [{"lemma": "젖", "tag": "VV", "surface": "젖은"}, {"lemma": "옷", "tag": "NNG", "surface": "옷이"}, {"lemma": "등", "tag": "NNG", "surface": "등에"}, {"lemma": "들러붙", "tag": "VV", "surface": "들러붙었다"}] },
    // 촉각
    { category: '촉각', text: '목덜미가 서늘해졌다.',
        lemmas: [{"lemma": "목덜미", "tag": "NNG", "surface": "목덜미가"}, {"lemma": "서늘", "tag": "XR", "surface": "서늘해졌다"}] },
    // 촉각
    { category: '촉각', text: '발밑이 기울어 몸이 쏠렸다.',
        lemmas: [{"lemma": "발밑", "tag": "NNG", "surface": "발밑이"}, {"lemma": "기울", "tag": "VV", "surface": "기울어"}, {"lemma": "몸", "tag": "NNG", "surface": "몸이"}, {"lemma": "쏠리", "tag": "VV", "surface": "쏠렸다"}] },
    // 온도
    { category: '온도', text: '등줄기로 찬 기운이 지나갔다.',
        lemmas: [{"lemma": "등줄기", "tag": "NNG", "surface": "등줄기로"}, {"lemma": "차", "tag": "VA", "surface": "찬"}, {"lemma": "기운", "tag": "NNG", "surface": "기운이"}, {"lemma": "지나가", "tag": "VV", "surface": "지나갔다"}] },
    // 후각
    { category: '후각', text: '쇳내가 짙게 배었다.',
        lemmas: [{"lemma": "쇳내", "tag": "NNG", "surface": "쇳내가"}, {"lemma": "짙", "tag": "VA", "surface": "짙게"}, {"lemma": "배", "tag": "VV", "surface": "배었다"}] },
    // 후각
    { category: '후각', text: '탄내가 짙어 숨이 막혔다.',
        lemmas: [{"lemma": "타", "tag": "VV", "surface": "탄내가"}, {"lemma": "내", "tag": "NNG", "surface": "탄내가"}, {"lemma": "짙", "tag": "VA", "surface": "짙어"}, {"lemma": "숨", "tag": "NNG", "surface": "숨이"}, {"lemma": "막히", "tag": "VV", "surface": "막혔다"}] },
    // 미각
    { category: '미각', text: '입안에 쇳물 맛이 돌았다.',
        lemmas: [{"lemma": "입", "tag": "NNG", "surface": "입안에"}, {"lemma": "안", "tag": "NNG", "surface": "입안에"}, {"lemma": "쇳물", "tag": "NNG", "surface": "쇳물"}, {"lemma": "맛", "tag": "NNG", "surface": "맛이"}, {"lemma": "돌", "tag": "VV", "surface": "돌았다"}] },
    // 충돌 감시: 훤/XR
    { category: '충돌 감시: 훤/XR', text: '그는 훤칠한 걸음으로 다가왔다.',
        lemmas: [{"lemma": "훤칠", "tag": "XR", "surface": "훤칠한"}, {"lemma": "걸음", "tag": "NNG", "surface": "걸음으로"}, {"lemma": "다가오", "tag": "VV", "surface": "다가왔다"}] },
    // 충돌 감시: 어른어른
    { category: '충돌 감시: 어른어른', text: '어른들이 마당 밖에서 떠들었다.',
        lemmas: [{"lemma": "어른", "tag": "NNG", "surface": "어른들이"}, {"lemma": "마당", "tag": "NNG", "surface": "마당"}, {"lemma": "밖", "tag": "NNG", "surface": "밖에서"}, {"lemma": "떠들", "tag": "VV", "surface": "떠들었다"}] },
    // 충돌 감시: 흐리/VA
    { category: '충돌 감시: 흐리/VA', text: '물이 흐르는 소리가 났다.',
        lemmas: [{"lemma": "물", "tag": "NNG", "surface": "물이"}, {"lemma": "흐르", "tag": "VV", "surface": "흐르는"}, {"lemma": "소리", "tag": "NNG", "surface": "소리가"}, {"lemma": "나", "tag": "VV", "surface": "났다"}] },
    // 충돌 감시: 반짝
    { category: '충돌 감시: 반짝', text: '반가운 소리가 담을 넘었다.',
        lemmas: [{"lemma": "반갑", "tag": "VA-I", "surface": "반가운"}, {"lemma": "소리", "tag": "NNG", "surface": "소리가"}, {"lemma": "담", "tag": "NNG", "surface": "담을"}, {"lemma": "넘", "tag": "VV", "surface": "넘었다"}] },
]

// 오탐 0 / 13