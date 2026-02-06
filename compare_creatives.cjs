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

const MY_CREATIVE = '1401800434970997';  // Just created
const REF_CREATIVE = '1784986325516418'; // Working reference

console.log('🔍 Comparing Creatives');
console.log('======================\n');

async function fetchCreative(creativeId, label) {
  return new Promise((resolve) => {
    const url = `https://graph.facebook.com/v22.0/${creativeId}?fields=id,name,applink_treatment,object_story_spec,asset_feed_spec,degrees_of_freedom_spec&access_token=${config.access_token}`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log(`\n========== ${label} (${creativeId}) ==========`);
          console.log(JSON.stringify(result, null, 2));
          console.log('='.repeat(50));
          resolve(result);
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
  const myCreative = await fetchCreative(MY_CREATIVE, 'MY CREATIVE');
  const refCreative = await fetchCreative(REF_CREATIVE, 'REFERENCE CREATIVE');

  if (myCreative && refCreative) {
    console.log('\n🔍 KEY DIFFERENCES:');
    console.log('-------------------');
    console.log('applink_treatment:');
    console.log('  Mine:', myCreative.applink_treatment || 'N/A');
    console.log('  Reference:', refCreative.applink_treatment || 'N/A');
    console.log('');
    console.log('degrees_of_freedom_spec:');
    console.log('  Mine:', myCreative.degrees_of_freedom_spec ? 'YES' : 'NO');
    console.log('  Reference:', refCreative.degrees_of_freedom_spec ? 'YES' : 'NO');
    console.log('');
    console.log('asset_feed_spec.images count:');
    console.log('  Mine:', myCreative.asset_feed_spec?.images?.length || 0);
    console.log('  Reference:', refCreative.asset_feed_spec?.images?.length || 0);
    console.log('');
    console.log('asset_customization_rules count:');
    console.log('  Mine:', myCreative.asset_feed_spec?.asset_customization_rules?.length || 0);
    console.log('  Reference:', refCreative.asset_feed_spec?.asset_customization_rules?.length || 0);
  }
})();
