# Project: Meta 광고 성과 분석

## Git 저장소
- Remote: https://github.com/Martinkim73/meta_report.git
- Branch: main
- 작업 완료 후 항상 commit + push origin main 수행할 것

## 🛡️ 롤백 시스템 (Rollback)
- **안전 백업 브랜치**: `version-web-success` (웹 캠페인 완벽 작동 버전)
- **복구 가이드**: `backups/ROLLBACK_GUIDE.md` 참조
- **문제 발생 시**: `git checkout version-web-success` 즉시 복구

## 빠른 시작 (새 환경에서)
```bash
# 1. 프로젝트 클론 (OneDrive 바깥 경로 권장)
git clone https://github.com/Martinkim73/meta_report.git
cd meta_report

# 2. 의존성 설치
npm install

# 3. clients.json 설정 (광고주 정보 - gitignore됨)
# 아래 "clients.json 설정" 섹션 참고

# 4. 개발 서버 시작
npm run dev
```

## 자동 저장 규칙
- **토큰 사용량 90% 도달 시**: 자동으로 git commit + push 수행
- 현재 작업 상태를 CLAUDE.md "현재 상태" 섹션에 업데이트
- 진행 중인 작업, 다음 단계, 주요 결정사항 기록

## 기술 스택
- **Frontend**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS (토스 스타일)
- **Language**: TypeScript
- **Deployment**: Vercel

## 프로젝트 구조
```
meta_report/
├── app/
│   ├── page.tsx              # 홈 (분석 실행)
│   ├── clients/page.tsx      # 광고주 관리
│   ├── results/page.tsx      # 분석 결과
│   ├── layout.tsx            # 레이아웃 + 사이드바
│   └── globals.css           # 글로벌 스타일
├── components/
│   └── Sidebar.tsx           # 사이드바 컴포넌트
├── lib/
│   ├── meta-api.ts           # Meta API 호출 (TODO)
│   └── discord.ts            # Discord 전송 (TODO)
├── app/api/
│   ├── analyze/route.ts      # 분석 API (TODO)
│   └── discord/route.ts      # Discord 전송 API (TODO)
└── clients.json              # 광고주 정보 (gitignore)
```

## 로컬 실행
```bash
# 의존성 설치
npm install

# 개발 서버 시작
npm run dev
# http://localhost:3000

# 빌드
npm run build

# 프로덕션 실행
npm start
```

## Vercel 배포

### 프로덕션 URL
- **배포 완료**: https://meta-report-nine.vercel.app/
- **GitHub 연동**: 완료 (main 브랜치 자동 배포)
- Git push 시 자동으로 Vercel에 배포됨

### 환경 변수 (Vercel Dashboard 설정 완료)
```env
# Upstash Redis KV (필수)
KV_REST_API_URL=https://your-redis.upstash.io
KV_REST_API_TOKEN=your_redis_token_here

# TODO: 추가 예정
# Discord
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

⚠️ **보안 주의사항:**
- **절대 실제 토큰을 Git에 커밋하지 마세요!**
- 로컬: `.env` 파일에 저장 (gitignore됨)
- Vercel: Dashboard에서 환경변수 설정
- 토큰 유출 시 즉시 재발급 필요

### Vercel CLI (선택사항)
```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel

# 프로덕션 배포
vercel --prod
```

## Meta 광고 지면별 이미지 비율 규칙 (필수)

### 영역별 기본 비율
| 영역 | 기본 비율 | 포함 지면 |
|------|----------|-----------|
| **피드, 릴스 인스트림** | 1:1 기본, **4:5 사용** | Facebook 피드, Instagram 피드 |
| **스토리, 상태, 릴스, 검색 결과** | 9:16 기본 | Facebook/Instagram 스토리, 릴스 등 |
| **오른쪽 칼럼, 검색 결과** | 1:1 원본 | Facebook 오른쪽 칼럼, 검색 |

### 이미지 4슬롯 → 지면 매핑 (asset_customization_rules)

| 슬롯 | 비율 | 적용 지면 (Meta API positions) |
|------|------|--------------------------------|
| **4:5** | 4:5 | `facebook: feed`, `instagram: stream` (Instagram 피드) |
| **9:16** | 9:16 | `facebook: story`, `instagram: story, ig_search, profile_reels`, `messenger: story`, `audience_network: classic` |
| **9:16 Reels** | 9:16 | `instagram: reels`, `facebook: facebook_reels` |
| **1:1** | 1:1 | `facebook: right_hand_column, search` + **기본값(fallback)** |

### 우선순위 (priority) - 웹구매 광고세트 기준
```
priority 1: 9:16      → facebook story + instagram story/ig_search/profile_reels + messenger story + audience_network classic
priority 2: 1:1       → facebook right_hand_column, search
priority 3: 4:5       → facebook feed
priority 4: 4:5       → instagram stream (= Instagram 피드)
priority 5: 9:16 Reels → instagram reels
priority 6: 9:16 Reels → facebook_reels
priority 7: 1:1       → 기본값 (나머지 모든 지면)
```

### 핵심 규칙 (반드시 기억)
- **Facebook 피드 = `feed`, Instagram 피드 = `stream`** → 둘 다 **4:5** 사용
- **Facebook 릴스 = `facebook_reels`, Instagram 릴스 = `reels`** → 둘 다 **9:16 Reels** 사용
- **오른쪽 칼럼, 검색 결과** → **1:1 원본** 사용
- **나머지 지면** → **1:1이 기본값**으로 적용

### 참고 광고 ID
**omnichannel (web&app 캠페인):**
- 120243171098540154, 120243171098520154, 120242865102020154

**웹구매 광고세트 (omni 아님):**
- 120242623999320154, 120242864324850154, 120242623999310154

---

## clients.json 설정
프로젝트 루트에 `clients.json` 파일 생성 (gitignore됨):
```json
{
  "광고주이름": {
    "access_token": "Meta API 액세스 토큰",
    "ad_account_id": "act_계정ID",
    "target_campaigns": ["캠페인명1", "캠페인명2"],
    "page_id": "페이스북 페이지 ID",
    "instagram_actor_id": "인스타그램 계정 ID (선택)",
    "landing_url": "랜딩 페이지 URL",
    "discord_webhook": "디스코드 웹훅 URL"
  }
}
```

## 현재 상태 (2026.02.07 최종)

### 🎯 4단계 추가 개발 진행 상황

#### ✅ Stage 1: 롤백 시스템 (완료)
- `version-web-success` 브랜치 생성 (안전 백업)
- `backups/` 폴더에 파일 백업
- `ROLLBACK_GUIDE.md` 롤백 가이드 작성

#### ✅ Stage 2: URL 매개변수 자동화 (완료)
- `urlTags` 필드 추가 (기본값: `utm_source=meta&utm_medium=cpc&utm_campaign={{campaign.name}}&utm_content={{adset.name}}__{{ad.name}}`)
- UI 입력창 추가 + API 적용 완료
- 테스트 완료: 광고 ID `120243254042170154`

#### ✅ Stage 3: 옴니채널 (Web+App) 지원 (완료 - 2026.02.07)
- **해결한 에러**:
  - ✅ #2446461: `omnichannel_link_spec`을 `asset_feed_spec.link_urls[0]` 내부로 이동
  - ✅ #1359187: `object_store_urls`를 `link_urls[0]` 내부에 추가
- **최종 구조** (PAC 옴니채널):
  ```typescript
  asset_feed_spec: {
    link_urls: [{
      website_url: websiteUrl,
      display_url: displayUrl,
      adlabels: allLinkLabels,
      omnichannel_link_spec: {
        web: { url: websiteUrl },
        app: {
          application_id: CODINGVALLEY_APP_ID,
          platform_specs: { android: {...}, ios: {...} }
        }
      },
      object_store_urls: [
        "http://itunes.apple.com/app/id6448019090",
        "http://play.google.com/store/apps/details?id=inc.ulift.cv"
      ]
    }]
  }
  ```
- **테스트 성공** (Meta 광고 관리자 에러 0개 확인):
  - 옴니채널: `120243256487380154`, `120243256497780154`
  - 웹: `120243256490520154`, `120243256503310154`
- **핵심**: PAC 광고에서는 모든 링크 정보(`omnichannel_link_spec` + `object_store_urls`)를 `link_urls` 한 곳에 통합

#### 🚧 Stage 4: Music 자동화 (예정)
- 릴스/스토리 광고의 Music ID 자동 선택 기능
- Music ID 프리셋 관리

---

### 🎯 이전 완료 사항 (2026.02.06)
1. **DA Creative instagram_user_id 수정** ✅
   - `instagram_actor_id` → `instagram_user_id` (asset_feed_spec 사용 시)
   - `/api/upload/route.ts`, `/api/ads/update/route.ts` 모두 적용
   - Meta API 에러 "(#100) Param instagram_actor_id must be a valid Instagram account id" 완전 해결

2. **asset_customization_rules 완전 수정** ✅
   - 모든 규칙에 `age_max: 65, age_min: 13` 추가 (Meta 필수 필드)
   - 7개 규칙으로 증가 (기존 6개 → 7개)
   - Priority 2 추가: 1:1 → right_hand_column, search
   - 실제 작동하는 광고(ID: 120240900675440154) 구조 100% 복사
   - **결과**: "Facebook 피드/Instagram 릴스 이미지 요구사항 불충족" 에러 해결

3. **토큰 관리 시스템 구축** ✅
   - `update_token.cjs`: temp_token.txt → Redis 업데이트
   - `sync_env_to_redis.cjs`: .env → Redis 자동 동기화
   - `.env.example`: 토큰 백업/마이그레이션 가이드
   - 60일마다 토큰 갱신 시스템

### ✅ 완료된 작업
- **Streamlit → Next.js 마이그레이션 완료**
- Next.js 15 + TypeScript + Tailwind CSS 설정
- 토스 스타일 UI 구현
- 모든 페이지 구현 (홈, 광고주 관리, 분석 결과, 업로드, 소재 교체)
- **광고 소재 업로드 기능 완료** (app/api/upload/route.ts)
  - 이미지 업로드 → 크리에이티브 생성 → 광고 생성
  - DA(이미지) / VA(영상) 지원
  - APP 광고세트 지원 (web&app 캠페인)
  - 캠페인/광고세트 선택 기능
  - Music ID Meta API 전달 (릴스/스토리용)
  - 공통 설정 편집 가능 (연결링크, 표시링크, 설명, 기본타이틀)
- **소재 교체 기능 완료** (app/edit/page.tsx + app/api/ads/update/route.ts)
  - 기존 Meta 광고의 이미지를 새 이미지로 교체
  - DA 4슬롯 (4x5, 9x16, 1x1, reels) 드래그&드롭 업로드
  - 두 단계 제출: Phase1 이미지 업로드 → Phase2 크리에이티브 생성+광고 업데이트
  - 기존 텍스트 유지 + 선택적 수정 지원
  - **테스트 완료**: branding_benefit_focus_v3_260129_img_test0205 × 2개 광고에 test2 이미지 교체 성공
- **AI코딩밸리 전용 설정**
  - Instagram: ai_codingvalley (ID: 17841459147478114) 자동 설정
  - 앱 ID: 1095821498597595 (코딩밸리 모바일앱)
  - Landing: codingvalley.com/ldm/7
  - UTM: source=meta, medium=cpc
- **runtime = "nodejs" 모든 API 라우트에 적용** (Upstash Redis edge runtime 호환성 수정)
- **FormData 기반 업로드 완료** (2026.02.06)
  - Base64 인코딩 제거 → 파일 크기 33% 절감
  - 브라우저 → 서버: FormData 사용
  - 서버 → Meta API: 이미지(Base64), 비디오(FormData)
  - 최대 파일 크기: 3.4MB → **4.5MB**
  - 두 페이지 모두 적용: `/edit` (소재 교체), `/upload` (소재 등록)
- **에러 핸들링 완전 개선** (2026.02.06)
  - `lib/api-helpers.ts`: `safeJsonParse` 헬퍼 함수
  - "Request Entity Too Large" 등 Vercel 오류 정확히 감지
  - 한글 오류 메시지 제공
  - 모든 Meta API 호출 적용 (upload-image, upload, ads/update)
- **Placement Rules 수정** (2026.02.06)
  - VA 규칙: 5개 → 4개 (right_hand_column, search 제거)
  - DA 규칙: 7개 → 6개 (right_hand_column, search 제거)
  - 기본값 규칙이 자동 처리
  - "광고 게재 불가" 오류 완전 해결

### 🖥️ 로컬 개발 환경
- 서버: `npm run dev` → http://localhost:3000
- 프로젝트 권장 위치: `C:\Projects\meta_report` (OneDrive 바깥)
- ⚠️ OneDrive 폴더에서 실행 시 .next 캐시 동기화 문제 발생 가능

### 🚧 구현 예정 (우선순위)
1. **청크 업로드 (Resumable Upload)** - 80MB+ 대용량 파일 지원
   - Meta Resumable Video API 3단계 (start → transfer → finish)
   - 4MB 청크로 분할 전송
   - 비디오 상태 폴링 (processing → ready)
   - 상세 프로그레스 바 ("조각 5/20 업로드 중 25%")
   - 최대 파일 크기: 4.5MB → **10GB**

2. **분석 엔진** (app/api/analyze/route.ts)
   - 저효율 광고 탐지 로직
   - DA/VA 소재 분류
   - 예산 규칙 점검

3. **Discord 연동** (lib/discord.ts)
   - 웹훅 전송 기능
   - 리포트 포맷팅

4. **AI 광고 문구 자동 생성**
   - LLM 기반 카피라이팅
   - A/B 테스트용 변형 생성

### 📝 변경 이력

**2026.02.06 저녁 - DA/옴니채널 에러 완전 해결** ✅
- **instagram_user_id 수정** (c3bc545, 86c72e5)
  - DA asset_feed_spec: `instagram_actor_id` → `instagram_user_id`
  - `/api/upload`, `/api/ads/update` 모두 적용
  - Meta API 호환성 완전 해결

- **asset_customization_rules 완전 수정**
  - 모든 규칙에 `age_max: 65, age_min: 13` 추가
  - 7개 규칙 완성 (Priority 1~7)
  - Facebook 피드, Instagram 릴스 이미지 매칭 정확도 100%
  - 참조: 광고 ID 120240900675440154 (작동하는 광고)

- **옴니채널 Creative 수정**
  - `degrees_of_freedom_spec` 추가 (standard_enhancements: OPT_IN)
  - `omnichannel_link_spec` 삭제 (불필요)
  - 에러 #1359187 "개체 스토어 URL 누락" 해결
  - 참조: Adset ID 120241978972260154, Creative ID 1964033344324630

- **토큰 관리 시스템**
  - `update_token.cjs`, `sync_env_to_redis.cjs` 추가
  - .env 백업 + Redis 동기화 자동화
  - 60일 갱신 주기 안내

**2026.02.06 낮 - FormData 적용 및 에러 해결 (CRITICAL FIX)**
- **Placement Rules 수정 완료** ✅
  - VA/DA 크리에이티브에서 `right_hand_column`, `search` 명시적 지정 제거
  - 기본값 규칙이 자동으로 처리하도록 변경 (Priority 4/6)
  - 정상 작동하는 광고 구조 분석 후 적용 (branding_gaiyoonreview_v2_260107_vid)
  - **결과**: "Facebook 피드/오른쪽 칼럼/검색 게재 불가" 오류 완전 해결

- **Base64 → FormData 전환 완료** ✅
  - **문제**: Base64 인코딩으로 파일 크기 33% 증가 → Vercel 4.5MB 제한 초과
  - **해결**: 브라우저 → 서버 구간을 FormData로 전송 (원본 크기 유지)
  - `/edit` 페이지: FormData + 순차 업로드 + 실시간 프로그레스 바
  - `/upload` 페이지: FormData + 병렬 업로드
  - **효과**: 3.4MB → 4.5MB까지 업로드 가능 (31% 증가)

- **에러 핸들링 완전 개선** ✅
  - `lib/api-helpers.ts` 생성 - `safeJsonParse` 헬퍼 함수
  - 모든 Meta API 호출에 적용 (6곳)
  - HTTP 상태, Content-Type, JSON 파싱 오류 처리
  - 명확한 한글 오류 메시지 ("파일 크기가 너무 큽니다. 최대 4.5MB")
  - **결과**: "Unexpected token 'R', Request Entity Too Large" 오류 해결

- **프로그레스 바 및 UX 개선** ✅
  - `/edit` 페이지: "1번 소재: 영상 업로드 중... (2/3) - 9:16 스토리"
  - 순차 업로드로 안정성 확보
  - 각 청크별 개별 API 호출 (Vercel 10초 타임아웃 회피)

- **설정 파일 추가** ✅
  - `next.config.mjs`: 로컬 개발 환경용 50MB body size limit
  - Vercel 배포: 4.5MB 제한 유지 (무료 플랜)
  - 향후 청크 업로드 구현 시 80MB+ 파일 지원 예정

- **Vercel 배포 정보 업데이트** ✅
  - 프로덕션 URL: https://meta-report-nine.vercel.app/
  - GitHub 자동 배포 완료
  - 환경변수: KV_REST_API_URL, KV_REST_API_TOKEN

**2026.02.05 (후반)**
- runtime = "nodejs" 모든 API 라우트 적용 (ads, adsets, campaigns, clients)
- 소재 교체 시스템 구현 완료 (소재 교체 페이지 + /api/ads/update)
- 테스트: branding_benefit_focus_v3_260129_img_test0205 × 2개 광고 이미지 교체 성공
  - 대상: broad_purchase_n_DA_251212, interest_businessai_n_DA_251212
  - test2 이미지 4개 (4x5, 9x16, 1x1, reels) → Meta Graph API 확인

**2026.02.05 (초반)**
- APP 광고세트 지원 (web&app 캠페인의 broad_purchase 등)
- AI코딩밸리 Instagram 자동 설정 (ai_codingvalley)
- Music ID Meta API 전달 (degrees_of_freedom_spec)
- UI 공통 설정 패널 실제 값과 일치하도록 수정

**2026.02.04**
- 광고 업로드 API 완성 (이미지/영상 → 크리에이티브 → 광고)
- Omnichannel adset 지원 추가
- 프로젝트 OneDrive → C:\Projects로 이동 (동기화 문제 해결)

**2026.02.03 - Streamlit → Next.js**
- Streamlit Cloud → Vercel로 마이그레이션
- Python → TypeScript 전환

### 다음 작업
- [ ] 청크 업로드 구현 (80MB+ 대용량 파일)
- [ ] 분석 엔진 구현
- [ ] Discord 연동
- [ ] AI 광고 문구 자동 생성

### 🔧 기술 부채 및 알려진 제약사항
- **Vercel 4.5MB 제한**: 현재 무료 플랜 사용 중
  - 해결책 1: Vercel Pro 업그레이드 ($20/월, 100MB)
  - 해결책 2: 청크 업로드 구현 (무료, 10GB)
  - 해결책 3: Cloudflare Workers 프록시 (무료, 100MB)
- **CORS 제한**: 브라우저 → Meta API 직접 호출 불가
  - 현재: Vercel 서버를 프록시로 사용
  - Meta API는 서버 간 통신만 허용
- **보안**: Access Token을 서버 환경변수에 저장 (Redis 권장)
  - localStorage 사용 시 XSS 공격 위험
- **Omnichannel (web+app) 광고 지원 완료** ✅ (2026.02.07)
  - `asset_feed_spec.link_urls`에 `object_store_urls` 추가로 해결
  - iOS/Android 딥링크 자동 설정 (CODINGVALLEY_IOS_ID, CODINGVALLEY_ANDROID_PACKAGE)
  - `omnichannel_link_spec` + `applink_treatment: "automatic"` 적용
  - `degrees_of_freedom_spec` 제거 (PAC 구조와 비호환)
  - **테스트 완료**: 옴니채널 광고 `120243254657080154`, 웹 광고 `120243254726130154`
