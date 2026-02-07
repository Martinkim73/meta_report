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

// 실제 성공한 광고에서 url_tags 구조 확인
const REFERENCE_AD = '120243214299330154';

async function checkUrlTags() {
  return new Promise((resolve) => {
    const url = `https://graph.facebook.com/v22.0/${REFERENCE_AD}?fields=creative{id,name,url_tags,asset_feed_spec{link_urls}}&access_token=${config.access_token}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const result = JSON.parse(data);
        console.log('📋 정답 광고의 URL Tags 구조:');
        console.log(JSON.stringify(result.creative, null, 2));
        resolve(result);
      });
    }).on('error', () => resolve(null));
  });
}

checkUrlTags();
