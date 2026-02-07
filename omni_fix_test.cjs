const fs = require('fs');
const https = require('https');
const path = require('path');

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

const OMNI_ADSET = '120241978972260154';
const WEB_ADSET = '120240900675400154';

const IMAGES = {
  '1x1': path.join(__dirname, 'test_image', 'branding_benefit_focus_v2_251114_img_1x1.png'),
  '4x5': path.join(__dirname, 'test_image', 'branding_benefit_focus_v2_251114_img_4x5.png'),
  '9x16': path.join(__dirname, 'test_image', 'branding_benefit_focus_v2_251114_img_9x16.png'),
  '9x16reels': path.join(__dirname, 'test_image', 'branding_benefit_focus_v2_251114_img_9x16(Reels).png')
};

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
          console.log(`✅ ${label} 업로드: ${hash}`);
          resolve({ label, hash, success: true });
        } else {
          console.log(`❌ ${label} 실패:`, result.error?.message);
          resolve({ label, hash: null, success: false });
        }
      });
    });
    req.write(postData);
    req.end();
  });
}

async function createCreative(imageHashes, isOmni, adsetName) {
  return new Promise((resolve) => {
    const ts = Date.now();

    const ruleLabels = {
      r1: { img: `pa_img_9x16_story_${ts}`, body: `pa_body_story_${ts}`, link: `pa_link_story_${ts}`, title: `pa_title_story_${ts}` },
      r2: { img: `pa_img_1x1_rhc_${ts}`, body: `pa_body_rhc_${ts}`, link: `pa_link_rhc_${ts}`, title: `pa_title_rhc_${ts}` },
      r3: { img: `pa_img_4x5_fbfeed_${ts}`, body: `pa_body_fbfeed_${ts}`, link: `pa_link_fbfeed_${ts}`, title: `pa_title_fbfeed_${ts}` },
      r4: { img: `pa_img_4x5_igstream_${ts}`, body: `pa_body_igfeed_${ts}`, link: `pa_link_igfeed_${ts}`, title: `pa_title_igfeed_${ts}` },
      r5: { img: `pa_img_reels_ig_${ts}`, body: `pa_body_igreels_${ts}`, link: `pa_link_igreels_${ts}`, title: `pa_title_igreels_${ts}` },
      r6: { img: `pa_img_reels_fb_${ts}`, body: `pa_body_fbreels_${ts}`, link: `pa_link_fbreels_${ts}`, title: `pa_title_fbreels_${ts}` },
      r7: { img: `pa_img_1x1_default_${ts}`, body: `pa_body_default_${ts}`, link: `pa_link_default_${ts}`, title: `pa_title_default_${ts}` },
    };

    const images = [
      { hash: imageHashes['9x16'], adlabels: [{ name: ruleLabels.r1.img }] },
      { hash: imageHashes['1x1'], adlabels: [{ name: ruleLabels.r2.img }, { name: ruleLabels.r7.img }] },
      { hash: imageHashes['4x5'], adlabels: [{ name: ruleLabels.r3.img }, { name: ruleLabels.r4.img }] },
      { hash: imageHashes['9x16reels'], adlabels: [{ name: ruleLabels.r5.img }, { name: ruleLabels.r6.img }] }
    ];

    const allBodyLabels = [
      { name: ruleLabels.r1.body }, { name: ruleLabels.r2.body }, { name: ruleLabels.r3.body },
      { name: ruleLabels.r4.body }, { name: ruleLabels.r5.body }, { name: ruleLabels.r6.body },
      { name: ruleLabels.r7.body }
    ];

    const allTitleLabels = [
      { name: ruleLabels.r1.title }, { name: ruleLabels.r2.title }, { name: ruleLabels.r3.title },
      { name: ruleLabels.r4.title }, { name: ruleLabels.r5.title }, { name: ruleLabels.r6.title },
      { name: ruleLabels.r7.title }
    ];

    const allLinkLabels = [
      { name: ruleLabels.r1.link }, { name: ruleLabels.r2.link }, { name: ruleLabels.r3.link },
      { name: ruleLabels.r4.link }, { name: ruleLabels.r5.link }, { name: ruleLabels.r6.link },
      { name: ruleLabels.r7.link }
    ];

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
        image_label: { name: ruleLabels.r1.img },
        body_label: { name: ruleLabels.r1.body },
        link_url_label: { name: ruleLabels.r1.link },
        title_label: { name: ruleLabels.r1.title },
        priority: 1
      },
      {
        customization_spec: {
          age_max: 65, age_min: 13,
          publisher_platforms: ['facebook'],
          facebook_positions: ['right_hand_column', 'search']
        },
        image_label: { name: ruleLabels.r2.img },
        body_label: { name: ruleLabels.r2.body },
        link_url_label: { name: ruleLabels.r2.link },
        title_label: { name: ruleLabels.r2.title },
        priority: 2
      },
      {
        customization_spec: {
          age_max: 65, age_min: 13,
          publisher_platforms: ['facebook'],
          facebook_positions: ['feed']
        },
        image_label: { name: ruleLabels.r3.img },
        body_label: { name: ruleLabels.r3.body },
        link_url_label: { name: ruleLabels.r3.link },
        title_label: { name: ruleLabels.r3.title },
        priority: 3
      },
      {
        customization_spec: {
          age_max: 65, age_min: 13,
          publisher_platforms: ['instagram'],
          instagram_positions: ['stream']
        },
        image_label: { name: ruleLabels.r4.img },
        body_label: { name: ruleLabels.r4.body },
        link_url_label: { name: ruleLabels.r4.link },
        title_label: { name: ruleLabels.r4.title },
        priority: 4
      },
      {
        customization_spec: {
          age_max: 65, age_min: 13,
          publisher_platforms: ['instagram'],
          instagram_positions: ['reels']
        },
        image_label: { name: ruleLabels.r5.img },
        body_label: { name: ruleLabels.r5.body },
        link_url_label: { name: ruleLabels.r5.link },
        title_label: { name: ruleLabels.r5.title },
        priority: 5
      },
      {
        customization_spec: {
          age_max: 65, age_min: 13,
          publisher_platforms: ['facebook'],
          facebook_positions: ['facebook_reels']
        },
        image_label: { name: ruleLabels.r6.img },
        body_label: { name: ruleLabels.r6.body },
        link_url_label: { name: ruleLabels.r6.link },
        title_label: { name: ruleLabels.r6.title },
        priority: 6
      },
      {
        customization_spec: {
          age_max: 65, age_min: 13
        },
        image_label: { name: ruleLabels.r7.img },
        body_label: { name: ruleLabels.r7.body },
        link_url_label: { name: ruleLabels.r7.link },
        title_label: { name: ruleLabels.r7.title },
        priority: 7
      }
    ];

    const creativeData = {
      access_token: config.access_token,
      name: `OMNI_FIX_TEST_${ts}`,
      url_tags: 'utm_source=meta&utm_medium=cpc&utm_campaign={{campaign.name}}&utm_content={{adset.name}}__{{ad.name}}',
      object_story_spec: {
        page_id: config.page_id,
        instagram_user_id: '17841459147478114'
      },
      asset_feed_spec: {
        images,
        bodies: [{ text: `옴니채널 테스트 ${isOmni ? 'OMNI' : 'WEB'}`, adlabels: allBodyLabels }],
        titles: [{ text: '테스트 타이틀', adlabels: allTitleLabels }],
        descriptions: [{ text: 'AI 시대 성공 전략, AI 코딩밸리' }],
        link_urls: [{
          website_url: 'https://www.codingvalley.com/ldm/7',
          display_url: 'https://www.codingvalley.com',
          adlabels: allLinkLabels
        }],
        call_to_action_types: ['LEARN_MORE'],
        ad_formats: ['AUTOMATIC_FORMAT'],
        asset_customization_rules: rules,
        optimization_type: 'PLACEMENT'
      }
    };

    if (isOmni) {
      creativeData.applink_treatment = 'automatic';
      creativeData.omnichannel_link_spec = {
        web: { url: 'https://www.codingvalley.com/ldm/7' },
        app: {
          application_id: '494894190077063',
          platform_specs: {
            android: { app_name: '코딩밸리', package_name: 'inc.ulift.cv' },
            ios: { app_name: '코딩밸리', app_store_id: '6448019090' }
          }
        }
      };

      // degrees_of_freedom_spec 제거 (Subcode 3858504 에러 원인)
    }

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
          console.log(`❌ Creative 실패:`, result.error?.message);
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

async function createAd(adsetId, creativeId, adsetName) {
  return new Promise((resolve) => {
    const adData = {
      access_token: config.access_token,
      name: `OMNI_FIX_AD_${Date.now()}`,
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
          console.log(`❌ Ad 실패:`, result.error?.message);
          resolve({ success: false, error: result.error });
        }
      });
    });
    req.write(JSON.stringify(adData));
    req.end();
  });
}

(async () => {
  console.log('🚀 옴니채널 수정 테스트 (degrees_of_freedom_spec 제거)');
  console.log('='.repeat(70));

  // 이미지 업로드
  console.log('\n📤 이미지 업로드');
  const uploads = await Promise.all([
    uploadImage(IMAGES['1x1'], '1:1'),
    uploadImage(IMAGES['4x5'], '4:5'),
    uploadImage(IMAGES['9x16'], '9:16'),
    uploadImage(IMAGES['9x16reels'], '9:16 Reels')
  ]);

  if (!uploads.every(u => u.success)) {
    console.log('❌ 이미지 업로드 실패');
    process.exit(1);
  }

  const hashes = {
    '1x1': uploads.find(u => u.label === '1:1').hash,
    '4x5': uploads.find(u => u.label === '4:5').hash,
    '9x16': uploads.find(u => u.label === '9:16').hash,
    '9x16reels': uploads.find(u => u.label === '9:16 Reels').hash
  };

  // 1. 옴니채널 광고세트 테스트
  console.log('\n🌐 옴니채널 광고세트 테스트');
  const omniCreative = await createCreative(hashes, true, 'broad_purchase_n_DA_251212');

  if (!omniCreative.success) {
    console.log('\n❌ 옴니채널 Creative 생성 실패 - 추가 분석 필요');
    process.exit(1);
  }

  await new Promise(r => setTimeout(r, 2000));
  const omniAd = await createAd(OMNI_ADSET, omniCreative.id, 'broad_purchase_n_DA_251212');

  // 2. 웹 광고세트 테스트
  console.log('\n🌍 웹 광고세트 테스트 (기존 로직 유지)');
  const webCreative = await createCreative(hashes, false, 'interest_businessai_n_DA_251212');

  if (!webCreative.success) {
    console.log('\n❌ 웹 Creative 생성 실패');
    process.exit(1);
  }

  await new Promise(r => setTimeout(r, 2000));
  const webAd = await createAd(WEB_ADSET, webCreative.id, 'interest_businessai_n_DA_251212');

  console.log('\n' + '='.repeat(70));
  console.log('🎉 테스트 완료');
  console.log(`옴니채널 광고 ID: ${omniAd.id || 'FAILED'}`);
  console.log(`웹 광고 ID: ${webAd.id || 'FAILED'}`);
  console.log('='.repeat(70));
})();
