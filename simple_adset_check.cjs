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

const url = `https://graph.facebook.com/v22.0/${config.ad_account_id}/adsets?fields=id,name,status,promoted_object&limit=10&access_token=${config.access_token}`;

console.log('🔍 Simple Adset Check');
console.log('URL:', url.replace(config.access_token, 'TOKEN_HIDDEN'));
console.log('');

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      console.log('Status Code:', res.statusCode);
      console.log('Response:', JSON.stringify(result, null, 2));
    } catch (e) {
      console.log('Parse Error:', e.message);
      console.log('Raw Data:', data);
    }
  });
}).on('error', (e) => {
  console.log('Network Error:', e.message);
});
