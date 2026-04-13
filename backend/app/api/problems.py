import os
import shutil
from datetime import datetime
from app.core.timezone import now_kst
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional, List
from app.core.database import get_db
from app.models.problem import Problem
from app.models.problem_tag import Tag, ProblemTag
from app.models.solution import Solution
from app.models.user import User
from app.schemas.problem import ProblemListItem, ProblemDetail, ProblemCreate
from app.api.deps import get_current_user_optional, get_current_user, get_current_teacher, get_current_admin

JUDGE_DATA_PATH = os.environ.get("JUDGE_DATA_PATH", "/judge_data")

router = APIRouter(prefix="/problems", tags=["problems"])


def _get_tags_for_problem(problem_id: int, db: Session) -> list[dict]:
    rows = (
        db.query(Tag)
        .join(ProblemTag, ProblemTag.tag_id == Tag.id)
        .filter(ProblemTag.problem_id == problem_id)
        .order_by(Tag.name)
        .all()
    )
    return [{"id": t.id, "name": t.name, "slug": t.slug} for t in rows]


@router.get("/categories")
def list_categories(db: Session = Depends(get_db)):
    """source 필드에서 카테고리 목록 추출 (distinct, 비어있지 않은 것만)"""
    rows = (
        db.query(Problem.source)
        .filter(Problem.defunct == "N", Problem.source.isnot(None), Problem.source != "")
        .distinct()
        .order_by(Problem.source)
        .all()
    )
    return {"categories": [r[0] for r in rows]}


@router.get("", response_model=dict)
def list_problems(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    difficulty: Optional[int] = Query(None, ge=1, le=5),
    tag_slug: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    query = db.query(Problem).filter(Problem.defunct == "N")

    if search:
        query = query.filter(
            Problem.title.ilike(f"%{search}%") |
            Problem.problem_id.cast(str).ilike(f"%{search}%")
        )
    if difficulty:
        query = query.filter(Problem.difficulty == difficulty)
    if tag_slug:
        tag = db.query(Tag).filter(Tag.slug == tag_slug).first()
        if tag:
            tagged_ids = [r[0] for r in db.query(ProblemTag.problem_id).filter(ProblemTag.tag_id == tag.id).all()]
            query = query.filter(Problem.problem_id.in_(tagged_ids))
        else:
            query = query.filter(text("1=0"))
    if category:
        query = query.filter(Problem.source == category)

    total = query.count()
    problems = query.order_by(Problem.problem_id).offset((page - 1) * page_size).limit(page_size).all()

    solved_ids = set()
    if current_user:
        solved = (
            db.query(Solution.problem_id)
            .filter(Solution.user_id == current_user.user_id, Solution.result == 4)
            .distinct()
            .all()
        )
        solved_ids = {r[0] for r in solved}

    result = []
    for p in problems:
        item = ProblemListItem.model_validate(p).model_dump()
        item["solved_by_me"] = p.problem_id in solved_ids
        item["difficulty"] = p.difficulty
        item["source"] = p.source
        item["tags"] = _get_tags_for_problem(p.problem_id, db)
        result.append(item)

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "problems": result,
    }


@router.get("/{problem_id}/adjacent")
def get_adjacent_problems(problem_id: int, db: Session = Depends(get_db)):
    """이전/다음 문제 ID 반환"""
    prev_p = (
        db.query(Problem.problem_id, Problem.title)
        .filter(Problem.problem_id < problem_id, Problem.defunct == "N")
        .order_by(Problem.problem_id.desc())
        .first()
    )
    next_p = (
        db.query(Problem.problem_id, Problem.title)
        .filter(Problem.problem_id > problem_id, Problem.defunct == "N")
        .order_by(Problem.problem_id.asc())
        .first()
    )
    return {
        "prev": {"problem_id": prev_p[0], "title": prev_p[1]} if prev_p else None,
        "next": {"problem_id": next_p[0], "title": next_p[1]} if next_p else None,
    }


@router.get("/{problem_id}")
def get_problem(
    problem_id: int,
    db: Session = Depends(get_db),
):
    problem = db.query(Problem).filter(
        Problem.problem_id == problem_id,
        Problem.defunct == "N",
    ).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    data = ProblemDetail.model_validate(problem).model_dump()
    data["difficulty"] = problem.difficulty
    data["tags"] = _get_tags_for_problem(problem_id, db)
    return data


def _save_tags(problem_id: int, tag_ids: list[int], db: Session):
    db.query(ProblemTag).filter(ProblemTag.problem_id == problem_id).delete()
    for tid in tag_ids:
        if db.query(Tag).filter(Tag.id == tid).first():
            db.add(ProblemTag(problem_id=problem_id, tag_id=tid))


@router.post("")
def create_problem(
    body: ProblemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_teacher),
):
    problem = Problem(
        title=body.title,
        description=body.description,
        input=body.input,
        output=body.output,
        sample_input=body.sample_input,
        sample_output=body.sample_output,
        hint=body.hint,
        source=body.source,
        time_limit=body.time_limit,
        memory_limit=body.memory_limit,
        difficulty=body.difficulty,
        spj="0",
        defunct="N",
        accepted=0,
        submit=0,
        solved=0,
        in_date=now_kst(),
    )
    db.add(problem)
    db.flush()

    if body.tag_ids:
        _save_tags(problem.problem_id, body.tag_ids, db)

    db.commit()
    db.refresh(problem)

    # 테스트케이스 파일 저장
    if body.test_cases:
        import os
        data_dir = f"/judge_data/{problem.problem_id}"
        os.makedirs(data_dir, exist_ok=True)
        for i, tc in enumerate(body.test_cases, start=1):
            inp = tc.get("input", "").replace("\r\n", "\n").replace("\r", "\n")
            out = tc.get("output", "").replace("\r\n", "\n").replace("\r", "\n")
            if inp and not inp.endswith("\n"):
                inp += "\n"
            if out and not out.endswith("\n"):
                out += "\n"
            with open(f"{data_dir}/{i}.in", "w", encoding="utf-8", newline="\n") as f:
                f.write(inp)
            with open(f"{data_dir}/{i}.out", "w", encoding="utf-8", newline="\n") as f:
                f.write(out)

    data = ProblemDetail.model_validate(problem).model_dump()
    data["difficulty"] = problem.difficulty
    data["tags"] = _get_tags_for_problem(problem.problem_id, db)
    return data


@router.get("/{problem_id}/testcases")
def get_testcases(problem_id: int):
    import os
    data_dir = f"/judge_data/{problem_id}"
    if not os.path.exists(data_dir):
        return {"test_cases": []}
    cases = []
    i = 1
    while True:
        inp_path = f"{data_dir}/{i}.in"
        out_path = f"{data_dir}/{i}.out"
        if not os.path.exists(inp_path) and not os.path.exists(out_path):
            break
        inp = open(inp_path, encoding="utf-8").read() if os.path.exists(inp_path) else ""
        out = open(out_path, encoding="utf-8").read() if os.path.exists(out_path) else ""
        cases.append({"input": inp, "output": out})
        i += 1
    return {"test_cases": cases}


@router.put("/{problem_id}")
def update_problem(
    problem_id: int,
    body: ProblemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_teacher),
):
    problem = db.query(Problem).filter(Problem.problem_id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    problem.title = body.title
    problem.description = body.description
    problem.input = body.input
    problem.output = body.output
    problem.sample_input = body.sample_input
    problem.sample_output = body.sample_output
    problem.hint = body.hint
    problem.source = body.source
    problem.time_limit = body.time_limit
    problem.memory_limit = body.memory_limit
    problem.difficulty = body.difficulty

    _save_tags(problem_id, body.tag_ids or [], db)

    if body.test_cases:
        import os, shutil
        data_dir = f"/judge_data/{problem_id}"
        if os.path.exists(data_dir):
            shutil.rmtree(data_dir)
        os.makedirs(data_dir, exist_ok=True)
        for i, tc in enumerate(body.test_cases, start=1):
            inp = tc.get("input", "").replace("\r\n", "\n").replace("\r", "\n")
            out = tc.get("output", "").replace("\r\n", "\n").replace("\r", "\n")
            if inp and not inp.endswith("\n"):
                inp += "\n"
            if out and not out.endswith("\n"):
                out += "\n"
            with open(f"{data_dir}/{i}.in", "w", encoding="utf-8", newline="\n") as f:
                f.write(inp)
            with open(f"{data_dir}/{i}.out", "w", encoding="utf-8", newline="\n") as f:
                f.write(out)

    db.commit()
    db.refresh(problem)
    data = ProblemDetail.model_validate(problem).model_dump()
    data["difficulty"] = problem.difficulty
    data["tags"] = _get_tags_for_problem(problem_id, db)
    return data


@router.delete("/{problem_id}")
def delete_problem(
    problem_id: int,
    permanent: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_teacher),
):
    problem = db.query(Problem).filter(Problem.problem_id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    if permanent:
        # 완전 삭제: 어드민만 허용
        is_admin = db.execute(
            text("SELECT 1 FROM privilege WHERE user_id=:uid AND rightstr='administrator' AND defunct='N' LIMIT 1"),
            {"uid": current_user.user_id},
        ).fetchone() is not None
        if not is_admin:
            raise HTTPException(status_code=403, detail="완전 삭제는 관리자만 가능합니다")

        db.query(ProblemTag).filter(ProblemTag.problem_id == problem_id).delete()
        db.delete(problem)
        db.commit()

        data_dir = f"{JUDGE_DATA_PATH}/{problem_id}"
        if os.path.exists(data_dir):
            shutil.rmtree(data_dir)

        return {"ok": True, "permanent": True}

    # 숨김 처리 (소프트 삭제)
    problem.defunct = "Y"
    db.commit()
    return {"ok": True, "permanent": False}
