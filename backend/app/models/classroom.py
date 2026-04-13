from sqlalchemy import Column, Integer, String, DateTime, SmallInteger
from app.core.database import Base


class Classroom(Base):
    __tablename__ = "classes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    teacher_id = Column(String(48), nullable=False)
    invite_code = Column(String(10), unique=True, nullable=False)
    description = Column(String(200), default="")
    created_at = Column(DateTime, nullable=False)
    archived = Column(SmallInteger, default=0)


class ClassMember(Base):
    __tablename__ = "class_members"

    id = Column(Integer, primary_key=True, autoincrement=True)
    class_id = Column(Integer, nullable=True)
    user_id = Column(String(48), nullable=False)
    role = Column(String(10), default="student")   # 'teacher' | 'student'
    grade = Column(SmallInteger, nullable=True)        # 학년
    class_num = Column(SmallInteger, nullable=True)    # 반
    student_num = Column(SmallInteger, nullable=True)  # 번호
    joined_at = Column(DateTime, nullable=False)
