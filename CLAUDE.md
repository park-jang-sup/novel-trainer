# novel-trainer

세션을 열면 **`docs/STATUS.md` 를 먼저 읽는다.** `docs/archive/` 는 읽지 않는다 — 경위다.

한 세션에 STATUS 의 `다음` 에서 **한 번호만** 한다. 끝나면 STATUS 를 덮어쓴다.
새 인수인계 문서를 만들지 않는다.

검사를 세우면 병을 넣어 무는 것을 보고 커밋한다 (물기 시험).
빈 결과(`[]` · null)를 통과로 읽지 않는다.

형태소 서버는 별도 터미널에서 띄운다. 안 떠 있으면 6단계 46문항이 pending 이다.
`cd scoring-server && source .venv/bin/activate && SCORING_SECRET=dev uvicorn main:app --port 8000`

@AGENTS.md
