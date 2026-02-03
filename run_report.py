# -*- coding: utf-8 -*-
"""
Meta 저효율 광고 분석 → Discord 전송 실행 스크립트

사용법: python run_report.py
"""

import json
import sys
from analysis_engine import analyze_meta_ads
from send_to_discord import send_report


def main():
    # 1. clients.json 로드
    try:
        with open('clients.json', 'r', encoding='utf-8') as f:
            clients = json.load(f)
    except FileNotFoundError:
        print("ERROR: clients.json 파일을 찾을 수 없습니다.")
        sys.exit(1)

    if not clients:
        print("ERROR: clients.json에 등록된 광고주가 없습니다.")
        sys.exit(1)

    print(f"=== Meta 저효율 광고 분석 시작 ({len(clients)}개 광고주) ===\n")

    # 2. 각 광고주별 분석 + 전송
    for client_name, config in clients.items():
        print(f"--- {client_name} ---")
        config['client_name'] = client_name

        # 분석 실행
        try:
            result = analyze_meta_ads(config, progress_callback=print)
        except Exception as e:
            print(f"[ERROR] {client_name} 분석 실패: {e}")
            continue

        if result.get('error'):
            print(f"[SKIP] {client_name}: {result['error']}")
            continue

        report_text = result.get('report_text', '')
        if not report_text:
            print(f"[SKIP] {client_name}: 보고서 내용 없음")
            continue

        # Discord 전송
        webhook_url = config.get('discord_webhook', '')
        if not webhook_url:
            print(f"[SKIP] {client_name}: Discord 웹훅 URL 미설정")
            print(report_text)
            continue

        success, msg = send_report(webhook_url, report_text)
        print(f"[{'OK' if success else 'FAIL'}] {client_name}: {msg}")

        # 디버그 정보 출력
        if result.get('debug_info'):
            print(f"\n[DEBUG] {client_name} 상세:\n{result['debug_info']}")

        print()

    print("=== 완료 ===")


if __name__ == '__main__':
    main()
