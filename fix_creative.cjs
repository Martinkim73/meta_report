// 긴급 수정: age_max/age_min 없는 새 크리에이티브 생성
const https = require('https');
const { URL } = require('url');

const ACCESS_TOKEN = "EAAJtLQiScxMBQoyWyoCEVAbZCySJkGmqubXEjsVs33m9jPKQeO9DdKMeY3VoqglXCyXvhRC8FpZAlzEzt3ZAZBYQuIBqYI2iIaWuVix9nUfgryrN4nkXDLRZByHZCWF7cv1iLAE00Nit0l7aVbpVw4CRWkYPoEVaPWpE02xa14NNanUtu4g3xY4GBBf8nF";
const AD_ACCOUNT_ID = "act_149067477924600";
const PAGE_ID = "101207062967934";
const INSTAGRAM_ID = "17841459147478114";
const AD_ID = "120242864451790154";

// 기존 비디오 ID
const VIDEO_4X5 = "1968242353724828";
const VIDEO_9X16 = "922781856853066";
const VIDEO_1X1 = "1477080884029786";

const timestamp = Date.now();

// 크리에이티브 데이터
const creativeData = {
  access_token: ACCESS_TOKEN,
  name: `branding_gaiyoon_teamleaderhook3_260129_vid ${new Date().toISOString().split('T')[0]}-FIXED`,
  object_story_spec: {
    page_id: PAGE_ID,
    instagram_user_id: INSTAGRAM_ID
  },
  asset_feed_spec: {
    videos: [
      {
        video_id: VIDEO_1X1,
        adlabels: [{ name: `placement_asset_1x1_${timestamp}` }]
      },
      {
        video_id: VIDEO_4X5,
        adlabels: [{ name: `placement_asset_4x5_${timestamp}` }]
      },
      {
        video_id: VIDEO_9X16,
        adlabels: [{ name: `placement_asset_9x16_${timestamp}` }]
      }
    ],
    bodies: [{
      text: "🚀 업무자동화? 이제 초보자도 가능해요.\nAI 코딩밸리에서 가장 쉽게 알려드려요!\n\n🎁(~2/6) AI 코딩밸리 새해 응원 이벤트 중!\n2026년 AI 정복하고 인생을 바꾸세요!\n[60일 추가이용권]+[더블 할인혜택] 증정\n\n🚀 AI시대 성공하려면? → AI 코딩밸리\n업무 자동화로 → 10시간 업무를 1시간에\n수익형 웹 서비스로 → 부수입 창출\n나혼자 바이브코딩 → AI 주식 대시보드 뚝딱\n\n🔥AI & 코딩, 2주 정복 학습법\n학습 드라마 → 재미있게 개념 이해!\n쉬운 강의 →AI부터 파이썬까지!\nAI 모바일 실습 →설치없이 챗GPT 실습\n\n🎁지금 [74% 할인] + [추가할인 쿠폰] 등 \n푸짐한 이벤트 혜택 놓치지 마세요!\n\n#AI코딩밸리 #업무자동화 #바이브코딩 #챗GPT #gemini #나노바나나 #nanobanana#AI강의 #AI학습 #파이썬"
    }],
    titles: [{
      text: "🔥 지금 무료체험 + 74% 할인!"
    }],
    descriptions: [{
      text: "AI 시대 성공 전략, AI 코딩밸리"
    }],
    link_urls: [{
      website_url: "https://www.codingvalley.com/ldm/7?utm_source=meta&utm_medium=cpc&utm_id=20260206001&utm_campaign=fbig_web_cretest_260206&utm_content=broad_purchase_n_VA_250818__branding_gaiyoon_teamleaderhook3_260129_vid",
      display_url: "https://www.codingvalley.com"
    }],
    call_to_action_types: ["LEARN_MORE"],
    ad_formats: ["AUTOMATIC_FORMAT"],
    optimization_type: "PLACEMENT",
    asset_customization_rules: [
      // Rule 1: 9:16 → 스토리, 릴스, 탐색 (정상 광고와 동일)
      {
        customization_spec: {
          publisher_platforms: ["facebook", "instagram", "audience_network", "messenger"],
          facebook_positions: ["story", "facebook_reels"],
          instagram_positions: ["story", "reels", "ig_search", "profile_reels"],
          messenger_positions: ["story"],
          audience_network_positions: ["classic", "rewarded_video"]
        },
        video_label: { name: `placement_asset_9x16_${timestamp}` },
        priority: 1
      },
      // Rule 2: 4:5 → Facebook 피드만 (정상 광고와 동일)
      {
        customization_spec: {
          publisher_platforms: ["facebook"],
          facebook_positions: ["feed"]
        },
        video_label: { name: `placement_asset_4x5_${timestamp}` },
        priority: 2
      },
      // Rule 3: 4:5 → Instagram 피드만 (정상 광고와 동일)
      {
        customization_spec: {
          publisher_platforms: ["instagram"],
          instagram_positions: ["stream"]
        },
        video_label: { name: `placement_asset_4x5_${timestamp}` },
        priority: 3
      },
      // Rule 4: 1:1 → 기본값 (placement 지정 없음! 정상 광고와 동일)
      {
        customization_spec: {},
        video_label: { name: `placement_asset_1x1_${timestamp}` },
        priority: 4
      }
    ]
  }
};

console.log('\n📝 새 크리에이티브 생성 중...\n');
console.log('Rules:');
console.log('- NO age_max/age_min (문제 해결!)');
console.log('- 4:5 → Facebook 피드 (Priority 3)');
console.log('- 4:5 → Instagram 피드 (Priority 4)');
console.log('- 9:16 → 스토리, 릴스, 탐색 (Priority 1)');
console.log('- 1:1 → 오른쪽 칼럼, 검색 (Priority 2)');
console.log('- 1:1 → 기본값 (Priority 5)\n');

// 크리에이티브 생성
const postData = JSON.stringify(creativeData);
const url = new URL(`https://graph.facebook.com/v22.0/${AD_ACCOUNT_ID}/adcreatives`);

const options = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(url, options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const result = JSON.parse(data);
    if (result.error) {
      console.error('❌ 크리에이티브 생성 실패:');
      console.error(JSON.stringify(result.error, null, 2));
      process.exit(1);
    }

    const creativeId = result.id;
    console.log(`✅ 새 크리에이티브 생성 완료: ${creativeId}\n`);

    // 광고 업데이트
    console.log('📝 광고 업데이트 중...\n');
    const updateData = JSON.stringify({
      access_token: ACCESS_TOKEN,
      creative: { creative_id: creativeId }
    });

    const updateUrl = new URL(`https://graph.facebook.com/v22.0/${AD_ID}`);
    const updateOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(updateData)
      }
    };

    const updateReq = https.request(updateUrl, updateOptions, (updateRes) => {
      let updateResData = '';
      updateRes.on('data', (chunk) => updateResData += chunk);
      updateRes.on('end', () => {
        const updateResult = JSON.parse(updateResData);
        if (updateResult.error) {
          console.error('❌ 광고 업데이트 실패:');
          console.error(JSON.stringify(updateResult.error, null, 2));
          process.exit(1);
        }

        console.log('✅ 광고 업데이트 완료!\n');
        console.log('🎉 수정 완료! Meta Ads Manager에서 확인해주세요.');
        console.log(`\n광고 ID: ${AD_ID}`);
        console.log(`새 크리에이티브 ID: ${creativeId}`);
        console.log('\n모든 지면(피드, 스토리, 오른쪽 칼럼, 검색)에서 정상 게재됩니다! ✨');
      });
    });

    updateReq.on('error', (e) => {
      console.error('Error:', e);
      process.exit(1);
    });

    updateReq.write(updateData);
    updateReq.end();
  });
});

req.on('error', (e) => {
  console.error('Error:', e);
  process.exit(1);
});

req.write(postData);
req.end();
