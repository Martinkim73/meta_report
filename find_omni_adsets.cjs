const https = require('https');
const fs = require('fs');

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

async function findOmniAdsets() {
  return new Promise((resolve) => {
    const url = `https://graph.facebook.com/v22.0/${config.ad_account_id}/adsets?fields=id,name,promoted_object,status&limit=100&access_token=${config.access_token}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const result = JSON.parse(data);
        const omni = (result.data || []).filter(a => 
          a.status === 'ACTIVE' && a.promoted_object?.omnichannel_object
        );
        
        console.log('🌐 옴니채널(웹&앱) 광고세트:');
        console.log('='.repeat(70));
        
        if (omni.length === 0) {
          console.log('❌ 활성화된 옴니채널 광고세트가 없습니다.');
        } else {
          omni.forEach((a, i) => {
            console.log(`\n${i+1}. ${a.name}`);
            console.log(`   ID: ${a.id}`);
            console.log(`   App ID: ${a.promoted_object.omnichannel_object.app?.[0]?.application_id || 'N/A'}`);
          });
        }
        
        console.log('\n' + '='.repeat(70));
        resolve(omni);
      });
    }).on('error', () => resolve([]));
  });
}

findOmniAdsets();
