from sqlalchemy import Column, String, Integer, DateTime, Text, Numeric, SmallInteger
from app.core.database import Base


class Problem(Base):
    __tablename__ = "problem"

    problem_id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(200), default="")
    description = Column(Text, nullable=True)
    input = Column(Text, nullable=True)
    output = Column(Text, nullable=True)
    sample_input = Column(Text, nullable=True)
    sample_output = Column(Text, nullable=True)
    spj = Column(String(1), default="0")
    hint = Column(Text, nullable=True)
    source = Column(String(100), nullable=True)
    in_date = Column(DateTime, nullable=True)
    time_limit = Column(Numeric(10, 3), default=0)
    memory_limit = Column(Integer, default=0)
    defunct = Column(String(1), default="N")
    accepted = Column(Integer, default=0)
    submit = Column(Integer, default=0)
    solved = Column(Integer, default=0)
    remote_oj = Column(String(16), nullable=True)
    remote_id = Column(String(32), nullable=True)
    difficulty = Column(SmallInteger, nullable=True)  # 1~5
