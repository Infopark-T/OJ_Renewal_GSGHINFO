from sqlalchemy import Column, Integer, String, Text, DateTime, SmallInteger, BigInteger
from app.core.database import Base


class ClassNotice(Base):
    __tablename__ = "class_notices"
    id         = Column(Integer, primary_key=True, autoincrement=True)
    class_id   = Column(Integer, nullable=False, index=True)
    title      = Column(String(200), nullable=False)
    content    = Column(Text, nullable=True)
    created_by = Column(String(48), nullable=False)
    created_at = Column(DateTime, nullable=False)
    is_pinned  = Column(SmallInteger, default=0)
    defunct    = Column(SmallInteger, default=0)


class ClassFile(Base):
    __tablename__ = "class_files"
    id            = Column(Integer, primary_key=True, autoincrement=True)
    class_id      = Column(Integer, nullable=False, index=True)
    original_name = Column(String(260), nullable=False)
    stored_name   = Column(String(100), nullable=False)
    mime_type     = Column(String(100), nullable=True)
    file_size     = Column(BigInteger, default=0)
    uploaded_by   = Column(String(48), nullable=False)
    created_at    = Column(DateTime, nullable=False)
    defunct       = Column(SmallInteger, default=0)
