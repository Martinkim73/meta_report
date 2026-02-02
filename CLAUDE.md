# Project: Meta 광고 성과 분석

## Git 저장소
- Remote: https://github.com/Martinkim73/meta_report.git
- Branch: main
- 작업 완료 후 항상 commit + push origin main 수행할 것

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

## 현재 상태 (2026.02.03)

### ✅ 완료된 작업
- **Streamlit → Next.js 마이그레이션 완료**
- Next.js 15 + TypeScript + Tailwind CSS 설정
- 토스 스타일 UI 구현
- 모든 페이지 구현 (홈, 광고주 관리, 분석 결과)
- 사이드바 메뉴 + 상세 설명
- 모든 입력 필드에 설명 추가
- 용어 설명 (ROAS, CPA, DA/VA)
- **GitHub 저장 완료** (commit: 96be941)

### 🖥️ 로컬 개발 환경
- 서버 실행 중: http://localhost:3001
- 프로젝트 위치: C:\Users\PC\OneDrive\Desktop\meta_report

### 🚧 구현 예정 (우선순위)
1. **Meta API 연동** (lib/meta-api.ts)
   - Facebook Business SDK 설치
   - 광고 데이터 조회 로직 포팅
   - Python → TypeScript 변환

2. **분석 엔진** (app/api/analyze/route.ts)
   - 저효율 광고 탐지 로직
   - DA/VA 소재 분류
   - 예산 규칙 점검

3. **Discord 연동** (lib/discord.ts)
   - 웹훅 전송 기능
   - 리포트 포맷팅

4. **데이터 저장**
   - 광고주 정보 저장 (로컬스토리지 또는 DB)
   - 분석 결과 캐싱

5. **Vercel 배포**
   - 환경변수 설정
   - 자동 배포 설정

### 📝 마이그레이션 이력
**2026.02.03 - Streamlit → Next.js**
- **이유**: UI 수정이 어렵고, 설명 추가가 복잡함
- **변경사항**:
  - Streamlit Cloud → Vercel
  - Python → TypeScript
  - 코드와 컨텐츠 분리
  - 더 유연한 커스터마이징
- **기존 배포**: https://metareport-auhbmmwl5ryy4chf93n9ii.streamlit.app/ (종료 예정)
- **새 배포**: Vercel (배포 예정)

### 다음 작업
- [ ] Meta API 연동 (TypeScript)
- [ ] 분석 엔진 구현
- [ ] Discord 연동
- [ ] Vercel 배포
- [ ] 광고 소재 자동 업로드 기능
- [ ] AI 광고 문구 자동 생성
