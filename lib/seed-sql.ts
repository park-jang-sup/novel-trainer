// seed SQL 문자열 리터럴을 만드는 유일한 통로와, 그것을 되재는 스캐너.
//
// scripts/gen-seed.ts(만드는 쪽)와 lib/scoring/verify.ts(재는 쪽)가 둘 다
// 여기를 import 한다. 사본을 만들지 않는다 — 검사하는 코드와 출하하는
// 코드가 갈라지면 검사가 아무것도 뜻하지 않는다.

// 지문에 작은따옴표가 들어 있다(예: instruction의 '흥부는 기뻤다').
// 직접 문자열을 이어붙이지 않고 전부 이 함수를 통과시킨다.
//
// 줄바꿈이 든 값만 E'' 로 낸다. 왜:
//   seed_data.sql 을 Supabase SQL 편집기에 붙여 넣으면 편집기가 textarea
//   규격대로 LF 를 CRLF 로 바꾼다. 문자열 리터럴 안의 '실제 줄바꿈'까지
//   함께 바뀌어 instruction 217 → 227 자가 된다(세션 9 §5). SQL 안에
//   실제 줄바꿈이 없으면 편집기가 건드릴 것이 없다.
//
// 줄바꿈이 없는 값은 예전 그대로 '' 로 둔다. 전부 E'' 로 바꾸면 77행이
// 통째로 diff 가 되어 읽을 수 없다. 실제로 바뀌는 것은 32개뿐이다.
//
// ★ 역슬래시를 먼저 겹친다. E'' 안에서는 역슬래시가 이스케이프 문자다.
//   순서를 뒤집어 줄바꿈을 먼저 \n 으로 만들면, 그다음 역슬래시 치환이
//   그것을 \\n 으로 만들어 버려 DB 에는 줄바꿈 대신 역슬래시와 n 두
//   글자가 들어간다. 스캐너로는 안 잡힌다. 왕복 검사가 잡는다.
export function sqlStr(value: string | null | undefined): string {
    if (value === null || value === undefined) return 'null'
    if (!/[\n\r]/.test(value)) return `'${value.replace(/'/g, "''")}'`
    return `E'${value
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "''")
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')}'`
}

// SQL 한 덩어리를 훑어 '문자열 리터럴 안의 실제 줄바꿈'을 센다.
// -- 줄주석, /* */ 블록 주석, '' 이중 따옴표, E'' 안의 \' 와 \\ 를 다룬다.
//
// 몇 개인지만이 아니라 몇 행인지도 낸다. seed_check.sql 이 길이를 함께
// 낸 것과 같은 이유다 — "다르다"만 알면 찾는 데 한참 걸린다.
//
// ★ 이 함수가 하는 일은 '없음을 증명하는 것' 하나뿐이다. 그래서 과탐보다
//   미탐이 훨씬 나쁘다. 아래 둘은 미탐이 나던 자리라 실측하고 막았다.
//   (가) 블록 주석 안의 따옴표 하나가 상태를 뒤집어 뒤따르는 진짜 위반을
//        통째로 삼켰다.  /* 가 ' 나 */ select '다⏎라';  → 0개로 통과
//   (나) e 로 끝난 식별자 뒤의 보통 문자열을 E'' 로 오인해, 역슬래시 뒤의
//        줄바꿈을 이스케이프로 보고 건너뛰었다.  type'가\⏎나'  → 0개로 통과
//   둘 다 지금 저장소에는 없다(블록 주석 0건, 오인 0/1416). 하지만 없음을
//   재는 자가 조용히 틀리면 아무도 모른다.
export function countRawNewlinesInStrings(sql: string): {
    count: number
    lines: number[]
} {
    const lines: number[] = []
    let count = 0
    let line = 1
    let i = 0
    let inStr = false
    let isE = false

    while (i < sql.length) {
        const c = sql[i]

        if (!inStr) {
            if (c === '-' && sql[i + 1] === '-') {
                while (i < sql.length && sql[i] !== '\n') i++
                continue
            }
            // 줄주석을 먼저 본다. `-- 원본: seed/dump/*.json` 의 /* 는 주석 안의
            // 글자다. 순서를 바꾸면 그것이 블록 주석 시작으로 잡힌다.
            if (c === '/' && sql[i + 1] === '*') {
                let depth = 1
                i += 2
                while (i < sql.length && depth > 0) {
                    if (sql[i] === '/' && sql[i + 1] === '*') {
                        depth++
                        i += 2
                        continue
                    }
                    if (sql[i] === '*' && sql[i + 1] === '/') {
                        depth--
                        i += 2
                        continue
                    }
                    if (sql[i] === '\n') line++
                    i++
                }
                continue
            }
            if (c === "'") {
                const prev = sql[i - 1] ?? ''
                const prev2 = sql[i - 2] ?? ''
                // 앞 글자가 E/e 라도 그것이 식별자의 끝 글자면 E 문자열이 아니다.
                isE = (prev === 'E' || prev === 'e') && !/[A-Za-z0-9_$]/.test(prev2)
                inStr = true
                i++
                continue
            }
            if (c === '\n') line++
            i++
            continue
        }

        // 문자열 안
        if (isE && c === '\\') {
            // \' 가 문자열을 끝내지 않는다. \\ 뒤의 따옴표는 끝낸다.
            if (sql[i + 1] === '\n') line++
            i += 2
            continue
        }
        if (c === "'") {
            if (sql[i + 1] === "'") {
                i += 2
                continue
            }
            inStr = false
            i++
            continue
        }
        if (c === '\n' || c === '\r') {
            count++
            if (lines[lines.length - 1] !== line) lines.push(line)
            if (c === '\n') line++
        }
        i++
    }

    return { count, lines }
}
