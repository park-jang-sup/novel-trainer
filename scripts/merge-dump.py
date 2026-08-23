#!/usr/bin/env python3
"""seed/dump 갱신 — 기존 파일의 순서를 보존한 채 DB 값만 갈아끼운다.

왜 이렇게 하는가.

원본 덤프는 order by 없이 뽑혀 있다. problems.json 은 order_no 순도 아니고
(reduce_adverb 1 → off_track 14 → reverse_design 17 → genre_coinage 19 →
emotion_action 2 → …) 단계 안에서도 source_key 순이 아니다. DB 가 돌려준
순서 그대로다. 그래서 어떤 order by 로도 재현되지 않는다.

쿼리 결과로 파일을 통째로 덮어쓰면 순서가 뒤집혀 diff 가 1300줄이 된다.
내용은 맞아도 "정말 의도한 곳만 바뀌었나"를 눈으로 확인할 수 없게 된다.
그 확인이 이 저장소에서 시드를 다루는 유일한 안전장치다.

그래서 순서는 재현 대상이 아니라 보존 대상으로 다룬다.
  - 기존 항목은 제자리에서 새 값으로 교체한다 (키: source_key / skill_key)
  - DB 에만 있는 항목은 파일 끝에 붙인다
  - DB 에서 사라진 항목은 지우고 !! 로 알린다

쓰는 법
  1) Supabase SQL Editor 에서 아래 두 쿼리를 돌려 결과를 파일로 저장한다.
     정렬은 넣지 않는다. 어차피 이 스크립트가 순서를 다시 맞춘다.

     -- /tmp/fresh-problems.json
     select jsonb_agg(jsonb_build_object(
       'type', p.type, 'choices', p.choices, 'passage', p.passage,
       'order_no', s.order_no, 'tone_tag', p.tone_tag, 'genre_tag', p.genre_tag,
       'skill_key', s.skill_key, 'difficulty', p.difficulty,
       'source_key', p.source_key, 'source_tag', p.source_tag,
       'instruction', p.instruction, 'scoring_mode', p.scoring_mode,
       'scoring_config', p.scoring_config))
     from problems p join stages s on s.id = p.stage_id;

     -- /tmp/fresh-stages.json
     select jsonb_agg(jsonb_build_object(
       'title', title, 'track', track, 'is_free', is_free,
       'summary', summary, 'order_no', order_no, 'skill_key', skill_key))
     from stages;

  2) python3 scripts/merge-dump.py problems /tmp/fresh-problems.json
     python3 scripts/merge-dump.py stages   /tmp/fresh-stages.json
  3) npm run gen:seed
  4) git diff --stat  으로 바뀐 곳이 의도한 만큼인지 본다

서식은 기존 파일에 맞춘다 — 2칸 들여쓰기, CRLF, 마지막 ] 뒤에 개행 없음,
BOM 없음. core.autocrlf 는 미설정이라 git 이 줄끝을 변환하지 않는다.
"""
import json
import sys

KEY = {"problems": "source_key", "stages": "skill_key"}
NEWLINE = "\r\n"


def load(path):
    with open(path, encoding="utf-8-sig") as f:
        return json.load(f)


def main():
    if len(sys.argv) != 3 or sys.argv[1] not in KEY:
        sys.exit("사용: merge-dump.py {problems|stages} <쿼리결과.json>")
    name, fresh_path = sys.argv[1], sys.argv[2]
    key = KEY[name]
    target = f"seed/dump/{name}.json"

    old = load(target)
    fresh = load(fresh_path)
    fresh_by = {x[key]: x for x in fresh}
    if len(fresh_by) != len(fresh):
        sys.exit(f"쿼리 결과에 {key} 가 중복이다. 멈춘다.")

    old_keys = {x[key] for x in old}
    merged, changed, removed = [], [], []
    for x in old:
        k = x[key]
        if k not in fresh_by:
            removed.append(k)
            continue
        if fresh_by[k] != x:
            changed.append(k)
        merged.append(fresh_by[k])
    added = [k for k in fresh_by if k not in old_keys]
    merged += [fresh_by[k] for k in added]

    with open(target, "w", encoding="utf-8", newline=NEWLINE) as f:
        f.write(json.dumps(merged, ensure_ascii=False, indent=2))

    print(f"{target}  {len(old)} -> {len(merged)}")
    print(f"  값이 바뀐 항목 {len(changed)}: {changed or '없음'}")
    print(f"  끝에 붙인 항목 {len(added)}: {added or '없음'}")
    if removed:
        print(f"  !! DB 에서 사라진 항목 {len(removed)}: {removed}")


if __name__ == "__main__":
    main()
