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

const OMNI_CREATIVE = '1442308620877667';  // My newly created omni creative
const WEB_ADSET = '120240900167460154';    // Web adset from earlier test

console.log('🧪 Testing: Use omni creative in WEB adset');
console.log('===========================================\n');

async function createAd(adsetId, creativeId) {
  return new Promise((resolve) => {
    const adData = {
      access_token: config.access_token,
      name: `TEST_OMNI_CREATIVE_IN_WEB_${Date.now()}`,
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
          console.log(`✅ Ad created successfully: ${result.id}`);
          console.log('   This proves the omni creative is valid!');
          resolve({ success: true, id: result.id });
        } else {
          console.log(`❌ Ad creation failed:`, result.error?.message);
          console.log(`   Subcode:`, result.error?.error_subcode);
          console.log(`   User Msg:`, result.error?.error_user_msg);
          resolve({ success: false, error: result.error });
        }
      });
    });

    req.write(JSON.stringify(adData));
    req.end();
  });
}

(async () => {
  console.log('Omni Creative ID:', OMNI_CREATIVE);
  console.log('Web Adset ID:', WEB_ADSET);
  console.log('');

  await createAd(WEB_ADSET, OMNI_CREATIVE);
})();
