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

// Reference Ad IDs from user
const REF_ADS = {
  omni: '120242864833540154',
  web: '120243214299330154'
};

console.log('🔍 Checking Reference Ads');
console.log('=========================\n');

async function checkAd(adId, label) {
  return new Promise((resolve) => {
    const url = `https://graph.facebook.com/v22.0/${adId}?fields=id,name,adset_id,adset{id,name,destination_type,promoted_object,status},creative{id,name,applink_treatment}&access_token=${config.access_token}`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.error) {
            console.log(`❌ ${label}: ${result.error.message}`);
            resolve(null);
          } else {
            console.log(`✅ ${label} Ad: ${result.name}`);
            console.log(`   Ad ID: ${result.id}`);
            console.log(`   Adset ID: ${result.adset_id}`);
            console.log(`   Adset Name: ${result.adset?.name}`);
            console.log(`   Adset Status: ${result.adset?.status}`);
            console.log(`   Destination: ${result.adset?.destination_type}`);
            console.log(`   Omnichannel: ${result.adset?.promoted_object?.omnichannel_object ? 'YES' : 'NO'}`);
            console.log(`   Creative applink_treatment: ${result.creative?.applink_treatment || 'N/A'}`);
            console.log('');
            resolve(result);
          }
        } catch (e) {
          console.log(`❌ ${label}: Parse error`);
          resolve(null);
        }
      });
    }).on('error', () => {
      console.log(`❌ ${label}: Network error`);
      resolve(null);
    });
  });
}

(async () => {
  const omniAd = await checkAd(REF_ADS.omni, 'OMNI');
  const webAd = await checkAd(REF_ADS.web, 'WEB');

  if (omniAd && webAd) {
    console.log('=== SUMMARY ===');
    console.log(`Omni Adset: ${omniAd.adset?.name} (${omniAd.adset_id})`);
    console.log(`Web Adset: ${webAd.adset?.name} (${webAd.adset_id})`);
  }
})();
