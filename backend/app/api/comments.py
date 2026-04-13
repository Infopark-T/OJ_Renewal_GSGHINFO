from datetime import datetime
from app.core.timezone import now_kst
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db
from app.models.comment import Comment
from app.models.user import User
from app.api.deps import get_current_user, get_current_user_optional

router = APIRouter(prefix="/problems/{problem_id}/comments", tags=["comments"])


def _is_admin(user_id: str, db: Session) -> bool:
    return db.execute(
        text("SELECT 1 FROM privilege WHERE user_id=:uid AND rightstr='administrator' AND defunct='N' LIMIT 1"),
        {"uid": user_id},
    ).fetchone() is not None


def _comment_dict(c: Comment, db: Session) -> dict:
    user = db.query(User).filter(User.user_id == c.user_id).first()
    return {
        "id": c.id,
        "problem_id": c.problem_id,
        "user_id": c.user_id,
        "nick": user.nick if user else c.user_id,
        "content": c.content,
        "parent_id": c.parent_id,
        "created_at": c.created_at.isoformat(),
    }


# ─── 댓글 목록 ────────────────────────────────────────────────────────────────

@router.get("")
def list_comments(
    problem_id: int,
    db: Session = Depends(get_db),
):
    comments = (
        db.query(Comment)
        .filter(Comment.problem_id == problem_id, Comment.defunct == 0)
        .order_by(Comment.created_at.asc())
        .all()
    )

    # 계층 구조 구성: 루트 댓글 + 대댓글
    root = []
    replies: dict[int, list] = {}
    for c in comments:
        d = _comment_dict(c, db)
        if c.parent_id is None:
            d["replies"] = []
            root.append(d)
            replies[c.id] = d["replies"]
        else:
            if c.parent_id in replies:
                replies[c.parent_id].append(d)

    return {"comments": root, "total": len(comments)}


# ─── 댓글 작성 ────────────────────────────────────────────────────────────────

@router.post("")
def create_comment(
    problem_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    content = body.get("content", "").strip()
    if not content:
        raise HTTPException(status_code=400, detail="내용을 입력하세요")
    if len(content) > 2000:
        raise HTTPException(status_code=400, detail="댓글은 2000자 이하로 작성하세요")

    parent_id = body.get("parent_id")
    if parent_id:
        parent = db.query(Comment).filter(
            Comment.id == parent_id,
            Comment.problem_id == problem_id,
            Comment.defunct == 0,
        ).first()
        if not parent:
            raise HTTPException(status_code=404, detail="부모 댓글을 찾을 수 없습니다")
        if parent.parent_id is not None:
            raise HTTPException(status_code=400, detail="대댓글에는 답글을 달 수 없습니다")

    c = Comment(
        problem_id=problem_id,
        user_id=current_user.user_id,
        content=content,
        parent_id=parent_id,
        created_at=now_kst(),
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return _comment_dict(c, db)


# ─── 댓글 삭제 ────────────────────────────────────────────────────────────────

@router.delete("/{comment_id}")
def delete_comment(
    problem_id: int,
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = db.query(Comment).filter(
        Comment.id == comment_id,
        Comment.problem_id == problem_id,
        Comment.defunct == 0,
    ).first()
    if not c:
        raise HTTPException(status_code=404, detail="댓글을 찾을 수 없습니다")
    if c.user_id != current_user.user_id and not _is_admin(current_user.user_id, db):
        raise HTTPException(status_code=403, detail="권한이 없습니다")

    # 대댓글도 같이 삭제
    db.query(Comment).filter(Comment.parent_id == comment_id).update({"defunct": 1})
    c.defunct = 1
    db.commit()
    return {"ok": True}
