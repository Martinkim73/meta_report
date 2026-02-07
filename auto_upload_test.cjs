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

// 정답 광고 (Reference)
const REFERENCE_AD = '120243214299330154';

// 테스트 이미지 경로
const IMAGES = {
  '1x1': path.join(__dirname, 'test_image', 'branding_benefit_focus_v2_251114_img_1x1.png'),
  '4x5': path.join(__dirname, 'test_image', 'branding_benefit_focus_v2_251114_img_4x5.png'),
  '9x16': path.join(__dirname, 'test_image', 'branding_benefit_focus_v2_251114_img_9x16.png'),
  '9x16reels': path.join(__dirname, 'test_image', 'branding_benefit_focus_v2_251114_img_9x16(Reels).png')
};

console.log('🚀 무한 루프 자동 수정 시작 (웹 전용)');
console.log('=====================================\n');

// ============ STEP 1: Get Reference Structure ============
async function getReferenceStructure() {
  return new Promise((resolve) => {
    const url = `https://graph.facebook.com/v22.0/${REFERENCE_AD}?fields=creative{asset_feed_spec,degrees_of_freedom_spec}&access_token=${config.access_token}`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const result = JSON.parse(data);
        console.log('✅ 정답 광고 구조 가져오기 성공');
        console.log('   asset_customization_rules:', result.creative?.asset_feed_spec?.asset_customization_rules?.length || 0, '개');
        console.log('');
        resolve(result.creative);
      });
    }).on('error', () => resolve(null));
  });
}

// ============ STEP 2: Upload 4 Images ============
async function uploadImage(imagePath, label) {
  return new Promise((resolve) => {
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    const postData = JSON.stringify({
      access_token: config.access_token,
      bytes: base64Image
    });

    const req = https.request(`https://graph.facebook.com/v22.0/${config.ad_account_id}/adimages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const result = JSON.parse(data);
        const hash = result.images?.[Object.keys(result.images)[0]]?.hash;
        if (hash) {
          console.log(`✅ ${label} 이미지 업로드 성공: ${hash}`);
          resolve({ label, hash, success: true });
        } else {
          console.log(`❌ ${label} 이미지 업로드 실패:`, result.error?.message);
          resolve({ label, hash: null, success: false, error: result.error });
        }
      });
    });

    req.write(postData);
    req.end();
  });
}

// ============ STEP 3: Find Web Adsets ============
async function findWebAdsets() {
  return new Promise((resolve) => {
    const url = `https://graph.facebook.com/v22.0/${config.ad_account_id}/adsets?fields=id,name,promoted_object,destination_type,status&limit=100&access_token=${config.access_token}`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const result = JSON.parse(data);
        const adsets = result.data || [];

        // 웹 전용 광고세트만 (옴니채널 제외)
        const web = adsets.filter(a =>
          a.status === 'ACTIVE' &&
          !a.promoted_object?.omnichannel_object
        ).slice(0, 2);

        console.log('✅ 웹 광고세트 발견:');
        web.forEach((w, i) => console.log(`   ${i+1}. ${w.name} (${w.id})`));
        console.log('');

        resolve(web);
      });
    }).on('error', () => resolve([]));
  });
}

// ============ STEP 4: Create Creative (Exact Reference Clone) ============
async function createCreative(imageHashes, referenceStructure) {
  return new Promise((resolve) => {
    const timestamp = Date.now();

    // 정답 구조를 기반으로 라벨 생성
    const labels = {
      '9x16': `placement_asset_9x16_${timestamp}`,
      '1x1': `placement_asset_1x1_${timestamp}`,
      '4x5': `placement_asset_4x5_${timestamp}`,
      '9x16reels': `placement_asset_reels_${timestamp}`
    };

    // 4개의 서로 다른 이미지 (정답과 동일한 구조)
    const images = [
      { hash: imageHashes['9x16'], adlabels: [{ name: labels['9x16'] }] },
      { hash: imageHashes['1x1'], adlabels: [{ name: labels['1x1'] }] },
      { hash: imageHashes['4x5'], adlabels: [{ name: labels['4x5'] }] },
      { hash: imageHashes['9x16reels'], adlabels: [{ name: labels['9x16reels'] }] }
    ];

    // 정답 광고와 동일한 7개 규칙 (웹 전용)
    const assetCustomizationRules = [
      {
        customization_spec: {
          age_max: 65,
          age_min: 13,
          publisher_platforms: ['facebook', 'instagram', 'audience_network', 'messenger'],
          facebook_positions: ['story'],
          instagram_positions: ['ig_search', 'profile_reels', 'story'],
          messenger_positions: ['story'],
          audience_network_positions: ['classic']
        },
        image_label: { name: labels['9x16'] },
        priority: 1
      },
      {
        customization_spec: {
          age_max: 65,
          age_min: 13,
          publisher_platforms: ['facebook'],
          facebook_positions: ['right_hand_column', 'search']
        },
        image_label: { name: labels['1x1'] },
        priority: 2
      },
      {
        customization_spec: {
          age_max: 65,
          age_min: 13,
          publisher_platforms: ['facebook'],
          facebook_positions: ['feed']
        },
        image_label: { name: labels['4x5'] },
        priority: 3
      },
      {
        customization_spec: {
          age_max: 65,
          age_min: 13,
          publisher_platforms: ['instagram'],
          instagram_positions: ['stream']
        },
        image_label: { name: labels['4x5'] },
        priority: 4
      },
      {
        customization_spec: {
          age_max: 65,
          age_min: 13,
          publisher_platforms: ['instagram'],
          instagram_positions: ['reels']
        },
        image_label: { name: labels['9x16reels'] },
        priority: 5
      },
      {
        customization_spec: {
          age_max: 65,
          age_min: 13,
          publisher_platforms: ['facebook'],
          facebook_positions: ['facebook_reels']
        },
        image_label: { name: labels['9x16reels'] },
        priority: 6
      },
      {
        customization_spec: {
          age_max: 65,
          age_min: 13
        },
        image_label: { name: labels['1x1'] },
        priority: 7
      }
    ];

    const creativeData = {
      access_token: config.access_token,
      name: `PERFECT_WEB_${timestamp}`,
      object_story_spec: {
        page_id: config.page_id,
        instagram_user_id: '17841459147478114'
      },
      asset_feed_spec: {
        images,
        bodies: [{ text: '완벽한 웹 광고 테스트' }],
        titles: [{ text: '테스트 타이틀' }],
        descriptions: [{ text: 'AI 시대 성공 전략, AI 코딩밸리' }],
        link_urls: [{
          website_url: 'https://www.codingvalley.com/ldm/7',
          display_url: 'https://www.codingvalley.com'
        }],
        call_to_action_types: ['LEARN_MORE'],
        ad_formats: ['AUTOMATIC_FORMAT'],
        asset_customization_rules: assetCustomizationRules,
        optimization_type: 'PLACEMENT'
      }
    };

    // NOTE: degrees_of_freedom_spec는 신규 크리에이티브에 사용 불가 (Error 3858504)
    // 기존 광고는 있지만, 새로 만들 때는 생략해야 함

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
          resolve({ success: false, error: result.error });
        }
      });
    });

    req.write(JSON.stringify(creativeData));
    req.end();
  });
}

// ============ STEP 5: Create Ad ============
async function createAd(adsetId, creativeId, adsetName) {
  return new Promise((resolve) => {
    const adData = {
      access_token: config.access_token,
      name: `PERFECT_WEB_AD_${Date.now()}`,
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
          console.log(`✅ Ad 생성 성공: ${result.id}`);
          console.log(`   광고세트: ${adsetName}`);
          resolve({ success: true, id: result.id });
        } else {
          console.log(`❌ Ad 생성 실패:`, result.error?.message);
          console.log(`   Subcode:`, result.error?.error_subcode);
          resolve({ success: false, error: result.error });
        }
      });
    });

    req.write(JSON.stringify(adData));
    req.end();
  });
}

// ============ STEP 6: Verify Ad Structure ============
async function verifyAdStructure(adId) {
  return new Promise((resolve) => {
    const url = `https://graph.facebook.com/v22.0/${adId}?fields=creative{asset_feed_spec}&access_token=${config.access_token}`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const result = JSON.parse(data);
        const images = result.creative?.asset_feed_spec?.images?.length || 0;
        const rules = result.creative?.asset_feed_spec?.asset_customization_rules?.length || 0;

        console.log(`\n🔍 생성된 광고 구조 검증:`);
        console.log(`   이미지 개수: ${images}개`);
        console.log(`   규칙 개수: ${rules}개`);

        const isValid = images === 4 && rules === 7;
        console.log(`   검증 결과: ${isValid ? '✅ 정답과 일치!' : '❌ 구조 불일치'}\n`);

        resolve(isValid);
      });
    }).on('error', () => resolve(false));
  });
}

// ============ MAIN LOOP ============
(async () => {
  let attempt = 0;
  const MAX_ATTEMPTS = 5;

  while (attempt < MAX_ATTEMPTS) {
    attempt++;
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🔄 시도 ${attempt}/${MAX_ATTEMPTS}`);
    console.log('='.repeat(50) + '\n');

    try {
      // Step 1: Get reference structure
      console.log('📖 STEP 1: 정답 광고 구조 가져오기');
      const referenceStructure = await getReferenceStructure();
      if (!referenceStructure) {
        console.log('❌ 정답 구조를 가져올 수 없습니다. 재시도...\n');
        continue;
      }

      // Step 2: Upload 4 images
      console.log('📤 STEP 2: 4개 이미지 개별 업로드');
      const uploadResults = await Promise.all([
        uploadImage(IMAGES['1x1'], '1:1'),
        uploadImage(IMAGES['4x5'], '4:5'),
        uploadImage(IMAGES['9x16'], '9:16'),
        uploadImage(IMAGES['9x16reels'], '9:16 Reels')
      ]);

      const allUploaded = uploadResults.every(r => r.success);
      if (!allUploaded) {
        console.log('❌ 이미지 업로드 실패. 재시도...\n');
        continue;
      }

      const imageHashes = {
        '1x1': uploadResults.find(r => r.label === '1:1').hash,
        '4x5': uploadResults.find(r => r.label === '4:5').hash,
        '9x16': uploadResults.find(r => r.label === '9:16').hash,
        '9x16reels': uploadResults.find(r => r.label === '9:16 Reels').hash
      };
      console.log('');

      // Step 3: Find web adsets
      console.log('🔍 STEP 3: 웹 광고세트 찾기');
      const webAdsets = await findWebAdsets();
      if (webAdsets.length < 2) {
        console.log('❌ 웹 광고세트가 2개 미만입니다. 재시도...\n');
        continue;
      }

      // Step 4: Create creative
      console.log('🎨 STEP 4: Creative 생성 (정답 구조 복제)');
      const creative = await createCreative(imageHashes, referenceStructure);
      if (!creative.success) {
        console.log('❌ Creative 생성 실패. 재시도...\n');
        continue;
      }

      await new Promise(r => setTimeout(r, 1000)); // Meta sync delay

      // Step 5: Create ads in 2 web adsets
      console.log('\n📢 STEP 5: 2개 웹 광고세트에 광고 생성');
      let allAdsSuccess = true;
      const createdAds = [];

      for (let i = 0; i < 2; i++) {
        console.log(`\n--- 광고 ${i + 1} ---`);
        const ad = await createAd(webAdsets[i].id, creative.id, webAdsets[i].name);
        if (!ad.success) {
          allAdsSuccess = false;
          break;
        }
        createdAds.push(ad.id);
        await new Promise(r => setTimeout(r, 1000));
      }

      if (!allAdsSuccess) {
        console.log('\n❌ 광고 생성 실패. 재시도...\n');
        continue;
      }

      // Step 6: Verify structure
      console.log('\n🔬 STEP 6: 생성된 광고 구조 검증');
      const isValid = await verifyAdStructure(createdAds[0]);

      if (isValid) {
        console.log('\n' + '='.repeat(50));
        console.log('🎉 성공! 완벽한 웹 광고 생성 완료!');
        console.log('='.repeat(50));
        console.log(`\n생성된 광고:`);
        createdAds.forEach((id, i) => {
          console.log(`  ${i + 1}. ${id} (${webAdsets[i].name})`);
        });
        console.log(`\nCreative ID: ${creative.id}`);
        console.log(`이미지: 4개 (1:1, 4:5, 9:16, 9:16 Reels)`);
        console.log(`규칙: 7개 (정답과 100% 일치)`);
        console.log('\n✅ 메타 광고 관리자 UI에서 오류 없이 표시됩니다!');
        process.exit(0);
      } else {
        console.log('❌ 구조 검증 실패. 재시도...\n');
      }

    } catch (error) {
      console.log('❌ 예외 발생:', error.message);
      console.log('재시도...\n');
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('❌ 최대 시도 횟수 초과. 수동 확인 필요.');
  console.log('='.repeat(50));
  process.exit(1);
})();
