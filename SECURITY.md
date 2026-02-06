# 보안 가이드

## 🔐 민감 정보 관리

### 절대 커밋하면 안 되는 파일
- `.env` - 환경변수 (로컬 개발용)
- `.env.local` - 환경변수 (로컬 개발용)
- `clients.json` - 광고주 정보 및 토큰
- `temp_token.txt` - 임시 토큰 파일
- `secrets.json` - 기타 비밀 정보

### 토큰 관리

#### 1. Meta Access Token
- **발급처**: https://developers.facebook.com/tools/explorer/
- **갱신 주기**: 60일
- **저장 위치**:
  - 로컬: `.env` → `META_ACCESS_TOKEN`
  - Vercel: Dashboard → Environment Variables
  - Redis: `clients` key (자동 동기화)

#### 2. Upstash Redis Token
- **발급처**: https://console.upstash.com/
- **저장 위치**:
  - 로컬: `.env` → `KV_REST_API_URL`, `KV_REST_API_TOKEN`
  - Vercel: Dashboard → Environment Variables
- **⚠️ 주의**: 코드에 직접 하드코딩 금지!

### 토큰 유출 시 조치

#### Redis 토큰 유출
1. **즉시 Upstash Console에서 토큰 재발급**
   - https://console.upstash.com/ → Database 선택 → REST API → Reset Token
2. **로컬 .env 파일 업데이트**
3. **Vercel 환경변수 업데이트**
4. **Redis 동기화**
   ```bash
   node sync_env_to_redis.cjs
   ```

#### Meta Access Token 유출
1. **즉시 Facebook Developers에서 토큰 재발급**
2. **로컬 .env 파일 업데이트**
3. **Redis 동기화**
   ```bash
   node sync_env_to_redis.cjs
   ```
4. **Vercel 환경변수 업데이트** (필요 시)

### Git 히스토리에서 민감 정보 제거

토큰이 커밋 히스토리에 포함된 경우:

```bash
# ⚠️ 주의: 협업 중이라면 팀원과 상의 후 실행
# 1. BFG Repo-Cleaner 사용 (권장)
brew install bfg  # macOS
bfg --replace-text passwords.txt  # 토큰 목록 파일

# 2. git filter-branch (대안)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch CLAUDE.md update_token.cjs sync_env_to_redis.cjs" \
  --prune-empty --tag-name-filter cat -- --all

# 3. Force push (협업자에게 알림 필수!)
git push origin --force --all
```

### .gitignore 확인

다음 파일들이 `.gitignore`에 포함되어 있는지 확인:

```gitignore
# API Keys & Secrets
.env
.env.local
.env.production
clients.json
secrets.json
temp_token.txt
*토큰*
```

### 안전한 토큰 업데이트 방법

#### 방법 1: sync_env_to_redis.cjs (권장)
```bash
# 1. .env 파일 수정
echo "META_ACCESS_TOKEN=새토큰" >> .env

# 2. Redis 동기화
node sync_env_to_redis.cjs
```

#### 방법 2: update_token.cjs
```bash
# 1. 임시 파일에 토큰 저장
echo "새토큰" > temp_token.txt

# 2. Redis 업데이트
node update_token.cjs

# 3. 자동으로 temp_token.txt 삭제됨
```

### Vercel 환경변수 보안

1. **Dashboard에서만 설정**
   - https://vercel.com/your-project/settings/environment-variables

2. **프로덕션/프리뷰/개발 환경 분리**
   - Production: 실제 Meta 계정
   - Preview: 테스트 Meta 계정
   - Development: 로컬 `.env` 사용

3. **민감 정보는 Encrypted Secrets 사용**
   - Vercel Pro 이상: Encrypted at rest

### 체크리스트

배포 전 확인사항:
- [ ] `.env` 파일이 `.gitignore`에 포함됨
- [ ] `clients.json`이 `.gitignore`에 포함됨
- [ ] 코드에 하드코딩된 토큰이 없음
- [ ] `CLAUDE.md`에 실제 토큰이 없음
- [ ] Vercel 환경변수가 설정됨
- [ ] Git 히스토리에 토큰이 없음

### 문의

보안 이슈 발견 시:
- GitHub Issues: https://github.com/Martinkim73/meta_report/issues
- 이메일: (관리자 이메일)
