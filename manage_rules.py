# -*- coding: utf-8 -*-
"""
Meta 광고 규칙 자동 관리

사용법: python manage_rules.py [--dry-run]

소재 추가/종료 후 실행하면:
1. 기존 ENABLED 규칙 삭제
2. 현재 활성 소재 기반으로 새 규칙 자동 생성
   - OFF: 광고세트별, 일일예산 50% 도달 시 OFF (30분마다 체크)
   - ON: DA/VA 통합, 매일 00시 ON
"""

import json
import sys
import time
from datetime import datetime

from facebook_business.api import FacebookAdsApi
from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.campaign import Campaign
from facebook_business.adobjects.adset import AdSet
from facebook_business.adobjects.adrule import AdRule


# 알림 받을 사용자 ID
NOTIFY_USER_ID = '1891764834770068'


def get_campaign_short(name):
    """캠페인명 → 한글 약칭"""
    if 'web&app' in name:
        return '웹&앱'
    if 'web_purchase' in name:
        return '웹구매'
    return name[:8]


def get_targeting_short(adset_name):
    """광고세트명 → 타겟팅 약칭"""
    if 'interest_businessai' in adset_name:
        return '직장인AI'
    if 'broad' in adset_name:
        return '브로드'
    if 'lookalike' in adset_name:
        return '유사'
    return adset_name.split('_')[0]


def get_adset_type(adset_name):
    """광고세트명 → DA/VA 분류"""
    parts = adset_name.upper().split('_')
    if 'DA' in parts:
        return 'DA'
    if 'VA' in parts:
        return 'VA'
    return '기타'


def format_threshold_label(amount):
    """금액 → 만원 단위 라벨"""
    man = amount / 10000
    if man == int(man):
        return f"{int(man)}만원"
    return f"{man:.1f}만원"


def main():
    dry_run = '--dry-run' in sys.argv

    if dry_run:
        print("[DRY-RUN] 실제 변경 없이 미리보기만 합니다.\n")

    # clients.json 로드
    with open('clients.json', 'r', encoding='utf-8') as f:
        clients = json.load(f)

    for client_name, config in clients.items():
        print(f"=== {client_name} 규칙 관리 ===\n")

        access_token = config['access_token']
        ad_account_id = config['ad_account_id']
        target_campaigns = config['target_campaigns']
        budget_rule_pct = config.get('budget_rule_pct', 50)

        FacebookAdsApi.init(access_token=access_token)
        account = AdAccount(ad_account_id)

        # 1. 타겟 캠페인 조회
        campaigns = list(account.get_campaigns(fields=['name', 'id', 'effective_status']))
        target = [(c['id'], c['name']) for c in campaigns
                  if c['name'] in target_campaigns and c['effective_status'] == 'ACTIVE']

        if not target:
            print("활성 타겟 캠페인 없음. 스킵.")
            continue

        # 2. 활성 광고세트 + 활성 소재 조회
        adset_rules = []
        all_da_ads = []
        all_va_ads = []

        print("[1] 활성 소재 조회 중...")
        for cid, cname in target:
            campaign_short = get_campaign_short(cname)
            camp = Campaign(cid)
            adsets = list(camp.get_ad_sets(fields=['id', 'name', 'effective_status', 'daily_budget']))
            time.sleep(1)

            for adset in adsets:
                if adset.get('effective_status') != 'ACTIVE':
                    continue

                adset_name = adset['name']
                budget = int(adset.get('daily_budget', 0))
                threshold = budget * budget_rule_pct // 100
                targeting = get_targeting_short(adset_name)
                ad_type = get_adset_type(adset_name)

                adset_obj = AdSet(adset['id'])
                ads = list(adset_obj.get_ads(fields=['id', 'effective_status']))
                active_ids = [a['id'] for a in ads if a.get('effective_status') == 'ACTIVE']
                time.sleep(1)

                if not active_ids:
                    continue

                adset_rules.append({
                    'campaign_short': campaign_short,
                    'targeting': targeting,
                    'type': ad_type,
                    'budget': budget,
                    'threshold': threshold,
                    'ad_ids': active_ids,
                })

                if ad_type == 'DA':
                    all_da_ads.extend(active_ids)
                elif ad_type == 'VA':
                    all_va_ads.extend(active_ids)

                print(f"  [{ad_type}] {campaign_short}_{targeting} | 예산 {budget:,}원 | 기준 {threshold:,}원 | 소재 {len(active_ids)}개")

        # 3. 기존 ENABLED 규칙 삭제
        print(f"\n[2] 기존 규칙 삭제 중...")
        existing_rules = account.get_ad_rules_library(fields=['name', 'status'])
        deleted = 0
        for rule in existing_rules:
            if rule.get('status') == 'ENABLED':
                print(f"  삭제: {rule['name']}")
                if not dry_run:
                    rule_obj = AdRule(rule['id'])
                    rule_obj.api_delete()
                    time.sleep(1)
                deleted += 1
        print(f"  → {deleted}개 {'삭제 예정' if dry_run else '삭제 완료'}")

        # 4. OFF 규칙 생성 (광고세트별)
        date_str = datetime.now().strftime('%y%m%d')

        print(f"\n[3] OFF 규칙 생성 중...")
        for d in adset_rules:
            rule_name = (
                f"{date_str}_{d['campaign_short']}_{d['targeting']}_"
                f"{d['type']}세트_OFF_{format_threshold_label(d['threshold'])}이상"
            )

            print(f"  생성: {rule_name} ({len(d['ad_ids'])}개 소재)")

            if not dry_run:
                account.create_ad_rules_library(params={
                    'name': rule_name,
                    'evaluation_spec': json.dumps({
                        'evaluation_type': 'SCHEDULE',
                        'filters': [
                            {'field': 'today_spent', 'value': str(d['threshold']), 'operator': 'GREATER_THAN'},
                            {'field': 'ad.id', 'value': d['ad_ids'], 'operator': 'IN'},
                            {'field': 'entity_type', 'value': 'AD', 'operator': 'EQUAL'},
                            {'field': 'time_preset', 'value': 'TODAY', 'operator': 'EQUAL'},
                        ]
                    }),
                    'execution_spec': json.dumps({
                        'execution_type': 'PAUSE',
                        'execution_options': [
                            {'field': 'user_ids', 'value': [NOTIFY_USER_ID], 'operator': 'EQUAL'},
                            {'field': 'alert_preferences', 'value': {'instant': {'trigger': 'CHANGE'}}, 'operator': 'EQUAL'},
                        ]
                    }),
                    'schedule_spec': json.dumps({'schedule_type': 'SEMI_HOURLY'}),
                })
                time.sleep(2)

        # 5. ON 규칙 생성 (DA/VA 통합)
        print(f"\n[4] ON 규칙 생성 중...")
        for ad_type, ad_ids in [('DA', all_da_ads), ('VA', all_va_ads)]:
            if not ad_ids:
                continue
            rule_name = f"{date_str}_전체{ad_type}세트_ON"

            print(f"  생성: {rule_name} ({len(ad_ids)}개 소재)")

            if not dry_run:
                account.create_ad_rules_library(params={
                    'name': rule_name,
                    'evaluation_spec': json.dumps({
                        'evaluation_type': 'SCHEDULE',
                        'filters': [
                            {'field': 'ad.id', 'value': ad_ids, 'operator': 'IN'},
                            {'field': 'entity_type', 'value': 'AD', 'operator': 'EQUAL'},
                            {'field': 'time_preset', 'value': 'MAXIMUM', 'operator': 'EQUAL'},
                        ]
                    }),
                    'execution_spec': json.dumps({
                        'execution_type': 'UNPAUSE',
                        'execution_options': [
                            {'field': 'user_ids', 'value': [NOTIFY_USER_ID], 'operator': 'EQUAL'},
                            {'field': 'alert_preferences', 'value': {'instant': {'trigger': 'CHANGE'}}, 'operator': 'EQUAL'},
                        ]
                    }),
                    'schedule_spec': json.dumps({'schedule_type': 'DAILY'}),
                })
                time.sleep(2)

        # 요약
        print(f"\n=== 완료 ===")
        print(f"OFF 규칙: {len(adset_rules)}개")
        print(f"ON 규칙: {sum(1 for t, ids in [('DA', all_da_ads), ('VA', all_va_ads)] if ids)}개")
        print(f"DA 소재: {len(all_da_ads)}개 / VA 소재: {len(all_va_ads)}개")


if __name__ == '__main__':
    main()
