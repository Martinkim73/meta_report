# -*- coding: utf-8 -*-
"""
메타 광고 성과 분석 및 디스코드 리포팅 에이전트

⚠️ LEGACY: 이 파일은 더 이상 사용되지 않습니다.
    대신 app.py (Streamlit UI)를 사용하세요.
"""

import sys
import io
import os

# Windows 콘솔 UTF-8 인코딩 설정
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from facebook_business.api import FacebookAdsApi
from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.campaign import Campaign
from facebook_business.adobjects.adset import AdSet
from facebook_business.adobjects.ad import Ad
from facebook_business.adobjects.adcreative import AdCreative
import pandas as pd
from datetime import datetime, timedelta

# 메타 API 초기화 (환경변수 사용)
ACCESS_TOKEN = os.getenv('META_ACCESS_TOKEN', 'YOUR_ACCESS_TOKEN_HERE')
AD_ACCOUNT_ID = os.getenv('META_AD_ACCOUNT_ID', 'act_XXXXXXXXXX')

# API 초기화
if ACCESS_TOKEN == 'YOUR_ACCESS_TOKEN_HERE':
    print("⚠️  환경변수 META_ACCESS_TOKEN을 설정하세요")
    print("    또는 app.py (Streamlit UI)를 사용하세요")
    sys.exit(1)

FacebookAdsApi.init(access_token=ACCESS_TOKEN)

# 타겟 캠페인
TARGET_CAMPAIGNS = ['fbig_web&app_purchase_250613', 'fbig_web_purchase_240910']

def get_creative_url(ad_creative_id):
    """광고 크리에이티브에서 이미지 또는 비디오 썸네일 URL 가져오기"""
    try:
        creative = AdCreative(ad_creative_id)
        creative_data = creative.api_get(fields=[
            'thumbnail_url',
            'image_url',
            'object_story_spec',
            'effective_object_story_id'
        ])

        # 썸네일 URL (비디오)
        if 'thumbnail_url' in creative_data and creative_data['thumbnail_url']:
            return creative_data['thumbnail_url']

        # 이미지 URL
        if 'image_url' in creative_data and creative_data['image_url']:
            return creative_data['image_url']

        # object_story_spec에서 URL 추출
        if 'object_story_spec' in creative_data:
            spec = creative_data['object_story_spec']
            if 'video_data' in spec and 'image_url' in spec['video_data']:
                return spec['video_data']['image_url']
            if 'link_data' in spec and 'picture' in spec['link_data']:
                return spec['link_data']['picture']

        return None
    except Exception as e:
        return None

def format_money(amount):
    """금액을 만원 단위로 포맷팅"""
    if amount >= 10000:
        return f"{amount/10000:.1f}만원"
    else:
        return f"{int(amount)}원"

def analyze_meta_ads():
    """메타 광고 데이터 분석"""
    print("🔍 메타 광고 데이터 수집 중...\n")

    account = AdAccount(AD_ACCOUNT_ID)

    # 날짜 범위 설정 (최근 7일)
    end_date = datetime.now()
    start_date = end_date - timedelta(days=7)
    date_range = {
        'since': start_date.strftime('%Y-%m-%d'),
        'until': end_date.strftime('%Y-%m-%d')
    }

    # 분석 기간 포맷 (예: 최근 D7 26.01.25 ~ 02.01)
    analysis_period = f"최근 D7 {start_date.strftime('%y.%m.%d')} ~ {end_date.strftime('%m.%d')}"

    # 모든 광고 데이터 수집
    all_ads_data = []

    try:
        # 활성 캠페인만 조회
        print(f"📅 {analysis_period}\n")
        print("🔍 활성 타겟 캠페인 검색 중...\n")

        campaigns = account.get_campaigns(fields=['name', 'id', 'status', 'effective_status'])
        target_campaigns = []

        for campaign in campaigns:
            if campaign['name'] in TARGET_CAMPAIGNS and campaign.get('effective_status') == 'ACTIVE':
                target_campaigns.append(campaign)
                print(f"✅ 활성 캠페인: {campaign['name']} (ID: {campaign['id']})")

        if not target_campaigns:
            print(f"⚠️ 활성화된 타겟 캠페인을 찾을 수 없습니다.")
            return

        print(f"\n📊 {len(target_campaigns)}개 활성 캠페인의 광고세트 확인 중...\n")

        # 각 캠페인별로 활성 광고세트 조회
        active_adsets = []
        for campaign in target_campaigns:
            campaign_obj = Campaign(campaign['id'])
            adsets = campaign_obj.get_ad_sets(fields=['name', 'id', 'status', 'effective_status'])

            for adset in adsets:
                if adset.get('effective_status') == 'ACTIVE':
                    active_adsets.append({
                        'campaign_name': campaign['name'],
                        'adset_id': adset['id'],
                        'adset_name': adset['name']
                    })
                    print(f"  └─ 광고세트: {adset['name']}")

        print(f"\n✅ 총 {len(active_adsets)}개 활성 광고세트 발견\n")

        if len(active_adsets) == 0:
            print("⚠️ 활성화된 광고세트가 없습니다.")
            return

        print("📊 광고 데이터 수집 중...\n")

        # 각 광고세트별로 광고 및 인사이트 조회
        for adset_info in active_adsets:
            adset_obj = AdSet(adset_info['adset_id'])

            # 광고 조회
            ads = adset_obj.get_ads(fields=['id', 'name', 'status', 'effective_status', 'creative'])

            for ad in ads:
                # 활성 광고만 처리
                if ad.get('effective_status') != 'ACTIVE':
                    continue

                # 인사이트 조회
                insights = Ad(ad['id']).get_insights(
                    fields=[
                        'spend',
                        'actions',
                        'action_values'
                    ],
                    params={
                        'time_range': date_range,
                        'level': 'ad'
                    }
                )

                # 데이터 합산
                total_spend = 0
                total_purchases = 0
                total_registrations = 0
                total_revenue = 0

                for insight in insights:
                    spend = float(insight.get('spend', 0))
                    total_spend += spend

                    # 구매 건수 및 등록완료 건수
                    if 'actions' in insight:
                        for action in insight['actions']:
                            if action['action_type'] == 'offsite_conversion.fb_pixel_purchase':
                                total_purchases += int(action['value'])
                            elif action['action_type'] == 'offsite_conversion.fb_pixel_complete_registration':
                                total_registrations += int(action['value'])

                    # 매출액
                    if 'action_values' in insight:
                        for action_value in insight['action_values']:
                            if action_value['action_type'] == 'offsite_conversion.fb_pixel_purchase':
                                total_revenue += float(action_value['value'])

                # 지출이 없으면 스킵
                if total_spend == 0:
                    continue

                # 크리에이티브 URL 가져오기
                creative_url = None
                if 'creative' in ad and 'id' in ad['creative']:
                    creative_url = get_creative_url(ad['creative']['id'])

                # 소재 분류 (DA=이미지, VA=영상)
                adset_name = adset_info['adset_name']
                material_type = "DA" if 'DA' in adset_name else "VA" if 'VA' in adset_name else "기타"

                all_ads_data.append({
                    'campaign_name': adset_info['campaign_name'],
                    'adset_name': adset_name,
                    'ad_name': ad['name'],
                    'material_type': material_type,
                    'spend': total_spend,
                    'purchases': total_purchases,
                    'registrations': total_registrations,
                    'revenue': total_revenue,
                    'creative_url': creative_url
                })

        if not all_ads_data:
            print("⚠️ 수집된 광고 데이터가 없습니다.")
            return

        # 데이터프레임 생성
        df = pd.DataFrame(all_ads_data)

        print(f"✅ 총 {len(df)}개의 활성 광고 데이터 수집 완료\n")

        # 동일 광고명 합산
        df_grouped = df.groupby(['ad_name', 'material_type']).agg({
            'spend': 'sum',
            'purchases': 'sum',
            'registrations': 'sum',
            'revenue': 'sum',
            'creative_url': 'first'
        }).reset_index()

        # 가중 평균 계산
        df_grouped['roas'] = df_grouped.apply(
            lambda x: (x['revenue'] / x['spend'] * 100) if x['spend'] > 0 else 0,
            axis=1
        ).round(0)

        df_grouped['cpa_purchase'] = df_grouped.apply(
            lambda x: (x['spend'] / x['purchases']) if x['purchases'] > 0 else 0,
            axis=1
        ).round(0)

        df_grouped['cpa_registration'] = df_grouped.apply(
            lambda x: (x['spend'] / x['registrations']) if x['registrations'] > 0 else 0,
            axis=1
        ).round(0)

        # ROAS 85% 미만 필터링
        low_performance = df_grouped[df_grouped['roas'] < 85].copy()
        low_performance = low_performance.sort_values('spend', ascending=False)

        # 디스코드 보고서 출력
        print("\n" + "="*80)
        print("🚀 **AI코딩밸리 주간 소재 성과 분석 리포트**")
        print("="*80)
        print(f"\n분석기간: {analysis_period}\n")
        print("="*80 + "\n")

        # DA 소재 (이미지)
        da_low = low_performance[low_performance['material_type'] == 'DA']
        print("**1. DA (이미지 소재)**\n")

        if not da_low.empty:
            for idx, row in enumerate(da_low.iterrows(), 1):
                _, r = row
                print(f"{idx}) {r['ad_name']}")

                # 지출 및 구매 정보
                if r['purchases'] > 0:
                    print(f"- {format_money(r['spend'])} 지출 / 구매 {int(r['purchases'])}건 발생 / ROAS: {int(r['roas'])}%")
                else:
                    print(f"- {format_money(r['spend'])} 지출 / 구매 미발생")

                # 회원가입 CPA (구매가 없고 회원가입만 있는 경우)
                if r['purchases'] == 0 and r['registrations'] > 0:
                    print(f"- 회원가입 CPA: {format_money(r['cpa_registration'])}")

                # 이미지 URL
                if r['creative_url']:
                    print(f"- 소재 이미지: {r['creative_url']}")

                print()
        else:
            print("(저효율 소재 없음)\n")

        # VA 소재 (영상)
        va_low = low_performance[low_performance['material_type'] == 'VA']
        print("**2. VA (영상 소재)**\n")

        if not va_low.empty:
            for idx, row in enumerate(va_low.iterrows(), 1):
                _, r = row
                print(f"{idx}) {r['ad_name']}")

                # 지출 및 구매 정보
                if r['purchases'] > 0:
                    print(f"- {format_money(r['spend'])} 지출 / 구매 {int(r['purchases'])}건 발생 / ROAS: {int(r['roas'])}%")
                else:
                    print(f"- {format_money(r['spend'])} 지출 / 구매 미발생")

                # 회원가입 CPA
                if r['registrations'] > 0:
                    print(f"- 회원가입 CPA: {format_money(r['cpa_registration'])}")

                # 비디오 썸네일 URL
                if r['creative_url']:
                    print(f"- 소재 첫 프레임: {r['creative_url']}")

                print()
        else:
            print("(저효율 소재 없음)\n")

        # 종합 분석 의견
        print("="*80)
        print("\n💡 **종합 분석 의견:**\n")

        total_low = len(low_performance)
        total_spend = df_grouped['spend'].sum()
        total_revenue = df_grouped['revenue'].sum()
        overall_roas = (total_revenue / total_spend * 100) if total_spend > 0 else 0

        if total_low > 0:
            low_spend = low_performance['spend'].sum()
            print(f"총 {total_low}개의 저효율 소재(ROAS 85% 미만)가 발견되었으며, {format_money(low_spend)}의 예산이 소진되었습니다.")
            print(f"이들 소재를 즉시 종료하고 고효율 소재로 예산을 재배치하여 전체 ROAS({int(overall_roas)}%)를 개선하는 것을 권장합니다.")
        else:
            print(f"모든 소재가 ROAS 85% 이상을 달성하고 있습니다. (전체 ROAS: {int(overall_roas)}%)")
            print(f"현재 전략을 유지하면서 고효율 소재의 예산을 점진적으로 증액하는 것을 추천합니다.")

        print("\n" + "="*80)

        # 전체 소재 리스트 (디버깅용)
        print("\n[참고] 전체 소재 리스트 (지출액 순)\n")
        df_sorted = df_grouped.sort_values('spend', ascending=False)
        for idx, row in df_sorted.iterrows():
            status = "🔴 저효율" if row['roas'] < 85 else "🟢 정상"
            print(f"{status} [{row['material_type']}] {row['ad_name']}")
            print(f"   지출: {format_money(row['spend'])} | 구매: {int(row['purchases'])}건 | ROAS: {int(row['roas'])}% | 회원가입: {int(row['registrations'])}건\n")

    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    analyze_meta_ads()
