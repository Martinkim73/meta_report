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

// Working reference creative from the omni ad
const REF_CREATIVE_ID = '1784986325516418';
const OMNI_ADSET = '120241978972260154';

console.log('🧪 Testing: Use working reference creative in omni adset');
console.log('=========================================================\n');

async function createAdWithCreative(adsetId, creativeId) {
  return new Promise((resolve) => {
    const adData = {
      access_token: config.access_token,
      name: `REF_CREATIVE_TEST_${Date.now()}`,
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
          console.log('   This proves the reference creative structure works!');
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
  console.log('Using Creative ID:', REF_CREATIVE_ID);
  console.log('Target Adset:', OMNI_ADSET);
  console.log('');

  await createAdWithCreative(OMNI_ADSET, REF_CREATIVE_ID);
})();
