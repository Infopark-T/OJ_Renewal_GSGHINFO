# 설치 가이드

## 요구 사항

- Ubuntu 24.04 LTS
- 공인 IP가 있는 서버 (VPS, 클라우드 등)
- 포트 80, 443 오픈 (방화벽 설정 필요)

---

## 1. 방화벽 포트 오픈

```bash
sudo ufw allow 22/tcp    # SSH (먼저 열어야 잠기지 않음)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

> AWS, NCP 등 클라우드 사용 시 콘솔의 **보안 그룹 인바운드 규칙**에도 80, 443 추가 필요

---

## 2. 설치 스크립트 실행

```bash
curl -fsSL https://raw.githubusercontent.com/Infopark-T/OJ_Renewal_GSGHINFO/main/server-setup.sh -o /tmp/setup.sh && sudo bash /tmp/setup.sh
```

실행 중 도메인 입력을 물어봅니다.

```
서버 공인 IP: 123.456.789.0

도메인이 있으면 입력하세요 (없으면 엔터 → IP로 접속):
```

- **도메인 있으면** 입력 → Nginx + SSL 안내
- **도메인 없으면** 엔터 → IP 주소로 바로 접속

스크립트가 자동으로 처리하는 것들:
- Docker, Nginx, Certbot 설치
- 코드 클론 (`/opt/hustoj`)
- DB 패스워드, JWT 시크릿 키 자동 생성 (`.env`)
- Nginx 리버스 프록시 설정

---

## 3. 디렉토리 소유권 설정

`sudo`로 설치했기 때문에 현재 유저로 소유권 변경:

```bash
sudo chown -R $USER:$USER /opt/hustoj
```

> 이 작업을 해야 이후 `git pull`, `deploy.sh` 등을 sudo 없이 실행 가능

---

## 4. Docker 그룹 설정 (sudo 없이 docker 사용)

```bash
sudo usermod -aG docker $USER
newgrp docker
```

---

## 5. 앱 빌드 및 시작

```bash
cd /opt/hustoj

# 빌드 및 컨테이너 시작 (최초 5~10분 소요)
sudo docker compose -f docker-compose.prod.yml up -d --build

# 상태 확인 (모두 running이어야 함)
sudo docker compose -f docker-compose.prod.yml ps
```

---

## 6. Piston 코드 실행 런타임 설치 (최초 1회)

컨테이너가 모두 실행된 후:

```bash
bash /opt/hustoj/piston-setup.sh
```

Python, C/C++, Java, JavaScript 런타임이 설치됩니다.

---

## 7. SSL 인증서 (도메인 있는 경우)

DNS가 이 서버를 가리킨 후:

```bash
sudo certbot --nginx -d your.domain.com
```

---

## 기본 관리자 계정

| 항목 | 값 |
|---|---|
| 아이디 | `admin` |
| 비밀번호 | `comedu` |

> 로그인 후 즉시 비밀번호를 변경하세요.

---

## 업데이트

```bash
cd /opt/hustoj
bash deploy.sh
```

---

## 문제 해결

### 컨테이너 상태 확인
```bash
sudo docker compose -f docker-compose.prod.yml ps
sudo docker compose -f docker-compose.prod.yml logs -f
sudo docker compose -f docker-compose.prod.yml logs -f backend   # 특정 서비스만
```

### git pull 권한 오류
```bash
# safe directory 오류 시
git config --global --add safe.directory /opt/hustoj

# 허가 거부 오류 시
sudo chown -R $USER:$USER /opt/hustoj
git pull
```

### 관리자 계정이 없을 때 (로그인 불가)
```bash
sudo docker compose -f docker-compose.prod.yml exec db mysql --default-character-set=utf8mb4 \
  -u hustoj -p$(grep MYSQL_PASSWORD /opt/hustoj/.env | cut -d= -f2) jol -e "
INSERT IGNORE INTO users (user_id, email, password, nick, school, ip, reg_time, submit, solved, defunct)
VALUES ('admin', 'admin@localhost', 'feae84ec683153c6244ba666dda7ae8f', '관리자', '', '127.0.0.1', NOW(), 0, 0, 'N');
INSERT IGNORE INTO privilege (user_id, rightstr, valuestr, defunct)
VALUES ('admin', 'administrator', 'true', 'N');
"
```

### 한글이 깨져 보일 때
```bash
sudo docker compose -f docker-compose.prod.yml exec db mysql --default-character-set=utf8mb4 \
  -u hustoj -p$(grep MYSQL_PASSWORD /opt/hustoj/.env | cut -d= -f2) jol -e \
  "UPDATE users SET nick='관리자' WHERE user_id='admin';"
```

### 전체 초기화 (DB 포함 — 주의)
```bash
sudo docker compose -f docker-compose.prod.yml down -v
```
