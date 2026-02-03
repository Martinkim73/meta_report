# -*- coding: utf-8 -*-
"""
디스코드 웹훅으로 보고서 전송 (파라미터화)
"""

import requests


def send_report(webhook_url, report_text):
    """
    디스코드로 보고서 전송

    Args:
        webhook_url: 디스코드 웹훅 URL
        report_text: 전송할 보고서 텍스트

    Returns:
        (success: bool, message: str)
    """
    if not webhook_url:
        return False, "웹훅 URL이 설정되지 않았습니다."

    if not report_text:
        return False, "전송할 보고서 내용이 없습니다."

    # 2000자 이하면 일반 메시지, 초과시 embed 사용 (4096자까지)
    if len(report_text) <= 2000:
        payload = {"content": report_text}
    else:
        payload = {
            "embeds": [{
                "description": report_text[:4096],
                "color": 3447003
            }]
        }

    try:
        response = requests.post(webhook_url, json=payload)

        if response.status_code == 204:
            return True, "보고서 전송 성공!"
        else:
            return False, f"전송 실패: HTTP {response.status_code} - {response.text}"
    except requests.RequestException as e:
        return False, f"전송 오류: {str(e)}"


if __name__ == "__main__":
    import json
    # 기존 호환: discord_report_data.json에서 데이터 로드
    try:
        with open('discord_report_data.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
        with open('clients.json', 'r', encoding='utf-8') as f:
            clients = json.load(f)
        # 첫 번째 클라이언트의 웹훅 사용
        first_client = next(iter(clients.values()))
        webhook_url = first_client.get('discord_webhook', '')
        success, msg = send_report(webhook_url, data['report_text'])
        print(msg)
    except FileNotFoundError as e:
        print(f"파일을 찾을 수 없습니다: {e}")
