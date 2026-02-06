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

console.log('🔍 Checking ALL Adsets (ACTIVE + PAUSED)');
console.log('==========================================\n');

async function getAllAdsets() {
  return new Promise((resolve) => {
    const url = `https://graph.facebook.com/v22.0/${config.ad_account_id}/adsets?fields=id,name,promoted_object,destination_type,status&limit=100&access_token=${config.access_token}`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const result = JSON.parse(data);
        const adsets = result.data || [];

        console.log(`Total Adsets: ${adsets.length}\n`);

        const omni = adsets.filter(a => a.promoted_object?.omnichannel_object);
        const web = adsets.filter(a => a.destination_type === 'WEBSITE' && !a.promoted_object?.omnichannel_object);

        console.log('=== OMNICHANNEL ADSETS ===');
        omni.forEach(a => {
          console.log(`  [${a.status}] ${a.name} (${a.id})`);
        });

        console.log('\n=== WEB-ONLY ADSETS ===');
        web.forEach(a => {
          console.log(`  [${a.status}] ${a.name} (${a.id})`);
        });

        console.log('\n=== ACTIVE ONLY ===');
        console.log(`Omni ACTIVE: ${omni.filter(a => a.status === 'ACTIVE').length}`);
        console.log(`Web ACTIVE: ${web.filter(a => a.status === 'ACTIVE').length}`);

        resolve({ omni, web });
      });
    }).on('error', () => resolve({ omni: [], web: [] }));
  });
}

(async () => {
  await getAllAdsets();
})();
