from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal


class ProblemCreate(BaseModel):
    title: str
    description: Optional[str] = None
    input: Optional[str] = None
    output: Optional[str] = None
    sample_input: Optional[str] = None
    sample_output: Optional[str] = None
    hint: Optional[str] = None
    source: Optional[str] = None
    time_limit: Decimal = Decimal("1.000")
    memory_limit: int = 128
    difficulty: Optional[int] = None   # 1~5
    tag_ids: Optional[list[int]] = None
    test_cases: Optional[list[dict]] = None  # [{"input": "...", "output": "..."}]


class ProblemListItem(BaseModel):
    problem_id: int
    title: str
    time_limit: Decimal
    memory_limit: int
    accepted: int
    submit: int
    source: Optional[str]

    class Config:
        from_attributes = True


class ProblemDetail(ProblemListItem):
    description: Optional[str]
    input: Optional[str]
    output: Optional[str]
    sample_input: Optional[str]
    sample_output: Optional[str]
    hint: Optional[str]
    spj: str
    in_date: Optional[datetime]
