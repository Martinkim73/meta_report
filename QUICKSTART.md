# 🚀 회사 컴퓨터에서 바로 시작하기

## 1단계: 프로젝트 가져오기

```bash
# GitHub에서 프로젝트 클론
git clone https://github.com/Martinkim73/meta_report.git
cd meta_report
```

## 2단계: 필수 라이브러리 설치

```bash
pip install facebook-business pandas requests
```

## 3단계: 바로 실행

### 메타 광고 분석 실행
```bash
python meta_analysis_report.py
```

### 디스코드로 보고서 전송
```bash
python send_to_discord.py
```

## 설정 정보 (이미 코드에 포함됨)

✅ **메타 API 토큰**: 코드에 저장됨
✅ **광고 계정 ID**: act_149067477924600
✅ **타겟 캠페인**: fbig_web&app_purchase_250613, fbig_web_purchase_240910
✅ **디스코드 웹훅**: 코드에 저장됨

## 추가 설정이 필요한 경우

### 메타 API 토큰 변경
`meta_analysis_report.py` 파일의 20번째 줄:
```python
ACCESS_TOKEN = 'your_new_token'
```

### 디스코드 웹훅 URL 변경
`send_to_discord.py` 파일의 12번째 줄:
```python
WEBHOOK_URL = "your_new_webhook_url"
```

## 분석 결과

- **분석 기간**: 자동으로 최근 7일
- **저효율 기준**: ROAS 85% 미만
- **소재 분류**: DA(이미지), VA(영상)
- **출력 형식**: 디스코드 마크다운

## 문제 해결

### API Rate Limit 오류
→ 30초 대기 후 재시도 (스크립트에서 자동 처리됨)

### 인코딩 오류 (한글 깨짐)
→ 이미 해결됨 (UTF-8 인코딩 적용)

### 캠페인 데이터가 없음
→ 캠페인/광고세트가 ACTIVE 상태인지 확인

## Claude Code와 함께 사용하기

회사 컴퓨터에서 Claude Code를 실행하고:

```
프로젝트 열기: C:\path\to\meta_report
```

또는 터미널에서:
```bash
cd meta_report
# Claude Code가 자동으로 프로젝트 컨텍스트 인식
```

그 다음 Claude에게:
> "메타 광고 분석 실행해줘"
> "디스코드로 보고서 보내줘"
> "이번 주 저효율 소재 알려줘"

등의 명령을 내리면 됩니다.

## 자동화 설정 (선택사항)

매일 자동 실행을 원하는 경우 Windows 작업 스케줄러 설정:

1. 작업 스케줄러 열기
2. "기본 작업 만들기" 선택
3. 트리거: 매일 오전 9시
4. 작업: `python C:\path\to\meta_report\meta_analysis_report.py`
5. 완료

## 지원

문제가 생기면:
1. `.claude_context.json` 파일 확인
2. Claude Code에게 "이전 작업 내용 요약해줘" 요청
3. GitHub Issues: https://github.com/Martinkim73/meta_report/issues

---

**준비 완료!** 🎉
이제 회사 컴퓨터에서 `git clone`만 하면 바로 사용 가능합니다.
