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

// 옴니채널 정답 광고
const OMNI_AD = '120242864833540154';

async function analyzeOmni() {
  return new Promise((resolve) => {
    const url = `https://graph.facebook.com/v22.0/${OMNI_AD}?fields=id,name,adset{id,name,promoted_object},creative{id,name,url_tags,applink_treatment,object_story_spec,asset_feed_spec,degrees_of_freedom_spec,omnichannel_link_spec}&access_token=${config.access_token}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const result = JSON.parse(data);
        console.log('🔍 옴니채널 정답 광고 완전 분석');
        console.log('=' .repeat(70));
        console.log('\n광고 ID:', result.id);
        console.log('광고 이름:', result.name);
        console.log('\n광고세트:', result.adset.name);
        console.log('광고세트 ID:', result.adset.id);
        console.log('\n📱 Promoted Object:');
        console.log(JSON.stringify(result.adset.promoted_object, null, 2));
        console.log('\n🎨 Creative:');
        console.log('  ID:', result.creative.id);
        console.log('  Name:', result.creative.name);
        console.log('  url_tags:', result.creative.url_tags || 'N/A');
        console.log('  applink_treatment:', result.creative.applink_treatment || 'N/A');
        console.log('\n🌐 omnichannel_link_spec:');
        console.log(JSON.stringify(result.creative.omnichannel_link_spec, null, 2));
        console.log('\n📦 degrees_of_freedom_spec:');
        console.log(JSON.stringify(result.creative.degrees_of_freedom_spec, null, 2));
        console.log('\n📄 object_story_spec:');
        console.log(JSON.stringify(result.creative.object_story_spec, null, 2));
        console.log('\n' + '='.repeat(70));
        
        // 파일로 저장
        fs.writeFileSync('omnichannel_reference.json', JSON.stringify(result, null, 2));
        console.log('\n✅ 전체 데이터 저장: omnichannel_reference.json');
        
        resolve(result);
      });
    }).on('error', (err) => {
      console.error('❌ 에러:', err);
      resolve(null);
    });
  });
}

analyzeOmni();
