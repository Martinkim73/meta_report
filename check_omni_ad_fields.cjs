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

// Working omnichannel ad
const OMNI_AD = '120242864833540154';

console.log('🔍 Checking Omnichannel Ad Fields');
console.log('==================================\n');

async function checkAd(adId) {
  return new Promise((resolve) => {
    const url = `https://graph.facebook.com/v22.0/${adId}?fields=id,name,adset_id,creative,status,tracking_specs,conversion_specs&access_token=${config.access_token}`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('========== Omnichannel Ad ==========');
          console.log(JSON.stringify(result, null, 2));
          console.log('====================================');
          resolve(result);
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
  await checkAd(OMNI_AD);
})();
