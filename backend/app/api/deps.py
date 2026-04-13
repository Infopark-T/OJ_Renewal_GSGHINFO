from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user = db.query(User).filter(User.user_id == payload.get("sub")).first()
    if not user or user.defunct == "Y":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return user


def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    user = get_current_user(credentials, db)
    from sqlalchemy import text
    priv = db.execute(
        text("SELECT 1 FROM privilege WHERE user_id=:uid AND rightstr='administrator' AND defunct='N' LIMIT 1"),
        {"uid": user.user_id},
    ).fetchone()
    if not priv:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    return user


def get_current_teacher(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """교사 또는 관리자만 허용"""
    user = get_current_user(credentials, db)
    from sqlalchemy import text
    priv = db.execute(
        text("""SELECT 1 FROM privilege
                WHERE user_id=:uid AND defunct='N'
                AND rightstr IN ('administrator','teacher') LIMIT 1"""),
        {"uid": user.user_id},
    ).fetchone()
    if not priv:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Teacher or admin only")
    return user


def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User | None:
    if not credentials:
        return None
    try:
        return get_current_user(credentials, db)
    except HTTPException:
        return None
