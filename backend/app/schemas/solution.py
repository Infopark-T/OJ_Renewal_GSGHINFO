from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class SubmitCode(BaseModel):
    problem_id: int
    language: int
    source_code: str
    contest_id: Optional[int] = 0


class SolutionOut(BaseModel):
    solution_id: int
    problem_id: int
    user_id: str
    nick: str
    result: int
    result_label: str
    language: int
    language_label: str
    time: int
    memory: int
    code_length: int
    in_date: datetime
    pass_rate: float

    class Config:
        from_attributes = True
