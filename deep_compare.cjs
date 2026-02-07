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

// 정답 광고 (수동 성공)
const REFERENCE_AD = '120243214299330154';
// 내가 만든 광고 (실패작)
const MY_AD = '120243233899750154';

async function getFullCreative(adId, label) {
  return new Promise((resolve) => {
    const url = `https://graph.facebook.com/v22.0/${adId}?fields=creative{id,asset_feed_spec,degrees_of_freedom_spec,applink_treatment}&access_token=${config.access_token}`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const result = JSON.parse(data);
        resolve(result.creative);
      });
    }).on('error', () => resolve(null));
  });
}

function analyzeRule(rule, images) {
  // image_label의 name으로 해당 이미지의 hash 찾기
  const labelName = rule.image_label?.name;
  let matchedHash = 'UNKNOWN';

  if (images) {
    for (const img of images) {
      if (img.adlabels?.some(l => l.name === labelName)) {
        matchedHash = img.hash;
        break;
      }
    }
  }

  const platforms = rule.customization_spec?.publisher_platforms?.join(', ') || 'ALL (fallback)';
  const fb = rule.customization_spec?.facebook_positions?.join(', ') || '-';
  const ig = rule.customization_spec?.instagram_positions?.join(', ') || '-';
  const msg = rule.customization_spec?.messenger_positions?.join(', ') || '-';
  const an = rule.customization_spec?.audience_network_positions?.join(', ') || '-';

  return { priority: rule.priority, platforms, fb, ig, msg, an, labelName, matchedHash };
}

(async () => {
  console.log('🔍 정밀 비교: 정답 광고 vs 내 광고');
  console.log('====================================\n');

  const ref = await getFullCreative(REFERENCE_AD, 'REFERENCE');
  await new Promise(r => setTimeout(r, 2000));
  const mine = await getFullCreative(MY_AD, 'MINE');

  if (!ref || !mine) {
    console.log('❌ 크리에이티브 조회 실패');
    return;
  }

  // ============ 이미지 비교 ============
  console.log('========== 이미지 비교 ==========\n');

  console.log('--- 정답 광고 이미지 ---');
  ref.asset_feed_spec.images.forEach((img, i) => {
    console.log(`  Image ${i+1}: hash=${img.hash}`);
    console.log(`    labels: ${img.adlabels.map(l => l.name).join(', ')}`);
  });

  console.log('\n--- 내 광고 이미지 ---');
  mine.asset_feed_spec.images.forEach((img, i) => {
    console.log(`  Image ${i+1}: hash=${img.hash}`);
    console.log(`    labels: ${img.adlabels.map(l => l.name).join(', ')}`);
  });

  // ============ 규칙별 이미지 매핑 비교 ============
  console.log('\n\n========== 규칙별 이미지 매핑 비교 (핵심!) ==========\n');

  const refRules = ref.asset_feed_spec.asset_customization_rules;
  const myRules = mine.asset_feed_spec.asset_customization_rules;

  console.log(`정답: ${refRules.length}개 규칙, 내것: ${myRules.length}개 규칙\n`);

  for (let i = 0; i < Math.max(refRules.length, myRules.length); i++) {
    const refR = refRules[i] ? analyzeRule(refRules[i], ref.asset_feed_spec.images) : null;
    const myR = myRules[i] ? analyzeRule(myRules[i], mine.asset_feed_spec.images) : null;

    console.log(`--- Priority ${i+1} ---`);
    if (refR) {
      console.log(`  [정답] Platforms: ${refR.platforms}`);
      console.log(`         FB: ${refR.fb} | IG: ${refR.ig} | MSG: ${refR.msg} | AN: ${refR.an}`);
      console.log(`         Image Hash: ${refR.matchedHash}`);
    }
    if (myR) {
      console.log(`  [내것] Platforms: ${myR.platforms}`);
      console.log(`         FB: ${myR.fb} | IG: ${myR.ig} | MSG: ${myR.msg} | AN: ${myR.an}`);
      console.log(`         Image Hash: ${myR.matchedHash}`);
    }

    // 차이점 강조
    if (refR && myR) {
      if (refR.fb !== myR.fb) console.log(`  ❌ Facebook 위치 다름!`);
      if (refR.ig !== myR.ig) console.log(`  ❌ Instagram 위치 다름!`);
      if (refR.msg !== myR.msg) console.log(`  ❌ Messenger 위치 다름!`);
      if (refR.an !== myR.an) console.log(`  ❌ AudienceNetwork 위치 다름!`);
      if (refR.platforms !== myR.platforms) console.log(`  ❌ 플랫폼 다름!`);
      if (refR.matchedHash === myR.matchedHash) console.log(`  ⚠️ 같은 해시! (동일 이미지 파일)`);
    }
    console.log('');
  }

  // ============ 전체 JSON 출력 ============
  console.log('\n\n========== 내 광고 전체 asset_feed_spec JSON ==========\n');
  console.log(JSON.stringify(mine.asset_feed_spec, null, 2));

  console.log('\n\n========== 정답 광고 전체 asset_feed_spec JSON ==========\n');
  console.log(JSON.stringify(ref.asset_feed_spec, null, 2));
})();
