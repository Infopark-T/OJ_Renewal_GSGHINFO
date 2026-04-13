from datetime import datetime
from app.core.timezone import now_kst
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db
from app.models.contest import Contest, ContestProblem, ContestUser
from app.models.problem import Problem
from app.models.solution import Solution
from app.models.user import User
from app.api.deps import get_current_user, get_current_teacher, get_current_user_optional

router = APIRouter(prefix="/contests", tags=["contests"])

ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"


def _is_admin(user_id: str, db: Session) -> bool:
    priv = db.execute(
        text("SELECT 1 FROM privilege WHERE user_id=:uid AND rightstr='administrator' AND defunct='N' LIMIT 1"),
        {"uid": user_id},
    ).fetchone()
    return priv is not None


def _contest_status(c: Contest) -> str:
    now = now_kst()
    if now < c.start_time:
        return "upcoming"
    if now <= c.end_time:
        return "paused" if c.paused_at else "running"
    return "ended"


def _contest_dict(c: Contest, db: Session, user_id: Optional[str] = None) -> dict:
    problems = (
        db.query(ContestProblem)
        .filter(ContestProblem.contest_id == c.id)
        .order_by(ContestProblem.order_num)
        .all()
    )
    registered = False
    if user_id:
        registered = db.query(ContestUser).filter(
            ContestUser.contest_id == c.id,
            ContestUser.user_id == user_id,
        ).first() is not None

    participant_count = db.query(ContestUser).filter(ContestUser.contest_id == c.id).count()

    return {
        "id": c.id,
        "title": c.title,
        "description": c.description,
        "start_time": c.start_time.isoformat(),
        "end_time": c.end_time.isoformat(),
        "contest_type": c.contest_type,
        "is_public": c.is_public,
        "created_by": c.created_by,
        "status": _contest_status(c),
        "paused_at": c.paused_at.isoformat() if c.paused_at else None,
        "problem_count": len(problems),
        "participant_count": participant_count,
        "registered": registered,
    }


# ─── 대회 목록 ────────────────────────────────────────────────────────────────

@router.get("")
def list_contests(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    query = db.query(Contest).filter(Contest.defunct == 0)
    total = query.count()
    contests = query.order_by(Contest.start_time.desc()).offset((page - 1) * page_size).limit(page_size).all()
    uid = current_user.user_id if current_user else None
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "contests": [_contest_dict(c, db, uid) for c in contests],
    }


# ─── 대회 생성 ────────────────────────────────────────────────────────────────

@router.post("")
def create_contest(
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_teacher),
):
    title = body.get("title", "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="대회 제목을 입력하세요")

    try:
        start_time = datetime.fromisoformat(body["start_time"])
        end_time = datetime.fromisoformat(body["end_time"])
    except (KeyError, ValueError):
        raise HTTPException(status_code=400, detail="시작/종료 시간을 올바르게 입력하세요")

    if end_time <= start_time:
        raise HTTPException(status_code=400, detail="종료 시간은 시작 시간보다 이후여야 합니다")

    problem_ids = body.get("problem_ids", [])
    if not problem_ids:
        raise HTTPException(status_code=400, detail="문제를 1개 이상 선택하세요")

    # 존재하지 않는 문제 번호 검증
    for pid in problem_ids:
        p = db.query(Problem).filter(Problem.problem_id == pid, Problem.defunct == "N").first()
        if not p:
            raise HTTPException(status_code=400, detail=f"문제 {pid}번을 찾을 수 없습니다")

    contest_type = body.get("contest_type", "ACM")
    if contest_type not in ("ACM", "OI"):
        raise HTTPException(status_code=400, detail="contest_type은 ACM 또는 OI여야 합니다")

    contest = Contest(
        title=title,
        description=body.get("description", ""),
        start_time=start_time,
        end_time=end_time,
        contest_type=contest_type,
        created_by=current_user.user_id,
        is_public=1 if body.get("is_public", True) else 0,
    )
    db.add(contest)
    db.flush()

    for i, pid in enumerate(problem_ids):
        db.add(ContestProblem(
            contest_id=contest.id,
            problem_id=pid,
            alias=ALPHABET[i] if i < 26 else str(i + 1),
            order_num=i,
        ))

    db.commit()
    db.refresh(contest)
    return _contest_dict(contest, db, current_user.user_id)


# ─── 대회 상세 ────────────────────────────────────────────────────────────────

@router.get("/{contest_id}")
def get_contest(
    contest_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    c = db.query(Contest).filter(Contest.id == contest_id, Contest.defunct == 0).first()
    if not c:
        raise HTTPException(status_code=404, detail="대회를 찾을 수 없습니다")

    uid = current_user.user_id if current_user else None
    d = _contest_dict(c, db, uid)

    # 문제 목록: 대회 시작 후 또는 참가자에게만 공개
    status = _contest_status(c)
    is_admin = uid and _is_admin(uid, db)
    registered = d["registered"]

    if status != "upcoming" or is_admin or registered:
        problems = (
            db.query(ContestProblem)
            .filter(ContestProblem.contest_id == contest_id)
            .order_by(ContestProblem.order_num)
            .all()
        )
        problem_list = []
        for cp in problems:
            p = db.query(Problem).filter(Problem.problem_id == cp.problem_id).first()
            problem_list.append({
                "alias": cp.alias,
                "problem_id": cp.problem_id,
                "title": p.title if p else f"문제 #{cp.problem_id}",
                "order_num": cp.order_num,
            })
        d["problems"] = problem_list
    else:
        d["problems"] = []

    return d


# ─── 대회 참가 등록 ────────────────────────────────────────────────────────────

@router.post("/{contest_id}/register")
def register_contest(
    contest_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = db.query(Contest).filter(Contest.id == contest_id, Contest.defunct == 0).first()
    if not c:
        raise HTTPException(status_code=404, detail="대회를 찾을 수 없습니다")
    if _contest_status(c) == "ended":
        raise HTTPException(status_code=400, detail="종료된 대회입니다")

    existing = db.query(ContestUser).filter(
        ContestUser.contest_id == contest_id,
        ContestUser.user_id == current_user.user_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="이미 참가 등록된 대회입니다")

    db.add(ContestUser(
        contest_id=contest_id,
        user_id=current_user.user_id,
        registered_at=now_kst(),
    ))
    db.commit()
    return {"ok": True}


# ─── 순위표 ──────────────────────────────────────────────────────────────────

@router.get("/{contest_id}/scoreboard")
def get_scoreboard(
    contest_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    c = db.query(Contest).filter(Contest.id == contest_id, Contest.defunct == 0).first()
    if not c:
        raise HTTPException(status_code=404, detail="대회를 찾을 수 없습니다")

    # 대회 문제 목록
    contest_problems = (
        db.query(ContestProblem)
        .filter(ContestProblem.contest_id == contest_id)
        .order_by(ContestProblem.order_num)
        .all()
    )
    problem_ids = [cp.problem_id for cp in contest_problems]
    alias_map = {cp.problem_id: cp.alias for cp in contest_problems}

    # 참가자 목록
    participants = db.query(ContestUser).filter(ContestUser.contest_id == contest_id).all()
    user_ids = [p.user_id for p in participants]

    # 대회 기간 내 제출 전체 조회
    if not problem_ids or not user_ids:
        return {"problems": [], "rows": []}

    solutions = (
        db.query(Solution)
        .filter(
            Solution.contest_id == contest_id,
            Solution.user_id.in_(user_ids),
            Solution.problem_id.in_(problem_ids),
            Solution.valid == 1,
            Solution.in_date >= c.start_time,
            Solution.in_date <= c.end_time,
        )
        .order_by(Solution.in_date)
        .all()
    )

    # 유저별 문제별 집계
    # stats[user_id][problem_id] = {"ac": bool, "wrong": int, "ac_time": minutes}
    stats: dict = {}
    for uid in user_ids:
        stats[uid] = {pid: {"ac": False, "wrong": 0, "ac_time": None} for pid in problem_ids}

    for sol in solutions:
        uid = sol.user_id
        pid = sol.problem_id
        if uid not in stats or pid not in stats[uid]:
            continue
        cell = stats[uid][pid]
        if cell["ac"]:
            continue  # 이미 맞은 문제는 무시
        if sol.result == 4:  # Accepted
            elapsed = (sol.in_date - c.start_time).total_seconds() / 60
            cell["ac"] = True
            cell["ac_time"] = int(elapsed)
        else:
            cell["wrong"] += 1

    # 행 생성
    rows = []
    for uid in user_ids:
        user = db.query(User).filter(User.user_id == uid).first()
        solved = 0
        penalty = 0
        problem_cells = []
        for pid in problem_ids:
            cell = stats[uid][pid]
            if cell["ac"]:
                solved += 1
                penalty += cell["ac_time"] + cell["wrong"] * 20
                problem_cells.append({
                    "alias": alias_map[pid],
                    "ac": True,
                    "wrong": cell["wrong"],
                    "ac_time": cell["ac_time"],
                })
            else:
                problem_cells.append({
                    "alias": alias_map[pid],
                    "ac": False,
                    "wrong": cell["wrong"],
                    "ac_time": None,
                })
        rows.append({
            "user_id": uid,
            "nick": user.nick if user else uid,
            "solved": solved,
            "penalty": penalty,
            "problems": problem_cells,
        })

    # ACM 정렬: 해결 수 내림차순 → 패널티 오름차순
    rows.sort(key=lambda r: (-r["solved"], r["penalty"]))
    for i, row in enumerate(rows):
        row["rank"] = i + 1

    problem_headers = [{"alias": cp.alias, "problem_id": cp.problem_id} for cp in contest_problems]
    return {"problems": problem_headers, "rows": rows}


# ─── 대회 수정 ────────────────────────────────────────────────────────────────

@router.patch("/{contest_id}")
def update_contest(
    contest_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = db.query(Contest).filter(Contest.id == contest_id, Contest.defunct == 0).first()
    if not c:
        raise HTTPException(status_code=404, detail="대회를 찾을 수 없습니다")
    if c.created_by != current_user.user_id and not _is_admin(current_user.user_id, db):
        raise HTTPException(status_code=403, detail="권한이 없습니다")

    status = _contest_status(c)

    if "title" in body:
        c.title = body["title"].strip() or c.title
    if "description" in body:
        c.description = body["description"]
    if "is_public" in body:
        c.is_public = 1 if body["is_public"] else 0

    # 시작 시간: 예정 중이거나, 제출 기록이 없으면 변경 가능
    if "start_time" in body:
        if status == "ended":
            raise HTTPException(status_code=400, detail="종료된 대회의 시작 시간은 변경할 수 없습니다")
        if status != "upcoming":
            has_submissions = db.query(Solution).filter(
                Solution.contest_id == contest_id, Solution.valid == 1
            ).first() is not None
            if has_submissions:
                raise HTTPException(status_code=400, detail="제출 기록이 있는 진행 중인 대회의 시작 시간은 변경할 수 없습니다")
        new_start = datetime.fromisoformat(body["start_time"])
        if new_start >= c.end_time:
            raise HTTPException(status_code=400, detail="시작 시간은 종료 시간보다 이전이어야 합니다")
        c.start_time = new_start

    # 종료 시간 연장: 분 단위로 받아 서버에서 계산 (타임존 변환 오차 방지)
    if "extend_minutes" in body:
        from datetime import timedelta
        mins = int(body["extend_minutes"])
        if mins <= 0:
            raise HTTPException(status_code=400, detail="연장 시간은 1분 이상이어야 합니다")
        c.end_time = c.end_time + timedelta(minutes=mins)

    # 종료 시간 직접 지정: 예정 상태에서만 허용
    if "end_time" in body:
        if status != "upcoming":
            raise HTTPException(status_code=400, detail="진행 중인 대회의 종료 시간은 '시간 연장' 기능을 사용하세요")
        new_end = datetime.fromisoformat(body["end_time"])
        if new_end <= c.start_time:
            raise HTTPException(status_code=400, detail="종료 시간은 시작 시간보다 이후여야 합니다")
        c.end_time = new_end

    # 문제 일괄 교체: 진행 중/종료 후 불가 (대신 POST /problems 사용)
    if "problem_ids" in body:
        if status != "upcoming":
            raise HTTPException(status_code=400, detail="진행 중이거나 종료된 대회의 문제는 일괄 변경할 수 없습니다. 문제 추가는 별도 API를 사용하세요")
        problem_ids = body["problem_ids"]
        if not problem_ids:
            raise HTTPException(status_code=400, detail="문제를 1개 이상 선택하세요")
        for pid in problem_ids:
            p = db.query(Problem).filter(Problem.problem_id == pid, Problem.defunct == "N").first()
            if not p:
                raise HTTPException(status_code=400, detail=f"문제 {pid}번을 찾을 수 없습니다")
        db.query(ContestProblem).filter(ContestProblem.contest_id == contest_id).delete()
        for i, pid in enumerate(problem_ids):
            db.add(ContestProblem(
                contest_id=contest_id,
                problem_id=pid,
                alias=ALPHABET[i] if i < 26 else str(i + 1),
                order_num=i,
            ))

    db.commit()
    db.refresh(c)
    return _contest_dict(c, db, current_user.user_id)


# ─── 대회 문제 추가 ───────────────────────────────────────────────────────────

@router.post("/{contest_id}/problems")
def add_contest_problem(
    contest_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = db.query(Contest).filter(Contest.id == contest_id, Contest.defunct == 0).first()
    if not c:
        raise HTTPException(status_code=404, detail="대회를 찾을 수 없습니다")
    if c.created_by != current_user.user_id and not _is_admin(current_user.user_id, db):
        raise HTTPException(status_code=403, detail="권한이 없습니다")
    if _contest_status(c) == "ended":
        raise HTTPException(status_code=400, detail="종료된 대회에는 문제를 추가할 수 없습니다")

    pid = body.get("problem_id")
    if not pid:
        raise HTTPException(status_code=400, detail="problem_id를 입력하세요")

    p = db.query(Problem).filter(Problem.problem_id == pid, Problem.defunct == "N").first()
    if not p:
        raise HTTPException(status_code=400, detail=f"문제 {pid}번을 찾을 수 없습니다")

    existing = db.query(ContestProblem).filter(
        ContestProblem.contest_id == contest_id,
        ContestProblem.problem_id == pid,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"문제 {pid}번은 이미 대회에 포함되어 있습니다")

    # 현재 마지막 order_num 뒤에 추가
    last = (
        db.query(ContestProblem)
        .filter(ContestProblem.contest_id == contest_id)
        .order_by(ContestProblem.order_num.desc())
        .first()
    )
    next_order = (last.order_num + 1) if last else 0
    alias = ALPHABET[next_order] if next_order < 26 else str(next_order + 1)

    db.add(ContestProblem(
        contest_id=contest_id,
        problem_id=pid,
        alias=alias,
        order_num=next_order,
    ))
    db.commit()
    return {"ok": True, "alias": alias, "problem_id": pid, "title": p.title}


# ─── 대회 일시중지 / 재개 ─────────────────────────────────────────────────────

@router.post("/{contest_id}/pause")
def pause_contest(
    contest_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = db.query(Contest).filter(Contest.id == contest_id, Contest.defunct == 0).first()
    if not c:
        raise HTTPException(status_code=404, detail="대회를 찾을 수 없습니다")
    if c.created_by != current_user.user_id and not _is_admin(current_user.user_id, db):
        raise HTTPException(status_code=403, detail="권한이 없습니다")
    if _contest_status(c) != "running":
        raise HTTPException(status_code=400, detail="진행 중인 대회만 일시중지할 수 있습니다")

    c.paused_at = now_kst()
    db.commit()
    return _contest_dict(c, db, current_user.user_id)


@router.post("/{contest_id}/resume")
def resume_contest(
    contest_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = db.query(Contest).filter(Contest.id == contest_id, Contest.defunct == 0).first()
    if not c:
        raise HTTPException(status_code=404, detail="대회를 찾을 수 없습니다")
    if c.created_by != current_user.user_id and not _is_admin(current_user.user_id, db):
        raise HTTPException(status_code=403, detail="권한이 없습니다")
    if _contest_status(c) != "paused":
        raise HTTPException(status_code=400, detail="일시중지된 대회만 재개할 수 있습니다")

    # 멈춰있던 시간만큼 종료 시간 자동 연장
    from datetime import timedelta
    paused_duration = now_kst() - c.paused_at
    c.end_time = c.end_time + paused_duration
    c.paused_at = None
    db.commit()
    return _contest_dict(c, db, current_user.user_id)


# ─── 대회 삭제 ────────────────────────────────────────────────────────────────

@router.delete("/{contest_id}")
def delete_contest(
    contest_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = db.query(Contest).filter(Contest.id == contest_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="대회를 찾을 수 없습니다")
    if c.created_by != current_user.user_id and not _is_admin(current_user.user_id, db):
        raise HTTPException(status_code=403, detail="권한이 없습니다")
    c.defunct = 1
    db.commit()
    return {"ok": True}
