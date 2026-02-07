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

// Test ads created today
const TEST_ADS = [
  '120243224045370154',
  '120243224052040154',
  '120243224105530154',
  '120243224109220154'
];

console.log('🔍 테스트 광고 확인');
console.log('==================\n');

async function checkAd(adId) {
  return new Promise((resolve) => {
    const url = `https://graph.facebook.com/v22.0/${adId}?fields=id,name,adset{name},status&access_token=${config.access_token}`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log(`✅ 광고 ID: ${result.id}`);
          console.log(`   이름: ${result.name}`);
          console.log(`   광고세트: ${result.adset?.name || 'N/A'}`);
          console.log(`   상태: ${result.status}`);
          console.log('');
          resolve(result);
        } catch (e) {
          console.log(`❌ ${adId}: Parse error`);
          resolve(null);
        }
      });
    }).on('error', () => {
      console.log(`❌ ${adId}: Network error`);
      resolve(null);
    });
  });
}

(async () => {
  for (const adId of TEST_ADS) {
    await checkAd(adId);
  }
})();
