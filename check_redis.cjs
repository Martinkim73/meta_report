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

https.get(`${env.KV_REST_API_URL}/get/clients`, {
  headers: { 'Authorization': `Bearer ${env.KV_REST_API_TOKEN}` }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const result = JSON.parse(data);
    if (result.result) {
      const clients = JSON.parse(result.result);
      console.log('✅ Redis에 clients 데이터 있음:');
      console.log('광고주:', Object.keys(clients));
    } else {
      console.log('❌ Redis에 clients 데이터 없음!');
      console.log('응답:', result);
    }
  });
}).on('error', err => console.error('❌ 오류:', err.message));
