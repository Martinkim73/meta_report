# 롤백 가이드 (Rollback Guide)

## 📌 현재 버전
- **Web Success Version**: 2026.02.07 20:00
- **Git Branch**: `version-web-success`
- **Commit**: `1c6065c` (Fix: apply same image_label fix to ad update API)

## 🛡️ 안전하게 작동하는 웹 캠페인 백업

### Git 브랜치로 복구
```bash
# 현재 main 브랜치에 문제 발생 시
git checkout version-web-success

# 또는 main에 강제 덮어쓰기
git checkout main
git reset --hard version-web-success
git push origin main --force
```

### 파일 단위 복구
```bash
# 업로드 API만 복구
cp backups/upload-route-v1-web-success.ts app/api/upload/route.ts

# 소재 교체 API만 복구
cp backups/ads-update-route-v1-web-success.ts app/api/ads/update/route.ts

# 복구 후 빌드 확인
npm run build
```

## ✅ 검증된 기능 (Web Campaign Only)
- [x] 이미지 4개 (1:1, 4:5, 9:16, 9:16 Reels) 개별 업로드
- [x] asset_customization_rules 7개 규칙 (고유 image_label)
- [x] body_label, link_url_label, title_label 모두 포함
- [x] age_max/age_min 포함
- [x] right_hand_column/search 규칙 포함
- [x] Instagram: ai_codingvalley (17841459147478114)
- [x] 정답 광고(120243214299330154) 구조 100% 일치

## ⚠️ 미구현 기능
- [ ] Omnichannel (web&app) 캠페인
- [ ] url_tags 자동 적용
- [ ] 음악(music_spec) 자동 적용
- [ ] 청크 업로드 (80MB+ 대용량 파일)

## 📝 복구가 필요한 상황
1. 새로운 기능 추가 후 Meta API 에러 발생
2. "게재 불가" 에러 재발생
3. 빌드 실패 또는 런타임 에러

이럴 때는 위 명령어로 즉시 `version-web-success`로 롤백!
