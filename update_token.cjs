// Meta Access Token 업데이트 스크립트
// 사용법: echo "새토큰" > temp_token.txt 후 node update_token.js

const fs = require('fs');
const https = require('https');
require('dotenv').config();

const REDIS_URL = process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN;
const CLIENT_NAME = 'AI코딩밸리';

// 환경변수 확인
if (!REDIS_URL || !REDIS_TOKEN) {
  console.error('❌ 환경변수가 설정되지 않았습니다!');
  console.log('💡 .env 파일에 다음을 추가하세요:');
  console.log('   KV_REST_API_URL=https://...');
  console.log('   KV_REST_API_TOKEN=...');
  process.exit(1);
}

async function updateToken() {
  try {
    // 1. temp_token.txt 파일 읽기
    if (!fs.existsSync('temp_token.txt')) {
      console.error('❌ temp_token.txt 파일이 없습니다!');
      console.log('💡 사용법: echo "새토큰" > temp_token.txt');
      process.exit(1);
    }

    const newToken = fs.readFileSync('temp_token.txt', 'utf8').trim();
    if (!newToken || newToken.length < 50) {
      console.error('❌ 유효하지 않은 토큰입니다!');
      process.exit(1);
    }

    console.log('📖 새 토큰 읽기 완료:', newToken.substring(0, 20) + '...');

    // 2. Redis에서 현재 clients 데이터 가져오기
    console.log('📡 Redis에서 현재 설정 가져오는 중...');
    const getCurrentData = () => new Promise((resolve, reject) => {
      https.get(`${REDIS_URL}/get/clients`, {
        headers: { 'Authorization': `Bearer ${REDIS_TOKEN}` }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            resolve(JSON.parse(result.result));
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', reject);
    });

    const clients = await getCurrentData();

    if (!clients[CLIENT_NAME]) {
      console.error(`❌ "${CLIENT_NAME}" 클라이언트를 찾을 수 없습니다!`);
      process.exit(1);
    }

    console.log('✅ 현재 설정 확인:', {
      ad_account_id: clients[CLIENT_NAME].ad_account_id,
      old_token: clients[CLIENT_NAME].access_token.substring(0, 20) + '...'
    });

    // 3. Access Token 업데이트
    clients[CLIENT_NAME].access_token = newToken;

    // 4. Redis에 저장
    console.log('💾 Redis에 업데이트 중...');
    const updateData = () => new Promise((resolve, reject) => {
      const postData = JSON.stringify(['clients', JSON.stringify(clients)]);
      const req = https.request(`${REDIS_URL}/set`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${REDIS_TOKEN}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(JSON.parse(data)));
      }).on('error', reject);

      req.write(postData);
      req.end();
    });

    await updateData();

    // 5. temp_token.txt 삭제
    fs.unlinkSync('temp_token.txt');
    console.log('🗑️  temp_token.txt 파일 삭제 완료');

    console.log('\n✅ 토큰 업데이트 완료!');
    console.log(`📅 다음 업데이트: 60일 후 (${new Date(Date.now() + 60*24*60*60*1000).toLocaleDateString('ko-KR')})`);

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    process.exit(1);
  }
}

updateToken();
