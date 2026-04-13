from sqlalchemy import Column, String, Integer, DateTime, SmallInteger, Numeric, TIMESTAMP
from app.core.database import Base


# Result code mapping (from judged.cc defines)
RESULT_CODES = {
    0: "Waiting",       # OJ_WT0 - queued
    1: "Judging",       # OJ_WT1 - being judged
    2: "Compiling",     # OJ_CI
    3: "Running",       # OJ_RI
    4: "Accepted",      # OJ_AC
    5: "Presentation Error",  # OJ_PE
    6: "Wrong Answer",  # OJ_WA
    7: "Time Limit Exceeded",   # OJ_TL
    8: "Memory Limit Exceeded", # OJ_ML
    9: "Output Limit Exceeded", # OJ_OL
    10: "Runtime Error",  # OJ_RE
    11: "Compile Error",  # OJ_CE
    12: "Compile OK",     # OJ_CO
}

LANGUAGE_NAMES = {
    0: "C",
    1: "C++",
    2: "Pascal",
    3: "Java",
    4: "Ruby",
    5: "Bash",
    6: "Python 3",
    7: "PHP",
    8: "Perl",
    9: "C#",
    10: "Objective-C",
    11: "FreeBasic",
    12: "Scheme",
    13: "Clang",
    14: "Clang++",
    15: "Lua",
    16: "JavaScript",
    17: "Go",
    18: "SQL",
    19: "Fortran",
    20: "Matlab",
}


class Solution(Base):
    __tablename__ = "solution"

    solution_id = Column(Integer, primary_key=True, autoincrement=True)
    problem_id = Column(Integer, default=0)
    user_id = Column(String(48), default="")
    nick = Column(String(20), default="")
    time = Column(Integer, default=0)
    memory = Column(Integer, default=0)
    in_date = Column(DateTime, nullable=False)
    result = Column(SmallInteger, default=0)
    language = Column(Integer, default=0)
    ip = Column(String(46), default="")
    contest_id = Column(Integer, default=0)
    valid = Column(Integer, default=1)
    num = Column(Integer, default=-1)
    code_length = Column(Integer, default=0)
    judgetime = Column(TIMESTAMP, nullable=True)
    pass_rate = Column(Numeric(4, 3), default=0)
    first_time = Column(Integer, default=0)
    lint_error = Column(Integer, default=0)
    judger = Column(String(16), default="LOCAL")
    remote_oj = Column(String(16), default="")
    remote_id = Column(String(32), default="")
