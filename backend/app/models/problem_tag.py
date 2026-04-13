from sqlalchemy import Column, Integer, String
from app.core.database import Base


class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), unique=True, nullable=False)   # 예: "DP", "그래프"
    slug = Column(String(50), unique=True, nullable=False)   # URL용: "dp", "graph"


class ProblemTag(Base):
    __tablename__ = "problem_tags"

    id = Column(Integer, primary_key=True, autoincrement=True)
    problem_id = Column(Integer, nullable=False)
    tag_id = Column(Integer, nullable=False)
