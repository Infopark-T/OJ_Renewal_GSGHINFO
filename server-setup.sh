#!/bin/bash
# ================================================================
# HustOJ 서버 최초 설치 스크립트 (Ubuntu 22.04 기준)
# 사용법: sudo bash server-setup.sh
# ================================================================
set -e

REPO_URL="https://github.com/YOUR_USERNAME/YOUR_REPO.git"   # ← 수정
DOMAIN="your.domain.com"                                      # ← 수정
APP_DIR="/opt/hustoj"

echo "=== [1/6] 시스템 패키지 업데이트 ==="
apt-get update && apt-get upgrade -y

echo "=== [2/6] Docker 설치 ==="
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
else
    echo "Docker 이미 설치됨"
fi

# Docker Compose V2 확인
docker compose version || apt-get install -y docker-compose-plugin

echo "=== [3/6] Nginx + Certbot 설치 ==="
apt-get install -y nginx certbot python3-certbot-nginx

echo "=== [4/6] 코드 클론 ==="
if [ -d "$APP_DIR" ]; then
    echo "$APP_DIR 이미 존재함 — git pull"
    cd "$APP_DIR" && git pull
else
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

echo "=== [5/6] .env 파일 생성 ==="
if [ ! -f "$APP_DIR/.env" ]; then
    SECRET=$(openssl rand -hex 32)
    DB_PASS=$(openssl rand -hex 16)
    DB_ROOT=$(openssl rand -hex 16)
    cat > "$APP_DIR/.env" <<EOF
MYSQL_ROOT_PASSWORD=$DB_ROOT
MYSQL_PASSWORD=$DB_PASS
SECRET_KEY=$SECRET
EOF
    echo ".env 생성 완료 (패스워드 자동 생성)"
    echo ">> DB 패스워드: $DB_PASS (안전한 곳에 보관하세요)"
else
    echo ".env 이미 존재함 — 건드리지 않음"
fi

echo "=== [6/6] Nginx 사이트 설정 ==="
cat > /etc/nginx/sites-available/hustoj <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        client_max_body_size 50m;
    }
}
EOF

ln -sf /etc/nginx/sites-available/hustoj /etc/nginx/sites-enabled/hustoj
nginx -t && systemctl reload nginx

echo ""
echo "======================================"
echo "설치 완료! 다음 단계:"
echo "  1. cd $APP_DIR"
echo "  2. docker compose -f docker-compose.prod.yml up -d --build"
echo "  3. bash piston-setup.sh   (런타임 설치, 최초 1회)"
echo "  4. sudo certbot --nginx -d $DOMAIN   (SSL 설정)"
echo "======================================"
