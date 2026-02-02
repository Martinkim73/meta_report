# Project: Meta 광고 성과 분석

## Git 저장소
- Remote: https://github.com/Martinkim73/meta_report.git
- Branch: main
- 작업 완료 후 항상 commit + push origin main 수행할 것

## 구조
- `app.py` - Streamlit 메인 앱 (토스 스타일 UI)
- `analysis_engine.py` - 메타 광고 분석 엔진 (파라미터화)
- `send_to_discord.py` - 디스코드 웹훅 전송 (파라미터화)
- `clients.json` - 광고주 프로필 저장소
- `meta_analysis_report.py` - 원본 CLI 스크립트 (레거시)

## 실행
```
streamlit run app.py
```
