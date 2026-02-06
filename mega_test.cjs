const fs = require('fs');
const https = require('https');

const env = {};
fs.readFileSync('.env', 'utf8').split('\n').forEach(line => {
  line = line.trim();
  if (line && !line.startsWith('#') && line.includes('=')) {
    const [key, ...val] = line.split('=');
    env[key.trim()] = val.join('=').trim();
  }
});

const clients = JSON.parse(fs.readFileSync('clients.json', 'utf8'));
const config = clients['AI코딩밸리'];

// Test Image Hash (이미 업로드된 이미지 사용)
const IMAGE_HASH = 'd56185a11cb190c08f221e3f445eab9b';

console.log('🧪 메가 테스트: Creative 생성 (옴니채널 vs 일반)');
console.log('===============================================');
console.log('Ad Account:', config.ad_account_id);
console.log('Page ID:', config.page_id);
console.log('Access Token:', config.access_token.substring(0, 20) + '...');
console.log('===============================================\n');

async function testCreative(name, structure) {
  return new Promise((resolve) => {
    const url = `https://graph.facebook.com/v22.0/${config.ad_account_id}/adcreatives`;
    const postData = JSON.stringify(structure);

    console.log(`📤 테스트: ${name}`);
    console.log('Request:', JSON.stringify(structure, null, 2));

    const req = https.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const result = JSON.parse(data);
        if (result.id) {
          console.log(`✅ 성공! Creative ID: ${result.id}\n`);
          resolve({ success: true, structure, id: result.id });
        } else {
          console.log(`❌ 실패: ${result.error?.message || 'Unknown'}`);
          console.log(`   Subcode: ${result.error?.error_subcode || 'N/A'}`);
          console.log(`   User Msg: ${result.error?.error_user_msg || 'N/A'}\n`);
          resolve({ success: false, structure, error: result.error });
        }
      });
    });

    req.write(postData);
    req.end();
  });
}

// 테스트 구조들
const structures = [
  {
    name: '구조 1: 일반 웹구매 (현재 코드)',
    structure: {
      access_token: config.access_token,
      name: 'TEST_DA_WEB_' + Date.now(),
      object_story_spec: {
        page_id: config.page_id,
        instagram_user_id: '17841459147478114'
      },
      asset_feed_spec: {
        images: [{ hash: IMAGE_HASH }],
        bodies: [{ text: 'Test body' }],
        titles: [{ text: 'Test title' }],
        descriptions: [{ text: 'Test description' }],
        link_urls: [{ website_url: 'https://www.codingvalley.com/ldm/7', display_url: 'https://www.codingvalley.com' }],
        call_to_action_types: ['LEARN_MORE'],
        ad_formats: ['AUTOMATIC_FORMAT'],
        optimization_type: 'PLACEMENT'
      },
      degrees_of_freedom_spec: {
        creative_features_spec: {
          standard_enhancements: {
            enroll_status: 'OPT_IN'
          }
        }
      }
    }
  },
  {
    name: '구조 2: 옴니채널 (현재 코드)',
    structure: {
      access_token: config.access_token,
      name: 'TEST_DA_OMNI_' + Date.now(),
      object_story_spec: {
        page_id: config.page_id,
        instagram_user_id: '17841459147478114'
      },
      asset_feed_spec: {
        images: [{ hash: IMAGE_HASH }],
        bodies: [{ text: 'Test body' }],
        titles: [{ text: 'Test title' }],
        descriptions: [{ text: 'Test description' }],
        link_urls: [{ website_url: 'https://www.codingvalley.com/ldm/7', display_url: 'https://www.codingvalley.com' }],
        call_to_action_types: ['LEARN_MORE'],
        ad_formats: ['AUTOMATIC_FORMAT'],
        optimization_type: 'PLACEMENT'
      },
      applink_treatment: 'automatic',
      degrees_of_freedom_spec: {
        creative_features_spec: {
          standard_enhancements: {
            enroll_status: 'OPT_IN'
          }
        }
      }
    }
  }
];

// 순차 테스트
(async () => {
  for (const test of structures) {
    const result = await testCreative(test.name, test.structure);
    if (result.success) {
      console.log('🎉 성공한 구조 발견!');
      console.log('이 구조를 메인 코드에 적용하세요:\n');
      console.log(JSON.stringify(result.structure, null, 2));
      break;
    }
  }
})();
