# -*- coding: utf-8 -*-
"""
메타 광고 성과 분석 - Streamlit 웹 앱 (토스 스타일)
"""

import streamlit as st
import json
import os
from pathlib import Path

CLIENTS_FILE = Path(__file__).parent / "clients.json"

# ─── 커스텀 CSS (토스 스타일) ───────────────────────────────────────────────

TOSS_CSS = """
<style>
@import url('https://cdn.jsdelivr.net/gh/toss/tossface/dist/tossface.css');
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap');

html, body, [class*="css"] {
    font-family: 'Noto Sans KR', sans-serif;
}

/* 전체 배경 */
.stApp {
    background-color: #F4F5F7;
}

/* 사이드바 */
section[data-testid="stSidebar"] {
    background-color: #FFFFFF;
    border-right: 1px solid #E5E8EB;
}
section[data-testid="stSidebar"] .stRadio label {
    font-size: 15px;
    font-weight: 500;
    padding: 8px 0;
}

/* 카드 스타일 */
.toss-card {
    background: #FFFFFF;
    border-radius: 16px;
    padding: 24px 28px;
    margin-bottom: 16px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    border: 1px solid #F0F0F0;
}
.toss-card-clickable {
    background: #FFFFFF;
    border-radius: 16px;
    padding: 24px 28px;
    margin-bottom: 12px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    border: 1px solid #F0F0F0;
    transition: box-shadow 0.15s, border-color 0.15s;
}
.toss-card-clickable:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    border-color: #3182F6;
}

/* 타이틀 */
.toss-title {
    font-size: 26px;
    font-weight: 700;
    color: #191F28;
    line-height: 1.4;
    margin-bottom: 4px;
}
.toss-subtitle {
    font-size: 15px;
    color: #8B95A1;
    font-weight: 400;
    margin-bottom: 24px;
}

/* 클라이언트 카드 내부 */
.client-name {
    font-size: 18px;
    font-weight: 700;
    color: #191F28;
    margin-bottom: 6px;
}
.client-meta {
    font-size: 13px;
    color: #8B95A1;
    line-height: 1.6;
}

/* 배지 */
.badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
}
.badge-blue {
    background: #E8F3FF;
    color: #3182F6;
}
.badge-gray {
    background: #F2F4F6;
    color: #6B7684;
}

/* 버튼 커스텀 */
.stButton > button {
    border-radius: 12px;
    padding: 10px 24px;
    font-weight: 600;
    font-size: 15px;
    border: none;
    transition: background 0.15s;
}
.stButton > button[kind="primary"] {
    background-color: #3182F6;
    color: white;
}
.stButton > button[kind="primary"]:hover {
    background-color: #1B64DA;
}

/* 구분선 */
.toss-divider {
    border: none;
    border-top: 1px solid #E5E8EB;
    margin: 20px 0;
}

/* 리포트 프리뷰 */
.report-box {
    background: #FAFBFC;
    border: 1px solid #E5E8EB;
    border-radius: 12px;
    padding: 20px 24px;
    font-size: 14px;
    line-height: 1.8;
    white-space: pre-wrap;
    color: #333D4B;
}

/* 상태 메시지 */
.status-msg {
    font-size: 14px;
    color: #6B7684;
    padding: 8px 0;
}
</style>
"""

# ─── 데이터 I/O ───────────────────────────────────────────────────────────

def load_clients():
    """클라이언트 정보 로드 (st.secrets 우선, 없으면 clients.json)"""
    # 1. Streamlit Secrets 확인 (배포 환경)
    if hasattr(st, 'secrets') and 'clients' in st.secrets:
        return dict(st.secrets['clients'])

    # 2. 로컬 clients.json 사용 (개발 환경)
    if CLIENTS_FILE.exists():
        with open(CLIENTS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)

    return {}


def save_clients(clients):
    """클라이언트 정보 저장 (로컬 파일만)"""
    # Streamlit Cloud에서는 secrets를 직접 수정할 수 없음
    # 로컬 개발 환경에서만 파일 저장
    with open(CLIENTS_FILE, 'w', encoding='utf-8') as f:
        json.dump(clients, f, ensure_ascii=False, indent=2)


# ─── 페이지: 홈 ────────────────────────────────────────────────────────────

def page_home():
    st.markdown('<div class="toss-title">오늘도 광고비를 지켜드릴게요</div>', unsafe_allow_html=True)
    st.markdown('<div class="toss-subtitle">등록된 광고주를 선택하고 분석을 실행하세요</div>', unsafe_allow_html=True)

    # 프로젝트 소개
    with st.expander("📌 이 서비스는 무엇인가요?", expanded=False):
        st.markdown("""
        **메타 광고 성과 자동 분석 도구**입니다.

        #### 주요 기능
        - 🔍 **저효율 광고 자동 탐지** - ROAS 85% 미만 광고 찾기
        - 📊 **DA/VA 소재 분석** - 동적/정적 소재별 성과 비교
        - 💰 **예산 규칙 점검** - 캠페인 예산 ON/OFF 확인
        - 📨 **디스코드 리포트** - 분석 결과 자동 전송

        #### 사용 방법
        1. **광고주 관리** 탭에서 광고주 추가
        2. **홈** 탭에서 분석 실행
        3. **분석 결과** 탭에서 결과 확인
        4. 디스코드로 리포트 전송

        #### 용어 설명
        - **ROAS** (Return On Ad Spend): 광고비 대비 매출 비율 (매출/광고비 × 100%)
        - **CPA** (Cost Per Action): 전환당 비용 (광고비/전환수)
        - **DA 소재**: 동적 광고 (Dynamic Ads) - 자동 최적화 소재
        - **VA 소재**: 정적 광고 (Video/Image Ads) - 수동 제작 소재
        """)

    clients = load_clients()

    if not clients:
        st.markdown(
            '<div class="toss-card">'
            '<div style="text-align:center; padding:32px 0; color:#8B95A1;">'
            '아직 등록된 광고주가 없어요<br>'
            '<span style="font-size:13px;">사이드바에서 "광고주 관리"로 이동해 추가해보세요</span>'
            '</div></div>',
            unsafe_allow_html=True
        )
        return

    for name, cfg in clients.items():
        campaigns_count = len(cfg.get('target_campaigns', []))
        has_webhook = "디스코드 연결됨" if cfg.get('discord_webhook') else "웹훅 미설정"

        st.markdown(
            f'<div class="toss-card-clickable">'
            f'<div class="client-name">{name}</div>'
            f'<div class="client-meta">'
            f'<span class="badge badge-blue">{campaigns_count}개 캠페인</span> '
            f'<span class="badge badge-gray">{has_webhook}</span><br>'
            f'계정: {cfg.get("ad_account_id", "-")} · '
            f'ROAS 기준: {cfg.get("low_roas_threshold", 85)}% · '
            f'최소 지출: {cfg.get("min_spend", 250000):,}원'
            f'</div></div>',
            unsafe_allow_html=True
        )

    st.markdown('<hr class="toss-divider">', unsafe_allow_html=True)

    # 광고주 선택 + 분석 실행
    selected = st.selectbox(
        "분석할 광고주",
        options=list(clients.keys()),
        label_visibility="collapsed",
        placeholder="광고주를 선택하세요"
    )

    if st.button("분석 실행", type="primary", use_container_width=True):
        if selected:
            run_analysis(selected, clients[selected])


def run_analysis(client_name, client_config):
    """분석 실행 + 결과를 session_state에 저장"""
    from analysis_engine import analyze_meta_ads

    config = {**client_config, 'client_name': client_name}

    status_container = st.empty()
    progress_bar = st.progress(0)
    log_area = st.empty()
    logs = []
    step = [0]

    def progress_callback(msg):
        step[0] += 1
        progress_val = min(step[0] / 12, 0.95)
        progress_bar.progress(progress_val)
        logs.append(msg)
        log_area.markdown(
            '<div class="status-msg">' + '<br>'.join(logs[-5:]) + '</div>',
            unsafe_allow_html=True
        )

    status_container.markdown(
        '<div class="toss-card">'
        '<div style="font-size:16px; font-weight:600; color:#191F28;">분석 중...</div>'
        '<div style="font-size:13px; color:#8B95A1; margin-top:4px;">'
        '광고비, 새고 있진 않나요? 꼼꼼히 살펴볼게요</div>'
        '</div>',
        unsafe_allow_html=True
    )

    try:
        result = analyze_meta_ads(config, progress_callback=progress_callback)
        progress_bar.progress(1.0)

        if result.get('error'):
            status_container.error(f"분석 실패: {result['error']}")
        else:
            st.session_state['last_result'] = result
            st.session_state['last_client'] = client_name
            st.session_state['last_webhook'] = client_config.get('discord_webhook', '')
            status_container.success("분석 완료! '분석 결과' 탭에서 확인하세요.")

    except Exception as e:
        progress_bar.empty()
        status_container.error(f"오류 발생: {str(e)}")


# ─── 페이지: 광고주 관리 ────────────────────────────────────────────────────

def page_clients():
    st.markdown('<div class="toss-title">광고주 관리</div>', unsafe_allow_html=True)
    st.markdown('<div class="toss-subtitle">광고주를 추가하거나 설정을 변경하세요</div>', unsafe_allow_html=True)

    clients = load_clients()

    tab_add, tab_edit, tab_delete = st.tabs(["추가", "수정", "삭제"])

    # ── 추가 탭 ──
    with tab_add:
        st.info("💡 **광고주 추가 가이드**: Meta 광고 계정 정보를 입력하여 자동 분석을 시작하세요")
        st.markdown('<div class="toss-card">', unsafe_allow_html=True)
        with st.form("add_client_form"):
            name = st.text_input(
                "광고주 이름",
                placeholder="예: AI코딩밸리",
                help="식별하기 쉬운 광고주 이름을 입력하세요"
            )
            access_token = st.text_input(
                "Meta Access Token",
                type="password",
                help="Meta Business Suite에서 발급받은 장기 토큰을 입력하세요 (60일 유효)"
            )
            ad_account_id = st.text_input(
                "광고 계정 ID",
                placeholder="act_XXXXXXXXXX",
                help="Meta 광고 관리자에서 확인 가능한 광고 계정 ID (act_로 시작)"
            )
            campaigns_str = st.text_area(
                "타겟 캠페인 (줄바꿈 구분)",
                placeholder="캠페인1\n캠페인2",
                height=100,
                help="분석할 캠페인 이름을 줄바꿈으로 구분하여 입력하세요. Meta 광고 관리자에서 정확한 이름을 복사하세요."
            )
            col1, col2 = st.columns(2)
            with col1:
                min_spend = st.number_input(
                    "최소 지출 기준 (원)",
                    value=250000,
                    step=10000,
                    help="이 금액 이상 소진한 광고만 분석합니다 (기본: 25만원)"
                )
                budget_rule_pct = st.number_input(
                    "규칙OFF 판단 비율 (%)",
                    value=50,
                    min_value=0,
                    max_value=100,
                    help="예산의 이 비율 이하로 소진되면 '규칙 OFF' 경고 (기본: 50%)"
                )
            with col2:
                low_roas = st.number_input(
                    "저효율 ROAS 기준 (%)",
                    value=85,
                    step=5,
                    help="이 ROAS 미만인 광고를 저효율로 판단합니다 (기본: 85%, 즉 광고비의 85% 미만 매출)"
                )
                discord_webhook = st.text_input(
                    "디스코드 웹훅 URL",
                    type="password",
                    help="디스코드 채널의 웹훅 URL을 입력하면 분석 결과를 자동 전송합니다 (선택사항)"
                )

            submitted = st.form_submit_button("광고주 추가", type="primary", use_container_width=True)

            if submitted:
                if not name:
                    st.error("광고주 이름을 입력해주세요.")
                elif name in clients:
                    st.error("이미 등록된 광고주입니다.")
                elif not access_token or not ad_account_id:
                    st.error("Access Token과 광고 계정 ID는 필수입니다.")
                else:
                    campaigns = [c.strip() for c in campaigns_str.strip().split('\n') if c.strip()]
                    clients[name] = {
                        'access_token': access_token,
                        'ad_account_id': ad_account_id,
                        'target_campaigns': campaigns,
                        'min_spend': int(min_spend),
                        'low_roas_threshold': int(low_roas),
                        'discord_webhook': discord_webhook,
                        'budget_rule_pct': int(budget_rule_pct)
                    }
                    save_clients(clients)
                    st.success(f"'{name}' 광고주가 추가되었습니다.")
                    st.rerun()
        st.markdown('</div>', unsafe_allow_html=True)

    # ── 수정 탭 ──
    with tab_edit:
        if not clients:
            st.info("등록된 광고주가 없습니다.")
        else:
            edit_name = st.selectbox("수정할 광고주", options=list(clients.keys()), key="edit_select")
            if edit_name:
                cfg = clients[edit_name]
                st.markdown('<div class="toss-card">', unsafe_allow_html=True)
                with st.form("edit_client_form"):
                    access_token = st.text_input(
                        "Meta Access Token",
                        value=cfg.get('access_token', ''),
                        type="password"
                    )
                    ad_account_id = st.text_input(
                        "광고 계정 ID",
                        value=cfg.get('ad_account_id', '')
                    )
                    campaigns_str = st.text_area(
                        "타겟 캠페인 (줄바꿈 구분)",
                        value='\n'.join(cfg.get('target_campaigns', [])),
                        height=100
                    )
                    col1, col2 = st.columns(2)
                    with col1:
                        min_spend = st.number_input(
                            "최소 지출 기준 (원)",
                            value=cfg.get('min_spend', 250000),
                            step=10000
                        )
                        budget_rule_pct = st.number_input(
                            "규칙OFF 판단 비율 (%)",
                            value=cfg.get('budget_rule_pct', 50),
                            min_value=0, max_value=100
                        )
                    with col2:
                        low_roas = st.number_input(
                            "저효율 ROAS 기준 (%)",
                            value=cfg.get('low_roas_threshold', 85),
                            step=5
                        )
                        discord_webhook = st.text_input(
                            "디스코드 웹훅 URL",
                            value=cfg.get('discord_webhook', ''),
                            type="password"
                        )

                    submitted = st.form_submit_button("변경사항 저장", type="primary", use_container_width=True)

                    if submitted:
                        campaigns = [c.strip() for c in campaigns_str.strip().split('\n') if c.strip()]
                        clients[edit_name] = {
                            'access_token': access_token,
                            'ad_account_id': ad_account_id,
                            'target_campaigns': campaigns,
                            'min_spend': int(min_spend),
                            'low_roas_threshold': int(low_roas),
                            'discord_webhook': discord_webhook,
                            'budget_rule_pct': int(budget_rule_pct)
                        }
                        save_clients(clients)
                        st.success(f"'{edit_name}' 설정이 저장되었습니다.")
                st.markdown('</div>', unsafe_allow_html=True)

    # ── 삭제 탭 ──
    with tab_delete:
        if not clients:
            st.info("등록된 광고주가 없습니다.")
        else:
            del_name = st.selectbox("삭제할 광고주", options=list(clients.keys()), key="del_select")
            if del_name:
                st.warning(f"'{del_name}' 광고주를 삭제하면 되돌릴 수 없습니다.")
                if st.button("삭제", type="primary"):
                    del clients[del_name]
                    save_clients(clients)
                    st.success(f"'{del_name}' 광고주가 삭제되었습니다.")
                    st.rerun()


# ─── 페이지: 분석 결과 ──────────────────────────────────────────────────────

def page_results():
    st.markdown('<div class="toss-title">분석 결과</div>', unsafe_allow_html=True)
    st.markdown('<div class="toss-subtitle">리포트를 확인하고 디스코드로 전송하세요</div>', unsafe_allow_html=True)

    # 용어 설명
    with st.expander("📖 용어 설명", expanded=False):
        col1, col2 = st.columns(2)
        with col1:
            st.markdown("""
            **ROAS** (Return On Ad Spend)
            - 광고비 대비 매출 비율
            - 계산: (매출 / 광고비) × 100%
            - 예: ROAS 150% = 10만원 광고비로 15만원 매출

            **CPA** (Cost Per Action)
            - 전환 1건당 비용
            - 계산: 광고비 / 전환수
            - 낮을수록 효율적
            """)
        with col2:
            st.markdown("""
            **DA 소재** (Dynamic Ads)
            - 동적 광고 소재
            - Meta가 자동으로 최적화
            - 이름에 'DA', 'dynamic', 'auto' 포함

            **VA 소재** (Video/Image Ads)
            - 정적 광고 소재 (수동 제작)
            - 직접 디자인한 이미지/비디오
            - DA가 아닌 모든 소재
            """)

    result = st.session_state.get('last_result')
    client_name = st.session_state.get('last_client', '')
    webhook_url = st.session_state.get('last_webhook', '')

    if not result:
        st.markdown(
            '<div class="toss-card">'
            '<div style="text-align:center; padding:32px 0; color:#8B95A1;">'
            '아직 분석 결과가 없어요<br>'
            '<span style="font-size:13px;">"홈"에서 분석을 실행해주세요</span>'
            '</div></div>',
            unsafe_allow_html=True
        )
        return

    # 요약 카드
    da_count = len(result.get('da_low', []))
    va_count = len(result.get('va_low', []))
    total_low = da_count + va_count
    all_low = result.get('da_low', []) + result.get('va_low', [])
    total_spend = sum(m['spend'] for m in all_low) if all_low else 0

    st.markdown(
        f'<div class="toss-card">'
        f'<div style="font-size:14px; color:#8B95A1; margin-bottom:8px;">{client_name} · {result.get("analysis_period", "")}</div>'
        f'<div style="display:flex; gap:32px;">'
        f'<div><div style="font-size:13px; color:#8B95A1;">저효율 소재</div>'
        f'<div style="font-size:28px; font-weight:700; color:#191F28;">{total_low}개</div></div>'
        f'<div><div style="font-size:13px; color:#8B95A1;">DA</div>'
        f'<div style="font-size:28px; font-weight:700; color:#3182F6;">{da_count}</div></div>'
        f'<div><div style="font-size:13px; color:#8B95A1;">VA</div>'
        f'<div style="font-size:28px; font-weight:700; color:#3182F6;">{va_count}</div></div>'
        f'<div><div style="font-size:13px; color:#8B95A1;">낭비 광고비</div>'
        f'<div style="font-size:28px; font-weight:700; color:#F04452;">{total_spend/10000:.1f}만원</div></div>'
        f'</div></div>',
        unsafe_allow_html=True
    )

    # 리포트 본문
    st.markdown('<div class="toss-card">', unsafe_allow_html=True)
    st.markdown(
        f'<div class="report-box">{result.get("report_text", "")}</div>',
        unsafe_allow_html=True
    )
    st.markdown('</div>', unsafe_allow_html=True)

    # 디스코드 전송
    col1, col2 = st.columns([3, 1])
    with col1:
        if webhook_url:
            st.markdown(
                '<span style="font-size:13px; color:#8B95A1;">디스코드 웹훅이 연결되어 있어요</span>',
                unsafe_allow_html=True
            )
        else:
            st.markdown(
                '<span style="font-size:13px; color:#F04452;">디스코드 웹훅이 설정되지 않았어요</span>',
                unsafe_allow_html=True
            )
    with col2:
        if st.button("디스코드 전송", type="primary", disabled=not webhook_url):
            from send_to_discord import send_report
            success, msg = send_report(webhook_url, result.get('report_text', ''))
            if success:
                st.success(msg)
            else:
                st.error(msg)

    # 디버그 정보 (접기)
    if result.get('debug_info'):
        with st.expander("디버그 정보"):
            st.text(result['debug_info'])


# ─── 메인 ──────────────────────────────────────────────────────────────────

def main():
    st.set_page_config(
        page_title="Meta 광고 분석",
        page_icon="📊",
        layout="wide",
        initial_sidebar_state="expanded"
    )

    st.markdown(TOSS_CSS, unsafe_allow_html=True)

    # 사이드바 네비게이션
    with st.sidebar:
        st.markdown(
            '<div style="padding:8px 0 16px 0;">'
            '<span style="font-size:20px; font-weight:700; color:#191F28;">📊 Meta 광고 분석</span>'
            '</div>',
            unsafe_allow_html=True
        )

        # 메뉴 설명
        st.markdown(
            '<div style="font-size:12px; color:#6B7684; margin-bottom:12px;">'
            '메뉴를 선택하세요'
            '</div>',
            unsafe_allow_html=True
        )

        page = st.radio(
            "메뉴",
            options=["홈", "광고주 관리", "분석 결과"],
            label_visibility="collapsed",
            help="🏠 홈: 분석 실행 | 👥 광고주 관리: 설정 추가/수정 | 📊 분석 결과: 리포트 확인"
        )

        # 메뉴별 설명
        menu_descriptions = {
            "홈": "💡 등록된 광고주를 선택하고 분석을 실행하세요",
            "광고주 관리": "💡 광고주 정보와 분석 설정을 관리하세요",
            "분석 결과": "💡 최근 분석 결과와 저효율 광고를 확인하세요"
        }
        st.markdown(
            f'<div style="font-size:11px; color:#8B95A1; padding:8px 12px; background:#F8F9FA; border-radius:8px; margin-top:8px;">'
            f'{menu_descriptions[page]}'
            '</div>',
            unsafe_allow_html=True
        )

        st.markdown('<hr class="toss-divider">', unsafe_allow_html=True)
        st.markdown(
            '<div style="font-size:12px; color:#AEB5BC; padding:4px 0;">'
            'Meta Ads Performance Analyzer<br>v1.0'
            '</div>',
            unsafe_allow_html=True
        )

    # 페이지 라우팅
    if page == "홈":
        page_home()
    elif page == "광고주 관리":
        page_clients()
    elif page == "분석 결과":
        page_results()


if __name__ == "__main__":
    main()
