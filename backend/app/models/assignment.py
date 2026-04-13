from sqlalchemy import Column, Integer, String, DateTime, Text, SmallInteger
from app.core.database import Base


class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    class_id = Column(Integer, nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, default="")
    due_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False)
    created_by = Column(String(48), nullable=False)  # teacher user_id
    archived = Column(SmallInteger, default=0)


class AssignmentProblem(Base):
    __tablename__ = "assignment_problems"

    id = Column(Integer, primary_key=True, autoincrement=True)
    assignment_id = Column(Integer, nullable=False)
    problem_id = Column(Integer, nullable=False)
    order_num = Column(Integer, default=0)
