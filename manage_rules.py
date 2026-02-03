# -*- coding: utf-8 -*-
"""
Meta 광고 규칙 자동 관리

사용법:
  python manage_rules.py sync [--dry-run]    현재 활성 소재 감지 → 규칙 자동 업데이트 (추가/제거)
  python manage_rules.py reset [--dry-run]   규칙 전체 삭제 → 재생성
  python manage_rules.py status              현재 규칙 상태 확인
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
from facebook_business.adobjects.ad import Ad


NOTIFY_USER_ID = '1891764834770068'


def get_campaign_short(name):
    if 'web&app' in name:
        return '웹&앱'
    if 'web_purchase' in name:
        return '웹구매'
    return name[:8]


def get_targeting_short(adset_name):
    if 'interest_businessai' in adset_name:
        return '직장인AI'
    if 'broad' in adset_name:
        return '브로드'
    if 'lookalike' in adset_name:
        return '유사'
    return adset_name.split('_')[0]


def get_adset_type(adset_name):
    parts = adset_name.upper().split('_')
    if 'DA' in parts:
        return 'DA'
    if 'VA' in parts:
        return 'VA'
    return '기타'


def format_threshold_label(amount):
    man = amount / 10000
    if man == int(man):
        return f"{int(man)}만원"
    return f"{man:.1f}만원"


def load_config():
    with open('clients.json', 'r', encoding='utf-8') as f:
        return json.load(f)


def get_active_adsets(account, config):
    """활성 캠페인 → 활성 광고세트 + 활성 소재 조회"""
    campaigns = list(account.get_campaigns(fields=['name', 'id', 'effective_status']))
    target = [(c['id'], c['name']) for c in campaigns
              if c['name'] in config['target_campaigns'] and c['effective_status'] == 'ACTIVE']

    budget_rule_pct = config.get('budget_rule_pct', 50)
    adset_data = []
    all_da_ads = []
    all_va_ads = []

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
            ads = list(adset_obj.get_ads(fields=['id', 'name', 'effective_status']))
            active_ads = [(a['id'], a['name']) for a in ads if a.get('effective_status') == 'ACTIVE']
            time.sleep(1)

            if not active_ads:
                continue

            active_ids = [a[0] for a in active_ads]
            info = {
                'campaign_short': campaign_short,
                'targeting': targeting,
                'type': ad_type,
                'budget': budget,
                'threshold': threshold,
                'ad_ids': active_ids,
                'ad_names': {a[0]: a[1] for a in active_ads},
            }
            adset_data.append(info)

            if ad_type == 'DA':
                all_da_ads.extend(active_ids)
            elif ad_type == 'VA':
                all_va_ads.extend(active_ids)

            print(f"  [{ad_type}] {campaign_short}_{targeting} | 예산 {budget:,}원 | 기준 {threshold:,}원 | 소재 {len(active_ids)}개")

    return adset_data, all_da_ads, all_va_ads


def get_enabled_rules(account):
    """ENABLED 규칙 조회 + ad.id 목록 추출"""
    rules = account.get_ad_rules_library(fields=['name', 'status', 'evaluation_spec'])
    result = []
    for r in rules:
        if r.get('status') != 'ENABLED':
            continue
        eval_spec = r.get('evaluation_spec')
        if hasattr(eval_spec, 'export_all_data'):
            eval_spec = eval_spec.export_all_data()
        filters = eval_spec.get('filters', [])
        ad_ids = []
        for f in filters:
            if f.get('field') == 'ad.id':
                ad_ids = f['value']
                break
        result.append({
            'id': r['id'],
            'name': r.get('name', ''),
            'ad_ids': set(ad_ids),
            'eval_spec': eval_spec,
        })
    return result


def update_rule_ads(rule_id, eval_spec, new_ad_ids):
    """규칙의 ad.id 필터를 새 목록으로 업데이트"""
    new_filters = []
    for f in eval_spec.get('filters', []):
        if f.get('field') == 'ad.id':
            new_filters.append({'field': 'ad.id', 'value': list(new_ad_ids), 'operator': 'IN'})
        else:
            new_filters.append(f)
    new_eval = dict(eval_spec)
    new_eval['filters'] = new_filters
    rule_obj = AdRule(rule_id)
    rule_obj.api_update(params={'evaluation_spec': json.dumps(new_eval)})
    time.sleep(1)


def match_rule_to_adset(rule_name, adset_info):
    """규칙명으로 해당 광고세트 매칭"""
    for d in adset_info:
        pattern = f"{d['campaign_short']}_{d['targeting']}_{d['type']}세트_OFF"
        if pattern in rule_name:
            return d
    return None


# ── sync: 현재 소재 기준으로 규칙 업데이트 ──

def cmd_sync(account, config, dry_run=False):
    print("[1] 활성 소재 조회 중...")
    adset_data, all_da_ads, all_va_ads = get_active_adsets(account, config)

    print("\n[2] 기존 규칙과 비교 중...")
    rules = get_enabled_rules(account)

    changes = 0
    for rule in rules:
        name = rule['name']
        old_ids = rule['ad_ids']

        if '_OFF_' in name:
            matched = match_rule_to_adset(name, adset_data)
            if not matched:
                continue
            new_ids = set(matched['ad_ids'])
        elif '_전체DA세트_ON' in name:
            new_ids = set(all_da_ads)
        elif '_전체VA세트_ON' in name:
            new_ids = set(all_va_ads)
        else:
            continue

        added = new_ids - old_ids
        removed = old_ids - new_ids

        if not added and not removed:
            print(f"  [=] {name} (변경 없음)")
            continue

        changes += 1
        parts = []
        if added:
            parts.append(f"+{len(added)}")
        if removed:
            parts.append(f"-{len(removed)}")
        print(f"  [변경] {name} | {len(old_ids)}개 → {len(new_ids)}개 ({', '.join(parts)})")

        if added:
            # 광고세트별 ad_names 통합
            all_names = {}
            for d in adset_data:
                all_names.update(d.get('ad_names', {}))
            for aid in added:
                print(f"    + {all_names.get(aid, aid)}")
        if removed:
            for aid in removed:
                print(f"    - {aid}")

        if not dry_run:
            update_rule_ads(rule['id'], rule['eval_spec'], new_ids)

    if changes == 0:
        print("\n규칙과 활성 소재가 이미 동기화되어 있습니다.")
    else:
        print(f"\n{'변경 예정' if dry_run else '완료'}: {changes}개 규칙 업데이트")


# ── reset: 규칙 전체 삭제 + 재생성 ──

def cmd_reset(account, config, dry_run=False):
    print("[1] 활성 소재 조회 중...")
    adset_data, all_da_ads, all_va_ads = get_active_adsets(account, config)

    print(f"\n[2] 기존 규칙 삭제 중...")
    existing_rules = account.get_ad_rules_library(fields=['name', 'status'])
    deleted = 0
    for rule in existing_rules:
        if rule.get('status') == 'ENABLED':
            print(f"  삭제: {rule['name']}")
            if not dry_run:
                AdRule(rule['id']).api_delete()
                time.sleep(1)
            deleted += 1
    print(f"  → {deleted}개 {'삭제 예정' if dry_run else '삭제 완료'}")

    date_str = datetime.now().strftime('%y%m%d')

    print(f"\n[3] OFF 규칙 생성 중...")
    for d in adset_data:
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

    print(f"\n=== 완료 ===")
    print(f"OFF 규칙: {len(adset_data)}개 / ON 규칙: {sum(1 for _, ids in [('DA', all_da_ads), ('VA', all_va_ads)] if ids)}개")
    print(f"DA 소재: {len(all_da_ads)}개 / VA 소재: {len(all_va_ads)}개")


# ── status: 현재 규칙 상태 확인 ──

def cmd_status(account):
    rules = get_enabled_rules(account)
    if not rules:
        print("활성 규칙 없음")
        return

    print(f"활성 규칙 {len(rules)}개:\n")
    for rule in rules:
        print(f"  {rule['name']} | 소재 {len(rule['ad_ids'])}개")


# ── main ──

def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    dry_run = '--dry-run' in sys.argv
    command = args[0] if args else 'sync'

    if command not in ('sync', 'reset', 'status'):
        print("사용법:")
        print("  python manage_rules.py sync [--dry-run]   소재 변경 감지 → 규칙 업데이트")
        print("  python manage_rules.py reset [--dry-run]  규칙 전체 재설정")
        print("  python manage_rules.py status             현재 규칙 확인")
        sys.exit(1)

    if dry_run:
        print("[DRY-RUN] 실제 변경 없이 미리보기만 합니다.\n")

    clients = load_config()

    for client_name, config in clients.items():
        print(f"=== {client_name} ===\n")

        FacebookAdsApi.init(access_token=config['access_token'])
        account = AdAccount(config['ad_account_id'])

        if command == 'sync':
            cmd_sync(account, config, dry_run)
        elif command == 'reset':
            cmd_reset(account, config, dry_run)
        elif command == 'status':
            cmd_status(account)

        print()


if __name__ == '__main__':
    main()
