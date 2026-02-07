import { NextRequest, NextResponse } from "next/server";
import { getClient, ClientConfig } from "@/lib/redis";
import { safeJsonParse } from "@/lib/api-helpers";

export const runtime = "nodejs";

const GRAPH_API_VERSION = "v22.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

interface MediaUpload {
  slot: string;
  ratio: string;
  mediaType: "image" | "video";
  hash?: string;
  videoId?: string;
}

interface CreativePayload {
  name: string;
  body: string;
  title: string;
  musicIds: string[];
  media: MediaUpload[];
}

interface AdsetInfo {
  id: string;
  name: string;
  isOmnichannel: boolean;
  isApp?: boolean;
  applicationId?: string;
}

interface OmnichannelInfo {
  ios: { app_id: string; store_url: string };
  android: { app_id: string; store_url: string };
}

interface UploadRequest {
  type: "DA" | "VA";
  clientName: string;
  adsetIds?: string[];  // deprecated, use adsets
  adsets?: AdsetInfo[];
  creatives: CreativePayload[];
  // 공통 설정 (수정 가능)
  landingUrl?: string;
  displayUrl?: string;
  description?: string;
}


// Landing & UTM defaults (AI코딩밸리)
const DEFAULT_LANDING_URL = "https://www.codingvalley.com/ldm/7";
const DEFAULT_DISPLAY_URL = "https://www.codingvalley.com";
const DEFAULT_DESCRIPTION = "AI 시대 성공 전략, AI 코딩밸리";

// AI코딩밸리 Instagram 계정 ID (ai_codingvalley)
const AI_CODINGVALLEY_INSTAGRAM_ID = "17841459147478114";

// 코딩밸리 모바일앱 ID
const CODINGVALLEY_APP_ID = "1095821498597595";

// Instagram business account 조회
async function getInstagramActorId(accessToken: string, pageId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${GRAPH_API_BASE}/${pageId}?fields=instagram_business_account&access_token=${accessToken}`
    );
    const data = await res.json();
    return data.instagram_business_account?.id || null;
  } catch {
    return null;
  }
}

// 광고세트에서 application_id 조회
async function getAdsetApplicationId(accessToken: string, adsetId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${GRAPH_API_BASE}/${adsetId}?fields=promoted_object&access_token=${accessToken}`
    );
    const data = await res.json();
    return data.promoted_object?.application_id || null;
  } catch {
    return null;
  }
}

function generateUtmUrl(creativeName: string, adsetName: string, landingUrl: string): string {
  const now = new Date();
  const Y = now.getFullYear().toString();
  const M = (now.getMonth() + 1).toString().padStart(2, "0");
  const D = now.getDate().toString().padStart(2, "0");
  const YY = Y.slice(2);
  const params = new URLSearchParams();
  params.set("utm_source", "meta");
  params.set("utm_medium", "cpc");
  params.set("utm_id", `${Y}${M}${D}001`);
  params.set("utm_campaign", `fbig_web_cretest_${YY}${M}${D}`);
  params.set("utm_content", `${adsetName}__${creativeName}`);
  return `${landingUrl}?${params.toString()}`;
}

function parseOmnichannelInfo(storeUrls: string[]): OmnichannelInfo | null {
  let iosAppId = "", iosStoreUrl = "";
  let androidAppId = "", androidStoreUrl = "";

  for (const url of storeUrls) {
    if (url.includes("itunes.apple.com") || url.includes("apps.apple.com")) {
      iosStoreUrl = url.replace("http://", "https://").replace("itunes.apple.com", "apps.apple.com");
      const match = url.match(/\/app\/id(\d+)/);
      if (match) iosAppId = match[1];
    } else if (url.includes("play.google.com")) {
      androidStoreUrl = url.replace("http://", "https://");
      const match = url.match(/id=([^&]+)/);
      if (match) androidAppId = match[1];
    }
  }

  if (!iosAppId || !androidAppId) return null;
  return {
    ios: { app_id: iosAppId, store_url: iosStoreUrl },
    android: { app_id: androidAppId, store_url: androidStoreUrl },
  };
}

async function getOmnichannelInfo(accessToken: string, adsetId: string): Promise<OmnichannelInfo | null> {
  try {
    const res = await fetch(
      `${GRAPH_API_BASE}/${adsetId}?fields=promoted_object&access_token=${accessToken}`
    );
    const data = await res.json();
    const storeUrls = data.promoted_object?.omnichannel_object?.app?.[0]?.object_store_urls;
    if (!storeUrls) return null;
    return parseOmnichannelInfo(storeUrls);
  } catch {
    return null;
  }
}

// Create Ad Creative — DA uses asset_feed_spec (multi-image, placement optimized), VA uses object_story_spec
async function createAdCreative(
  adAccountId: string,
  accessToken: string,
  creative: CreativePayload,
  mediaAssets: { hash?: string; videoId?: string; slot: string }[],
  config: ClientConfig,
  isVideo: boolean,
  adsetName: string,
  landingUrl: string,
  displayUrl: string,
  description: string,
  omnichannel?: OmnichannelInfo
): Promise<string> {
  const url = `${GRAPH_API_BASE}/${adAccountId}/adcreatives`;
  const websiteUrl = generateUtmUrl(creative.name, adsetName, landingUrl);

  let creativeData: Record<string, unknown>;

  if (isVideo) {
    // VA: 단일 영상 + object_story_spec
    const objectStorySpec: Record<string, unknown> = {
      page_id: config.page_id,
      video_data: {
        video_id: mediaAssets[0]?.videoId,
        message: creative.body,
        title: creative.title,
        call_to_action: {
          type: "LEARN_MORE",
          value: { link: websiteUrl },
        },
      },
    };

    if (config.instagram_actor_id) {
      objectStorySpec.instagram_user_id = config.instagram_actor_id;
    }

    creativeData = {
      access_token: accessToken,
      name: creative.name,
      object_story_spec: objectStorySpec,
    };
  } else {
    // DA: asset_feed_spec — 4장 이미지를 비율별로 배치 최적화 + asset_customization_rules
    const timestamp = Date.now();

    // 슬롯별 해시 수집
    const hashMap: Record<string, string> = {};
    mediaAssets.forEach((m) => {
      if (!m.hash) return;
      const slotType =
        m.slot === "피드 이미지" ? "4x5"
        : m.slot === "스토리 이미지" ? "9x16"
        : m.slot === "릴스 이미지" ? "9x16reels"
        : m.slot === "기본 이미지" ? "1x1"
        : null;
      if (slotType) hashMap[slotType] = m.hash;
    });

    if (Object.keys(hashMap).length === 0) {
      throw new Error("No image hashes available");
    }

    // asset_customization_rules 생성 (실제 작동하는 광고와 100% 동일)
    // 각 규칙마다 image_label + body_label + link_url_label + title_label 필수
    const assetCustomizationRules: Record<string, unknown>[] = [];
    let priority = 1;

    // 각 규칙마다 고유한 4가지 라벨 (image, body, link, title) - 정답 광고 구조 100% 복제
    const ruleLabels = {
      r1: { img: `pa_img_9x16_story_${timestamp}`, body: `pa_body_story_${timestamp}`, link: `pa_link_story_${timestamp}`, title: `pa_title_story_${timestamp}` },
      r2: { img: `pa_img_1x1_rhc_${timestamp}`, body: `pa_body_rhc_${timestamp}`, link: `pa_link_rhc_${timestamp}`, title: `pa_title_rhc_${timestamp}` },
      r3: { img: `pa_img_4x5_fbfeed_${timestamp}`, body: `pa_body_fbfeed_${timestamp}`, link: `pa_link_fbfeed_${timestamp}`, title: `pa_title_fbfeed_${timestamp}` },
      r4: { img: `pa_img_4x5_igstream_${timestamp}`, body: `pa_body_igfeed_${timestamp}`, link: `pa_link_igfeed_${timestamp}`, title: `pa_title_igfeed_${timestamp}` },
      r5: { img: `pa_img_reels_ig_${timestamp}`, body: `pa_body_igreels_${timestamp}`, link: `pa_link_igreels_${timestamp}`, title: `pa_title_igreels_${timestamp}` },
      r6: { img: `pa_img_reels_fb_${timestamp}`, body: `pa_body_fbreels_${timestamp}`, link: `pa_link_fbreels_${timestamp}`, title: `pa_title_fbreels_${timestamp}` },
      r7: { img: `pa_img_1x1_default_${timestamp}`, body: `pa_body_default_${timestamp}`, link: `pa_link_default_${timestamp}`, title: `pa_title_default_${timestamp}` },
    };

    // images 배열: 같은 해시에 해당하는 모든 고유 image_label을 adlabels에 포함
    const images: { hash: string; adlabels: { name: string }[] }[] = [];
    if (hashMap["9x16"]) {
      images.push({ hash: hashMap["9x16"], adlabels: [{ name: ruleLabels.r1.img }] });
    }
    if (hashMap["1x1"]) {
      images.push({ hash: hashMap["1x1"], adlabels: [{ name: ruleLabels.r2.img }, { name: ruleLabels.r7.img }] });
    }
    if (hashMap["4x5"]) {
      images.push({ hash: hashMap["4x5"], adlabels: [{ name: ruleLabels.r3.img }, { name: ruleLabels.r4.img }] });
    }
    if (hashMap["9x16reels"]) {
      images.push({ hash: hashMap["9x16reels"], adlabels: [{ name: ruleLabels.r5.img }, { name: ruleLabels.r6.img }] });
    }

    const allBodyLabels: { name: string }[] = [];
    const allLinkLabels: { name: string }[] = [];
    const allTitleLabels: { name: string }[] = [];

    // Rule 1: 9:16 → story (facebook, instagram, messenger, audience_network)
    if (hashMap["9x16"]) {
      allBodyLabels.push({ name: ruleLabels.r1.body });
      allLinkLabels.push({ name: ruleLabels.r1.link });
      allTitleLabels.push({ name: ruleLabels.r1.title });
      assetCustomizationRules.push({
        customization_spec: {
          age_max: 65,
          age_min: 13,
          publisher_platforms: ["facebook", "instagram", "audience_network", "messenger"],
          facebook_positions: ["story"],
          instagram_positions: ["ig_search", "profile_reels", "story"],
          messenger_positions: ["story"],
          audience_network_positions: ["classic"],
        },
        image_label: { name: ruleLabels.r1.img },
        body_label: { name: ruleLabels.r1.body },
        link_url_label: { name: ruleLabels.r1.link },
        title_label: { name: ruleLabels.r1.title },
        priority: priority++,
      });
    }

    // Rule 2: 1:1 → right_hand_column, search (facebook)
    if (hashMap["1x1"]) {
      allBodyLabels.push({ name: ruleLabels.r2.body });
      allLinkLabels.push({ name: ruleLabels.r2.link });
      allTitleLabels.push({ name: ruleLabels.r2.title });
      assetCustomizationRules.push({
        customization_spec: {
          age_max: 65,
          age_min: 13,
          publisher_platforms: ["facebook"],
          facebook_positions: ["right_hand_column", "search"],
        },
        image_label: { name: ruleLabels.r2.img },
        body_label: { name: ruleLabels.r2.body },
        link_url_label: { name: ruleLabels.r2.link },
        title_label: { name: ruleLabels.r2.title },
        priority: priority++,
      });
    }

    // Rule 3: 4:5 → facebook feed
    if (hashMap["4x5"]) {
      allBodyLabels.push({ name: ruleLabels.r3.body });
      allLinkLabels.push({ name: ruleLabels.r3.link });
      allTitleLabels.push({ name: ruleLabels.r3.title });
      assetCustomizationRules.push({
        customization_spec: {
          age_max: 65,
          age_min: 13,
          publisher_platforms: ["facebook"],
          facebook_positions: ["feed"],
        },
        image_label: { name: ruleLabels.r3.img },
        body_label: { name: ruleLabels.r3.body },
        link_url_label: { name: ruleLabels.r3.link },
        title_label: { name: ruleLabels.r3.title },
        priority: priority++,
      });
    }

    // Rule 4: 4:5 → instagram stream (피드)
    if (hashMap["4x5"]) {
      allBodyLabels.push({ name: ruleLabels.r4.body });
      allLinkLabels.push({ name: ruleLabels.r4.link });
      allTitleLabels.push({ name: ruleLabels.r4.title });
      assetCustomizationRules.push({
        customization_spec: {
          age_max: 65,
          age_min: 13,
          publisher_platforms: ["instagram"],
          instagram_positions: ["stream"],
        },
        image_label: { name: ruleLabels.r4.img },
        body_label: { name: ruleLabels.r4.body },
        link_url_label: { name: ruleLabels.r4.link },
        title_label: { name: ruleLabels.r4.title },
        priority: priority++,
      });
    }

    // Rule 5: 9:16 Reels → instagram reels
    if (hashMap["9x16reels"]) {
      allBodyLabels.push({ name: ruleLabels.r5.body });
      allLinkLabels.push({ name: ruleLabels.r5.link });
      allTitleLabels.push({ name: ruleLabels.r5.title });
      assetCustomizationRules.push({
        customization_spec: {
          age_max: 65,
          age_min: 13,
          publisher_platforms: ["instagram"],
          instagram_positions: ["reels"],
        },
        image_label: { name: ruleLabels.r5.img },
        body_label: { name: ruleLabels.r5.body },
        link_url_label: { name: ruleLabels.r5.link },
        title_label: { name: ruleLabels.r5.title },
        priority: priority++,
      });
    }

    // Rule 6: 9:16 Reels → facebook_reels
    if (hashMap["9x16reels"]) {
      allBodyLabels.push({ name: ruleLabels.r6.body });
      allLinkLabels.push({ name: ruleLabels.r6.link });
      allTitleLabels.push({ name: ruleLabels.r6.title });
      assetCustomizationRules.push({
        customization_spec: {
          age_max: 65,
          age_min: 13,
          publisher_platforms: ["facebook"],
          facebook_positions: ["facebook_reels"],
        },
        image_label: { name: ruleLabels.r6.img },
        body_label: { name: ruleLabels.r6.body },
        link_url_label: { name: ruleLabels.r6.link },
        title_label: { name: ruleLabels.r6.title },
        priority: priority++,
      });
    }

    // Rule 7: 1:1 → 기본값 (나머지 모든 지면)
    if (hashMap["1x1"]) {
      allBodyLabels.push({ name: ruleLabels.r7.body });
      allLinkLabels.push({ name: ruleLabels.r7.link });
      allTitleLabels.push({ name: ruleLabels.r7.title });
      assetCustomizationRules.push({
        customization_spec: {
          age_max: 65,
          age_min: 13,
        },
        image_label: { name: ruleLabels.r7.img },
        body_label: { name: ruleLabels.r7.body },
        link_url_label: { name: ruleLabels.r7.link },
        title_label: { name: ruleLabels.r7.title },
        priority: priority++,
      });
    }

    creativeData = {
      access_token: accessToken,
      name: creative.name,
      object_story_spec: {
        page_id: config.page_id,
        ...(config.instagram_actor_id && { instagram_user_id: config.instagram_actor_id }),
      },
      asset_feed_spec: {
        images,
        bodies: [{ text: creative.body, adlabels: allBodyLabels }],
        titles: [{ text: creative.title, adlabels: allTitleLabels }],
        descriptions: [{ text: description }],
        link_urls: [
          {
            website_url: websiteUrl,
            display_url: displayUrl,
            adlabels: allLinkLabels,
          },
        ],
        call_to_action_types: ["LEARN_MORE"],
        ad_formats: ["AUTOMATIC_FORMAT"],
        ...(assetCustomizationRules.length > 0 && { asset_customization_rules: assetCustomizationRules }),
        optimization_type: "PLACEMENT",
      },
    };

  }

  // 옴니채널 광고: applink_treatment만 설정
  // NOTE: degrees_of_freedom_spec의 standard_enhancements는 지원 중단됨 (Subcode 3858504)
  if (omnichannel) {
    creativeData.applink_treatment = "automatic";
  }

  // 🔍 DEBUG: Creative 생성 직전 데이터 확인
  console.log("============ CREATIVE DATA DEBUG ============");
  console.log("Creative Name:", creative.name);
  console.log("Is Video:", isVideo);
  console.log("Ad Account ID:", adAccountId);
  console.log("Page ID:", config.page_id);
  console.log("Instagram ID:", config.instagram_actor_id || "N/A");
  console.log("Omnichannel:", omnichannel ? "YES" : "NO");
  console.log("object_story_spec:", JSON.stringify(creativeData.object_story_spec, null, 2));
  if (!isVideo) {
    console.log("asset_feed_spec.images count:", (creativeData.asset_feed_spec as any)?.images?.length);
    console.log("asset_customization_rules count:", (creativeData.asset_feed_spec as any)?.asset_customization_rules?.length);
  }
  console.log("Request Body (Full):", JSON.stringify(creativeData, null, 2));
  console.log("===========================================");

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(creativeData),
  });

  const result = await safeJsonParse(response, "Creative creation");

  // 🔒 SAFETY: Creative ID 검증
  if (!result.id) {
    console.error("❌ Creative ID is missing in response:", JSON.stringify(result, null, 2));
    throw new Error("Creative creation failed: No ID returned");
  }

  console.log("✅ Creative created successfully:", result.id);

  // ⏱️ TIMING FIX: Meta 서버 동기화를 위한 1초 대기 (Serverless 환경)
  console.log("⏳ Waiting 1 second for Meta server sync...");
  await new Promise(resolve => setTimeout(resolve, 1000));

  return result.id;
}

// Get active adsets from target campaigns
async function getActiveAdsets(
  adAccountId: string,
  accessToken: string,
  campaignNames: string[]
): Promise<{ id: string; name: string }[]> {
  // First get campaigns
  const campaignsUrl = `${GRAPH_API_BASE}/${adAccountId}/campaigns?fields=id,name,status&access_token=${accessToken}`;
  const campaignsRes = await fetch(campaignsUrl);
  const campaignsData = await campaignsRes.json();

  if (campaignsData.error) {
    throw new Error(`Failed to get campaigns: ${campaignsData.error.message}`);
  }

  // Filter target campaigns
  const targetCampaigns = campaignsData.data?.filter(
    (c: { name: string; status: string }) =>
      campaignNames.includes(c.name) && c.status === "ACTIVE"
  ) || [];

  if (targetCampaigns.length === 0) {
    throw new Error("No active target campaigns found");
  }

  // Get adsets from these campaigns
  const adsets: { id: string; name: string }[] = [];
  for (const campaign of targetCampaigns) {
    const adsetsUrl = `${GRAPH_API_BASE}/${campaign.id}/adsets?fields=id,name,status,destination_type,promoted_object&access_token=${accessToken}`;
    const adsetsRes = await fetch(adsetsUrl);
    const adsetsData = await adsetsRes.json();

    if (adsetsData.data) {
      // Filter: ACTIVE, not APP destination, no omnichannel (cross-channel optimization requires object_store_url)
      adsets.push(
        ...adsetsData.data.filter((a: { status: string; destination_type: string; promoted_object?: { omnichannel_object?: unknown } }) =>
          a.status === "ACTIVE" &&
          a.destination_type !== "APP" &&
          !a.promoted_object?.omnichannel_object
        )
      );
    }
  }

  return adsets;
}

// Create Ad in an adset
async function createAd(
  adAccountId: string,
  accessToken: string,
  adsetId: string,
  creativeId: string,
  name: string,
  isApp: boolean = false,
  applicationId?: string
): Promise<string> {
  // 🔒 SAFETY: Creative ID 검증
  if (!creativeId || creativeId.trim() === "") {
    throw new Error("Cannot create Ad: Creative ID is empty");
  }

  const url = `${GRAPH_API_BASE}/${adAccountId}/ads`;

  const adData: Record<string, unknown> = {
    access_token: accessToken,
    name,
    adset_id: adsetId,
    creative: { creative_id: creativeId },
    status: "PAUSED", // Start paused for safety
  };

  // 앱 광고세트일 경우 tracking_specs 추가
  if (isApp && applicationId) {
    adData.tracking_specs = [
      {
        "action.type": ["mobile_app_install"],
        "application": [applicationId],
      },
      {
        "action.type": ["app_custom_event"],
        "application": [applicationId],
      },
    ];
  }

  // 🔍 DEBUG: Ad 생성 직전 데이터 확인
  console.log("============ AD CREATION DEBUG ============");
  console.log("Ad Name:", name);
  console.log("Ad Account ID:", adAccountId);
  console.log("Adset ID:", adsetId);
  console.log("Creative ID:", creativeId);
  console.log("Is App:", isApp);
  console.log("App ID:", applicationId || "N/A");
  console.log("Access Token (first 20 chars):", accessToken.substring(0, 20) + "...");
  console.log("==========================================");
  console.log("📤 Request Body (FULL):");
  console.log(JSON.stringify(adData, null, 2));
  console.log("==========================================");

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(adData),
  });

  const responseText = await response.text();
  console.log("📥 Meta API Response (Status: " + response.status + "):");
  console.log(responseText);

  let result;
  try {
    result = JSON.parse(responseText);
  } catch (e) {
    console.error("❌ Failed to parse response:", responseText);
    throw new Error(`Ad creation failed: Invalid JSON response (${response.status})`);
  }

  if (result.error) {
    console.error("❌ Meta API Error:", JSON.stringify(result.error, null, 2));
    throw new Error(`Ad creation failed (${response.status}): ${JSON.stringify(result)}`);
  }

  if (!result.id) {
    console.error("❌ Ad ID is missing in response:", JSON.stringify(result, null, 2));
    throw new Error("Ad creation failed: No ID returned");
  }

  console.log("✅ Ad created successfully:", result.id);
  return result.id;
}

export async function POST(request: NextRequest) {
  try {
    const arrayBuffer = await request.arrayBuffer();
    const body: UploadRequest = JSON.parse(Buffer.from(arrayBuffer).toString("utf-8"));
    const { type, clientName, adsetIds, adsets: adsetInfos, creatives } = body;

    // 공통 설정 (기본값 적용)
    const landingUrl = body.landingUrl || DEFAULT_LANDING_URL;
    const displayUrl = body.displayUrl || DEFAULT_DISPLAY_URL;
    const description = body.description || DEFAULT_DESCRIPTION;

    // Get client config
    const config = await getClient(clientName);
    if (!config) {
      return NextResponse.json(
        { error: `Client "${clientName}" not found` },
        { status: 404 }
      );
    }

    // page_id가 빈 경우 Meta API에서 자동 조회
    if (!config.page_id) {
      const pagesRes = await fetch(
        `${GRAPH_API_BASE}/me/accounts?fields=id,name&access_token=${config.access_token}`
      );
      const pagesData = await pagesRes.json();
      if (pagesData.data && pagesData.data.length > 0) {
        config.page_id = pagesData.data[0].id;
      } else {
        return NextResponse.json(
          { error: "Facebook 페이지를 찾을 수 없습니다. 광고주 설정에서 페이지 ID를 입력해주세요." },
          { status: 400 }
        );
      }
    }

    // AI코딩밸리의 경우 Instagram actor ID 자동 설정
    if (clientName === "AI코딩밸리" && !config.instagram_actor_id) {
      config.instagram_actor_id = AI_CODINGVALLEY_INSTAGRAM_ID;
    }
    // 다른 클라이언트는 페이지에서 Instagram 계정 조회
    if (!config.instagram_actor_id && config.page_id) {
      const igId = await getInstagramActorId(config.access_token, config.page_id);
      if (igId) {
        config.instagram_actor_id = igId;
      }
    }

    // 🔍 DEBUG: 환경변수 및 설정 확인
    console.log("============ ENVIRONMENT & CONFIG DEBUG ============");
    console.log("Client:", clientName);
    console.log("Ad Account ID:", config.ad_account_id);
    console.log("Page ID:", config.page_id);
    console.log("Instagram Actor ID:", config.instagram_actor_id || "N/A");
    console.log("Access Token (first 20):", config.access_token.substring(0, 20) + "...");
    console.log("Target Campaigns:", config.target_campaigns);
    console.log("Landing URL:", landingUrl);
    console.log("Display URL:", displayUrl);
    console.log("===================================================");

    const isVideo = type === "VA";
    const results: {
      creativeName: string;
      creativeId: string;
      omnichannelCreativeId?: string;
      adIds: string[];
    }[] = [];

    // Use provided adsets or adsetIds or fall back to auto-detection
    let targetAdsets: AdsetInfo[];

    if (adsetInfos && adsetInfos.length > 0) {
      targetAdsets = adsetInfos;
    } else if (adsetIds && adsetIds.length > 0) {
      // Legacy support
      targetAdsets = adsetIds.map((id) => ({ id, name: id, isOmnichannel: false }));
    } else {
      // Fall back to auto-detection
      const autoAdsets = await getActiveAdsets(
        config.ad_account_id,
        config.access_token,
        config.target_campaigns
      );
      targetAdsets = autoAdsets.map((a) => ({ ...a, isOmnichannel: false }));
    }

    if (targetAdsets.length === 0) {
      return NextResponse.json(
        { error: "광고세트를 선택해주세요" },
        { status: 400 }
      );
    }

    // Process each creative
    for (const creative of creatives) {
      // Media already uploaded via /api/upload-image — use hashes directly
      const mediaAssets: { hash?: string; videoId?: string; slot: string }[] = creative.media.map(
        (m) => ({ hash: m.hash, videoId: m.videoId, slot: m.slot })
      );

      const adIds: string[] = [];
      let lastCreativeId = "";

      // 각 광고세트마다 개별 creative 생성 (adset별 UTM 추적)
      for (const adset of targetAdsets) {
        // Omnichannel adset: promoted_object에서 앱 정보 추출
        let omnichannel: OmnichannelInfo | undefined;
        if (adset.isOmnichannel) {
          omnichannel = await getOmnichannelInfo(config.access_token, adset.id) || undefined;
        }

        const creativeId = await createAdCreative(
          config.ad_account_id,
          config.access_token,
          creative,
          mediaAssets,
          config,
          isVideo,
          adset.name,
          landingUrl,
          displayUrl,
          description,
          omnichannel
        );
        lastCreativeId = creativeId;

        // 앱 광고세트인 경우 application_id 조회 또는 기본값 사용
        let appId: string | undefined;
        if (adset.isApp) {
          appId = adset.applicationId;
          if (!appId) {
            appId = await getAdsetApplicationId(config.access_token, adset.id) || undefined;
          }
          if (!appId && clientName === "AI코딩밸리") {
            appId = CODINGVALLEY_APP_ID;
          }
        }

        const adId = await createAd(
          config.ad_account_id,
          config.access_token,
          adset.id,
          creativeId,
          creative.name,
          adset.isApp || false,
          appId
        );
        adIds.push(adId);
      }

      results.push({
        creativeName: creative.name,
        creativeId: lastCreativeId,
        adIds,
      });
    }

    return NextResponse.json({
      success: true,
      message: `${results.length}개 소재가 등록되었습니다`,
      results,
      adsetsUsed: targetAdsets.map((a) => a.name),
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Upload failed",
      },
      { status: 500 }
    );
  }
}
