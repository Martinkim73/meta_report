const fs = require('fs');
const http = require('http');
const path = require('path');

const IMAGES = {
  '1x1': path.join(__dirname, 'test_image', 'branding_benefit_focus_v2_251114_img_1x1.png'),
  '4x5': path.join(__dirname, 'test_image', 'branding_benefit_focus_v2_251114_img_4x5.png'),
  '9x16': path.join(__dirname, 'test_image', 'branding_benefit_focus_v2_251114_img_9x16.png'),
  '9x16reels': path.join(__dirname, 'test_image', 'branding_benefit_focus_v2_251114_img_9x16(Reels).png')
};

// FormData 생성
function createFormData(fields, file) {
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const parts = [];

  // 텍스트 필드
  for (const [name, value] of Object.entries(fields)) {
    parts.push(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="${name}"\r\n\r\n` +
      `${value}\r\n`
    );
  }

  // 파일 필드
  if (file) {
    const fileBuffer = fs.readFileSync(file.path);
    const filename = path.basename(file.path);
    parts.push(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
      `Content-Type: image/png\r\n\r\n`
    );
    parts.push(fileBuffer);
    parts.push('\r\n');
  }

  parts.push(`--${boundary}--\r\n`);

  return { boundary, body: Buffer.concat(parts.map(p => Buffer.isBuffer(p) ? p : Buffer.from(p, 'utf8'))) };
}

// Phase 1: 이미지 업로드
async function uploadImage(imagePath, label) {
  return new Promise((resolve) => {
    const { boundary, body } = createFormData(
      { clientName: 'AI코딩밸리', mediaType: 'image' },
      { path: imagePath }
    );

    const req = http.request('http://localhost:3000/api/upload-image', {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.hash) {
            console.log(`  ✅ ${label}: ${result.hash}`);
            resolve({ label, hash: result.hash, success: true });
          } else {
            console.log(`  ❌ ${label} 실패:`, result.error);
            resolve({ label, hash: null, success: false });
          }
        } catch (e) {
          console.log(`  ❌ ${label} 파싱 실패:`, data.substring(0, 200));
          resolve({ label, hash: null, success: false });
        }
      });
    });

    req.on('error', (e) => {
      console.log(`  ❌ ${label} 요청 실패:`, e.message);
      resolve({ label, hash: null, success: false });
    });

    req.write(body);
    req.end();
  });
}

// Phase 2: 크리에이티브 + 광고 생성
async function createAd(hashes, testType) {
  const isOmni = testType === 'omni';
  const adsetId = isOmni ? '120241978972260154' : '120240900675400154';
  const adsetName = isOmni ? 'broad_purchase_n_DA_251212' : 'interest_businessai_n_DA_251212';

  const payload = {
    type: 'DA',
    clientName: 'AI코딩밸리',
    adsets: [{
      id: adsetId,
      name: adsetName,
      isOmnichannel: isOmni,
      isApp: false
    }],
    creatives: [{
      name: `OMNI_API_TEST_${testType.toUpperCase()}_${Date.now()}`,
      body: `옴니채널 API 테스트 ${testType}`,
      title: '테스트 타이틀',
      musicIds: [],
      media: [
        { slot: '기본 이미지', ratio: '1:1', hash: hashes['1x1'] },
        { slot: '피드 이미지', ratio: '4:5', hash: hashes['4x5'] },
        { slot: '스토리 이미지', ratio: '9:16', hash: hashes['9x16'] },
        { slot: '릴스 이미지', ratio: '9:16', hash: hashes['9x16reels'] }
      ]
    }],
    landingUrl: 'https://www.codingvalley.com/ldm/7',
    displayUrl: 'https://www.codingvalley.com',
    description: 'AI 시대 성공 전략, AI 코딩밸리',
    urlTags: 'utm_source=meta&utm_medium=cpc&utm_campaign={{campaign.name}}&utm_content={{adset.name}}__{{ad.name}}'
  };

  const body = JSON.stringify(payload);

  return new Promise((resolve) => {
    const req = http.request('http://localhost:3000/api/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.success && result.results) {
            console.log(`  ✅ 광고 생성 성공!`);
            const allAdIds = result.results.flatMap(r => r.adIds);
            const allCreativeIds = result.results.map(r => r.creativeId);
            console.log(`     광고 ID: ${allAdIds.join(', ')}`);
            console.log(`     크리에이티브 ID: ${allCreativeIds.join(', ')}`);
            resolve({ success: true, adIds: allAdIds, creativeIds: allCreativeIds });
          } else {
            console.log(`  ❌ 광고 생성 실패:`, result.error || result.message);
            resolve({ success: false, error: result.error });
          }
        } catch (e) {
          console.log(`  ❌ 응답 파싱 실패:`, data.substring(0, 500));
          resolve({ success: false, error: 'Parse error' });
        }
      });
    });

    req.on('error', (e) => {
      console.log(`  ❌ 요청 실패:`, e.message);
      resolve({ success: false, error: e.message });
    });

    req.write(body);
    req.end();
  });
}

async function testUpload(testType) {
  const isOmni = testType === 'omni';

  console.log(`\n${'='.repeat(70)}`);
  console.log(`🧪 테스트: ${isOmni ? '옴니채널' : '웹'} 광고 업로드`);
  console.log('='.repeat(70));

  // Phase 1: 이미지 업로드
  console.log('\n📤 Phase 1: 이미지 업로드');
  const uploads = await Promise.all([
    uploadImage(IMAGES['1x1'], '1:1'),
    uploadImage(IMAGES['4x5'], '4:5'),
    uploadImage(IMAGES['9x16'], '9:16'),
    uploadImage(IMAGES['9x16reels'], '9:16 Reels')
  ]);

  if (!uploads.every(u => u.success)) {
    console.log('\n❌ 이미지 업로드 실패 - 중단');
    return { success: false };
  }

  const hashes = {
    '1x1': uploads.find(u => u.label === '1:1').hash,
    '4x5': uploads.find(u => u.label === '4:5').hash,
    '9x16': uploads.find(u => u.label === '9:16').hash,
    '9x16reels': uploads.find(u => u.label === '9:16 Reels').hash
  };

  // Phase 2: 크리에이티브 + 광고 생성
  console.log('\n🎨 Phase 2: 크리에이티브 + 광고 생성');
  const result = await createAd(hashes, testType);

  return result;
}

(async () => {
  console.log('🚀 Next.js API 옴니채널 테스트 시작');
  console.log('서버: http://localhost:3000');

  // 1초 대기 (서버 안정화)
  await new Promise(r => setTimeout(r, 1000));

  // 1. 옴니채널 테스트
  const omniResult = await testUpload('omni');

  if (!omniResult.success) {
    console.log('\n❌ 옴니채널 테스트 실패 - 웹 테스트는 계속 진행');
  }

  // 2초 대기
  await new Promise(r => setTimeout(r, 2000));

  // 2. 웹 테스트
  const webResult = await testUpload('web');

  console.log('\n' + '='.repeat(70));
  console.log('🎉 테스트 완료');
  console.log(`옴니채널: ${omniResult.adIds?.join(', ') || 'FAILED'}`);
  console.log(`웹: ${webResult.adIds?.join(', ') || 'FAILED'}`);
  console.log('='.repeat(70));

  process.exit(omniResult.success && webResult.success ? 0 : 1);
})();
