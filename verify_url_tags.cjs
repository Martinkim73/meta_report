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

// 방금 생성한 광고 확인
const TEST_AD = '120243252795260154';

async function checkUrlTags() {
  return new Promise((resolve) => {
    const url = `https://graph.facebook.com/v22.0/${TEST_AD}?fields=creative{id,name,url_tags}&access_token=${config.access_token}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const result = JSON.parse(data);
        console.log('📋 생성된 광고의 URL Tags:');
        console.log(JSON.stringify(result.creative, null, 2));
        
        if (result.creative.url_tags) {
          console.log('\n✅ url_tags 적용 성공!');
        } else {
          console.log('\n❌ url_tags 없음 - 기본값이 적용되지 않았을 수 있음');
        }
        resolve(result);
      });
    }).on('error', () => resolve(null));
  });
}

checkUrlTags();
