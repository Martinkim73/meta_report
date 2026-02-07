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

// 조금 전 발견했던 광고세트 ID들
const ADSET_IDS = [
  '120240900675400154',  // interest_businessai_n_DA_251212
  '120240900167460154'   // broad_purchase_n_DA_251212
];

console.log('🔍 특정 광고세트 직접 조회');
console.log('===========================\n');

async function checkAdset(adsetId) {
  return new Promise((resolve) => {
    const url = `https://graph.facebook.com/v22.0/${adsetId}?fields=id,name,status,campaign{id,name,status},effective_status&access_token=${config.access_token}`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.error) {
            console.log(`❌ 광고세트 ${adsetId}`);
            console.log(`   에러: ${result.error.message}`);
            console.log(`   Code: ${result.error.code}`);
            console.log('');
            resolve(null);
          } else {
            console.log(`✅ 광고세트 ${adsetId}`);
            console.log(`   이름: ${result.name}`);
            console.log(`   상태: ${result.status}`);
            console.log(`   실제 상태: ${result.effective_status || 'N/A'}`);
            console.log(`   캠페인: ${result.campaign?.name || 'N/A'}`);
            console.log(`   캠페인 상태: ${result.campaign?.status || 'N/A'}`);
            console.log('');
            resolve(result);
          }
        } catch (e) {
          console.log(`❌ 광고세트 ${adsetId}`);
          console.log(`   Parse 에러: ${e.message}`);
          console.log('');
          resolve(null);
        }
      });
    }).on('error', (e) => {
      console.log(`❌ 광고세트 ${adsetId}`);
      console.log(`   Network 에러: ${e.message}`);
      console.log('');
      resolve(null);
    });
  });
}

(async () => {
  console.log('Rate limit을 피하기 위해 천천히 조회합니다...\n');

  for (const adsetId of ADSET_IDS) {
    await checkAdset(adsetId);
    await new Promise(r => setTimeout(r, 2000)); // 2초 대기
  }
})();
