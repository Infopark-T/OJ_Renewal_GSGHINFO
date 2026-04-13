from sqlalchemy import Column, Integer, String, DateTime, Text, SmallInteger
from app.core.database import Base


class Contest(Base):
    __tablename__ = "contests"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, default="")
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    contest_type = Column(String(10), default="ACM")  # ACM | OI
    created_by = Column(String(48), nullable=False)
    is_public = Column(SmallInteger, default=1)   # 1=공개, 0=비공개(등록 필요)
    defunct = Column(SmallInteger, default=0)
    paused_at = Column(DateTime, nullable=True, default=None)  # NULL = 진행 중


class ContestProblem(Base):
    __tablename__ = "contest_problems"

    id = Column(Integer, primary_key=True, autoincrement=True)
    contest_id = Column(Integer, nullable=False)
    problem_id = Column(Integer, nullable=False)
    alias = Column(String(4), default="")    # A, B, C … 또는 1, 2, 3
    order_num = Column(Integer, default=0)


class ContestUser(Base):
    __tablename__ = "contest_users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    contest_id = Column(Integer, nullable=False)
    user_id = Column(String(48), nullable=False)
    registered_at = Column(DateTime, nullable=False)
