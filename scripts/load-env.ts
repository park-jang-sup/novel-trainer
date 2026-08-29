/**
 * `.env.local` 을 읽는다. **스크립트의 첫 import 여야 한다.**
 *
 * ★ `next dev` 는 `.env.local` 을 알아서 읽지만 `tsx` 로 도는 스크립트는 안
 *   읽는다. 그래서 하니스가 `--check` 에서 `DB 자격이 없다` 로 죽었다 —
 *   자격은 있었고 **읽는 코드가 없었다.**
 *
 *   세션 11 §8-1 의 계보가 또 나왔다. 얼굴이 넷째다.
 *
 * ```
 * 1차  상한이 적혀 있고 읽는 코드가 없다      daily_spend_cap_usd 20
 * 2차  테이블은 있는데 읽을 권한이 없다        grant insert only
 * 3차  읽히긴 하는데 일부 행이 조용히 빠진다    created_at null
 * 4차  ★ .env.local 에 있는데 읽는 코드가 없다  next dev 만 읽는다
 * ```
 *
 * ★★ `--dry` 가 이걸 못 잡은 이유를 적어 둔다. **`--dry` 는 env 를 안 탄다.**
 *   그래서 물기 시험을 다 통과하고도 `--check` 첫 줄에서 죽었다. 층을 가른
 *   대가다 — 자격 없이 도는 층은 자격 쪽 결함을 원리적으로 못 문다.
 *
 * `@next/env` 를 쓰는 이유: 손으로 파서를 쓰면 `.env` · `.env.local` ·
 * `.env.development.local` 의 우선순위가 `next dev` 와 갈린다. 갈리면
 * 화면에서 되던 것이 스크립트에서 안 된다.
 */
import { loadEnvConfig } from '@next/env'

loadEnvConfig(process.cwd(), true, { info: () => {}, error: console.error })
