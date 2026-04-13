#!/bin/bash
# Piston 언어 런타임 설치 (최초 1회 실행)
# docker compose up 후 piston 컨테이너가 뜬 다음 실행

PISTON="http://localhost:2000"

wait_piston() {
    echo "Piston 응답 대기 중..."
    for i in $(seq 1 20); do
        if curl -sf "$PISTON/api/v2/runtimes" > /dev/null; then
            echo "Piston 준비됨"
            return 0
        fi
        sleep 3
    done
    echo "Piston 응답 없음 - 컨테이너 상태 확인 필요"
    exit 1
}

install_runtime() {
    local lang=$1
    local ver=$2
    echo -n "  설치 중: $lang $ver ... "
    result=$(curl -sf -X POST "$PISTON/api/v2/packages" \
        -H "Content-Type: application/json" \
        -d "{\"language\":\"$lang\",\"version\":\"$ver\"}" 2>&1)
    if echo "$result" | grep -q "\"language\""; then
        echo "완료"
    else
        echo "실패: $result"
    fi
}

wait_piston

echo "=== 언어 런타임 설치 ==="
install_runtime python     3.10.0
install_runtime gcc        10.2.0   # C + C++ 포함
install_runtime java       15.0.2
install_runtime node       18.15.0

echo ""
echo "설치된 런타임:"
curl -s "$PISTON/api/v2/runtimes" | python3 -c \
    "import sys,json; [print(' -', r['language'], r['version']) for r in json.load(sys.stdin)]"
