from datetime import datetime
from app.core.timezone import now_kst
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
from app.core.database import get_db
from app.models.solution import Solution, RESULT_CODES, LANGUAGE_NAMES
from app.models.problem import Problem
from app.models.user import User
from app.models.contest import Contest
from app.schemas.solution import SubmitCode, SolutionOut
from app.api.deps import get_current_user, get_current_user_optional


def _get_active_contest_lock(problem_id: int, user_id: str, db: Session) -> Optional[int]:
    """
    해당 문제가 현재 진행 중인 대회에 포함되어 있고,
    user_id가 그 대회에 참가 등록된 경우 → contest_id 반환.
    아니면 None 반환.
    """
    now = now_kst()
    row = db.execute(
        text("""
            SELECT c.id
            FROM contests c
            JOIN contest_problems cp ON cp.contest_id = c.id
            JOIN contest_users cu ON cu.contest_id = c.id
            WHERE cp.problem_id = :pid
              AND cu.user_id = :uid
              AND c.defunct = 0
              AND c.start_time <= :now
              AND c.end_time >= :now
            LIMIT 1
        """),
        {"pid": problem_id, "uid": user_id, "now": now},
    ).fetchone()
    return row[0] if row else None

router = APIRouter(prefix="/solutions", tags=["solutions"])


def to_solution_out(s: Solution, db: Session = None) -> dict:
    d = {c.name: getattr(s, c.name) for c in s.__table__.columns}
    d["result_label"] = RESULT_CODES.get(s.result, "Unknown")
    d["language_label"] = LANGUAGE_NAMES.get(s.language, str(s.language))
    d["pass_rate"] = float(s.pass_rate)
    if db:
        p = db.query(Problem).filter(Problem.problem_id == s.problem_id).first()
        d["problem_title"] = p.title if p else None
    return d


@router.post("/submit", response_model=dict)
def submit(
    body: SubmitCode,
    request_obj=None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from fastapi import Request

    # 대회 일시중지 중 제출 차단
    if body.contest_id:
        contest = db.query(Contest).filter(Contest.id == body.contest_id, Contest.defunct == 0).first()
        if contest and contest.paused_at:
            raise HTTPException(status_code=423, detail="대회가 일시중지 중입니다. 재개 후 제출하세요.")

    solution = Solution(
        problem_id=body.problem_id,
        user_id=current_user.user_id,
        nick=current_user.nick,
        result=0,  # OJ_WT0 - Waiting, judge가 result<2 인 것을 집어감
        language=body.language,
        ip="",
        contest_id=body.contest_id or 0,
        in_date=now_kst(),
        code_length=len(body.source_code),
    )
    db.add(solution)
    db.flush()

    # Insert source code into source_code table
    db.execute(
        text("INSERT INTO source_code (solution_id, source) VALUES (:sid, :src)"),
        {"sid": solution.solution_id, "src": body.source_code},
    )

    # Update user submit count
    db.execute(
        text("UPDATE users SET submit = submit + 1 WHERE user_id = :uid"),
        {"uid": current_user.user_id},
    )

    db.commit()

    return {"solution_id": solution.solution_id, "result": "Submitted"}


@router.get("", response_model=dict)
def list_solutions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    problem_id: Optional[int] = None,
    user_id: Optional[str] = None,
    result: Optional[int] = None,   # result code (4=AC, 6=WA, ...)
    db: Session = Depends(get_db),
):
    query = db.query(Solution).filter(Solution.valid == 1)

    if problem_id:
        query = query.filter(Solution.problem_id == problem_id)
    if user_id:
        query = query.filter(Solution.user_id == user_id)
    if result is not None:
        query = query.filter(Solution.result == result)

    total = query.count()
    solutions = query.order_by(Solution.solution_id.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "solutions": [to_solution_out(s, db) for s in solutions],
    }


@router.get("/{solution_id}", response_model=dict)
def get_solution(
    solution_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    solution = db.query(Solution).filter(Solution.solution_id == solution_id).first()
    if not solution:
        raise HTTPException(status_code=404, detail="Solution not found")

    # 본인 또는 관리자만 열람 가능
    is_admin = False
    if current_user:
        priv = db.execute(
            text("SELECT 1 FROM privilege WHERE user_id=:uid AND rightstr='administrator' AND defunct='N' LIMIT 1"),
            {"uid": current_user.user_id},
        ).fetchone()
        is_admin = priv is not None

    if not current_user or (solution.user_id != current_user.user_id and not is_admin):
        raise HTTPException(status_code=403, detail="Forbidden")

    # ── B안: 활성 대회 중 이전 풀이 열람 차단 ──
    if current_user and not is_admin:
        active_contest_id = _get_active_contest_lock(solution.problem_id, current_user.user_id, db)
        if active_contest_id and solution.contest_id != active_contest_id:
            raise HTTPException(
                status_code=403,
                detail=f"진행 중인 대회({active_contest_id})가 끝난 후 열람할 수 있습니다."
            )

    result = to_solution_out(solution)
    source = db.execute(
        text("SELECT source FROM source_code WHERE solution_id = :sid"),
        {"sid": solution_id},
    ).fetchone()
    result["source_code"] = source[0] if source else ""

    # 컴파일 에러 메시지 (compile_info 테이블이 있는 경우)
    try:
        ce = db.execute(
            text("SELECT error FROM compile_info WHERE solution_id = :sid"),
            {"sid": solution_id},
        ).fetchone()
        result["compile_error"] = ce[0] if ce else None
    except Exception:
        result["compile_error"] = None

    return result
