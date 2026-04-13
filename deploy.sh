#!/bin/bash
# ================================================================
# HustOJ 배포 업데이트 스크립트
# 사용법: bash deploy.sh
# ================================================================
set -e

cd "$(dirname "$0")"

echo "=== [1/3] 최신 코드 pull ==="
git pull

echo "=== [2/3] 컨테이너 빌드 & 재시작 ==="
docker compose -f docker-compose.prod.yml up -d --build

echo "=== [3/3] 상태 확인 ==="
docker compose -f docker-compose.prod.yml ps

echo ""
echo "배포 완료!"
