from datetime import datetime
from app.core.timezone import now_kst
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.notice import Notice
from app.models.user import User
from app.api.deps import get_current_user, get_current_teacher, get_current_user_optional

router = APIRouter(prefix="/notices", tags=["notices"])


def _notice_dict(n: Notice, author_nick: str = "") -> dict:
    return {
        "id": n.id,
        "title": n.title,
        "content": n.content,
        "created_by": n.created_by,
        "author_nick": author_nick,
        "created_at": n.created_at.isoformat(),
        "is_pinned": bool(n.is_pinned),
    }


# ─── 목록 ─────────────────────────────────────────────────────────────────────

@router.get("")
def list_notices(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    base = db.query(Notice).filter(Notice.defunct == 0)
    total = base.count()

    # 고정 공지 먼저, 그다음 최신순
    notices = (
        base.order_by(Notice.is_pinned.desc(), Notice.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    from app.models.user import User as UserModel
    rows = []
    for n in notices:
        user = db.query(UserModel).filter(UserModel.user_id == n.created_by).first()
        rows.append(_notice_dict(n, user.nick if user else n.created_by))

    return {"total": total, "page": page, "page_size": page_size, "notices": rows}


# ─── 상세 ─────────────────────────────────────────────────────────────────────

@router.get("/{notice_id}")
def get_notice(notice_id: int, db: Session = Depends(get_db)):
    n = db.query(Notice).filter(Notice.id == notice_id, Notice.defunct == 0).first()
    if not n:
        raise HTTPException(status_code=404, detail="공지를 찾을 수 없습니다")
    from app.models.user import User as UserModel
    user = db.query(UserModel).filter(UserModel.user_id == n.created_by).first()
    return _notice_dict(n, user.nick if user else n.created_by)


# ─── 생성 ─────────────────────────────────────────────────────────────────────

@router.post("")
def create_notice(
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_teacher),
):
    title = body.get("title", "").strip()
    content = body.get("content", "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="제목을 입력하세요")
    if not content:
        raise HTTPException(status_code=400, detail="내용을 입력하세요")

    n = Notice(
        title=title,
        content=content,
        created_by=current_user.user_id,
        created_at=now_kst(),
        is_pinned=1 if body.get("is_pinned") else 0,
    )
    db.add(n)
    db.commit()
    db.refresh(n)
    return _notice_dict(n, current_user.nick)


# ─── 수정 ─────────────────────────────────────────────────────────────────────

@router.patch("/{notice_id}")
def update_notice(
    notice_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    n = db.query(Notice).filter(Notice.id == notice_id, Notice.defunct == 0).first()
    if not n:
        raise HTTPException(status_code=404, detail="공지를 찾을 수 없습니다")

    from sqlalchemy import text
    is_admin = db.execute(
        text("SELECT 1 FROM privilege WHERE user_id=:uid AND rightstr='administrator' AND defunct='N' LIMIT 1"),
        {"uid": current_user.user_id},
    ).fetchone()
    if n.created_by != current_user.user_id and not is_admin:
        raise HTTPException(status_code=403, detail="권한이 없습니다")

    if "title" in body:
        n.title = body["title"].strip() or n.title
    if "content" in body:
        n.content = body["content"].strip() or n.content
    if "is_pinned" in body:
        n.is_pinned = 1 if body["is_pinned"] else 0

    db.commit()
    db.refresh(n)
    return _notice_dict(n, current_user.nick)


# ─── 삭제 ─────────────────────────────────────────────────────────────────────

@router.delete("/{notice_id}")
def delete_notice(
    notice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    n = db.query(Notice).filter(Notice.id == notice_id).first()
    if not n:
        raise HTTPException(status_code=404, detail="공지를 찾을 수 없습니다")

    from sqlalchemy import text
    is_admin = db.execute(
        text("SELECT 1 FROM privilege WHERE user_id=:uid AND rightstr='administrator' AND defunct='N' LIMIT 1"),
        {"uid": current_user.user_id},
    ).fetchone()
    if n.created_by != current_user.user_id and not is_admin:
        raise HTTPException(status_code=403, detail="권한이 없습니다")

    n.defunct = 1
    db.commit()
    return {"ok": True}
