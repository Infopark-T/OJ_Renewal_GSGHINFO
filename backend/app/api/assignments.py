from datetime import datetime
from app.core.timezone import now_kst
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db
from app.models.assignment import Assignment, AssignmentProblem
from app.models.classroom import Classroom, ClassMember
from app.models.problem import Problem
from app.models.solution import Solution
from app.models.user import User
from app.api.deps import get_current_user, get_current_teacher

router = APIRouter(prefix="/assignments", tags=["assignments"])


def _is_class_teacher(user_id: str, class_id: int, db: Session) -> bool:
    cls = db.query(Classroom).filter(Classroom.id == class_id).first()
    if not cls:
        return False
    if cls.teacher_id == user_id:
        return True
    priv = db.execute(
        text("SELECT 1 FROM privilege WHERE user_id=:uid AND rightstr='administrator' AND defunct='N' LIMIT 1"),
        {"uid": user_id},
    ).fetchone()
    return priv is not None


def _is_class_member(user_id: str, class_id: int, db: Session) -> bool:
    return db.query(ClassMember).filter(
        ClassMember.class_id == class_id,
        ClassMember.user_id == user_id,
    ).first() is not None


def _assignment_dict(a: Assignment, db: Session, user_id: Optional[str] = None) -> dict:
    problems = (
        db.query(AssignmentProblem)
        .filter(AssignmentProblem.assignment_id == a.id)
        .order_by(AssignmentProblem.order_num)
        .all()
    )
    problem_ids = [ap.problem_id for ap in problems]

    # 문제 제목 조회
    problem_list = []
    for pid in problem_ids:
        p = db.query(Problem).filter(Problem.problem_id == pid).first()
        problem_list.append({
            "problem_id": pid,
            "title": p.title if p else f"문제 #{pid}",
        })

    d = {
        "id": a.id,
        "class_id": a.class_id,
        "title": a.title,
        "description": a.description,
        "due_date": a.due_date.isoformat() if a.due_date else None,
        "created_at": a.created_at.isoformat(),
        "created_by": a.created_by,
        "problems": problem_list,
        "problem_count": len(problem_list),
    }

    # 로그인한 사용자의 진행률
    if user_id and problem_ids:
        solved = {
            r[0] for r in db.query(Solution.problem_id)
            .filter(
                Solution.user_id == user_id,
                Solution.problem_id.in_(problem_ids),
                Solution.result == 4,
            )
            .distinct()
            .all()
        }
        d["my_solved"] = len(solved)
        d["my_progress"] = round(len(solved) / len(problem_ids) * 100)
        d["my_solved_problems"] = list(solved)
    else:
        d["my_solved"] = 0
        d["my_progress"] = 0
        d["my_solved_problems"] = []

    return d


# ─── 과제 생성 ──────────────────────────────────────────────────────────────

@router.post("")
def create_assignment(
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_teacher),
):
    class_id = body.get("class_id")
    if not class_id:
        raise HTTPException(status_code=400, detail="class_id가 필요합니다")
    if not _is_class_teacher(current_user.user_id, class_id, db):
        raise HTTPException(status_code=403, detail="해당 학급의 선생님만 과제를 생성할 수 있습니다")

    title = body.get("title", "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="과제 제목을 입력하세요")

    problem_ids = body.get("problem_ids", [])
    if not problem_ids:
        raise HTTPException(status_code=400, detail="문제를 1개 이상 선택하세요")

    due_date = None
    if body.get("due_date"):
        try:
            due_date = datetime.fromisoformat(body["due_date"])
        except ValueError:
            raise HTTPException(status_code=400, detail="due_date 형식이 올바르지 않습니다")

    assignment = Assignment(
        class_id=class_id,
        title=title,
        description=body.get("description", ""),
        due_date=due_date,
        created_at=now_kst(),
        created_by=current_user.user_id,
    )
    db.add(assignment)
    db.flush()

    for i, pid in enumerate(problem_ids):
        db.add(AssignmentProblem(
            assignment_id=assignment.id,
            problem_id=pid,
            order_num=i,
        ))

    db.commit()
    db.refresh(assignment)
    return _assignment_dict(assignment, db, current_user.user_id)


# ─── 학급별 과제 목록 ─────────────────────────────────────────────────────────

@router.get("/class/{class_id}")
def list_assignments(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not _is_class_member(current_user.user_id, class_id, db) and \
       not _is_class_teacher(current_user.user_id, class_id, db):
        raise HTTPException(status_code=403, detail="학급 멤버만 접근할 수 있습니다")

    assignments = (
        db.query(Assignment)
        .filter(Assignment.class_id == class_id, Assignment.archived == 0)
        .order_by(Assignment.created_at.desc())
        .all()
    )
    return [_assignment_dict(a, db, current_user.user_id) for a in assignments]


# ─── 과제 상세 ───────────────────────────────────────────────────────────────

@router.get("/{assignment_id}")
def get_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    a = db.query(Assignment).filter(Assignment.id == assignment_id, Assignment.archived == 0).first()
    if not a:
        raise HTTPException(status_code=404, detail="과제를 찾을 수 없습니다")

    if not _is_class_member(current_user.user_id, a.class_id, db) and \
       not _is_class_teacher(current_user.user_id, a.class_id, db):
        raise HTTPException(status_code=403, detail="학급 멤버만 접근할 수 있습니다")

    return _assignment_dict(a, db, current_user.user_id)


# ─── 과제 진행 현황 (선생님용) ─────────────────────────────────────────────────

@router.get("/{assignment_id}/progress")
def get_assignment_progress(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    a = db.query(Assignment).filter(Assignment.id == assignment_id, Assignment.archived == 0).first()
    if not a:
        raise HTTPException(status_code=404, detail="과제를 찾을 수 없습니다")

    if not _is_class_teacher(current_user.user_id, a.class_id, db):
        raise HTTPException(status_code=403, detail="선생님만 진행 현황을 볼 수 있습니다")

    ap_rows = (
        db.query(AssignmentProblem)
        .filter(AssignmentProblem.assignment_id == assignment_id)
        .order_by(AssignmentProblem.order_num)
        .all()
    )
    problem_ids = [ap.problem_id for ap in ap_rows]

    # 학급 학생 목록
    members = db.query(ClassMember).filter(
        ClassMember.class_id == a.class_id,
        ClassMember.role == "student",
    ).all()

    result = []
    for m in members:
        user = db.query(User).filter(User.user_id == m.user_id).first()
        solved = {
            r[0] for r in db.query(Solution.problem_id)
            .filter(
                Solution.user_id == m.user_id,
                Solution.problem_id.in_(problem_ids),
                Solution.result == 4,
            )
            .distinct()
            .all()
        } if problem_ids else set()

        result.append({
            "user_id": m.user_id,
            "nick": user.nick if user else m.user_id,
            "grade": m.grade,
            "class_num": m.class_num,
            "student_num": m.student_num,
            "solved_count": len(solved),
            "total_count": len(problem_ids),
            "progress": round(len(solved) / len(problem_ids) * 100) if problem_ids else 0,
            "solved_problems": list(solved),
        })

    # 학번 순 정렬
    result.sort(key=lambda x: (x["grade"] or 99, x["class_num"] or 99, x["student_num"] or 99))

    problems_info = []
    for pid in problem_ids:
        p = db.query(Problem).filter(Problem.problem_id == pid).first()
        problems_info.append({"problem_id": pid, "title": p.title if p else f"문제 #{pid}"})

    return {
        "assignment_id": assignment_id,
        "problems": problems_info,
        "students": result,
    }


# ─── 과제 수정 ───────────────────────────────────────────────────────────────

@router.patch("/{assignment_id}")
def update_assignment(
    assignment_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    a = db.query(Assignment).filter(Assignment.id == assignment_id, Assignment.archived == 0).first()
    if not a:
        raise HTTPException(status_code=404, detail="과제를 찾을 수 없습니다")
    if not _is_class_teacher(current_user.user_id, a.class_id, db):
        raise HTTPException(status_code=403, detail="선생님만 수정할 수 있습니다")

    if "title" in body:
        title = body["title"].strip()
        if not title:
            raise HTTPException(status_code=400, detail="과제 제목을 입력하세요")
        a.title = title
    if "description" in body:
        a.description = body["description"]
    if "due_date" in body:
        if body["due_date"]:
            try:
                a.due_date = datetime.fromisoformat(body["due_date"])
            except ValueError:
                raise HTTPException(status_code=400, detail="due_date 형식이 올바르지 않습니다")
        else:
            a.due_date = None

    if "problem_ids" in body:
        problem_ids = body["problem_ids"]
        if not problem_ids:
            raise HTTPException(status_code=400, detail="문제를 1개 이상 선택하세요")
        db.query(AssignmentProblem).filter(AssignmentProblem.assignment_id == assignment_id).delete()
        for i, pid in enumerate(problem_ids):
            db.add(AssignmentProblem(assignment_id=assignment_id, problem_id=pid, order_num=i))

    db.commit()
    db.refresh(a)
    return _assignment_dict(a, db, current_user.user_id)


# ─── 과제 삭제 ───────────────────────────────────────────────────────────────

@router.delete("/{assignment_id}")
def delete_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    a = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="과제를 찾을 수 없습니다")
    if not _is_class_teacher(current_user.user_id, a.class_id, db):
        raise HTTPException(status_code=403, detail="선생님만 삭제할 수 있습니다")

    a.archived = 1
    db.commit()
    return {"ok": True}
