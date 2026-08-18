// convert 유형 문항의 원본 데이터.
//
// 이 파일이 단일 출처다. 시드 SQL은 scripts/gen-convert-seed.ts 가 여기서 생성한다.
// forbidWords를 SQL에 직접 쓰지 않는 이유:
//   문항이 걷어내라고 지시한 표현 자신이 forbidWords에 걸리는지를
//   기계적으로 검사해야 하는데, SQL 안에 있으면 검사할 방법이 없다.
//
// 불변식 (verify.ts가 단정한다):
//   1. 지문의 감정어가 forbidWords에 걸린다
//      → 걸리지 않으면 사용자가 지문을 복사해 제출해도 통과하고 AI까지 호출된다
//   2. forbidWords의 어떤 어간도 흔한 단어의 접두사가 아니다
//      → 좋은 답안을 미달로 만들지 않는다

export interface ConvertSeed {
  /**
   * 안정 식별자. DB의 problems.source_key 와 대응한다.
   *
   * 지문의 부분 문자열을 키로 쓰면 지문을 고치는 순간 UPDATE의 where 절이
   * 깨지면서 DB에는 옛 지문이 남고, 테스트만 새 지문 기준으로 통과한다.
   * 그러면 DB의 지문이 forbidWords에 안 걸리는 상태가 조용히 만들어진다.
   * 그래서 키를 지문에서 독립시킨다.
   */
  key: string
  instruction: string
  passage: string
  forbidWords: string[]
  maxChars: number
  maxAdverbs: number
  maxModifiers: number
  minVerbs: number
  genre: string
  difficulty: number
  /**
   * 검토를 마친 오탐. 어간이 이 단어들의 접두사가 되는 것을 알고도 남겨둔 경우다.
   *
   * 가드를 끄는 장치가 아니라 triage 기록이다. 검토하지 않은 충돌은 여전히
   * 테스트를 실패시킨다. 나중에 이 어간을 다른 장르 문항에 재사용하면
   * 그때 다시 판단해야 한다는 표시이기도 하다.
   */
  reviewedCollisions?: { stem: string; word: string; why: string }[]
}

export const CONVERT_SEEDS: ConvertSeed[] = [
  {
    key: 'sim-cheong-fear',
    instruction: "'심청은 두려웠다'를 감정어 없이 쓰시오. 신체 동작만으로 두려움이 보이게 할 것.",
    passage: '뱃사람들이 뱃전에 모여 그녀를 불렀다. 심청은 두려웠다.',
    // 두렵다는 ㅂ불규칙: 두려운/두려워/두려웠 과 두렵게/두렵다 두 계열이 나온다
    forbidWords: ['두려', '두렵', '무서', '겁먹', '떨렸', '공포', '질렸'],
    maxChars: 60, maxAdverbs: 1, maxModifiers: 2, minVerbs: 1,
    genre: 'modern', difficulty: 1,
  },
  {
    key: 'heungbu-joy',
    instruction: "'흥부는 기뻤다'를 감정어 없이 쓰시오.",
    passage: '박이 갈라지고 안에서 금은보화가 쏟아졌다. 흥부는 기뻤다.',
    forbidWords: ['기뻤', '기쁘', '기뻐', '기쁨', '행복', '신났', '신나', '즐거', '좋았'],
    maxChars: 60, maxAdverbs: 1, maxModifiers: 2, minVerbs: 2,
    genre: 'fantasy', difficulty: 1,
  },
  {
    key: 'kongjwi-grief',
    instruction: "'콩쥐는 서러웠다'를 감정어 없이 쓰시오. 울음을 직접 쓰지 말 것.",
    passage: '식구들은 잔치에 가고 마당에는 깨진 독만 남았다. 콩쥐는 서러웠다.',
    forbidWords: ['서러', '서럽', '슬프', '슬펐', '슬픔', '눈물', '흐느', '비참', '원망'],
    maxChars: 70, maxAdverbs: 1, maxModifiers: 2, minVerbs: 2,
    genre: 'modern', difficulty: 2,
  },
  {
    key: 'dragon-king-anger',
    instruction: "'용왕은 화가 났다'를 감정어 없이 쓰시오.",
    passage: '토끼가 간을 두고 왔다고 말했다. 용왕은 화가 났다.',
    // '화났'은 "화가 났다"를 잡지 못한다 (화·가·공백·났). 띄어쓴 형태를 따로 넣는다.
    // '화가 나'는 화가(畫家)와 충돌한다: "화가 나무를 그렸다".
    // 활용형까지 좁히면 충돌이 사라지므로 triage가 필요 없다.
    forbidWords: ['화났', '화가 났', '화가 나서', '화가 치밀', '분노', '노여', '성났', '격분', '짜증', '치밀어', '치밀었'],
    maxChars: 60, maxAdverbs: 1, maxModifiers: 2, minVerbs: 2,
    genre: 'martial', difficulty: 2,
  },
  {
    key: 'woodcutter-shame',
    instruction: "'나무꾼은 부끄러웠다'를 감정어 없이 쓰시오.",
    passage: '산신령이 금도끼와 은도끼를 나란히 들어 보였다. 나무꾼은 부끄러웠다.',
    forbidWords: ['부끄', '창피', '민망', '수치스', '낯뜨거', '뻘개'],
    maxChars: 65, maxAdverbs: 1, maxModifiers: 2, minVerbs: 2,
    genre: 'fantasy', difficulty: 3,
  },
  {
    key: 'gyeonu-longing',
    instruction: "'견우는 그리웠다'를 감정어 없이 쓰시오. 직녀를 등장시키지 말 것.",
    passage: '일 년에 한 번 다리가 놓이는 날이 아직 멀었다. 견우는 그리웠다.',
    // 그립다도 ㅂ불규칙: 그리워/그리웠 과 그립게/그립다. '그리워'만으로는 "그리웠다"를 놓친다.
    forbidWords: ['그리웠', '그리워', '그리움', '그립', '보고 싶', '외로', '쓸쓸', '사무치', '애틋'],
    maxChars: 70, maxAdverbs: 1, maxModifiers: 2, minVerbs: 2,
    genre: 'romance', difficulty: 3,
    reviewedCollisions: [
      {
        stem: '그립',
        word: '그립감 그립톡',
        why: '고전 설화 소재라 등장 가능성이 없다. 현대물 문항에 이 어간을 재사용하면 다시 판단해야 한다',
      },
      {
        stem: '보고 싶',
        word: '보고 싶은 서류를 찾았다',
        why: '보고(報告)와의 충돌. 전래동화 소재에는 나타나지 않는다. 현대 직장물 문항에는 이 어간을 쓰지 않는다',
      },
      {
        stem: '보고 싶',
        word: '보고 싶다고 상사가 말했다',
        why: '위와 같다',
      },
      {
        stem: '보고 싶',
        word: '결재를 보고 싶어 한다',
        why: '위와 같다',
      },
    ],
  },
]
