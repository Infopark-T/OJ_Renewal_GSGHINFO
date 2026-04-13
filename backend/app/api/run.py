import os
import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/run", tags=["run"])

PISTON_URL = os.getenv("PISTON_URL", "http://piston:2000")

# language int (used in solutions) → (piston lang name, filename)
LANG_MAP: dict[int, tuple[str, str]] = {
    0:  ("c",          "main.c"),
    1:  ("c++",        "main.cpp"),
    3:  ("java",       "Main.java"),
    6:  ("python",     "main.py"),
    16: ("javascript", "main.js"),
}

# Python용: input()이 stdin 값을 stdout에 echo하도록 shim 주입
# → 실제 터미널처럼 프롬프트 옆에 입력값이 나타남
_PYTHON_INPUT_SHIM = '''\
import sys as _sys, builtins as _bt
def input(prompt='', _f=_bt.input, _out=_sys.stdout):
    val = _f(prompt)
    _out.write(str(val) + '\\n')
    _out.flush()
    return val
_bt.input = input
'''


class RunRequest(BaseModel):
    language: int
    source_code: str
    stdin: str = ""


@router.post("", response_model=dict)
async def run_code(
    body: RunRequest,
    current_user: User = Depends(get_current_user),
):
    if body.language not in LANG_MAP:
        raise HTTPException(status_code=400, detail="지원하지 않는 언어입니다.")

    lang, filename = LANG_MAP[body.language]

    # Python은 input() echo shim 주입
    source = body.source_code
    if body.language == 6:
        source = _PYTHON_INPUT_SHIM + source

    payload = {
        "language": lang,
        "version": "*",
        "files": [{"name": filename, "content": source}],
        "stdin": body.stdin,
        "run_timeout": 3000,       # ms (Piston 기본 제한)
        "compile_timeout": 3000,  # ms
        "run_memory_limit": 128 * 1024 * 1024,  # 128 MB
    }

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(f"{PISTON_URL}/api/v2/execute", json=payload)
            resp.raise_for_status()
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="실행 엔진에 연결할 수 없습니다. (Piston 서비스 확인)")
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="실행 시간이 초과되었습니다.")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"실행 엔진 오류: {e.response.text}")

    data = resp.json()
    run_info = data.get("run", {})
    compile_info = data.get("compile", {})

    return {
        "stdout": run_info.get("stdout", ""),
        "stderr": run_info.get("stderr", ""),
        "exit_code": run_info.get("code", -1),
        "compile_stderr": compile_info.get("stderr", "") if compile_info else "",
        "language": lang,
    }
