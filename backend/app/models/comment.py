from sqlalchemy import Column, Integer, String, DateTime, Text, SmallInteger
from app.core.database import Base


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    problem_id = Column(Integer, nullable=False)
    user_id = Column(String(48), nullable=False)
    content = Column(Text, nullable=False)
    parent_id = Column(Integer, nullable=True)   # 대댓글이면 부모 댓글 id
    created_at = Column(DateTime, nullable=False)
    defunct = Column(SmallInteger, default=0)
