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

// 정답 광고 (수동으로 올려서 성공한 것)
const REFERENCE_AD = '120243214299330154';

// 내가 만든 테스트 광고 (실패작)
const MY_TEST_AD = '120243224045370154';

console.log('🔍 진단: 정답지 vs 실패작 비교');
console.log('=================================\n');

async function getAdCreative(adId, label) {
  return new Promise((resolve) => {
    const url = `https://graph.facebook.com/v22.0/${adId}?fields=id,name,creative{id,name,asset_feed_spec,degrees_of_freedom_spec,applink_treatment}&access_token=${config.access_token}`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log(`\n========== ${label} ==========`);
          console.log('Ad ID:', result.id);
          console.log('Ad Name:', result.name);
          console.log('Creative ID:', result.creative?.id);
          console.log('Creative Name:', result.creative?.name);
          console.log('\n--- asset_feed_spec 구조 ---');

          const afs = result.creative?.asset_feed_spec;
          if (afs) {
            console.log('images 개수:', afs.images?.length || 0);
            console.log('asset_customization_rules 개수:', afs.asset_customization_rules?.length || 0);
            console.log('optimization_type:', afs.optimization_type || 'N/A');

            console.log('\n--- asset_customization_rules 상세 ---');
            if (afs.asset_customization_rules) {
              afs.asset_customization_rules.forEach((rule, idx) => {
                console.log(`\nRule ${idx + 1} (Priority ${rule.priority}):`);
                console.log('  Platforms:', rule.customization_spec?.publisher_platforms?.join(', ') || 'ALL');
                console.log('  Facebook:', rule.customization_spec?.facebook_positions?.join(', ') || '-');
                console.log('  Instagram:', rule.customization_spec?.instagram_positions?.join(', ') || '-');
                console.log('  Messenger:', rule.customization_spec?.messenger_positions?.join(', ') || '-');
                console.log('  AudienceNet:', rule.customization_spec?.audience_network_positions?.join(', ') || '-');
                console.log('  Image Label:', rule.image_label?.name || 'N/A');
              });
            } else {
              console.log('❌ asset_customization_rules 없음! (메타가 자동 배치)');
            }
          }

          console.log('\n--- degrees_of_freedom_spec ---');
          const dofs = result.creative?.degrees_of_freedom_spec;
          if (dofs?.creative_features_spec?.standard_enhancements) {
            console.log('⚠️ standard_enhancements:', dofs.creative_features_spec.standard_enhancements.enroll_status);
          } else {
            console.log('✅ standard_enhancements 없음 (좋음)');
          }

          console.log('\n--- applink_treatment ---');
          console.log(result.creative?.applink_treatment || 'N/A');

          console.log('\n' + '='.repeat(50));

          resolve(result);
        } catch (e) {
          console.log('❌ Parse error:', e.message);
          resolve(null);
        }
      });
    }).on('error', (e) => {
      console.log('❌ Network error:', e.message);
      resolve(null);
    });
  });
}

(async () => {
  const reference = await getAdCreative(REFERENCE_AD, '정답 광고 (수동 성공)');
  const myAd = await getAdCreative(MY_TEST_AD, '내가 만든 테스트 광고');

  console.log('\n\n🔍 분석 결과 요약');
  console.log('==================');

  if (reference && myAd) {
    const refRules = reference.creative?.asset_feed_spec?.asset_customization_rules?.length || 0;
    const myRules = myAd.creative?.asset_feed_spec?.asset_customization_rules?.length || 0;

    console.log('\n1. asset_customization_rules 비교:');
    console.log(`   정답: ${refRules}개 규칙`);
    console.log(`   내것: ${myRules}개 규칙`);
    if (refRules !== myRules) {
      console.log('   ❌ 규칙 개수가 다름!');
    }

    console.log('\n2. 이미지 개수 비교:');
    console.log(`   정답: ${reference.creative?.asset_feed_spec?.images?.length || 0}개`);
    console.log(`   내것: ${myAd.creative?.asset_feed_spec?.images?.length || 0}개`);

    console.log('\n3. degrees_of_freedom_spec 비교:');
    const refDOF = reference.creative?.degrees_of_freedom_spec ? 'YES' : 'NO';
    const myDOF = myAd.creative?.degrees_of_freedom_spec ? 'YES' : 'NO';
    console.log(`   정답: ${refDOF}`);
    console.log(`   내것: ${myDOF}`);
  }
})();
