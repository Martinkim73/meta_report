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

// 옴니채널 광고 ID들
const ADS = ['120243171098540154', '120243171098520154', '120242865102020154'];

async function checkAd(adId) {
  return new Promise((resolve) => {
    const url = `https://graph.facebook.com/v22.0/${adId}?fields=creative{id,name,object_story_spec,asset_feed_spec,applink_treatment,degrees_of_freedom_spec}&access_token=${env.META_ACCESS_TOKEN}`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.creative) {
            console.log('✅ 광고', adId, '- Creative 발견!');
            console.log('   applink_treatment:', result.creative.applink_treatment || 'N/A');
            console.log('   asset_feed_spec:', result.creative.asset_feed_spec ? 'YES' : 'NO');
            resolve(result);
          } else {
            console.log('❌ 광고', adId, '- 에러:', result.error?.message || 'Unknown');
            resolve(null);
          }
        } catch (e) {
          console.log('❌ 광고', adId, '- Parse 에러');
          resolve(null);
        }
      });
    }).on('error', () => {
      console.log('❌ 광고', adId, '- Network 에러');
      resolve(null);
    });
  });
}

(async () => {
  for (const adId of ADS) {
    const result = await checkAd(adId);
    if (result?.creative) {
      console.log('');
      console.log('========== 옴니채널 광고', adId, '전체 구조 ==========');
      console.log(JSON.stringify(result.creative, null, 2));
      console.log('==================================================');

      if (result.creative.asset_feed_spec) {
        console.log('');
        console.log('🔍 asset_feed_spec Keys:', Object.keys(result.creative.asset_feed_spec));
      }
      break;
    }
  }
})();
