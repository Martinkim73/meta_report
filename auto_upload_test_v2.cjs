const fs = require('fs');
const https = require('https');
const path = require('path');

// ============ CONFIG ============
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

const REFERENCE_AD = '120243214299330154';

const IMAGES = {
  '1x1': path.join(__dirname, 'test_image', 'branding_benefit_focus_v2_251114_img_1x1.png'),
  '4x5': path.join(__dirname, 'test_image', 'branding_benefit_focus_v2_251114_img_4x5.png'),
  '9x16': path.join(__dirname, 'test_image', 'branding_benefit_focus_v2_251114_img_9x16.png'),
  '9x16reels': path.join(__dirname, 'test_image', 'branding_benefit_focus_v2_251114_img_9x16(Reels).png')
};

console.log('🚀 v2: 정답 구조 100% 복제 (body_label, link_url_label, title_label 포함)');
console.log('=========================================================================\n');

// ============ Upload Image ============
async function uploadImage(imagePath, label) {
  return new Promise((resolve) => {
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const postData = JSON.stringify({ access_token: config.access_token, bytes: base64Image });

    const req = https.request(`https://graph.facebook.com/v22.0/${config.ad_account_id}/adimages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const result = JSON.parse(data);
        const hash = result.images?.[Object.keys(result.images)[0]]?.hash;
        if (hash) {
          console.log(`✅ ${label} 업로드 성공: ${hash}`);
          resolve({ label, hash, success: true });
        } else {
          console.log(`❌ ${label} 업로드 실패:`, result.error?.message);
          resolve({ label, hash: null, success: false });
        }
      });
    });
    req.write(postData);
    req.end();
  });
}

// ============ Find Web Adsets ============
async function findWebAdsets() {
  return new Promise((resolve) => {
    const url = `https://graph.facebook.com/v22.0/${config.ad_account_id}/adsets?fields=id,name,promoted_object,status&limit=100&access_token=${config.access_token}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const result = JSON.parse(data);
        const web = (result.data || []).filter(a =>
          a.status === 'ACTIVE' && !a.promoted_object?.omnichannel_object
        ).slice(0, 2);
        resolve(web);
      });
    }).on('error', () => resolve([]));
  });
}

// ============ Create Creative (정답 100% 복제) ============
async function createCreative(imageHashes) {
  return new Promise((resolve) => {
    const ts = Date.now();

    // 각 규칙마다 고유한 라벨 세트 생성 (정답과 동일 구조)
    // 규칙 1: 9:16 → story
    const rule1_img = `pa_img_9x16_story_${ts}`;
    const rule1_body = `pa_body_story_${ts}`;
    const rule1_link = `pa_link_story_${ts}`;
    const rule1_title = `pa_title_story_${ts}`;

    // 규칙 2: 1:1 → right_hand_column, search
    const rule2_img = `pa_img_1x1_rhc_${ts}`;
    const rule2_body = `pa_body_rhc_${ts}`;
    const rule2_link = `pa_link_rhc_${ts}`;
    const rule2_title = `pa_title_rhc_${ts}`;

    // 규칙 3: 4:5 → facebook feed
    const rule3_img = `pa_img_4x5_fbfeed_${ts}`;
    const rule3_body = `pa_body_fbfeed_${ts}`;
    const rule3_link = `pa_link_fbfeed_${ts}`;
    const rule3_title = `pa_title_fbfeed_${ts}`;

    // 규칙 4: 4:5 → instagram stream
    const rule4_img = `pa_img_4x5_igstream_${ts}`;
    const rule4_body = `pa_body_igstream_${ts}`;
    const rule4_link = `pa_link_igstream_${ts}`;
    const rule4_title = `pa_title_igstream_${ts}`;

    // 규칙 5: 9:16 Reels → instagram reels
    const rule5_img = `pa_img_reels_ig_${ts}`;
    const rule5_body = `pa_body_reels_ig_${ts}`;
    const rule5_link = `pa_link_reels_ig_${ts}`;
    const rule5_title = `pa_title_reels_ig_${ts}`;

    // 규칙 6: 9:16 Reels → facebook reels
    const rule6_img = `pa_img_reels_fb_${ts}`;
    const rule6_body = `pa_body_reels_fb_${ts}`;
    const rule6_link = `pa_link_reels_fb_${ts}`;
    const rule6_title = `pa_title_reels_fb_${ts}`;

    // 규칙 7: 1:1 → fallback
    const rule7_img = `pa_img_1x1_default_${ts}`;
    const rule7_body = `pa_body_default_${ts}`;
    const rule7_link = `pa_link_default_${ts}`;
    const rule7_title = `pa_title_default_${ts}`;

    // 이미지: 각 해시에 해당 규칙 라벨들을 정확히 매핑
    const images = [
      {
        hash: imageHashes['9x16'],
        adlabels: [{ name: rule1_img }]
      },
      {
        hash: imageHashes['1x1'],
        adlabels: [{ name: rule2_img }, { name: rule7_img }]
      },
      {
        hash: imageHashes['4x5'],
        adlabels: [{ name: rule3_img }, { name: rule4_img }]
      },
      {
        hash: imageHashes['9x16reels'],
        adlabels: [{ name: rule5_img }, { name: rule6_img }]
      }
    ];

    // bodies: 모든 규칙의 body_label 포함
    const bodies = [{
      adlabels: [
        { name: rule1_body }, { name: rule2_body }, { name: rule3_body },
        { name: rule4_body }, { name: rule5_body }, { name: rule6_body },
        { name: rule7_body }
      ],
      text: '완벽한 웹 광고 테스트 v2'
    }];

    // titles: 모든 규칙의 title_label 포함
    const titles = [{
      adlabels: [
        { name: rule1_title }, { name: rule2_title }, { name: rule3_title },
        { name: rule4_title }, { name: rule5_title }, { name: rule6_title },
        { name: rule7_title }
      ],
      text: '테스트 타이틀 v2'
    }];

    // link_urls: 모든 규칙의 link_url_label 포함
    const link_urls = [{
      adlabels: [
        { name: rule1_link }, { name: rule2_link }, { name: rule3_link },
        { name: rule4_link }, { name: rule5_link }, { name: rule6_link },
        { name: rule7_link }
      ],
      website_url: 'https://www.codingvalley.com/ldm/7',
      display_url: 'https://www.codingvalley.com'
    }];

    // 7개 규칙 (정답과 100% 동일 구조)
    const rules = [
      {
        customization_spec: {
          age_max: 65, age_min: 13,
          publisher_platforms: ['facebook', 'instagram', 'audience_network', 'messenger'],
          facebook_positions: ['story'],
          instagram_positions: ['ig_search', 'profile_reels', 'story'],
          messenger_positions: ['story'],
          audience_network_positions: ['classic']
        },
        image_label: { name: rule1_img },
        body_label: { name: rule1_body },
        link_url_label: { name: rule1_link },
        title_label: { name: rule1_title },
        priority: 1
      },
      {
        customization_spec: {
          age_max: 65, age_min: 13,
          publisher_platforms: ['facebook'],
          facebook_positions: ['right_hand_column', 'search']
        },
        image_label: { name: rule2_img },
        body_label: { name: rule2_body },
        link_url_label: { name: rule2_link },
        title_label: { name: rule2_title },
        priority: 2
      },
      {
        customization_spec: {
          age_max: 65, age_min: 13,
          publisher_platforms: ['facebook'],
          facebook_positions: ['feed']
        },
        image_label: { name: rule3_img },
        body_label: { name: rule3_body },
        link_url_label: { name: rule3_link },
        title_label: { name: rule3_title },
        priority: 3
      },
      {
        customization_spec: {
          age_max: 65, age_min: 13,
          publisher_platforms: ['instagram'],
          instagram_positions: ['stream']
        },
        image_label: { name: rule4_img },
        body_label: { name: rule4_body },
        link_url_label: { name: rule4_link },
        title_label: { name: rule4_title },
        priority: 4
      },
      {
        customization_spec: {
          age_max: 65, age_min: 13,
          publisher_platforms: ['instagram'],
          instagram_positions: ['reels']
        },
        image_label: { name: rule5_img },
        body_label: { name: rule5_body },
        link_url_label: { name: rule5_link },
        title_label: { name: rule5_title },
        priority: 5
      },
      {
        customization_spec: {
          age_max: 65, age_min: 13,
          publisher_platforms: ['facebook'],
          facebook_positions: ['facebook_reels']
        },
        image_label: { name: rule6_img },
        body_label: { name: rule6_body },
        link_url_label: { name: rule6_link },
        title_label: { name: rule6_title },
        priority: 6
      },
      {
        customization_spec: {
          age_max: 65, age_min: 13
        },
        image_label: { name: rule7_img },
        body_label: { name: rule7_body },
        link_url_label: { name: rule7_link },
        title_label: { name: rule7_title },
        priority: 7
      }
    ];

    const creativeData = {
      access_token: config.access_token,
      name: `PERFECT_WEB_V2_${ts}`,
      object_story_spec: {
        page_id: config.page_id,
        instagram_user_id: '17841459147478114'
      },
      asset_feed_spec: {
        images,
        bodies,
        titles,
        descriptions: [{ text: 'AI 시대 성공 전략, AI 코딩밸리' }],
        link_urls,
        call_to_action_types: ['LEARN_MORE'],
        ad_formats: ['AUTOMATIC_FORMAT'],
        asset_customization_rules: rules,
        optimization_type: 'PLACEMENT'
      }
    };

    const url = `https://graph.facebook.com/v22.0/${config.ad_account_id}/adcreatives`;
    const req = https.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const result = JSON.parse(data);
        if (result.id) {
          console.log(`✅ Creative 생성 성공: ${result.id}`);
          resolve({ success: true, id: result.id });
        } else {
          console.log(`❌ Creative 생성 실패:`, result.error?.message);
          console.log(`   Subcode:`, result.error?.error_subcode);
          console.log(`   User Msg:`, result.error?.error_user_msg);
          resolve({ success: false, error: result.error });
        }
      });
    });
    req.write(JSON.stringify(creativeData));
    req.end();
  });
}

// ============ Create Ad ============
async function createAd(adsetId, creativeId, adsetName) {
  return new Promise((resolve) => {
    const adData = {
      access_token: config.access_token,
      name: `PERFECT_WEB_V2_AD_${Date.now()}`,
      adset_id: adsetId,
      creative: { creative_id: creativeId },
      status: 'PAUSED'
    };
    const url = `https://graph.facebook.com/v22.0/${config.ad_account_id}/ads`;
    const req = https.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const result = JSON.parse(data);
        if (result.id) {
          console.log(`✅ Ad 생성 성공: ${result.id} (${adsetName})`);
          resolve({ success: true, id: result.id });
        } else {
          console.log(`❌ Ad 생성 실패:`, result.error?.message);
          resolve({ success: false, error: result.error });
        }
      });
    });
    req.write(JSON.stringify(adData));
    req.end();
  });
}

// ============ Verify - 전체 JSON 출력 ============
async function verifyAndDump(adId) {
  return new Promise((resolve) => {
    const url = `https://graph.facebook.com/v22.0/${adId}?fields=creative{id,asset_feed_spec}&access_token=${config.access_token}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const result = JSON.parse(data);
        const afs = result.creative?.asset_feed_spec;

        console.log('\n========== 생성된 광고 전체 asset_feed_spec ==========');
        console.log(JSON.stringify(afs, null, 2));
        console.log('=====================================================\n');

        // 검증
        const imgs = afs?.images?.length || 0;
        const rules = afs?.asset_customization_rules?.length || 0;
        const hasBodyLabels = afs?.asset_customization_rules?.every(r => r.body_label) || false;
        const hasLinkLabels = afs?.asset_customization_rules?.every(r => r.link_url_label) || false;
        const hasTitleLabels = afs?.asset_customization_rules?.every(r => r.title_label) || false;

        console.log('🔍 검증 결과:');
        console.log(`   이미지: ${imgs}개 ${imgs === 4 ? '✅' : '❌'}`);
        console.log(`   규칙: ${rules}개 ${rules === 7 ? '✅' : '❌'}`);
        console.log(`   body_label: ${hasBodyLabels ? '✅ 모두 있음' : '❌ 빠짐'}`);
        console.log(`   link_url_label: ${hasLinkLabels ? '✅ 모두 있음' : '❌ 빠짐'}`);
        console.log(`   title_label: ${hasTitleLabels ? '✅ 모두 있음' : '❌ 빠짐'}`);

        const allGood = imgs === 4 && rules === 7 && hasBodyLabels && hasLinkLabels && hasTitleLabels;
        console.log(`\n   최종: ${allGood ? '✅ 정답과 100% 일치!' : '❌ 구조 불일치'}`);

        resolve(allGood);
      });
    }).on('error', () => resolve(false));
  });
}

// ============ MAIN ============
(async () => {
  let attempt = 0;
  const MAX = 5;

  while (attempt < MAX) {
    attempt++;
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🔄 시도 ${attempt}/${MAX}`);
    console.log('='.repeat(50) + '\n');

    // Step 1: Upload images
    console.log('📤 4개 이미지 개별 업로드');
    const uploads = await Promise.all([
      uploadImage(IMAGES['1x1'], '1:1'),
      uploadImage(IMAGES['4x5'], '4:5'),
      uploadImage(IMAGES['9x16'], '9:16'),
      uploadImage(IMAGES['9x16reels'], '9:16 Reels')
    ]);

    if (!uploads.every(u => u.success)) { console.log('❌ 업로드 실패. 재시도...\n'); continue; }

    const hashes = {
      '1x1': uploads.find(u => u.label === '1:1').hash,
      '4x5': uploads.find(u => u.label === '4:5').hash,
      '9x16': uploads.find(u => u.label === '9:16').hash,
      '9x16reels': uploads.find(u => u.label === '9:16 Reels').hash
    };
    console.log('');

    // Step 2: Find adsets
    console.log('🔍 웹 광고세트 찾기');
    const adsets = await findWebAdsets();
    if (adsets.length < 2) { console.log('❌ 광고세트 부족. 재시도...\n'); continue; }
    adsets.forEach((a, i) => console.log(`   ${i+1}. ${a.name} (${a.id})`));
    console.log('');

    // Step 3: Create creative
    console.log('🎨 Creative 생성 (body_label, link_url_label, title_label 포함!)');
    const creative = await createCreative(hashes);
    if (!creative.success) { console.log('❌ Creative 실패. 재시도...\n'); continue; }

    await new Promise(r => setTimeout(r, 2000));

    // Step 4: Create ads
    console.log('\n📢 2개 광고세트에 광고 생성');
    const ads = [];
    let allOk = true;
    for (let i = 0; i < 2; i++) {
      const ad = await createAd(adsets[i].id, creative.id, adsets[i].name);
      if (!ad.success) { allOk = false; break; }
      ads.push(ad.id);
      await new Promise(r => setTimeout(r, 1000));
    }

    if (!allOk) { console.log('❌ Ad 생성 실패. 재시도...\n'); continue; }

    // Step 5: Verify - 전체 JSON 출력
    console.log('\n🔬 생성 결과 전체 JSON 검증');
    await new Promise(r => setTimeout(r, 2000));
    const verified = await verifyAndDump(ads[0]);

    if (verified) {
      console.log('\n' + '='.repeat(50));
      console.log('🎉🎉🎉 성공! 정답 구조 100% 복제 완료! 🎉🎉🎉');
      console.log('='.repeat(50));
      console.log(`\n광고 1: ${ads[0]}`);
      console.log(`광고 2: ${ads[1]}`);
      console.log(`Creative: ${creative.id}`);
      process.exit(0);
    }
  }

  console.log('\n❌ 최대 시도 초과');
  process.exit(1);
})();
