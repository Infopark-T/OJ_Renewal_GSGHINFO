from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.api import auth, problems, solutions, admin, classes, assignments, contests, ranking, tags, notices, comments, stats, upload, run
from app.core.database import Base, engine
from app.models import classroom   # noqa: F401 — registers models with Base
from app.models import assignment  # noqa: F401 — registers models with Base
from app.models import contest     # noqa: F401 — registers models with Base
from app.models import problem_tag # noqa: F401 — registers models with Base
from app.models import notice      # noqa: F401 — registers models with Base
from app.models import comment      # noqa: F401 — registers models with Base
from app.models import class_extras # noqa: F401 — registers models with Base

Base.metadata.create_all(bind=engine)

# 마이그레이션: 기존 테이블 컬럼 변경/추가
with engine.connect() as _conn:
    for stmt in [
        "ALTER TABLE class_members MODIFY COLUMN class_id INT NULL",
        "ALTER TABLE problem ADD COLUMN difficulty TINYINT NULL",
    ]:
        try:
            _conn.execute(text(stmt))
            _conn.commit()
        except Exception:
            pass  # 이미 적용됐거나 지원 안 하는 경우 무시

app = FastAPI(
    title="HustOJ New API",
    description="Modern API for HustOJ platform",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(problems.router, prefix="/api")
app.include_router(solutions.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(classes.router, prefix="/api")
app.include_router(assignments.router, prefix="/api")
app.include_router(contests.router, prefix="/api")
app.include_router(ranking.router, prefix="/api")
app.include_router(tags.router, prefix="/api")
app.include_router(notices.router, prefix="/api")
app.include_router(comments.router, prefix="/api")
app.include_router(stats.router, prefix="/api")
app.include_router(upload.router, prefix="/api")
app.include_router(run.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}
