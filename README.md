# novel-trainer

`docs/STATUS.md` 를 읽어라.

형태소 서버(6단계 46문항에 필요)는 별도 터미널에서:
`cd scoring-server && source .venv/bin/activate && SCORING_SECRET=dev uvicorn main:app --port 8000`
