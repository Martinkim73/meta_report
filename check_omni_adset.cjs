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

// Omnichannel adset from earlier test
const OMNI_ADSET = '120241978972260154';

console.log('🔍 Checking Omnichannel Adset promoted_object');
console.log('==============================================\n');

async function checkAdset(adsetId) {
  return new Promise((resolve) => {
    const url = `https://graph.facebook.com/v22.0/${adsetId}?fields=id,name,promoted_object,destination_type,optimization_goal&access_token=${config.access_token}`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('✅ Adset:', result.name);
          console.log('   ID:', result.id);
          console.log('   destination_type:', result.destination_type || 'N/A');
          console.log('   optimization_goal:', result.optimization_goal || 'N/A');
          console.log('');
          console.log('========== promoted_object ==========');
          console.log(JSON.stringify(result.promoted_object, null, 2));
          console.log('=====================================');
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
  await checkAdset(OMNI_ADSET);
})();
