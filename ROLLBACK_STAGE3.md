# Stage 3 성공 상태 롤백 가이드

## 백업 시점
- **날짜**: 2026.02.07
- **상태**: Stage 3 (옴니채널 PAC 광고) 완벽 구현 완료
- **검증**: Meta 광고 관리자 에러 0개 확인

## 검증된 광고 ID
- 옴니채널: 120243256487380154, 120243256497780154
- 웹: 120243256490520154, 120243256503310154

## 해결된 에러
- ✅ #2446461: omnichannel_link_spec 위치 오류
- ✅ #1359187: object_store_urls 누락

## 백업 파일
- **파일명**: `app/api/upload/route_v3_omni_success_stable.ts`
- **크기**: 28KB
- **Git 태그**: `stage3-omni-success`

## 롤백 방법

### 방법 1: 백업 파일로 복원
```bash
cp app/api/upload/route_v3_omni_success_stable.ts app/api/upload/route.ts
git add app/api/upload/route.ts
git commit -m "Rollback: Stage 3 안정 버전으로 복원"
git push origin main
```

### 방법 2: Git 태그로 복원
```bash
git checkout stage3-omni-success -- app/api/upload/route.ts
git add app/api/upload/route.ts
git commit -m "Rollback: Stage 3 안정 버전으로 복원 (Git tag)"
git push origin main
```

### 방법 3: Git 커밋으로 복원
```bash
git checkout 782b205 -- app/api/upload/route.ts
git add app/api/upload/route.ts
git commit -m "Rollback: Stage 3 안정 버전으로 복원 (커밋 해시)"
git push origin main
```

## 롤백이 필요한 상황
1. Stage 4 개발 중 옴니채널 광고 생성 실패
2. Meta API 에러 #2446461 또는 #1359187 재발
3. 기존 성공하던 옴니채널 광고가 "게재 불가" 상태로 변경
4. 예상치 못한 PAC 구조 관련 오류 발생

## 롤백 후 확인 사항
1. `omni_fix_test.cjs` 실행하여 광고 생성 성공 확인
2. Meta 광고 관리자에서 빨간 에러 딱지 없는지 확인
3. 옴니채널 광고세트(broad_purchase_n_DA_251212)에서 정상 작동 확인

## 현재 성공 구조 (참고용)
```typescript
// asset_feed_spec.link_urls[0]에 모든 링크 정보 통합
link_urls: [{
  website_url: websiteUrl,
  display_url: displayUrl,
  adlabels: allLinkLabels,
  omnichannel_link_spec: {
    web: { url: websiteUrl },
    app: {
      application_id: CODINGVALLEY_APP_ID,
      platform_specs: {
        android: { app_name: CODINGVALLEY_APP_NAME, package_name: CODINGVALLEY_ANDROID_PACKAGE },
        ios: { app_name: CODINGVALLEY_APP_NAME, app_store_id: CODINGVALLEY_IOS_ID }
      }
    }
  },
  object_store_urls: [
    `http://itunes.apple.com/app/id${CODINGVALLEY_IOS_ID}`,
    `http://play.google.com/store/apps/details?id=${CODINGVALLEY_ANDROID_PACKAGE}`
  ]
}]
```

## 중요 원칙
- **PAC 광고**: omnichannel_link_spec과 object_store_urls는 반드시 link_urls 내부에 함께 있어야 함
- **applink_treatment**: "automatic"은 creative 루트에 유지
- **degrees_of_freedom_spec**: PAC 구조와 비호환이므로 절대 추가하지 말 것
