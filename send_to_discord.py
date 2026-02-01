# -*- coding: utf-8 -*-
"""
디스코드 웹훅으로 보고서 전송
"""

import sys
import io

# Windows 콘솔 UTF-8 인코딩 설정
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import requests
import json

WEBHOOK_URL = "https://discord.com/api/webhooks/1467530388321865791/nHHwTsxtvfu_CcEtvBMpPzi-or09bBsp3ym1knL8tZ6zh1v6HMPKLqEjnIfE6P_e5Dwr"

# 보고서 내용
report = """
🚀 **AI코딩밸리 주간 소재 성과 분석 리포트**

**분석기간: 최근 D7 26.01.25 ~ 02.01**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**1. DA (이미지 소재)**

1) branding_promotionend_v2_260129_img
- 10.8만원 지출 / 구매 미발생
- 회원가입 CPA: 5.4만원

2) branding_newyearevent_260107_img
- 6.5만원 지출 / 구매 미발생

3) branding_year-end event_251205_img
- 6.4만원 지출 / 구매 미발생
- 회원가입 CPA: 6.4만원

4) branding_year-end event_v3_end_260129_img
- 5.6만원 지출 / 구매 미발생
"""

report2 = """
**2. VA (영상 소재)**

1) branding_hongjuwonnarrationoffice_260129_vid
- 13.6만원 지출 / 구매 미발생
- 회원가입 CPA: 3.4만원

2) branding_gaiyoonreview_v2_260107_vid
- 1.7만원 지출 / 구매 미발생
- 회원가입 CPA: 8346원

3) branding_hongjuwonnarration_rooftop_260121_vid
- 1409원 지출 / 구매 미발생

4) branding_juniorgaiyoon_hook_260121_vid
- 977원 지출 / 구매 미발생

5) branding_hongjuwonnarranationwhook_b_v1_251205_vid
- 331원 지출 / 구매 미발생

6) branding_hongjuwonnarranationwhook_b_v3_251212_vid
- 252원 지출 / 구매 미발생

7) branding_pricefocus_v3_260107_vid
- 169원 지출 / 구매 미발생
- 회원가입 CPA: 169원
"""

report3 = """
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 **종합 분석 의견:**

총 **11개의 저효율 소재**(ROAS 85% 미만)가 발견되었으며, **45.0만원**의 예산이 소진되었습니다.

이들 소재를 즉시 종료하고 고효율 소재로 예산을 재배치하여 전체 ROAS(236%)를 개선하는 것을 권장합니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🟢 **고효율 소재 TOP 3**

1. branding_gaiyoon-usp_v5_260107_img - ROAS **2554%**
2. branding_year-end event_v2_b_251219_img - ROAS **1145%**
3. branding_benefit_focus_v2_251114_img - ROAS **1056%**
"""

# 이미지 URL 리스트
images = {
    "branding_promotionend_v2_260129_img": "https://scontent-ssn1-1.xx.fbcdn.net/v/t45.1600-4/623675207_25674527805574471_6271121807329196195_n.png?_nc_cat=111&ccb=1-7&_nc_ohc=AVLFvf2xrJAQ7kNvwH5ittW&_nc_oc=AdmiLnbsbpJq74JyvY_geP-DoC46U2pQxi7_2tD0m8HBW_bi7CpIWq-0OcSfxmmqihE&_nc_zt=1&_nc_ht=scontent-ssn1-1.xx&edm=AAT1rw8EAAAA&_nc_gid=HYzAxFBgu61CtRiMjc5Tvg&_nc_tpa=Q5bMBQFUo-1jEZ7ajfxqaOVHRahzrgGJjCnUGg1zsp9JkFY8apVnYmFFAjeLy0OnNADSd0doxGJSmvok&stp=c0.5000x0.5000f_dst-emg0_p64x64_q75_tt6&ur=4c02d7&_nc_sid=58080a&oh=00_Aft5-4njNciCFtc0d5-6AGnWgIs3nwzoViQevdey9RbD7g&oe=6985535E",
    "branding_newyearevent_260107_img": "https://scontent-ssn1-1.xx.fbcdn.net/v/t45.1600-4/612127319_25474276982266222_2629435318317203219_n.png?_nc_cat=109&ccb=1-7&_nc_ohc=8Wq0cAL1CJ4Q7kNvwFJGIoJ&_nc_oc=AdneHx7KWGqmZC4ds9RA228aRMBSfoL9mv4jw398ZOsgsiCO7d4pjwTVf9QwzolNoBY&_nc_zt=1&_nc_ht=scontent-ssn1-1.xx&edm=AAT1rw8EAAAA&_nc_gid=bPDz9UGpHoBPMklVwFsR-Q&_nc_tpa=Q5bMBQF1NWxOHmy5U8KFqOC4Mslwe-OOB3ZDJotKepaPyNlmsBhbQGSfCciqYWNomvEjLxgqE5l_TXi4&stp=c0.5000x0.5000f_dst-emg0_p64x64_q75_tt6&ur=4c02d7&_nc_sid=58080a&oh=00_Afs4CAF7jlp3e6KPsC56btYWmj3RSrBxZAbbhC2n4vuEwg&oe=69851EA6",
    "branding_gaiyoonreview_v2_260107_vid": "https://scontent-ssn1-1.xx.fbcdn.net/v/t15.5256-10/615956433_862550763294850_5218751306041972920_n.jpg?_nc_cat=100&ccb=1-7&_nc_ohc=lyBqjW15d0MQ7kNvwG0NNGJ&_nc_oc=Adn9VchrSTI6zt7v9NNLyuYVT9md7zpMcQ9UqirWMjZdAH9mR9kA5joPM-JufVAb6IE&_nc_zt=23&_nc_ht=scontent-ssn1-1.xx&edm=AAT1rw8EAAAA&_nc_gid=SaUVHWw1TuBLGKJ48hi-uw&_nc_tpa=Q5bMBQGFgaIAddO3fPHTrhmvCq4jkEx02nm_5lNJsCrKGD5_2q-3ZGuDsUhTBGRXy-_NOMh4I_m4oRYF&stp=c0.5000x0.5000f_dst-emg0_p64x64_q75_tt6&ur=b696e2&_nc_sid=58080a&oh=00_AftIx50c5TmQSHankvER1php6gxjiwFrhq0q-D4fmqvxuw&oe=69852476",
}

def send_message(content):
    """디스코드 웹훅으로 메시지 전송"""
    data = {
        "content": content
    }
    response = requests.post(WEBHOOK_URL, json=data)
    if response.status_code == 204:
        print("✅ 메시지 전송 성공")
    else:
        print(f"❌ 전송 실패: {response.status_code}")
        print(response.text)

def send_embed_with_image(title, description, image_url):
    """이미지가 포함된 임베드 메시지 전송"""
    data = {
        "embeds": [{
            "title": title,
            "description": description,
            "color": 16711680,  # 빨간색
            "image": {
                "url": image_url
            }
        }]
    }
    response = requests.post(WEBHOOK_URL, json=data)
    if response.status_code == 204:
        print(f"✅ 임베드 전송 성공: {title}")
    else:
        print(f"❌ 전송 실패: {response.status_code}")

# 메시지 전송
print("📤 디스코드로 보고서 전송 중...\n")

send_message(report)
send_message(report2)
send_message(report3)

# 주요 이미지 전송
print("\n📸 주요 소재 이미지 전송 중...\n")

send_embed_with_image(
    "🔴 DA 저효율 #1",
    "branding_promotionend_v2_260129_img\n10.8만원 지출 / 구매 미발생",
    images["branding_promotionend_v2_260129_img"]
)

send_embed_with_image(
    "🔴 DA 저효율 #2",
    "branding_newyearevent_260107_img\n6.5만원 지출 / 구매 미발생",
    images["branding_newyearevent_260107_img"]
)

send_embed_with_image(
    "🔴 VA 저효율 #1",
    "branding_gaiyoonreview_v2_260107_vid\n1.7만원 지출 / 구매 미발생",
    images["branding_gaiyoonreview_v2_260107_vid"]
)

print("\n✅ 모든 메시지 전송 완료!")
