// .env 파일에서 토큰을 읽어 Redis에 자동 동기화
// 사용법: node sync_env_to_redis.cjs

const fs = require('fs');
const https = require('https');
const path = require('path');

const REDIS_URL = 'https://talented-muskox-39764.upstash.io';
const REDIS_TOKEN = 'AZtUAAIncDI0YWY2ZDZiOWFjYmE0NDhiOGRhZWE2ZGZhMzM0ODhjMXAyMzk3NjQ';
const CLIENT_NAME = 'AI코딩밸리';

// .env 파일 파싱
function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};

  content.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        let value = valueParts.join('=').trim();
        // 따옴표 제거
        value = value.replace(/^["']|["']$/g, '');
        env[key.trim()] = value;
      }
    }
  });

  return env;
}

async function syncEnvToRedis() {
  try {
    console.log('🔄 .env → Redis 동기화 시작...\n');

    // 1. .env 파일 읽기
    const envPath = path.join(__dirname, '.env');
    const env = parseEnvFile(envPath);

    if (!env.META_ACCESS_TOKEN) {
      console.error('❌ .env 파일에 META_ACCESS_TOKEN이 없습니다!');
      console.log('💡 .env 파일 형식:');
      console.log('   META_ACCESS_TOKEN=EAAJtL...');
      process.exit(1);
    }

    const newToken = env.META_ACCESS_TOKEN;
    if (newToken.length < 50) {
      console.error('❌ 유효하지 않은 토큰입니다!');
      process.exit(1);
    }

    console.log('✅ .env 파일 읽기 완료');
    console.log('   토큰:', newToken.substring(0, 20) + '...\n');

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

    const oldToken = clients[CLIENT_NAME].access_token;
    console.log('✅ 현재 설정 확인');
    console.log('   Ad Account:', clients[CLIENT_NAME].ad_account_id);
    console.log('   기존 토큰:', oldToken.substring(0, 20) + '...\n');

    // 토큰이 같으면 업데이트 불필요
    if (oldToken === newToken) {
      console.log('ℹ️  Redis와 .env의 토큰이 이미 동일합니다.');
      console.log('   업데이트가 필요 없습니다.\n');
      return;
    }

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

    console.log('✅ Redis 업데이트 완료!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 동기화 성공!');
    console.log('📅 다음 업데이트: 60일 후 (', new Date(Date.now() + 60*24*60*60*1000).toLocaleDateString('ko-KR'), ')');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n❌ 오류 발생:', error.message);
    process.exit(1);
  }
}

syncEnvToRedis();
