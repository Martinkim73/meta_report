# -*- coding: utf-8 -*-
"""
메타 광고 성과 분석 엔진 (파라미터화)
"""

import json
import time

from facebook_business.api import FacebookAdsApi
from facebook_business.exceptions import FacebookRequestError
from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.campaign import Campaign
from facebook_business.adobjects.adset import AdSet
import pandas as pd
from datetime import datetime, timedelta

# 액션 타입 (레거시 + 표준 둘 다 체크)
PURCHASE_ACTION_TYPES = ['offsite_conversion.fb_pixel_purchase', 'purchase']
REGISTRATION_ACTION_TYPES = ['offsite_conversion.fb_pixel_complete_registration', 'complete_registration']


def api_call_with_retry(func, max_retries=5, initial_wait=60, progress_callback=None):
    """API 호출 시 rate limit 에러 발생하면 자동 재시도"""
    for attempt in range(max_retries):
        try:
            return func()
        except FacebookRequestError as e:
            if e.api_error_code() == 17:
                wait = initial_wait * (2 ** attempt)
                if progress_callback:
                    progress_callback(f"API 한도 초과. {wait}초 대기 후 재시도... ({attempt+1}/{max_retries})")
                time.sleep(wait)
            else:
                raise
    raise Exception(f"API 호출 {max_retries}회 재시도 후에도 실패")


def format_money(amount):
    """금액을 만원 단위로 포맷팅"""
    if amount >= 10000:
        return f"{amount/10000:.1f}만원"
    else:
        return f"{int(amount)}원"


def generate_expert_analysis(da_low_list, va_low_list, df_all):
    """30년차 그로스 마케터 관점의 종합 분석 의견 생성"""

    all_low = da_low_list + va_low_list
    total_low_count = len(all_low)

    if total_low_count == 0:
        return "전 소재 ROAS 85% 이상 유지 중. 현행 전략 유지하되, 신규 소재 테스트로 스케일업 여지를 탐색하세요."

    total_low_spend = sum(m['spend'] for m in all_low)
    total_all_spend = float(df_all['spend'].sum())
    total_all_revenue = float(df_all['revenue'].sum())
    overall_roas = (total_all_revenue / total_all_spend * 100) if total_all_spend > 0 else 0
    low_spend_ratio = (total_low_spend / total_all_spend * 100) if total_all_spend > 0 else 0

    zero_purchase = [m for m in all_low if m['purchases'] == 0]
    has_reg_no_purchase = [m for m in all_low if m['purchases'] == 0 and m['registrations'] > 0]
    low_roas_with_purchase = [m for m in all_low if m['purchases'] > 0]

    lines = []

    # 총평
    lines.append(f"금주 저효율 소재 {total_low_count}개에서 총 {format_money(total_low_spend)}이 소진되었습니다(전체 광고비의 {low_spend_ratio:.0f}%).")
    lines.append(f"계정 전체 ROAS {int(overall_roas)}% 대비 해당 소재들은 기준치(85%) 미만으로, 즉각적인 예산 재배치가 필요합니다.")
    lines.append("")

    # 구매 전환 0건 분석
    if zero_purchase:
        zero_spend = sum(m['spend'] for m in zero_purchase)
        lines.append(f"▸ 구매 전환 0건 소재 {len(zero_purchase)}개에서 {format_money(zero_spend)}이 전환 없이 소진 중입니다. 크리에이티브 메시지 또는 타겟 자체에 문제가 있을 가능성이 높으므로 즉시 OFF를 권장합니다.")

    # 퍼널 누수 분석
    if has_reg_no_purchase:
        reg_cpas = [m['cpa_registration'] for m in has_reg_no_purchase if m['cpa_registration'] > 0]
        avg_cpa = sum(reg_cpas) / len(reg_cpas) if reg_cpas else 0
        lines.append(f"▸ 회원가입은 발생하나 구매 미전환 소재 {len(has_reg_no_purchase)}개(평균 가입CPA {format_money(avg_cpa)}): 후킹은 작동하나 구매 전환 퍼널에서 이탈 중. 랜딩페이지 CTA 및 결제 동선 점검, 소재 메시지와 실제 상품 간 기대값 불일치 여부를 확인하세요.")

    # ROAS 미달이지만 구매 발생 소재
    if low_roas_with_purchase:
        for m in low_roas_with_purchase:
            lines.append(f"▸ {m['ad_name']}: 구매 {int(m['purchases'])}건(ROAS {int(m['roas'])}%)으로 전환은 발생하나 효율 미달. 타겟 세분화 또는 입찰 조정 후 3일 모니터링 권장.")

    lines.append("")

    # 액션 플랜
    lines.append("**권장 액션 플랜:**")
    action_num = 1
    if zero_purchase:
        no_reg = [m for m in zero_purchase if m['registrations'] == 0]
        if no_reg:
            lines.append(f"{action_num}. 구매·가입 모두 0건 소재 {len(no_reg)}개 → 즉시 OFF (회생 가능성 없음)")
            action_num += 1
    if has_reg_no_purchase:
        lines.append(f"{action_num}. 가입만 발생 소재 {len(has_reg_no_purchase)}개 → CPA 효율 최상위 1~2개만 존속 검토, 나머지 OFF")
        action_num += 1
    if low_roas_with_purchase:
        lines.append(f"{action_num}. ROAS 미달 but 전환 발생 소재 {len(low_roas_with_purchase)}개 → 타겟/입찰 최적화 후 3일 관찰, 미개선 시 OFF")
        action_num += 1
    lines.append(f"{action_num}. 확보 예산({format_money(total_low_spend)}) → ROAS 상위 소재 스케일업에 재배치")

    return "\n".join(lines)


def build_report_text(client_name, analysis_period, da_low_list, va_low_list, expert_analysis):
    """보고서 텍스트 생성"""

    report = f"""🚀 **{client_name} 주간 소재 성과 분석 리포트**

**분석기간: {analysis_period}**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**1. DA**

"""

    if da_low_list:
        for idx, m in enumerate(da_low_list, 1):
            report += f"{idx}) {m['ad_name']}\n"
            report += format_material_line(m)
            report += "\n"
    else:
        report += "(저효율 소재 없음)\n\n"

    report += """**2. VA**

"""

    if va_low_list:
        for idx, m in enumerate(va_low_list, 1):
            report += f"{idx}) {m['ad_name']}\n"
            report += format_material_line(m)
            report += "\n"
    else:
        report += "(저효율 소재 없음)\n\n"

    report += f"""━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 **종합 분석 의견**

{expert_analysis}
"""

    return report


def format_material_line(m):
    """소재별 지표 라인 포맷팅"""
    parts = [f"{format_money(m['spend'])} 지출"]

    if m['purchases'] > 0:
        parts.append(f"매출 {format_money(m['revenue'])}")
        parts.append(f"구매 {int(m['purchases'])}건")
        parts.append(f"ROAS: {int(m['roas'])}%")
        parts.append(f"구매CPA: {format_money(m['cpa_purchase'])}")
    else:
        parts.append("구매 미발생")

    if m['registrations'] > 0:
        parts.append(f"회원가입CPA: {format_money(m['cpa_registration'])}")

    return "- " + " / ".join(parts) + "\n"


def analyze_meta_ads(config, progress_callback=None):
    """
    메타 광고 데이터 분석 (계정 레벨 일괄 조회)

    config keys:
        client_name, access_token, ad_account_id, target_campaigns,
        min_spend, low_roas_threshold, budget_rule_pct

    returns:
        { report_text, da_low, va_low, expert_analysis, debug_info }
    """

    def log(msg):
        if progress_callback:
            progress_callback(msg)

    access_token = config['access_token']
    ad_account_id = config['ad_account_id']
    target_campaigns = config['target_campaigns']
    min_spend_total = config.get('min_spend', 250000)
    low_roas_threshold = config.get('low_roas_threshold', 85)
    budget_rule_pct = config.get('budget_rule_pct', 50)
    client_name = config.get('client_name', '광고주')

    # API 초기화
    FacebookAdsApi.init(access_token=access_token)

    log("메타 광고 데이터 수집 중...")

    account = AdAccount(ad_account_id)

    # 날짜 범위 설정 (최근 7일, 오늘 제외)
    end_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=1)
    start_date = end_date - timedelta(days=6)
    date_range = {
        'since': start_date.strftime('%Y-%m-%d'),
        'until': end_date.strftime('%Y-%m-%d')
    }

    analysis_period = f"최근 D7 {start_date.strftime('%y.%m.%d')} ~ {end_date.strftime('%m.%d')}"
    debug_lines = []

    log(f"분석기간: {analysis_period}")

    # 1단계: 타겟 캠페인 ID 조회
    log("활성 타겟 캠페인 검색 중...")
    campaigns = api_call_with_retry(
        lambda: list(account.get_campaigns(fields=['name', 'id', 'effective_status'])),
        progress_callback=progress_callback
    )

    target_campaign_ids = []
    for campaign in campaigns:
        if campaign['name'] in target_campaigns and campaign.get('effective_status') == 'ACTIVE':
            target_campaign_ids.append(campaign['id'])
            log(f"활성 캠페인: {campaign['name']}")

    if not target_campaign_ids:
        return {
            'report_text': '',
            'da_low': [],
            'va_low': [],
            'expert_analysis': '',
            'debug_info': '활성화된 타겟 캠페인을 찾을 수 없습니다.',
            'error': '활성화된 타겟 캠페인을 찾을 수 없습니다.'
        }

    # 2단계: 인사이트 일괄 조회
    log("광고 데이터 일괄 수집 중...")

    raw_insights = api_call_with_retry(
        lambda: list(account.get_insights(
            fields=[
                'ad_id',
                'ad_name',
                'adset_name',
                'campaign_name',
                'spend',
                'actions',
                'action_values'
            ],
            params={
                'level': 'ad',
                'time_range': date_range,
                'filtering': [
                    {
                        'field': 'campaign.id',
                        'operator': 'IN',
                        'value': target_campaign_ids
                    }
                ],
                'limit': 500
            }
        )),
        progress_callback=progress_callback
    )

    log(f"{len(raw_insights)}개 광고 인사이트 수집 완료")

    # 2-b단계: 광고세트 예산 + 광고 상태 + 오늘 지출 조회
    log("광고 상태 및 규칙OFF 자동 감지 중...")

    today_str = datetime.now().strftime('%Y-%m-%d')
    today_range = {'since': today_str, 'until': today_str}

    adset_budgets = {}
    ad_status_map = {}

    for cid in target_campaign_ids:
        campaign_obj = Campaign(cid)
        adsets = api_call_with_retry(
            lambda c=campaign_obj: list(c.get_ad_sets(
                fields=['id', 'name', 'effective_status', 'daily_budget']
            )),
            progress_callback=progress_callback
        )
        time.sleep(1)
        for adset in adsets:
            if adset.get('effective_status') != 'ACTIVE':
                continue
            adset_budgets[adset['id']] = int(adset.get('daily_budget', 0))
            adset_obj = AdSet(adset['id'])
            ads = api_call_with_retry(
                lambda a=adset_obj: list(a.get_ads(
                    fields=['id', 'name', 'effective_status']
                )),
                progress_callback=progress_callback
            )
            time.sleep(1)
            for ad in ads:
                ad_status_map[(ad['name'], adset['id'])] = ad.get('effective_status', '')

    # 오늘 광고별 지출 조회
    today_insights = api_call_with_retry(
        lambda: list(account.get_insights(
            fields=['ad_name', 'adset_id', 'spend'],
            params={
                'level': 'ad',
                'time_range': today_range,
                'filtering': [
                    {
                        'field': 'campaign.id',
                        'operator': 'IN',
                        'value': target_campaign_ids
                    }
                ],
                'limit': 500
            }
        )),
        progress_callback=progress_callback
    )

    today_spend_map = {}
    for ti in today_insights:
        key = (ti.get('ad_name', ''), ti.get('adset_id', ''))
        today_spend_map[key] = float(ti.get('spend', 0))

    # 활성 소재 판별
    active_ad_names = set()
    rule_off_details = []
    for (ad_name, adset_id), status in ad_status_map.items():
        if status == 'ACTIVE':
            active_ad_names.add(ad_name)
        elif status == 'PAUSED':
            budget = adset_budgets.get(adset_id, 0)
            spend = today_spend_map.get((ad_name, adset_id), 0)
            if budget > 0 and spend >= budget * (budget_rule_pct / 100):
                active_ad_names.add(ad_name)
                rule_off_details.append(f"[규칙OFF] {ad_name} (지출 {spend:,.0f}원 / 예산 {budget:,}원 = {spend/budget*100:.0f}%)")

    for line in rule_off_details:
        debug_lines.append(line)
    log(f"활성 소재: {len(active_ad_names)}개 (규칙OFF 포함)")

    # 3단계: 데이터 파싱
    all_ads_data = []
    excluded_count = 0
    for insight in raw_insights:
        spend = float(insight.get('spend', 0))
        if spend == 0:
            continue

        ad_name = insight.get('ad_name', '')
        if ad_name not in active_ad_names:
            excluded_count += 1
            continue
        adset_name = insight.get('adset_name', '')

        material_type = "DA" if 'DA' in adset_name else "VA" if 'VA' in adset_name else "기타"

        purchases = 0
        registrations = 0
        revenue = 0

        def get_action_value(action_obj):
            return float(action_obj.get('value', 0))

        if 'actions' in insight:
            purchase_counts = {}
            reg_counts = {}
            for action in insight['actions']:
                at = action['action_type']
                if at in PURCHASE_ACTION_TYPES:
                    purchase_counts[at] = int(get_action_value(action))
                elif at in REGISTRATION_ACTION_TYPES:
                    reg_counts[at] = int(get_action_value(action))
            purchases = purchase_counts.get('purchase',
                        purchase_counts.get('offsite_conversion.fb_pixel_purchase', 0))
            registrations = reg_counts.get('complete_registration',
                            reg_counts.get('offsite_conversion.fb_pixel_complete_registration', 0))

        if 'action_values' in insight:
            rev_values = {}
            for av in insight['action_values']:
                at = av['action_type']
                if at in PURCHASE_ACTION_TYPES:
                    rev_values[at] = get_action_value(av)
            revenue = rev_values.get('purchase',
                      rev_values.get('offsite_conversion.fb_pixel_purchase', 0))

        all_ads_data.append({
            'ad_name': ad_name,
            'adset_name': adset_name,
            'material_type': material_type,
            'spend': spend,
            'purchases': purchases,
            'registrations': registrations,
            'revenue': revenue
        })

    if not all_ads_data:
        return {
            'report_text': '',
            'da_low': [],
            'va_low': [],
            'expert_analysis': '',
            'debug_info': '수집된 광고 데이터가 없습니다.',
            'error': '수집된 광고 데이터가 없습니다.'
        }

    # 4단계: 소재명 + 타입 기준 통합 집계
    df = pd.DataFrame(all_ads_data)
    log(f"지출 발생 광고: {len(df)}개 (수동OFF 제외: {excluded_count}개)")

    df_grouped = df.groupby(['ad_name', 'material_type']).agg({
        'spend': 'sum',
        'purchases': 'sum',
        'registrations': 'sum',
        'revenue': 'sum'
    }).reset_index()

    df_grouped['roas'] = df_grouped.apply(
        lambda x: (x['revenue'] / x['spend'] * 100) if x['spend'] > 0 else 0, axis=1
    ).round(0)

    df_grouped['cpa_purchase'] = df_grouped.apply(
        lambda x: (x['spend'] / x['purchases']) if x['purchases'] > 0 else 0, axis=1
    ).round(0)

    df_grouped['cpa_registration'] = df_grouped.apply(
        lambda x: (x['spend'] / x['registrations']) if x['registrations'] > 0 else 0, axis=1
    ).round(0)

    # 5단계: 저효율 소재 필터링
    low_performance = df_grouped[
        (df_grouped['roas'] < low_roas_threshold) &
        (df_grouped['spend'] >= min_spend_total)
    ].copy()
    low_performance = low_performance.sort_values('spend', ascending=False)

    qualified_count = len(df_grouped[df_grouped['spend'] >= min_spend_total])
    log(f"지출 기준 충족 소재: {qualified_count}개 / 저효율: {len(low_performance)}개")

    # 디버그 정보
    qualified = df_grouped[df_grouped['spend'] >= min_spend_total].sort_values('spend', ascending=False)
    for _, r in qualified.iterrows():
        debug_lines.append(
            f"[{r['material_type']}] {r['ad_name']} | "
            f"지출: {r['spend']:.0f}원 / 매출: {r['revenue']:.0f}원 / "
            f"구매: {int(r['purchases'])}건 / ROAS: {int(r['roas'])}% / 가입: {int(r['registrations'])}건"
        )

    # DA / VA 분리
    da_low = low_performance[low_performance['material_type'] == 'DA']
    va_low = low_performance[low_performance['material_type'] == 'VA']

    da_low_list = da_low.to_dict('records') if not da_low.empty else []
    va_low_list = va_low.to_dict('records') if not va_low.empty else []

    # 전문가 분석 의견 생성
    expert_analysis = generate_expert_analysis(da_low_list, va_low_list, df_grouped)

    # 보고서 텍스트 생성
    report_text = build_report_text(client_name, analysis_period, da_low_list, va_low_list, expert_analysis)

    log("분석 완료!")

    return {
        'report_text': report_text,
        'da_low': da_low_list,
        'va_low': va_low_list,
        'expert_analysis': expert_analysis,
        'debug_info': "\n".join(debug_lines),
        'analysis_period': analysis_period,
        'df_grouped': df_grouped,
    }
