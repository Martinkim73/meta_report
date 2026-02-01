# 메타 광고 성과 분석 및 디스코드 리포팅 에이전트

AI코딩밸리의 메타(페이스북) 광고 성과를 자동으로 분석하고 디스코드로 보고서를 전송하는 자동화 도구입니다.

## 주요 기능

- ✅ 메타 광고 API를 통한 실시간 데이터 수집
- ✅ 활성 캠페인 및 광고세트 자동 필터링
- ✅ 소재별 성과 지표 분석 (ROAS, CPA 등)
- ✅ 저효율 소재 자동 식별 (ROAS 85% 미만)
- ✅ 디스코드 웹훅을 통한 자동 보고서 전송
- ✅ 소재 이미지/비디오 썸네일 자동 추출

## 파일 구조

```
meta_report/
├── meta_analysis_report.py    # 메타 광고 분석 메인 스크립트
├── send_to_discord.py          # 디스코드 웹훅 전송 스크립트
└── README.md                   # 프로젝트 문서
```

## 설치 방법

```bash
pip install facebook-business pandas
```

## 사용 방법

### 1. 메타 광고 분석 실행

```bash
python meta_analysis_report.py
```

**분석 내용:**
- 최근 7일간의 광고 성과 데이터 수집
- 활성 캠페인 2개: `fbig_web&app_purchase_250613`, `fbig_web_purchase_240910`
- 활성 광고세트만 대상으로 필터링
- 소재 분류: DA(이미지), VA(영상)
- ROAS 85% 미만 소재 자동 식별

### 2. 디스코드 보고서 전송

```bash
python send_to_discord.py
```

**전송 내용:**
- 저효율 소재 목록 (DA/VA 분류)
- 소재별 상세 지표 (지출액, 구매건수, ROAS, CPA)
- 종합 분석 의견
- 고효율 소재 TOP 3
- 주요 소재 이미지/썸네일

## 설정

### 메타 API 설정 (meta_analysis_report.py)

```python
ACCESS_TOKEN = 'your_access_token'
AD_ACCOUNT_ID = 'act_your_account_id'
TARGET_CAMPAIGNS = ['campaign1', 'campaign2']
```

### 디스코드 웹훅 설정 (send_to_discord.py)

```python
WEBHOOK_URL = "https://discord.com/api/webhooks/your_webhook_url"
```

## 출력 예시

### 터미널 출력

```
🚀 **AI코딩밸리 주간 소재 성과 분석 리포트**

분석기간: 최근 D7 26.01.25 ~ 02.01

**1. DA (이미지 소재)**

1) branding_promotionend_v2_260129_img
- 10.8만원 지출 / 구매 미발생
- 회원가입 CPA: 5.4만원
- 소재 이미지: [URL]

...

💡 **종합 분석 의견:**
총 11개의 저효율 소재(ROAS 85% 미만)가 발견되었으며, 45.0만원의 예산이 소진되었습니다.
```

## 분석 지표

- **ROAS**: (총 매출 / 총 지출) × 100
- **구매 CPA**: 총 지출 / 총 구매 건수
- **회원가입 CPA**: 총 지출 / 총 등록완료 건수
- **저효율 기준**: ROAS 85% 미만

## 기술 스택

- Python 3.13
- facebook-business (Meta Marketing API)
- pandas (데이터 분석)
- requests (디스코드 웹훅)

## 작성자

Claude Sonnet 4.5 (AI 코딩 에이전트)

## 라이선스

MIT License
