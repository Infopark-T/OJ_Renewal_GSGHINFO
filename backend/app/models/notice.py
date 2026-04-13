from sqlalchemy import Column, Integer, String, DateTime, Text, SmallInteger
from app.core.database import Base


class Notice(Base):
    __tablename__ = "notices"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    created_by = Column(String(48), nullable=False)
    created_at = Column(DateTime, nullable=False)
    is_pinned = Column(SmallInteger, default=0)   # 1 = 상단 고정
    defunct = Column(SmallInteger, default=0)
