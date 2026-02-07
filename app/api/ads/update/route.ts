import { NextRequest, NextResponse } from "next/server";
import { getClient, ClientConfig } from "@/lib/redis";
import { safeJsonParse } from "@/lib/api-helpers";

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
  mediaType: "image" | "video";
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

  // 이미지와 영상 분리
  const images: { hash: string; adlabels: { name: string }[] }[] = [];
  const videos: { video_id: string; adlabels: { name: string }[] }[] = [];
  const labelMap: Record<string, string> = {}; // VA용
  const hashMap: Record<string, string> = {}; // DA용
  const isVideo = media.some((m) => m.mediaType === "video");

  media.forEach((m, idx) => {
    if (m.mediaType === "video" && m.videoId) {
      // VA: 영상도 placement별 매핑
      const slotType =
        m.slot === "4:5 피드" ? "4x5"
        : m.slot === "9:16 스토리/릴스" ? "9x16"
        : m.slot === "1:1 기본" ? "1x1"
        : `video${idx}`;

      const label = `placement_asset_${slotType}_${timestamp}`;

      const existing = videos.find((v) => v.video_id === m.videoId);
      if (existing) {
        existing.adlabels.push({ name: label });
      } else {
        videos.push({ video_id: m.videoId, adlabels: [{ name: label }] });
      }

      labelMap[slotType] = label;
      return;
    }

    if (!m.hash) return;

    // DA: 슬롯별 해시 수집 (images는 DA 규칙 블록에서 구성)
    const slotType =
      m.slot === "4:5 피드" ? "4x5"
      : m.slot === "피드 이미지" ? "4x5"
      : m.slot === "9:16 스토리" ? "9x16"
      : m.slot === "스토리 이미지" ? "9x16"
      : m.slot === "9:16 릴스" ? "9x16reels"
      : m.slot === "릴스 이미지" ? "9x16reels"
      : m.slot === "1:1 기본" ? "1x1"
      : m.slot === "기본 이미지" ? "1x1"
      : null;
    if (slotType) hashMap[slotType] = m.hash;
  });

  if (Object.keys(hashMap).length === 0 && videos.length === 0) {
    throw new Error("이미지 또는 영상이 필요합니다");
  }

  // asset_customization_rules 생성
  const assetCustomizationRules: Record<string, unknown>[] = [];
  let priority = 1;
  const assetLabelKey = isVideo ? "video_label" : "image_label";
  const allBodyLabels: { name: string }[] = [];
  const allLinkLabels: { name: string }[] = [];
  const allTitleLabels: { name: string }[] = [];

  if (isVideo) {
    // VA 영상 규칙 - 정상 작동하는 광고와 동일한 구조 (4개 규칙만)
    const platforms = config.instagram_actor_id
      ? ["facebook", "instagram", "audience_network", "messenger"]
      : ["facebook", "audience_network", "messenger"];

    // Rule 1: 9:16 → 스토리, 릴스, 탐색
    if (labelMap["9x16"]) {
      const rule: Record<string, unknown> = {
        customization_spec: {
          publisher_platforms: platforms,
          facebook_positions: ["story", "facebook_reels"],
          messenger_positions: ["story"],
          audience_network_positions: ["classic", "rewarded_video"],
        },
        [assetLabelKey]: { name: labelMap["9x16"] },
        priority: priority++,
      };

      if (config.instagram_actor_id) {
        (rule.customization_spec as Record<string, unknown>).instagram_positions = ["story", "reels", "ig_search", "profile_reels"];
      }

      assetCustomizationRules.push(rule);
    }

    // Rule 2: 4:5 → facebook feed만
    if (labelMap["4x5"]) {
      assetCustomizationRules.push({
        customization_spec: {
          publisher_platforms: ["facebook"],
          facebook_positions: ["feed"],
        },
        [assetLabelKey]: { name: labelMap["4x5"] },
        priority: priority++,
      });
    }

    // Rule 3: 4:5 → instagram stream (피드)만
    if (labelMap["4x5"]) {
      assetCustomizationRules.push({
        customization_spec: {
          publisher_platforms: ["instagram"],
          instagram_positions: ["stream"],
        },
        [assetLabelKey]: { name: labelMap["4x5"] },
        priority: priority++,
      });
    }

    // Rule 4: 1:1 → 기본값 (placement 지정 없음! right_hand_column, search는 자동 처리)
    if (labelMap["1x1"]) {
      assetCustomizationRules.push({
        customization_spec: {},
        [assetLabelKey]: { name: labelMap["1x1"] },
        priority: priority++,
      });
    }
  } else {
    // DA 이미지 규칙 - 정답 광고 구조 100% 복제 (7개 규칙, 고유 라벨)
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

    // Rule 1: 9:16 → story (facebook, instagram, messenger, audience_network)
    if (hashMap["9x16"]) {
      allBodyLabels.push({ name: ruleLabels.r1.body });
      allLinkLabels.push({ name: ruleLabels.r1.link });
      allTitleLabels.push({ name: ruleLabels.r1.title });
      assetCustomizationRules.push({
        customization_spec: {
          age_max: 65, age_min: 13,
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
          age_max: 65, age_min: 13,
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
          age_max: 65, age_min: 13,
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
          age_max: 65, age_min: 13,
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
          age_max: 65, age_min: 13,
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
          age_max: 65, age_min: 13,
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
          age_max: 65, age_min: 13,
        },
        image_label: { name: ruleLabels.r7.img },
        body_label: { name: ruleLabels.r7.body },
        link_url_label: { name: ruleLabels.r7.link },
        title_label: { name: ruleLabels.r7.title },
        priority: priority++,
      });
    }
  }

  // object_story_spec 구성
  const objectStorySpec: Record<string, unknown> = {
    page_id: config.page_id,
  };

  // Instagram ID 포함 (DA와 VA 모두 instagram_user_id 사용)
  if (config.instagram_actor_id) {
    // asset_feed_spec 사용 시 instagram_user_id 필요 (DA/VA 공통)
    objectStorySpec.instagram_user_id = config.instagram_actor_id;
  }

  const creativeData: Record<string, unknown> = {
    access_token: accessToken,
    name: name,
    object_story_spec: objectStorySpec,
    asset_feed_spec: {
      ...(images.length > 0 && { images }),
      ...(videos.length > 0 && { videos }),
      bodies: [{ text: body, ...(allBodyLabels.length > 0 && { adlabels: allBodyLabels }) }],
      titles: [{ text: title, ...(allTitleLabels.length > 0 && { adlabels: allTitleLabels }) }],
      descriptions: [{ text: description }],
      link_urls: [
        {
          website_url: websiteUrl,
          display_url: displayUrl,
          ...(allLinkLabels.length > 0 && { adlabels: allLinkLabels }),
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

  const result = await safeJsonParse(response, "Creative creation");

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

  const result = await safeJsonParse(response, "Ad update");
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

    // Instagram ID 자동 설정 - 페이지에서 조회
    if (!config.instagram_actor_id && config.page_id) {
      try {
        const igRes = await fetch(
          `${GRAPH_API_BASE}/${config.page_id}?fields=instagram_business_account&access_token=${config.access_token}`
        );
        const igData = await igRes.json();
        if (igData.instagram_business_account?.id) {
          config.instagram_actor_id = igData.instagram_business_account.id;
          console.log("Instagram actor ID fetched:", config.instagram_actor_id);
        }
      } catch (err) {
        console.warn("Failed to fetch Instagram actor ID:", err);
      }
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
