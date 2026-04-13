from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.problem_tag import Tag
from app.api.deps import get_current_admin

router = APIRouter(prefix="/tags", tags=["tags"])

DEFAULT_TAGS = [
    ("구현", "implementation"),
    ("수학", "math"),
    ("그리디", "greedy"),
    ("정렬", "sorting"),
    ("이진 탐색", "binary-search"),
    ("두 포인터", "two-pointer"),
    ("BFS", "bfs"),
    ("DFS", "dfs"),
    ("그래프", "graph"),
    ("트리", "tree"),
    ("DP", "dp"),
    ("분할 정복", "divide-and-conquer"),
    ("백트래킹", "backtracking"),
    ("문자열", "string"),
    ("최단경로", "shortest-path"),
    ("유니온 파인드", "union-find"),
    ("세그먼트 트리", "segment-tree"),
    ("브루트포스", "bruteforce"),
    ("시뮬레이션", "simulation"),
    ("스택/큐", "stack-queue"),
]


@router.get("")
def list_tags(db: Session = Depends(get_db)):
    tags = db.query(Tag).order_by(Tag.name).all()
    return [{"id": t.id, "name": t.name, "slug": t.slug} for t in tags]


@router.post("/init")
def init_tags(db: Session = Depends(get_db), _=Depends(get_current_admin)):
    """기본 태그 초기화 (관리자 전용)"""
    created = 0
    for name, slug in DEFAULT_TAGS:
        if not db.query(Tag).filter(Tag.slug == slug).first():
            db.add(Tag(name=name, slug=slug))
            created += 1
    db.commit()
    return {"created": created}


@router.post("")
def create_tag(body: dict, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    name = body.get("name", "").strip()
    slug = body.get("slug", "").strip().lower()
    if not name or not slug:
        raise HTTPException(status_code=400, detail="name과 slug를 입력하세요")
    if db.query(Tag).filter(Tag.slug == slug).first():
        raise HTTPException(status_code=409, detail="이미 존재하는 slug입니다")
    tag = Tag(name=name, slug=slug)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return {"id": tag.id, "name": tag.name, "slug": tag.slug}


@router.delete("/{tag_id}")
def delete_tag(tag_id: int, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="태그를 찾을 수 없습니다")
    db.delete(tag)
    db.commit()
    return {"ok": True}
