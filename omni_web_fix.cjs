const fs = require('fs');
const https = require('https');

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

const IMAGE_HASH = 'd56185a11cb190c08f221e3f445eab9b'; // Test image

console.log('🚀 SELF-CORRECTION LOOP: Omni + Web Fix');
console.log('=========================================\n');

// ============ STEP 1: Find Adsets ============
async function findAdsets() {
  return new Promise((resolve) => {
    const url = `https://graph.facebook.com/v22.0/${config.ad_account_id}/adsets?fields=id,name,promoted_object,destination_type,status&limit=100&access_token=${config.access_token}`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const result = JSON.parse(data);
        const adsets = result.data || [];

        const omni = adsets.find(a => a.status === 'ACTIVE' && a.promoted_object?.omnichannel_object);
        const web = adsets.filter(a => a.status === 'ACTIVE' && !a.promoted_object?.omnichannel_object).slice(0, 2);

        console.log('✅ Found Adsets:');
        console.log('  Omnichannel:', omni?.name || 'NONE');
        web.forEach((w, i) => console.log(`  Web ${i+1}:`, w.name));
        console.log('');

        resolve({ omni, web });
      });
    }).on('error', () => resolve({ omni: null, web: [] }));
  });
}

// ============ STEP 2: Create Creative ============
async function createCreative(name, isOmni) {
  return new Promise((resolve) => {
    const timestamp = Date.now();

    // Create adlabels for each slot
    const label_9x16 = `placement_asset_9x16_${timestamp}`;
    const label_1x1 = `placement_asset_1x1_${timestamp}`;
    const label_4x5 = `placement_asset_4x5_${timestamp}`;
    const label_reels = `placement_asset_reels_${timestamp}`;

    // Since we're using the same hash for all placements, combine all labels into one image
    const images = [
      {
        hash: IMAGE_HASH,
        adlabels: [
          { name: label_9x16 },
          { name: label_1x1 },
          { name: label_4x5 },
          { name: label_reels }
        ]
      }
    ];

    // Asset customization rules (different for omni vs web)
    const assetCustomizationRules = [];
    let priority = 1;

    if (isOmni) {
      // OMNICHANNEL: NO messenger/audience_network, NO right_hand_column/search
      assetCustomizationRules.push(
        {
          customization_spec: {
            age_max: 65,
            age_min: 13,
            publisher_platforms: ['facebook', 'instagram'],  // NO messenger, NO audience_network
            facebook_positions: ['story'],
            instagram_positions: ['ig_search', 'profile_reels', 'story']
          },
          image_label: { name: label_9x16 },
          priority: priority++
        },
        {
          customization_spec: {
            age_max: 65,
            age_min: 13,
            publisher_platforms: ['facebook'],
            facebook_positions: ['feed']
          },
          image_label: { name: label_4x5 },
          priority: priority++
        },
        {
          customization_spec: {
            age_max: 65,
            age_min: 13,
            publisher_platforms: ['instagram'],
            instagram_positions: ['stream']
          },
          image_label: { name: label_4x5 },
          priority: priority++
        },
        {
          customization_spec: {
            age_max: 65,
            age_min: 13,
            publisher_platforms: ['instagram'],
            instagram_positions: ['reels']
          },
          image_label: { name: label_reels },
          priority: priority++
        },
        {
          customization_spec: {
            age_max: 65,
            age_min: 13,
            publisher_platforms: ['facebook'],
            facebook_positions: ['facebook_reels']
          },
          image_label: { name: label_reels },
          priority: priority++
        },
        {
          customization_spec: {
            age_max: 65,
            age_min: 13
          },
          image_label: { name: label_1x1 },
          priority: priority++
        }
      );
    } else {
      // WEB: Include messenger/audience_network, include right_hand_column/search
      assetCustomizationRules.push(
        {
          customization_spec: {
            age_max: 65,
            age_min: 13,
            publisher_platforms: ['facebook', 'instagram', 'audience_network', 'messenger'],
            facebook_positions: ['story'],
            instagram_positions: ['ig_search', 'profile_reels', 'story'],
            messenger_positions: ['story'],
            audience_network_positions: ['classic']
          },
          image_label: { name: label_9x16 },
          priority: priority++
        },
        {
          customization_spec: {
            age_max: 65,
            age_min: 13,
            publisher_platforms: ['facebook'],
            facebook_positions: ['right_hand_column', 'search']
          },
          image_label: { name: label_1x1 },
          priority: priority++
        },
        {
          customization_spec: {
            age_max: 65,
            age_min: 13,
            publisher_platforms: ['facebook'],
            facebook_positions: ['feed']
          },
          image_label: { name: label_4x5 },
          priority: priority++
        },
        {
          customization_spec: {
            age_max: 65,
            age_min: 13,
            publisher_platforms: ['instagram'],
            instagram_positions: ['stream']
          },
          image_label: { name: label_4x5 },
          priority: priority++
        },
        {
          customization_spec: {
            age_max: 65,
            age_min: 13,
            publisher_platforms: ['instagram'],
            instagram_positions: ['reels']
          },
          image_label: { name: label_reels },
          priority: priority++
        },
        {
          customization_spec: {
            age_max: 65,
            age_min: 13,
            publisher_platforms: ['facebook'],
            facebook_positions: ['facebook_reels']
          },
          image_label: { name: label_reels },
          priority: priority++
        },
        {
          customization_spec: {
            age_max: 65,
            age_min: 13
          },
          image_label: { name: label_1x1 },
          priority: priority++
        }
      );
    }

    const creativeData = {
      access_token: config.access_token,
      name: `AUTO_TEST_${isOmni ? 'OMNI' : 'WEB'}_${timestamp}`,
      object_story_spec: {
        page_id: config.page_id,
        instagram_user_id: '17841459147478114'
      },
      asset_feed_spec: {
        images,
        bodies: [{ text: 'Auto test body' }],
        titles: [{ text: 'Auto test title' }],
        descriptions: [{ text: 'AI 시대 성공 전략, AI 코딩밸리' }],
        link_urls: [{
          website_url: 'https://www.codingvalley.com/ldm/7',
          display_url: 'https://www.codingvalley.com'
        }],
        call_to_action_types: ['LEARN_MORE'],
        ad_formats: ['AUTOMATIC_FORMAT'],
        asset_customization_rules: assetCustomizationRules,
        optimization_type: 'PLACEMENT'
      }
    };

    if (isOmni) {
      creativeData.applink_treatment = 'automatic';
    }

    const url = `https://graph.facebook.com/v22.0/${config.ad_account_id}/adcreatives`;
    const req = https.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const result = JSON.parse(data);
        if (result.id) {
          console.log(`✅ Creative ${name} created: ${result.id}`);
          resolve({ success: true, id: result.id });
        } else {
          console.log(`❌ Creative ${name} failed:`, result.error?.message);
          console.log(`   Subcode:`, result.error?.error_subcode);
          resolve({ success: false, error: result.error });
        }
      });
    });

    req.write(JSON.stringify(creativeData));
    req.end();
  });
}

// ============ STEP 3: Create Ad ============
async function createAd(adsetId, creativeId, name) {
  return new Promise((resolve) => {
    const adData = {
      access_token: config.access_token,
      name: `AUTO_TEST_AD_${Date.now()}`,
      adset_id: adsetId,
      creative: { creative_id: creativeId },
      status: 'PAUSED'
    };

    const url = `https://graph.facebook.com/v22.0/${config.ad_account_id}/ads`;
    const req = https.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const result = JSON.parse(data);
        if (result.id) {
          console.log(`✅ Ad ${name} created: ${result.id}`);
          resolve({ success: true, id: result.id });
        } else {
          console.log(`❌ Ad ${name} failed:`, result.error?.message);
          console.log(`   Subcode:`, result.error?.error_subcode);
          console.log(`   User Msg:`, result.error?.error_user_msg);
          resolve({ success: false, error: result.error });
        }
      });
    });

    req.write(JSON.stringify(adData));
    req.end();
  });
}

// ============ MAIN LOOP ============
(async () => {
  const { omni, web } = await findAdsets();

  if (!omni || web.length < 2) {
    console.log('❌ Not enough active adsets found!');
    console.log('Need: 1 omnichannel + 2 web adsets');
    return;
  }

  console.log('🎯 Starting tests...\n');

  // Test 1: Omnichannel
  console.log('Test 1: Omnichannel Creative + Ad');
  const omniCreative = await createCreative('OMNI', true);
  if (omniCreative.success) {
    await new Promise(r => setTimeout(r, 1000));
    await createAd(omni.id, omniCreative.id, 'OMNI');
  }
  console.log('');

  // Test 2: Web 1
  console.log('Test 2: Web Creative + Ad (1)');
  const webCreative1 = await createCreative('WEB1', false);
  if (webCreative1.success) {
    await new Promise(r => setTimeout(r, 1000));
    await createAd(web[0].id, webCreative1.id, 'WEB1');
  }
  console.log('');

  // Test 3: Web 2
  console.log('Test 3: Web Creative + Ad (2)');
  const webCreative2 = await createCreative('WEB2', false);
  if (webCreative2.success) {
    await new Promise(r => setTimeout(r, 1000));
    await createAd(web[1].id, webCreative2.id, 'WEB2');
  }
  console.log('');

  console.log('🎉 ALL TESTS COMPLETE!');
})();
