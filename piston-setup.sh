#!/bin/bash
# Piston 언어 런타임 설치 (최초 1회 실행)
# docker compose up 후 piston 컨테이너가 뜬 다음 실행

set -e

# 개발환경(localhost 직접접근) vs 프로덕션(backend 컨테이너 경유) 자동 감지
if curl -sf --max-time 3 http://localhost:2000/api/v2/runtimes > /dev/null 2>&1; then
    # 개발환경: piston 포트가 호스트에 노출되어 있음
    PISTON="http://localhost:2000"
    USE_EXEC=false
    echo "개발환경 감지 — localhost:2000 직접 접근"
else
    # 프로덕션: backend 컨테이너를 통해 내부 네트워크로 접근
    USE_EXEC=true
    echo "프로덕션 환경 감지 — backend 컨테이너 경유로 설치"
fi

install_runtime() {
    local lang=$1
    local ver=$2
    echo -n "  설치 중: $lang $ver ... "

    if [ "$USE_EXEC" = true ]; then
        # docker-compose.prod.yml 또는 docker-compose.yml 자동 감지
        COMPOSE_FILE="docker-compose.prod.yml"
        [ ! -f "$COMPOSE_FILE" ] && COMPOSE_FILE="docker-compose.yml"

        result=$(docker compose -f "$COMPOSE_FILE" exec -T backend \
            python3 -c "
import httpx, asyncio, json
async def main():
    async with httpx.AsyncClient(timeout=120) as c:
        r = await c.post('http://piston:2000/api/v2/packages', json={'language':'$lang','version':'$ver'})
        print(r.text)
asyncio.run(main())
" 2>&1)
    else
        result=$(curl -sf -X POST "$PISTON/api/v2/packages" \
            -H "Content-Type: application/json" \
            -d "{\"language\":\"$lang\",\"version\":\"$ver\"}" 2>&1)
    fi

    if echo "$result" | grep -q "\"language\""; then
        echo "완료"
    else
        echo "실패: $result"
    fi
}

echo "=== Piston 언어 런타임 설치 ==="
install_runtime python     3.10.0
install_runtime gcc        10.2.0   # C + C++ 포함
install_runtime java       15.0.2
install_runtime node       18.15.0

echo ""
echo "설치된 런타임 확인:"
if [ "$USE_EXEC" = true ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
    [ ! -f "$COMPOSE_FILE" ] && COMPOSE_FILE="docker-compose.yml"
    docker compose -f "$COMPOSE_FILE" exec -T backend \
        python3 -c "
import httpx, asyncio, json
async def main():
    async with httpx.AsyncClient() as c:
        r = await c.get('http://piston:2000/api/v2/runtimes')
        for rt in r.json():
            print(f'  - {rt[\"language\"]} {rt[\"version\"]}')
asyncio.run(main())
"
else
    curl -s "$PISTON/api/v2/runtimes" | python3 -c \
        "import sys,json; [print(' -', r['language'], r['version']) for r in json.load(sys.stdin)]"
fi
