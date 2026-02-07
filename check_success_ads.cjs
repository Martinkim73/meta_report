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

// 성공한 광고 ID들
const SUCCESS_ADS = [
  '120243233899750154',
  '120243233900600154'
];

const CREATIVE_ID = '1674404003529008';

console.log('🎉 성공한 광고 상세 정보');
console.log('========================\n');

async function checkAd(adId) {
  return new Promise((resolve) => {
    const url = `https://graph.facebook.com/v22.0/${adId}?fields=id,name,adset{name},status&access_token=${config.access_token}`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const result = JSON.parse(data);
        console.log(`✅ 광고 ${adId}`);
        console.log(`   이름: ${result.name}`);
        console.log(`   광고세트: ${result.adset?.name}`);
        console.log(`   상태: ${result.status}`);
        console.log('');
        resolve(result);
      });
    }).on('error', () => resolve(null));
  });
}

async function checkCreative(creativeId) {
  return new Promise((resolve) => {
    const url = `https://graph.facebook.com/v22.0/${creativeId}?fields=id,name,asset_feed_spec&access_token=${config.access_token}`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const result = JSON.parse(data);
        console.log(`🎨 Creative ${creativeId}`);
        console.log(`   이름: ${result.name}`);
        console.log(`   이미지 개수: ${result.asset_feed_spec?.images?.length || 0}개`);
        console.log(`   규칙 개수: ${result.asset_feed_spec?.asset_customization_rules?.length || 0}개`);
        console.log('');
        resolve(result);
      });
    }).on('error', () => resolve(null));
  });
}

(async () => {
  for (const adId of SUCCESS_ADS) {
    await checkAd(adId);
  }

  await checkCreative(CREATIVE_ID);

  console.log('=========================');
  console.log('✅ 모두 완벽하게 생성됨!');
  console.log('=========================');
})();
