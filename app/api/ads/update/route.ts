import { NextRequest, NextResponse } from "next/server";
import { getClient, ClientConfig } from "@/lib/redis";

export const runtime = "nodejs";

const GRAPH_API_VERSION = "v22.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// AI코딩밸리 Instagram 계정 ID
const AI_CODINGVALLEY_INSTAGRAM_ID = "17841459147478114";

// 기본값
const DEFAULT_LANDING_URL = "https://www.codingvalley.com/ldm/7";
const DEFAULT_DISPLAY_URL = "https://www.codingvalley.com";
const DEFAULT_DESCRIPTION = "AI 시대 성공 전략, AI 코딩밸리";

interface MediaUpload {
  slot: string;
  ratio: string;
  hash?: string;
  videoId?: string;
}

interface UpdateRequest {
  clientName: string;
  adIds: string[];  // 수정할 광고 ID들
  media: MediaUpload[];  // 새 이미지/영상
  // 선택적 텍스트 수정
  body?: string;
  title?: string;
  landingUrl?: string;
  displayUrl?: string;
  description?: string;
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

interface OmnichannelInfo {
  ios: { app_id: string; store_url: string };
  android: { app_id: string; store_url: string };
}

// adset의 promoted_object에서 omnichannel 앱 정보 추출
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

// 기존 광고에서 정보 가져오기
async function getAdInfo(accessToken: string, adId: string): Promise<{
  name: string;
  adsetId: string;
  adsetName: string;
  creative: {
    body?: string;
    title?: string;
  };
  omnichannel?: OmnichannelInfo;
} | null> {
  try {
    const res = await fetch(
      `${GRAPH_API_BASE}/${adId}?fields=name,adset_id,creative{object_story_spec,asset_feed_spec}&access_token=${accessToken}`
    );
    const data = await res.json();
    if (data.error) return null;

    // 광고세트 정보 + promoted_object 조회
    const adsetRes = await fetch(
      `${GRAPH_API_BASE}/${data.adset_id}?fields=name,promoted_object&access_token=${accessToken}`
    );
    const adsetData = await adsetRes.json();

    // omnichannel 감지
    let omnichannel: OmnichannelInfo | undefined;
    const appInfo = adsetData.promoted_object?.omnichannel_object?.app?.[0];
    if (appInfo?.object_store_urls) {
      omnichannel = parseOmnichannelInfo(appInfo.object_store_urls) || undefined;
    }

    // 기존 크리에이티브에서 텍스트 추출
    let body = "";
    let title = "";
    const creative = data.creative;
    if (creative?.asset_feed_spec) {
      body = creative.asset_feed_spec.bodies?.[0]?.text || "";
      title = creative.asset_feed_spec.titles?.[0]?.text || "";
    } else if (creative?.object_story_spec?.link_data) {
      body = creative.object_story_spec.link_data.message || "";
      title = creative.object_story_spec.link_data.name || "";
    }

    return {
      name: data.name,
      adsetId: data.adset_id,
      adsetName: adsetData.name || data.adset_id,
      creative: { body, title },
      omnichannel,
    };
  } catch {
    return null;
  }
}

// 새 크리에이티브 생성
async function createNewCreative(
  adAccountId: string,
  accessToken: string,
  name: string,
  body: string,
  title: string,
  media: MediaUpload[],
  config: ClientConfig,
  adsetName: string,
  landingUrl: string,
  displayUrl: string,
  description: string,
  omnichannel?: OmnichannelInfo
): Promise<string> {
  const url = `${GRAPH_API_BASE}/${adAccountId}/adcreatives`;
  const websiteUrl = generateUtmUrl(name, adsetName, landingUrl);
  const timestamp = Date.now();

  // ratio로 이미지 찾기
  const img4x5 = media.find((m) => m.hash && m.ratio === "4:5");
  const img9x16 = media.find((m) => m.hash && m.ratio === "9:16" && m.slot?.includes("스토리"));
  const img9x16Reels = media.find((m) => m.hash && m.ratio === "9:16" && m.slot?.includes("릴스"));
  const img1x1 = media.find((m) => m.hash && m.ratio === "1:1");

  // 이미지 배열 생성 (adlabels 포함)
  const images: { hash: string; adlabels: { name: string }[] }[] = [];
  const labelMap: Record<string, string> = {};

  // 4:5 이미지
  if (img4x5?.hash) {
    const label = `placement_asset_4x5_${timestamp}`;
    images.push({ hash: img4x5.hash, adlabels: [{ name: label }] });
    labelMap["4x5"] = label;
  }

  // 9:16 이미지
  if (img9x16?.hash) {
    const label = `placement_asset_9x16_${timestamp}`;
    const existing = images.find((img) => img.hash === img9x16.hash);
    if (existing) {
      existing.adlabels.push({ name: label });
    } else {
      images.push({ hash: img9x16.hash, adlabels: [{ name: label }] });
    }
    labelMap["9x16"] = label;
  }

  // 9:16 Reels 이미지
  if (img9x16Reels?.hash) {
    const label = `placement_asset_9x16reels_${timestamp}`;
    const existing = images.find((img) => img.hash === img9x16Reels.hash);
    if (existing) {
      existing.adlabels.push({ name: label });
    } else {
      images.push({ hash: img9x16Reels.hash, adlabels: [{ name: label }] });
    }
    labelMap["9x16reels"] = label;
  }

  // 1:1 이미지
  if (img1x1?.hash) {
    const label = `placement_asset_1x1_${timestamp}`;
    const existing = images.find((img) => img.hash === img1x1.hash);
    if (existing) {
      existing.adlabels.push({ name: label });
    } else {
      images.push({ hash: img1x1.hash, adlabels: [{ name: label }] });
    }
    labelMap["1x1"] = label;
  }

  if (images.length === 0) {
    throw new Error("No image hashes available");
  }

  // asset_customization_rules 생성
  const assetCustomizationRules: Record<string, unknown>[] = [];
  let priority = 1;

  // Rule 1: 9:16 → story, ig_search, profile_reels
  if (labelMap["9x16"]) {
    assetCustomizationRules.push({
      customization_spec: {
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

  // Rule 2: 1:1 → right_hand_column, search
  if (labelMap["1x1"]) {
    assetCustomizationRules.push({
      customization_spec: {
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
        publisher_platforms: ["facebook"],
        facebook_positions: ["facebook_reels"],
      },
      image_label: { name: labelMap["9x16reels"] },
      priority: priority++,
    });
  }

  // Rule 7: 1:1 → 기본값
  if (labelMap["1x1"]) {
    assetCustomizationRules.push({
      customization_spec: {},
      image_label: { name: labelMap["1x1"] },
      priority: priority++,
    });
  }

  const creativeData: Record<string, unknown> = {
    access_token: accessToken,
    name: name,
    object_story_spec: {
      page_id: config.page_id,
      ...(config.instagram_actor_id && { instagram_actor_id: config.instagram_actor_id }),
    },
    asset_feed_spec: {
      images,
      bodies: [{ text: body }],
      titles: [{ text: title }],
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

  // Omnichannel adset: applink_treatment + omnichannel_link_spec 필수
  if (omnichannel) {
    creativeData.applink_treatment = "automatic";
    creativeData.omnichannel_link_spec = {
      web: { url: websiteUrl },
      ios: omnichannel.ios,
      android: omnichannel.android,
    };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(creativeData),
  });

  const result = await response.json();

  if (result.error) {
    const errorDetail = result.error.error_user_msg || result.error.message;
    throw new Error(`Creative creation failed: ${errorDetail}`);
  }

  return result.id;
}

// 광고의 크리에이티브 업데이트
async function updateAdCreative(
  accessToken: string,
  adId: string,
  creativeId: string
): Promise<boolean> {
  const url = `${GRAPH_API_BASE}/${adId}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      access_token: accessToken,
      creative: { creative_id: creativeId },
    }),
  });

  const result = await response.json();

  if (result.error) {
    throw new Error(`Ad update failed: ${result.error.message}`);
  }

  return result.success === true;
}

export async function POST(request: NextRequest) {
  try {
    const arrayBuffer = await request.arrayBuffer();
    const body: UpdateRequest = JSON.parse(Buffer.from(arrayBuffer).toString("utf-8"));
    const { clientName, adIds, media } = body;

    if (!adIds || adIds.length === 0) {
      return NextResponse.json({ error: "수정할 광고를 선택해주세요" }, { status: 400 });
    }

    if (!media || media.length === 0) {
      return NextResponse.json({ error: "새 이미지를 업로드해주세요" }, { status: 400 });
    }

    const config = await getClient(clientName);
    if (!config) {
      return NextResponse.json({ error: `Client "${clientName}" not found` }, { status: 404 });
    }

    // page_id 자동 조회
    if (!config.page_id) {
      const pagesRes = await fetch(
        `${GRAPH_API_BASE}/me/accounts?fields=id,name&access_token=${config.access_token}`
      );
      const pagesData = await pagesRes.json();
      if (pagesData.data && pagesData.data.length > 0) {
        config.page_id = pagesData.data[0].id;
      } else {
        return NextResponse.json(
          { error: "Facebook 페이지를 찾을 수 없습니다" },
          { status: 400 }
        );
      }
    }

    // Instagram ID 자동 설정
    if (clientName === "AI코딩밸리" && !config.instagram_actor_id) {
      config.instagram_actor_id = AI_CODINGVALLEY_INSTAGRAM_ID;
    }

    const landingUrl = body.landingUrl || DEFAULT_LANDING_URL;
    const displayUrl = body.displayUrl || DEFAULT_DISPLAY_URL;
    const description = body.description || DEFAULT_DESCRIPTION;

    const results: { adId: string; adName: string; success: boolean; error?: string }[] = [];

    for (const adId of adIds) {
      try {
        // 기존 광고 정보 가져오기
        const adInfo = await getAdInfo(config.access_token, adId);
        if (!adInfo) {
          results.push({ adId, adName: adId, success: false, error: "광고 정보를 가져올 수 없음" });
          continue;
        }

        // 텍스트는 기존 값 유지 또는 새 값 사용
        const finalBody = body.body || adInfo.creative.body || "";
        const finalTitle = body.title || adInfo.creative.title || "";

        // 새 크리에이티브 생성
        const newCreativeId = await createNewCreative(
          config.ad_account_id,
          config.access_token,
          adInfo.name,
          finalBody,
          finalTitle,
          media,
          config,
          adInfo.adsetName,
          landingUrl,
          displayUrl,
          description,
          adInfo.omnichannel
        );

        // 광고 업데이트
        await updateAdCreative(config.access_token, adId, newCreativeId);

        results.push({ adId, adName: adInfo.name, success: true });
      } catch (error) {
        results.push({
          adId,
          adName: adId,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `${successCount}개 광고 수정 완료${failCount > 0 ? `, ${failCount}개 실패` : ""}`,
      results,
    });
  } catch (error) {
    console.error("Update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed" },
      { status: 500 }
    );
  }
}
