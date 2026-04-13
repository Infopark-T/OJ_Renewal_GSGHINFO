from sqlalchemy import Column, String, Integer, DateTime, Date
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    user_id = Column(String(48), primary_key=True)
    email = Column(String(100), nullable=True)
    submit = Column(Integer, default=0)
    solved = Column(Integer, default=0)
    defunct = Column(String(1), default="N")
    ip = Column(String(46), default="")
    accesstime = Column(DateTime, nullable=True)
    volume = Column(Integer, default=1)
    language = Column(Integer, default=1)
    password = Column(String(32), nullable=True)
    reg_time = Column(DateTime, nullable=True)
    expiry_date = Column(Date, default="2099-01-01")
    nick = Column(String(20), default="")
    school = Column(String(20), default="")
    group_name = Column(String(16), default="")
    activecode = Column(String(16), default="")
    starred = Column(Integer, default=0)
