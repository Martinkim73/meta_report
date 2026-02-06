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

    // 모든 이미지 추가 + 슬롯별 매핑
    const images: { hash: string; adlabels: { name: string }[] }[] = [];
    const labelMap: Record<string, string> = {};

    mediaAssets.forEach((m, idx) => {
      if (!m.hash) return;

      const slotType =
        m.slot === "피드 이미지" ? "4x5"
        : m.slot === "스토리 이미지" ? "9x16"
        : m.slot === "릴스 이미지" ? "9x16reels"
        : m.slot === "기본 이미지" ? "1x1"
        : `img${idx}`;

      const label = `placement_asset_${slotType}_${timestamp}`;

      const existing = images.find((img) => img.hash === m.hash);
      if (existing) {
        existing.adlabels.push({ name: label });
      } else {
        images.push({ hash: m.hash, adlabels: [{ name: label }] });
      }

      labelMap[slotType] = label;
    });

    if (images.length === 0) {
      throw new Error("No image hashes available");
    }

    // asset_customization_rules 생성 (실제 작동하는 광고와 100% 동일)
    const assetCustomizationRules: Record<string, unknown>[] = [];
    let priority = 1;

    // Rule 1: 9:16 → story (facebook, instagram, messenger, audience_network)
    if (labelMap["9x16"]) {
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
        image_label: { name: labelMap["9x16"] },
        priority: priority++,
      });
    }

    // Rule 2: 1:1 → right_hand_column, search (facebook)
    if (labelMap["1x1"]) {
      assetCustomizationRules.push({
        customization_spec: {
          age_max: 65,
          age_min: 13,
          publisher_platforms: ["facebook"],
          facebook_positions: ["right_hand_column", "search"],
        },
        image_label: { name: labelMap["1x1"] },
        priority: priority++,
      });
    }

    // Rule 3: 4:5 → facebook feed
    if (labelMap["4x5"]) {
      assetCustomizationRules.push({
        customization_spec: {
          age_max: 65,
          age_min: 13,
          publisher_platforms: ["facebook"],
          facebook_positions: ["feed"],
        },
        image_label: { name: labelMap["4x5"] },
        priority: priority++,
      });
    }

    // Rule 4: 4:5 → instagram stream (피드)
    if (labelMap["4x5"]) {
      assetCustomizationRules.push({
        customization_spec: {
          age_max: 65,
          age_min: 13,
          publisher_platforms: ["instagram"],
          instagram_positions: ["stream"],
        },
        image_label: { name: labelMap["4x5"] },
        priority: priority++,
      });
    }

    // Rule 5: 9:16 Reels → instagram reels
    if (labelMap["9x16reels"]) {
      assetCustomizationRules.push({
        customization_spec: {
          age_max: 65,
          age_min: 13,
          publisher_platforms: ["instagram"],
          instagram_positions: ["reels"],
        },
        image_label: { name: labelMap["9x16reels"] },
        priority: priority++,
      });
    }

    // Rule 6: 9:16 Reels → facebook_reels
    if (labelMap["9x16reels"]) {
      assetCustomizationRules.push({
        customization_spec: {
          age_max: 65,
          age_min: 13,
          publisher_platforms: ["facebook"],
          facebook_positions: ["facebook_reels"],
        },
        image_label: { name: labelMap["9x16reels"] },
        priority: priority++,
      });
    }

    // Rule 7: 1:1 → 기본값 (나머지 모든 지면)
    if (labelMap["1x1"]) {
      assetCustomizationRules.push({
        customization_spec: {
          age_max: 65,
          age_min: 13,
        },
        image_label: { name: labelMap["1x1"] },
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
        bodies: [{ text: creative.body }],
        titles: [{ text: creative.title }],
        descriptions: [{ text: description }],
        link_urls: [
          {
            website_url: websiteUrl,
            display_url: displayUrl,
          },
        ],
        call_to_action_types: ["LEARN_MORE"],
        ad_formats: ["AUTOMATIC_FORMAT"],
        ...(assetCustomizationRules.length > 0 && { asset_customization_rules: assetCustomizationRules }),
        optimization_type: "PLACEMENT",
      },
    };

  }

  // Omnichannel adset: applink_treatment + omnichannel_link_spec 필수
  if (omnichannel) {
    creativeData.applink_treatment = "automatic";
    creativeData.omnichannel_link_spec = {
      web: { url: websiteUrl },
      ios: omnichannel.ios,
      android: omnichannel.android,
    };
  }

  // 🔍 DEBUG: Creative 생성 직전 데이터 확인
  console.log("============ CREATIVE DATA DEBUG ============");
  console.log("Creative Name:", creative.name);
  console.log("Is Video:", isVideo);
  console.log("object_story_spec:", JSON.stringify(creativeData.object_story_spec, null, 2));
  if (!isVideo) {
    console.log("asset_feed_spec.images count:", (creativeData.asset_feed_spec as any)?.images?.length);
  }
  console.log("===========================================");

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(creativeData),
  });

  const result = await safeJsonParse(response, "Creative creation");
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

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(adData),
  });

  const result = await safeJsonParse(response, "Ad creation");
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

    // 🔍 DEBUG: Instagram ID 확인
    console.log("============ Instagram ID DEBUG ============");
    console.log("Client:", clientName);
    console.log("Page ID:", config.page_id);
    console.log("Instagram Actor ID:", config.instagram_actor_id);
    console.log("===========================================");

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
