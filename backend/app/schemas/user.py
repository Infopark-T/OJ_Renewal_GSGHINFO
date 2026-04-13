from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class UserLogin(BaseModel):
    user_id: str
    password: str


class UserCreate(BaseModel):
    user_id: str
    password: str
    email: Optional[str] = None
    nick: Optional[str] = ""
    school: Optional[str] = ""


class UserOut(BaseModel):
    user_id: str
    email: Optional[str]
    nick: str
    school: str
    submit: int
    solved: int
    reg_time: Optional[datetime]
    is_admin: bool = False
    is_teacher: bool = False

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut
