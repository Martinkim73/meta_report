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

// Reference web ad
const WEB_AD = '120243214299330154';

console.log('🔍 Checking Web Ad Creative');
console.log('============================\n');

async function checkAd(adId) {
  return new Promise((resolve) => {
    const url = `https://graph.facebook.com/v22.0/${adId}?fields=creative{id,name,object_story_spec,asset_feed_spec,applink_treatment,degrees_of_freedom_spec}&access_token=${config.access_token}`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.creative) {
            console.log('✅ Creative 발견!');
            console.log('   applink_treatment:', result.creative.applink_treatment || 'N/A');
            console.log('   Has asset_feed_spec:', result.creative.asset_feed_spec ? 'YES' : 'NO');
            console.log('   Has asset_customization_rules:', result.creative.asset_feed_spec?.asset_customization_rules ? 'YES' : 'NO');
            console.log('   optimization_type:', result.creative.asset_feed_spec?.optimization_type || 'N/A');
            console.log('');
            console.log('========== Web Creative Full Structure ==========');
            console.log(JSON.stringify(result.creative, null, 2));
            console.log('=================================================');
            resolve(result);
          } else {
            console.log('❌ Error:', result.error?.message);
            resolve(null);
          }
        } catch (e) {
          console.log('❌ Parse error');
          resolve(null);
        }
      });
    }).on('error', () => {
      console.log('❌ Network error');
      resolve(null);
    });
  });
}

(async () => {
  await checkAd(WEB_AD);
})();
