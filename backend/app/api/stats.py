"""통계 대시보드 API — 어드민/교사 전용"""
from datetime import date, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from app.core.database import get_db
from app.models.user import User
from app.models.problem import Problem
from app.models.solution import Solution, RESULT_CODES, LANGUAGE_NAMES
from app.models.classroom import Classroom
from app.api.deps import get_current_user
from app.models.user import User as UserModel

router = APIRouter(prefix="/stats", tags=["stats"])


def _require_admin_or_teacher(current_user: UserModel, db: Session):
    is_admin = db.execute(
        text("SELECT 1 FROM privilege WHERE user_id=:uid AND rightstr='administrator' AND defunct='N' LIMIT 1"),
        {"uid": current_user.user_id},
    ).fetchone() is not None
    is_teacher = db.execute(
        text("SELECT 1 FROM privilege WHERE user_id=:uid AND rightstr='teacher' AND defunct='N' LIMIT 1"),
        {"uid": current_user.user_id},
    ).fetchone() is not None
    return is_admin, is_teacher


@router.get("")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    is_admin, is_teacher = _require_admin_or_teacher(current_user, db)

    # ── 기본 카운트 ──────────────────────────────────────────────────────────
    total_users = db.query(func.count(User.user_id)).filter(User.defunct == "N").scalar() or 0
    total_problems = db.query(func.count(Problem.problem_id)).filter(Problem.defunct == "N").scalar() or 0
    total_submissions = db.query(func.count(Solution.solution_id)).scalar() or 0
    total_accepted = db.query(func.count(Solution.solution_id)).filter(Solution.result == 4).scalar() or 0

    today = date.today()
    today_submissions = db.query(func.count(Solution.solution_id)).filter(
        func.date(Solution.in_date) == today
    ).scalar() or 0
    today_accepted = db.query(func.count(Solution.solution_id)).filter(
        func.date(Solution.in_date) == today, Solution.result == 4
    ).scalar() or 0

    # ── 최근 7일 일별 제출 수 ────────────────────────────────────────────────
    daily = []
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        cnt = db.query(func.count(Solution.solution_id)).filter(
            func.date(Solution.in_date) == d
        ).scalar() or 0
        ac = db.query(func.count(Solution.solution_id)).filter(
            func.date(Solution.in_date) == d, Solution.result == 4
        ).scalar() or 0
        daily.append({"date": d.isoformat(), "submissions": cnt, "accepted": ac})

    # ── 결과 분포 ────────────────────────────────────────────────────────────
    result_rows = db.execute(
        text("SELECT result, COUNT(*) as cnt FROM solution GROUP BY result ORDER BY cnt DESC LIMIT 10")
    ).fetchall()
    result_dist = [
        {"result": RESULT_CODES.get(r.result, str(r.result)), "code": r.result, "count": r.cnt}
        for r in result_rows
    ]

    # ── 언어 분포 ────────────────────────────────────────────────────────────
    lang_rows = db.execute(
        text("SELECT language, COUNT(*) as cnt FROM solution GROUP BY language ORDER BY cnt DESC LIMIT 8")
    ).fetchall()
    lang_dist = [
        {"language": LANGUAGE_NAMES.get(r.language, str(r.language)), "code": r.language, "count": r.cnt}
        for r in lang_rows
    ]

    # ── 풀린 문제 TOP 10 ─────────────────────────────────────────────────────
    hot_rows = db.execute(
        text("""
            SELECT p.problem_id, p.title, p.submit, p.accepted
            FROM problem p
            WHERE p.defunct='N' AND p.submit > 0
            ORDER BY p.submit DESC
            LIMIT 10
        """)
    ).fetchall()
    hot_problems = [
        {
            "problem_id": r.problem_id,
            "title": r.title,
            "submit": r.submit,
            "accepted": r.accepted,
            "ac_rate": round(r.accepted / r.submit * 100) if r.submit > 0 else 0,
        }
        for r in hot_rows
    ]

    # ── 최근 가입 유저 TOP 5 (어드민 전용) ──────────────────────────────────
    recent_users = []
    if is_admin:
        u_rows = db.execute(
            text("SELECT user_id, nick, reg_time FROM users WHERE defunct='N' ORDER BY reg_time DESC LIMIT 5")
        ).fetchall()
        recent_users = [
            {"user_id": r.user_id, "nick": r.nick, "reg_time": r.reg_time.isoformat() if r.reg_time else None}
            for r in u_rows
        ]

    # ── 활발한 유저 TOP 10 (최근 7일 제출 기준) ─────────────────────────────
    active_rows = db.execute(
        text("""
            SELECT user_id, COUNT(*) as cnt
            FROM solution
            WHERE in_date >= :since
            GROUP BY user_id
            ORDER BY cnt DESC
            LIMIT 10
        """),
        {"since": today - timedelta(days=7)},
    ).fetchall()
    active_users = [{"user_id": r.user_id, "submissions": r.cnt} for r in active_rows]

    return {
        "summary": {
            "total_users": total_users,
            "total_problems": total_problems,
            "total_submissions": total_submissions,
            "total_accepted": total_accepted,
            "accept_rate": round(total_accepted / total_submissions * 100) if total_submissions > 0 else 0,
            "today_submissions": today_submissions,
            "today_accepted": today_accepted,
        },
        "daily_submissions": daily,
        "result_distribution": result_dist,
        "language_distribution": lang_dist,
        "hot_problems": hot_problems,
        "recent_users": recent_users,
        "active_users": active_users,
    }
