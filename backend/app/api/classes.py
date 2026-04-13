import os
import uuid
import random
import string
from datetime import datetime
from app.core.timezone import now_kst
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from typing import Optional
from app.core.database import get_db
from app.models.classroom import Classroom, ClassMember
from app.models.user import User
from app.models.class_extras import ClassNotice, ClassFile
from app.models.solution import Solution
from app.api.deps import get_current_user, get_current_teacher

CLASS_FILES_DIR = os.environ.get("CLASS_FILES_DIR", "/judge_data/class_files")
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

router = APIRouter(prefix="/classes", tags=["classes"])


def _gen_code(db: Session) -> str:
    while True:
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        if not db.query(Classroom).filter(Classroom.invite_code == code).first():
            return code


def _is_teacher(user_id: str, db: Session) -> bool:
    priv = db.execute(
        text("SELECT 1 FROM privilege WHERE user_id=:uid AND rightstr='administrator' AND defunct='N' LIMIT 1"),
        {"uid": user_id},
    ).fetchone()
    return priv is not None


def _member_detail(m: ClassMember, db: Session) -> dict:
    user = db.query(User).filter(User.user_id == m.user_id).first()
    return {
        "id": m.id,
        "user_id": m.user_id,
        "nick": user.nick if user else m.user_id,
        "school": user.school if user else "",
        "role": m.role,
        "grade": m.grade,
        "class_num": m.class_num,
        "student_num": m.student_num,
        "joined_at": m.joined_at.isoformat(),
        "submit": user.submit if user else 0,
        "solved": user.solved if user else 0,
    }


# ─── 학급 생성 ────────────────────────────────────────────────────────────────

@router.post("")
def create_class(body: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_teacher)):

    name = body.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="학급 이름을 입력하세요")

    cls = Classroom(
        name=name,
        teacher_id=current_user.user_id,
        invite_code=_gen_code(db),
        description=body.get("description", ""),
        created_at=now_kst(),
    )
    db.add(cls)
    db.flush()

    # 담임 선생님 자동 멤버 등록
    db.add(ClassMember(
        class_id=cls.id,
        user_id=current_user.user_id,
        role="teacher",
        joined_at=now_kst(),
    ))
    db.commit()
    db.refresh(cls)
    return _class_dict(cls)


# ─── 내 학급 목록 ──────────────────────────────────────────────────────────────

@router.get("/mine")
def my_classes(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    memberships = db.query(ClassMember).filter(ClassMember.user_id == current_user.user_id).all()
    class_ids = [m.class_id for m in memberships]
    classes = db.query(Classroom).filter(Classroom.id.in_(class_ids), Classroom.archived == 0).all()

    result = []
    for cls in classes:
        d = _class_dict(cls)
        d["member_count"] = db.query(ClassMember).filter(ClassMember.class_id == cls.id).count()
        membership = next((m for m in memberships if m.class_id == cls.id), None)
        d["my_role"] = membership.role if membership else "student"
        result.append(d)
    return result


# ─── 학급 상세 ────────────────────────────────────────────────────────────────

@router.get("/{class_id}")
def get_class(class_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cls = db.query(Classroom).filter(Classroom.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="학급을 찾을 수 없습니다")

    membership = db.query(ClassMember).filter(
        ClassMember.class_id == class_id,
        ClassMember.user_id == current_user.user_id,
    ).first()
    if not membership and not _is_teacher(current_user.user_id, db):
        raise HTTPException(status_code=403, detail="학급 멤버만 접근할 수 있습니다")

    members = db.query(ClassMember).filter(ClassMember.class_id == class_id).all()
    d = _class_dict(cls)
    d["my_role"] = membership.role if membership else "teacher"
    d["members"] = sorted(
        [_member_detail(m, db) for m in members],
        key=lambda x: (x["grade"] or 99, x["class_num"] or 99, x["student_num"] or 99),
    )
    return d


# ─── 초대코드로 참여 ──────────────────────────────────────────────────────────

@router.post("/join")
def join_class(body: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    code = body.get("invite_code", "").strip().upper()
    cls = db.query(Classroom).filter(Classroom.invite_code == code, Classroom.archived == 0).first()
    if not cls:
        raise HTTPException(status_code=404, detail="초대 코드가 올바르지 않습니다")

    existing = db.query(ClassMember).filter(
        ClassMember.class_id == cls.id,
        ClassMember.user_id == current_user.user_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="이미 참여한 학급입니다")

    db.add(ClassMember(
        class_id=cls.id,
        user_id=current_user.user_id,
        role="student",
        grade=body.get("grade"),
        class_num=body.get("class_num"),
        student_num=body.get("student_num"),
        joined_at=now_kst(),
    ))
    db.commit()
    return {"ok": True, "class_id": cls.id, "class_name": cls.name}


# ─── 멤버 정보 수정 (본인 or 선생님) ──────────────────────────────────────────

@router.patch("/{class_id}/members/{user_id}")
def update_member(
    class_id: int,
    user_id: str,
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cls = db.query(Classroom).filter(Classroom.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="학급을 찾을 수 없습니다")

    is_teacher = cls.teacher_id == current_user.user_id or _is_teacher(current_user.user_id, db)
    if user_id != current_user.user_id and not is_teacher:
        raise HTTPException(status_code=403, detail="권한이 없습니다")

    member = db.query(ClassMember).filter(
        ClassMember.class_id == class_id,
        ClassMember.user_id == user_id,
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="멤버를 찾을 수 없습니다")

    if "grade" in body:
        member.grade = body["grade"]
    if "class_num" in body:
        member.class_num = body["class_num"]
    if "student_num" in body:
        member.student_num = body["student_num"]
    db.commit()
    return _member_detail(member, db)


# ─── 멤버 제거 ────────────────────────────────────────────────────────────────

@router.delete("/{class_id}/members/{user_id}")
def remove_member(
    class_id: int,
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cls = db.query(Classroom).filter(Classroom.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="학급을 찾을 수 없습니다")

    is_teacher = cls.teacher_id == current_user.user_id or _is_teacher(current_user.user_id, db)
    if user_id != current_user.user_id and not is_teacher:
        raise HTTPException(status_code=403, detail="권한이 없습니다")

    member = db.query(ClassMember).filter(
        ClassMember.class_id == class_id,
        ClassMember.user_id == user_id,
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="멤버를 찾을 수 없습니다")
    if member.role == "teacher" and user_id == cls.teacher_id:
        raise HTTPException(status_code=400, detail="담임 선생님은 제거할 수 없습니다")

    db.delete(member)
    db.commit()
    return {"ok": True}


# ─── 학급 수정 / 삭제 ─────────────────────────────────────────────────────────

@router.patch("/{class_id}")
def update_class(
    class_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cls = db.query(Classroom).filter(Classroom.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="학급을 찾을 수 없습니다")
    if cls.teacher_id != current_user.user_id and not _is_teacher(current_user.user_id, db):
        raise HTTPException(status_code=403, detail="권한이 없습니다")

    if "name" in body:
        name = body["name"].strip()
        if not name:
            raise HTTPException(status_code=400, detail="학급 이름을 입력하세요")
        cls.name = name
    if "description" in body:
        cls.description = body["description"]
    if "invite_code" in body:
        code = body["invite_code"].strip().upper()
        if not code:
            raise HTTPException(status_code=400, detail="초대 코드를 입력하세요")
        if len(code) < 4 or len(code) > 10:
            raise HTTPException(status_code=400, detail="초대 코드는 4~10자여야 합니다")
        # 영문 대문자 + 숫자만 허용
        import re
        if not re.match(r'^[A-Z0-9]+$', code):
            raise HTTPException(status_code=400, detail="초대 코드는 영문 대문자와 숫자만 사용할 수 있습니다")
        conflict = db.query(Classroom).filter(
            Classroom.invite_code == code,
            Classroom.id != class_id,
        ).first()
        if conflict:
            raise HTTPException(status_code=409, detail="이미 사용 중인 초대 코드입니다")
        cls.invite_code = code

    db.commit()
    return _class_dict(cls)


@router.delete("/{class_id}")
def delete_class(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cls = db.query(Classroom).filter(Classroom.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="학급을 찾을 수 없습니다")
    if cls.teacher_id != current_user.user_id and not _is_teacher(current_user.user_id, db):
        raise HTTPException(status_code=403, detail="권한이 없습니다")

    cls.archived = 1
    db.commit()
    return {"ok": True}


def _class_dict(cls: Classroom) -> dict:
    return {
        "id": cls.id,
        "name": cls.name,
        "teacher_id": cls.teacher_id,
        "invite_code": cls.invite_code,
        "description": cls.description,
        "created_at": cls.created_at.isoformat(),
        "archived": cls.archived,
    }


def _require_teacher(class_id: int, current_user: User, db: Session):
    cls = db.query(Classroom).filter(Classroom.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="학급을 찾을 수 없습니다")
    if cls.teacher_id != current_user.user_id and not _is_teacher(current_user.user_id, db):
        raise HTTPException(status_code=403, detail="권한이 없습니다")
    return cls


def _require_member(class_id: int, current_user: User, db: Session):
    cls = db.query(Classroom).filter(Classroom.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="학급을 찾을 수 없습니다")
    member = db.query(ClassMember).filter(
        ClassMember.class_id == class_id,
        ClassMember.user_id == current_user.user_id,
    ).first()
    if not member and not _is_teacher(current_user.user_id, db):
        raise HTTPException(status_code=403, detail="학급 멤버만 접근할 수 있습니다")
    is_teacher = (cls.teacher_id == current_user.user_id or _is_teacher(current_user.user_id, db))
    return cls, is_teacher


# ─── 멤버 초대 피커: 학급에 없는 유저 목록 ───────────────────────────────────

@router.get("/{class_id}/members/picker")
def member_picker(
    class_id: int,
    search: Optional[str] = None,
    grade: Optional[int] = None,
    class_num: Optional[int] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_teacher(class_id, current_user, db)

    # 이미 학급에 속한 유저 ID
    existing_ids = {
        r[0] for r in db.query(ClassMember.user_id).filter(ClassMember.class_id == class_id).all()
    }

    query = db.query(User).filter(User.defunct == "N")
    if search:
        query = query.filter(
            User.user_id.ilike(f"%{search}%") | User.nick.ilike(f"%{search}%")
        )

    users = query.order_by(User.user_id).all()

    # 학급 미등록 유저만 + 학년/반 필터 (class_members에 해당 유저의 최신 정보 참조)
    result = []
    for u in users:
        if u.user_id in existing_ids:
            continue
        # 해당 유저의 다른 학급에서 학년/반 정보 가져오기
        last_member = (
            db.query(ClassMember)
            .filter(ClassMember.user_id == u.user_id)
            .order_by(ClassMember.id.desc())
            .first()
        )
        g = last_member.grade if last_member else None
        cn = last_member.class_num if last_member else None
        sn = last_member.student_num if last_member else None

        if grade is not None and g != grade:
            continue
        if class_num is not None and cn != class_num:
            continue

        result.append({
            "user_id": u.user_id,
            "nick": u.nick,
            "school": u.school or "",
            "grade": g,
            "class_num": cn,
            "student_num": sn,
            "submit": u.submit,
            "solved": u.solved,
        })

    total = len(result)
    paged = result[(page - 1) * page_size: page * page_size]
    return {"total": total, "users": paged}


# ─── 멤버 일괄 추가 ───────────────────────────────────────────────────────────

@router.post("/{class_id}/members/bulk")
def bulk_add_members(
    class_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_teacher(class_id, current_user, db)
    user_ids: list[str] = body.get("user_ids", [])
    if not user_ids:
        raise HTTPException(status_code=400, detail="추가할 유저를 선택하세요")

    added = []
    for uid in user_ids:
        existing = db.query(ClassMember).filter(
            ClassMember.class_id == class_id, ClassMember.user_id == uid
        ).first()
        if existing:
            continue
        user = db.query(User).filter(User.user_id == uid, User.defunct == "N").first()
        if not user:
            continue
        # 다른 학급에서 학년/반/번호 정보 가져오기
        last_member = (
            db.query(ClassMember)
            .filter(ClassMember.user_id == uid)
            .order_by(ClassMember.id.desc())
            .first()
        )
        db.add(ClassMember(
            class_id=class_id, user_id=uid, role="student", joined_at=now_kst(),
            grade=last_member.grade if last_member else None,
            class_num=last_member.class_num if last_member else None,
            student_num=last_member.student_num if last_member else None,
        ))
        added.append(uid)

    db.commit()
    return {"added": len(added), "user_ids": added}


# ─── 학급 성적 현황 ───────────────────────────────────────────────────────────

@router.get("/{class_id}/stats")
def class_stats(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cls, is_teacher = _require_member(class_id, current_user, db)

    members = db.query(ClassMember).filter(ClassMember.class_id == class_id, ClassMember.role == "student").all()
    rows = []
    for m in members:
        user = db.query(User).filter(User.user_id == m.user_id).first()
        if not user:
            continue
        total_sub = db.query(func.count(Solution.solution_id)).filter(
            Solution.user_id == m.user_id
        ).scalar() or 0
        total_ac = db.query(func.count(Solution.solution_id)).filter(
            Solution.user_id == m.user_id, Solution.result == 4
        ).scalar() or 0
        rows.append({
            "user_id": m.user_id,
            "nick": user.nick,
            "role": m.role,
            "grade": m.grade,
            "class_num": m.class_num,
            "student_num": m.student_num,
            "submit": total_sub,
            "accepted": total_ac,
            "solved": user.solved or 0,
            "ac_rate": round(total_ac / total_sub * 100) if total_sub > 0 else 0,
        })

    rows.sort(key=lambda x: (x["grade"] or 99, x["class_num"] or 99, x["student_num"] or 99))
    return {"members": rows}


# ─── 학급 공지 ────────────────────────────────────────────────────────────────

@router.get("/{class_id}/notices")
def list_class_notices(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_member(class_id, current_user, db)
    notices = (
        db.query(ClassNotice)
        .filter(ClassNotice.class_id == class_id, ClassNotice.defunct == 0)
        .order_by(ClassNotice.is_pinned.desc(), ClassNotice.created_at.desc())
        .all()
    )
    return [_notice_dict(n, db) for n in notices]


@router.post("/{class_id}/notices")
def create_class_notice(
    class_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_teacher(class_id, current_user, db)
    title = body.get("title", "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="제목을 입력하세요")
    n = ClassNotice(
        class_id=class_id,
        title=title,
        content=body.get("content", ""),
        created_by=current_user.user_id,
        created_at=now_kst(),
        is_pinned=int(body.get("is_pinned", False)),
    )
    db.add(n)
    db.commit()
    db.refresh(n)
    return _notice_dict(n, db)


@router.patch("/{class_id}/notices/{notice_id}")
def update_class_notice(
    class_id: int, notice_id: int, body: dict,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    _require_teacher(class_id, current_user, db)
    n = db.query(ClassNotice).filter(ClassNotice.id == notice_id, ClassNotice.class_id == class_id, ClassNotice.defunct == 0).first()
    if not n:
        raise HTTPException(status_code=404, detail="공지를 찾을 수 없습니다")
    if "title" in body: n.title = body["title"]
    if "content" in body: n.content = body["content"]
    if "is_pinned" in body: n.is_pinned = int(body["is_pinned"])
    db.commit()
    return _notice_dict(n, db)


@router.delete("/{class_id}/notices/{notice_id}")
def delete_class_notice(
    class_id: int, notice_id: int,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    _require_teacher(class_id, current_user, db)
    n = db.query(ClassNotice).filter(ClassNotice.id == notice_id, ClassNotice.class_id == class_id).first()
    if not n:
        raise HTTPException(status_code=404, detail="공지를 찾을 수 없습니다")
    n.defunct = 1
    db.commit()
    return {"ok": True}


def _notice_dict(n: ClassNotice, db: Session) -> dict:
    user = db.query(User).filter(User.user_id == n.created_by).first()
    return {
        "id": n.id, "class_id": n.class_id, "title": n.title,
        "content": n.content, "created_by": n.created_by,
        "nick": user.nick if user else n.created_by,
        "is_pinned": bool(n.is_pinned),
        "created_at": n.created_at.isoformat(),
    }


# ─── 파일 공유 ────────────────────────────────────────────────────────────────

@router.get("/{class_id}/files")
def list_class_files(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_member(class_id, current_user, db)
    files = (
        db.query(ClassFile)
        .filter(ClassFile.class_id == class_id, ClassFile.defunct == 0)
        .order_by(ClassFile.created_at.desc())
        .all()
    )
    return [_file_dict(f, db) for f in files]


@router.post("/{class_id}/files")
async def upload_class_file(
    class_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cls, is_teacher = _require_member(class_id, current_user, db)

    data = await file.read()
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="파일 크기는 50MB 이하여야 합니다")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else "bin"
    stored = f"{uuid.uuid4().hex}.{ext}"
    dir_path = os.path.join(CLASS_FILES_DIR, str(class_id))
    os.makedirs(dir_path, exist_ok=True)
    with open(os.path.join(dir_path, stored), "wb") as f:
        f.write(data)

    cf = ClassFile(
        class_id=class_id,
        original_name=file.filename or stored,
        stored_name=stored,
        mime_type=file.content_type,
        file_size=len(data),
        uploaded_by=current_user.user_id,
        created_at=now_kst(),
    )
    db.add(cf)
    db.commit()
    db.refresh(cf)
    return _file_dict(cf, db)


@router.get("/{class_id}/files/{file_id}/download")
def download_class_file(
    class_id: int, file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_member(class_id, current_user, db)
    cf = db.query(ClassFile).filter(ClassFile.id == file_id, ClassFile.class_id == class_id, ClassFile.defunct == 0).first()
    if not cf:
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다")
    path = os.path.join(CLASS_FILES_DIR, str(class_id), cf.stored_name)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="파일이 존재하지 않습니다")
    return FileResponse(path, filename=cf.original_name, media_type=cf.mime_type or "application/octet-stream")


@router.delete("/{class_id}/files/{file_id}")
def delete_class_file(
    class_id: int, file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cls, is_teacher = _require_member(class_id, current_user, db)
    cf = db.query(ClassFile).filter(ClassFile.id == file_id, ClassFile.class_id == class_id, ClassFile.defunct == 0).first()
    if not cf:
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다")
    if cf.uploaded_by != current_user.user_id and not is_teacher:
        raise HTTPException(status_code=403, detail="권한이 없습니다")
    cf.defunct = 1
    db.commit()
    # 실제 파일 삭제
    path = os.path.join(CLASS_FILES_DIR, str(class_id), cf.stored_name)
    if os.path.exists(path):
        os.remove(path)
    return {"ok": True}


def _file_dict(f: ClassFile, db: Session) -> dict:
    user = db.query(User).filter(User.user_id == f.uploaded_by).first()
    return {
        "id": f.id, "class_id": f.class_id,
        "original_name": f.original_name, "mime_type": f.mime_type,
        "file_size": f.file_size, "uploaded_by": f.uploaded_by,
        "nick": user.nick if user else f.uploaded_by,
        "created_at": f.created_at.isoformat(),
    }
