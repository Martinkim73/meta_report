const fs = require('fs');
const https = require('https');
const { spawn } = require('child_process');

// ============ CONFIG ============
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

const WAIT_TIME = 15 * 60 * 1000; // 15분
const CHECK_INTERVAL = 60 * 1000; // 1분마다 체크

console.log('⏰ Rate Limit 자동 감시 시작');
console.log('===========================\n');
console.log(`⏳ ${WAIT_TIME / 60000}분 대기 후 API 상태 확인 시작`);
console.log(`🔄 ${CHECK_INTERVAL / 1000}초마다 자동 체크`);
console.log(`\n시작 시간: ${new Date().toLocaleString('ko-KR')}`);
console.log('');

// ============ Check if API is available ============
async function checkApiStatus() {
  return new Promise((resolve) => {
    const url = `https://graph.facebook.com/v22.0/${config.ad_account_id}/adsets?fields=id&limit=1&access_token=${config.access_token}`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);

          if (result.error) {
            // Still rate limited
            if (result.error.code === 17) {
              resolve({ available: false, reason: 'rate_limit', message: result.error.error_user_msg });
            } else {
              resolve({ available: false, reason: 'error', message: result.error.message });
            }
          } else {
            // API is available!
            resolve({ available: true });
          }
        } catch (e) {
          resolve({ available: false, reason: 'parse_error', message: e.message });
        }
      });
    }).on('error', (e) => {
      resolve({ available: false, reason: 'network_error', message: e.message });
    });
  });
}

// ============ Run auto_upload_test.cjs ============
function runAutoUploadTest() {
  console.log('\n' + '='.repeat(50));
  console.log('🚀 auto_upload_test.cjs 실행 시작!');
  console.log('='.repeat(50) + '\n');

  const child = spawn('node', ['auto_upload_test.cjs'], {
    stdio: 'inherit',
    cwd: __dirname
  });

  child.on('exit', (code) => {
    console.log('\n' + '='.repeat(50));
    if (code === 0) {
      console.log('✅ 성공! 완벽한 웹 광고 생성 완료!');
      console.log('='.repeat(50));
      process.exit(0);
    } else {
      console.log(`❌ 종료 코드: ${code}`);
      console.log('수동 확인이 필요합니다.');
      console.log('='.repeat(50));
      process.exit(1);
    }
  });
}

// ============ Main Logic ============
(async () => {
  // 초기 대기 (15분)
  console.log('💤 15분 대기 중...');
  console.log('   (Ctrl+C로 중단 가능)\n');

  await new Promise(resolve => setTimeout(resolve, WAIT_TIME));

  console.log('⏰ 15분 경과! API 상태 확인 시작\n');

  // 1분마다 체크 (최대 10번 = 10분)
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    attempts++;
    const timestamp = new Date().toLocaleTimeString('ko-KR');

    console.log(`[${timestamp}] 시도 ${attempts}/${maxAttempts} - API 상태 확인 중...`);

    const status = await checkApiStatus();

    if (status.available) {
      console.log('✅ API 사용 가능! Rate limit 해제됨!\n');
      runAutoUploadTest();
      return;
    } else {
      console.log(`❌ 아직 불가: ${status.reason}`);
      if (status.message) {
        console.log(`   메시지: ${status.message}`);
      }

      if (attempts < maxAttempts) {
        console.log(`⏳ ${CHECK_INTERVAL / 1000}초 후 재시도...\n`);
        await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
      }
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('❌ 최대 시도 횟수 초과');
  console.log('Rate limit이 예상보다 오래 지속되고 있습니다.');
  console.log('나중에 수동으로 실행하세요: node auto_upload_test.cjs');
  console.log('='.repeat(50));
  process.exit(1);
})();
