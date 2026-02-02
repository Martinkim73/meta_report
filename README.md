# Meta 광고 성과 분석 (Next.js)

메타 광고 성과를 자동으로 분석하고 저효율 광고를 찾아드립니다.

## 기술 스택

- **Frontend**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS (토스 스타일)
- **Language**: TypeScript
- **Deployment**: Vercel

## 로컬 개발

```bash
# 개발 서버 시작
npm run dev

# 브라우저에서 열기
# http://localhost:3000
```

## 배포

```bash
# Vercel에 배포
vercel

# 또는 GitHub 연동 후 자동 배포
```

## 환경 변수

Vercel Dashboard에서 설정:

```env
# Meta API
META_ACCESS_TOKEN=your_token
META_AD_ACCOUNT_ID=act_xxxx

# Discord
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

## 주요 기능

- 🔍 저효율 광고 자동 탐지
- 📊 DA/VA 소재 분석
- 💰 예산 규칙 점검
- 📨 디스코드 리포트 자동 전송

## 라이선스

MIT
