import hashlib
from datetime import datetime
from app.core.timezone import now_kst, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy import text, func
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import create_access_token, get_password_hash
from app.models.user import User
from app.models.solution import Solution, RESULT_CODES
from app.models.problem import Problem
from app.schemas.user import UserLogin, UserCreate, Token, UserOut
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


def md5(s: str) -> str:
    return hashlib.md5(s.encode()).hexdigest()


def _build_user_out(user: User, db: Session) -> UserOut:
    rows = db.execute(
        text("SELECT rightstr FROM privilege WHERE user_id=:uid AND defunct='N'"),
        {"uid": user.user_id},
    ).fetchall()
    roles = {r[0] for r in rows}
    user_out = UserOut.model_validate(user)
    user_out.is_admin = "administrator" in roles
    user_out.is_teacher = "teacher" in roles or "administrator" in roles
    return user_out


@router.post("/login", response_model=Token)
def login(body: UserLogin, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.user_id == body.user_id).first()
    if not user or user.defunct == "Y":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if user.password != md5(body.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token({"sub": user.user_id})
    return Token(access_token=token, token_type="bearer", user=_build_user_out(user, db))


@router.post("/register", response_model=Token)
def register(body: UserCreate, request: Request, db: Session = Depends(get_db)):
    if db.query(User).filter(User.user_id == body.user_id).first():
        raise HTTPException(status_code=400, detail="User ID already exists")

    user = User(
        user_id=body.user_id,
        password=md5(body.password),
        email=body.email,
        nick=body.nick or body.user_id,
        school=body.school or "",
        ip=request.client.host if request.client else "",
        reg_time=now_kst(),
        submit=0,
        solved=0,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token({"sub": user.user_id})
    return Token(access_token=token, token_type="bearer", user=_build_user_out(user, db))


@router.get("/me", response_model=UserOut)
def me(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return _build_user_out(current_user, db)


@router.patch("/me", response_model=UserOut)
def update_me(body: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if "nick" in body and body["nick"].strip():
        current_user.nick = body["nick"].strip()
    if "email" in body:
        current_user.email = body["email"]
    if "school" in body:
        current_user.school = body["school"]
    db.commit()
    db.refresh(current_user)
    return _build_user_out(current_user, db)


@router.patch("/me/password")
def change_password(body: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    current_pw = body.get("current_password", "")
    new_pw = body.get("new_password", "")
    if current_user.password != md5(current_pw):
        raise HTTPException(status_code=400, detail="현재 비밀번호가 올바르지 않습니다")
    if len(new_pw) < 4:
        raise HTTPException(status_code=400, detail="새 비밀번호는 4자 이상이어야 합니다")
    current_user.password = md5(new_pw)
    db.commit()
    return {"ok": True}


@router.get("/me/activity")
def my_activity(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """최근 365일 날짜별 제출 횟수 반환 (히트맵용)"""
    since = now_kst() - timedelta(days=365)
    rows = (
        db.query(
            func.date(Solution.in_date).label("day"),
            func.count(Solution.solution_id).label("count"),
        )
        .filter(Solution.user_id == current_user.user_id, Solution.in_date >= since)
        .group_by(func.date(Solution.in_date))
        .all()
    )
    return {str(r.day): r.count for r in rows}


@router.get("/me/solved-problems")
def my_solved_problems(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """AC된 문제 목록 (제목·난이도·카테고리 포함)"""
    solved_ids = {
        r[0] for r in db.query(Solution.problem_id)
        .filter(Solution.user_id == current_user.user_id, Solution.result == 4)
        .distinct()
        .all()
    }
    result = []
    for pid in solved_ids:
        p = db.query(Problem).filter(Problem.problem_id == pid, Problem.defunct == "N").first()
        if not p:
            continue
        result.append({
            "problem_id": pid,
            "title": p.title,
            "difficulty": p.difficulty,
            "source": p.source or "",
        })
    result.sort(key=lambda x: x["problem_id"])
    return result
