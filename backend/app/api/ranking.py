from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db
from app.models.user import User
from app.models.classroom import ClassMember, Classroom
from app.api.deps import get_current_user_optional, get_current_user

router = APIRouter(prefix="/ranking", tags=["ranking"])


def _user_row(u: User, rank: int) -> dict:
    return {
        "rank": rank,
        "user_id": u.user_id,
        "nick": u.nick,
        "school": u.school,
        "solved": u.solved,
        "submit": u.submit,
        "ratio": round(u.solved / u.submit * 100, 1) if u.submit > 0 else 0,
    }


# ─── 전체 랭킹 ─────────────────────────────────────────────────────────────

@router.get("")
def global_ranking(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(User).filter(User.defunct == "N", User.solved > 0)

    if search:
        query = query.filter(
            User.user_id.ilike(f"%{search}%") | User.nick.ilike(f"%{search}%")
        )

    total = query.count()
    # 해결 수 내림차순 → 제출 수 오름차순 → 아이디 오름차순
    users = (
        query.order_by(User.solved.desc(), User.submit.asc(), User.user_id.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    # 검색 시에도 실제 전체 순위 계산
    rows = []
    for i, u in enumerate(users):
        # 이 유저보다 solved 많은 사람 수 + 1
        rank_offset = (page - 1) * page_size + i + 1
        rows.append(_user_row(u, rank_offset))

    return {"total": total, "page": page, "page_size": page_size, "rows": rows}


# ─── 학급 랭킹 ─────────────────────────────────────────────────────────────

@router.get("/class/{class_id}")
def class_ranking(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cls = db.query(Classroom).filter(Classroom.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="학급을 찾을 수 없습니다")

    membership = db.query(ClassMember).filter(
        ClassMember.class_id == class_id,
        ClassMember.user_id == current_user.user_id,
    ).first()
    is_admin = db.execute(
        text("SELECT 1 FROM privilege WHERE user_id=:uid AND rightstr='administrator' AND defunct='N' LIMIT 1"),
        {"uid": current_user.user_id},
    ).fetchone()
    if not membership and not is_admin:
        raise HTTPException(status_code=403, detail="학급 멤버만 볼 수 있습니다")

    members = db.query(ClassMember).filter(ClassMember.class_id == class_id).all()
    user_ids = [m.user_id for m in members]

    users = (
        db.query(User)
        .filter(User.user_id.in_(user_ids), User.defunct == "N")
        .order_by(User.solved.desc(), User.submit.asc(), User.user_id.asc())
        .all()
    )

    # 학번 정보 맵
    member_map = {m.user_id: m for m in members}

    rows = []
    for i, u in enumerate(users):
        row = _user_row(u, i + 1)
        m = member_map.get(u.user_id)
        if m:
            row["grade"] = m.grade
            row["class_num"] = m.class_num
            row["student_num"] = m.student_num
            row["role"] = m.role
        rows.append(row)

    return {"class_id": class_id, "class_name": cls.name, "rows": rows}
