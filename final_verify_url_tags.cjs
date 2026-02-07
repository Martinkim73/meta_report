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

const TEST_AD = '120243254042170154';

async function checkUrlTags() {
  return new Promise((resolve) => {
    const url = `https://graph.facebook.com/v22.0/${TEST_AD}?fields=creative{id,name,url_tags}&access_token=${config.access_token}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const result = JSON.parse(data);
        console.log('🎉 최종 확인: 실제 앱에서 생성한 광고');
        console.log('광고 ID:', TEST_AD);
        console.log('');
        console.log('Creative ID:', result.creative.id);
        console.log('Creative Name:', result.creative.name);
        console.log('');
        console.log('url_tags:', result.creative.url_tags || '❌ 없음');
        console.log('');
        
        if (result.creative.url_tags) {
          console.log('✅✅✅ URL 매개변수 자동화 성공! ✅✅✅');
          console.log('');
          console.log('적용된 매개변수:');
          const params = result.creative.url_tags.split('&');
          params.forEach(p => console.log(`  - ${p}`));
        } else {
          console.log('❌ url_tags 없음');
        }
        resolve(result);
      });
    }).on('error', () => resolve(null));
  });
}

checkUrlTags();
