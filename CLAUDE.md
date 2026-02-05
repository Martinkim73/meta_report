# Project: Meta 광고 성과 분석

## Git 저장소
- Remote: https://github.com/Martinkim73/meta_report.git
- Branch: main
- 작업 완료 후 항상 commit + push origin main 수행할 것

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
```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel

# 프로덕션 배포
vercel --prod
```

### 환경 변수 (Vercel Dashboard)
```env
# Meta API (TODO: 구현 시 추가)
META_ACCESS_TOKEN=your_token
META_AD_ACCOUNT_ID=act_xxxx

# Discord
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

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

## 현재 상태 (2026.02.05)

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

### 🖥️ 로컬 개발 환경
- 서버: `npm run dev` → http://localhost:3000
- 프로젝트 권장 위치: `C:\Projects\meta_report` (OneDrive 바깥)
- ⚠️ OneDrive 폴더에서 실행 시 .next 캐시 동기화 문제 발생 가능

### 🚧 구현 예정 (우선순위)
1. **분석 엔진** (app/api/analyze/route.ts)
   - 저효율 광고 탐지 로직
   - DA/VA 소재 분류
   - 예산 규칙 점검

2. **Discord 연동** (lib/discord.ts)
   - 웹훅 전송 기능
   - 리포트 포맷팅

3. **Vercel 배포**
   - 환경변수 설정
   - 자동 배포 설정

4. **Instagram actor ID 지원** (현재 비활성화)
   - Meta API 호환성 이슈 해결 필요

### 📝 변경 이력
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
- [ ] 분석 엔진 구현
- [ ] Discord 연동
- [ ] AI 광고 문구 자동 생성
