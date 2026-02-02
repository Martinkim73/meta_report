# Project: Meta 광고 성과 분석

## Git 저장소
- Remote: https://github.com/Martinkim73/meta_report.git
- Branch: main
- 작업 완료 후 항상 commit + push origin main 수행할 것

## 구조
- `app.py` - Streamlit 메인 앱 (토스 스타일 UI)
- `analysis_engine.py` - 메타 광고 분석 엔진 (파라미터화)
- `send_to_discord.py` - 디스코드 웹훅 전송 (파라미터화)
- `clients.json` - 광고주 프로필 저장소 (로컬 개발용, gitignore)
- `clients.json.example` - 설정 구조 예시
- `.streamlit/secrets.toml.example` - Streamlit Cloud 배포용 설정 예시
- `meta_analysis_report.py` - 원본 CLI 스크립트 (레거시, 사용 안 함)

## 로컬 실행
```bash
# 1. clients.json.example을 복사해서 clients.json 생성
cp clients.json.example clients.json

# 2. clients.json에 실제 토큰 입력
# 3. 앱 실행
streamlit run app.py
```

## Streamlit Cloud 배포
```bash
# 1. https://share.streamlit.io 접속
# 2. GitHub 계정으로 로그인
# 3. New app → Repository: Martinkim73/meta_report
# 4. Branch: main, Main file: app.py
# 5. Advanced settings → Secrets에 아래 내용 입력:

[clients.AI코딩밸리]
access_token = "YOUR_META_ACCESS_TOKEN"
ad_account_id = "act_XXXXXXXXXX"
target_campaigns = ["캠페인1", "캠페인2"]
min_spend = 250000
low_roas_threshold = 85
discord_webhook = "https://discord.com/api/webhooks/..."
budget_rule_pct = 50

# 6. Deploy 클릭
```

## 현재 상태 (2026.02.03)
- ✅ Streamlit 웹 앱 완성 (토스 스타일 UI)
- ✅ 보안 강화: 민감정보 gitignore, st.secrets 지원
- ✅ 로컬 실행 가능
- ⏳ Streamlit Cloud 배포 준비 완료

### 보안 개선 (2026.02.03)
- `clients.json` → .gitignore 추가 (민감정보 보호)
- `st.secrets` 지원 추가 (Streamlit Cloud 배포용)
- `meta_analysis_report.py` → 하드코딩 토큰 제거, 환경변수 사용
- `clients.json.example` 추가 (설정 가이드)
- `.streamlit/secrets.toml.example` 추가 (배포 가이드)

### 다음 단계
- Streamlit Cloud에 배포
- 배포 URL 확인 및 테스트
