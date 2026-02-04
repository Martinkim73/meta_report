import { NextRequest, NextResponse } from "next/server";
import { getClient, ClientConfig } from "@/lib/redis";

export const runtime = "nodejs";

const GRAPH_API_VERSION = "v22.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

interface MediaUpload {
  slot: string;
  ratio: string;
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
}

interface UploadRequest {
  type: "DA" | "VA";
  clientName: string;
  adsetIds?: string[];  // deprecated, use adsets
  adsets?: AdsetInfo[];
  creatives: CreativePayload[];
}


// Landing & UTM constants (AI코딩밸리)
const LANDING_BASE = "https://www.codingvalley.com/ldm/7";
const DISPLAY_URL = "https://www.codingvalley.com";
const DEFAULT_DESCRIPTION = "AI 시대 성공 전략, AI 코딩밸리";

function generateUtmUrl(creativeName: string, adsetName: string): string {
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
  return `${LANDING_BASE}?${params.toString()}`;
}

// Create Ad Creative — DA uses asset_feed_spec (multi-image, placement optimized), VA uses object_story_spec
async function createAdCreative(
  adAccountId: string,
  accessToken: string,
  creative: CreativePayload,
  mediaAssets: { hash?: string; videoId?: string; slot: string }[],
  config: ClientConfig,
  isVideo: boolean,
  adsetName: string
): Promise<string> {
  const url = `${GRAPH_API_BASE}/${adAccountId}/adcreatives`;
  const websiteUrl = generateUtmUrl(creative.name, adsetName);

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
    // DA: asset_feed_spec — 4장 이미지를 비율별로 배치 최적화
    const images = mediaAssets
      .filter((m) => m.hash)
      .map((m) => ({ hash: m.hash }));

    if (images.length === 0) {
      throw new Error("No image hashes available");
    }

    const objectStorySpec: Record<string, unknown> = {
      page_id: config.page_id,
    };

    if (config.instagram_actor_id) {
      objectStorySpec.instagram_user_id = config.instagram_actor_id;
    }

    creativeData = {
      access_token: accessToken,
      name: creative.name,
      object_story_spec: objectStorySpec,
      asset_feed_spec: {
        images,
        bodies: [{ text: creative.body }],
        titles: [{ text: creative.title }],
        descriptions: [{ text: DEFAULT_DESCRIPTION }],
        link_urls: [
          {
            website_url: websiteUrl,
            display_url: DISPLAY_URL,
          },
        ],
        call_to_action_types: ["LEARN_MORE"],
        ad_formats: ["AUTOMATIC_FORMAT"],
        optimization_type: "PLACEMENT",
      },
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
    throw new Error(`Creative creation failed: ${errorDetail} (code: ${result.error.code}, subcode: ${result.error.error_subcode || 'none'})`);
  }

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
  name: string
): Promise<string> {
  const url = `${GRAPH_API_BASE}/${adAccountId}/ads`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      access_token: accessToken,
      name,
      adset_id: adsetId,
      creative: JSON.stringify({ creative_id: creativeId }),
      status: "PAUSED", // Start paused for safety
    }),
  });

  const result = await response.json();

  if (result.error) {
    const errorDetail = result.error.error_user_msg || result.error.message;
    throw new Error(`Ad creation failed: ${errorDetail} (code: ${result.error.code}, subcode: ${result.error.error_subcode || 'none'})`);
  }

  return result.id;
}

export async function POST(request: NextRequest) {
  try {
    const arrayBuffer = await request.arrayBuffer();
    const body: UploadRequest = JSON.parse(Buffer.from(arrayBuffer).toString("utf-8"));
    const { type, clientName, adsetIds, adsets: adsetInfos, creatives } = body;

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

    // Omnichannel 세트는 DPA(동적제품광고)만 호환 — 수동 소재 업로드 불가, 자동 제외
    const skippedOmni = targetAdsets.filter((a) => a.isOmnichannel).map((a) => a.name);
    const regularAdsets = targetAdsets.filter((a) => !a.isOmnichannel);

    // Process each creative
    for (const creative of creatives) {
      // Media already uploaded via /api/upload-image — use hashes directly
      const mediaAssets: { hash?: string; videoId?: string; slot: string }[] = creative.media.map(
        (m) => ({ hash: m.hash, videoId: m.videoId, slot: m.slot })
      );

      const adIds: string[] = [];
      let lastCreativeId = "";

      // 각 광고세트마다 개별 creative 생성 (adset별 UTM 추적)
      for (const adset of regularAdsets) {
        const creativeId = await createAdCreative(
          config.ad_account_id,
          config.access_token,
          creative,
          mediaAssets,
          config,
          isVideo,
          adset.name
        );
        lastCreativeId = creativeId;

        const adId = await createAd(
          config.ad_account_id,
          config.access_token,
          adset.id,
          creativeId,
          creative.name
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
      adsetsUsed: regularAdsets.map((a) => a.name),
      ...(skippedOmni.length > 0 && {
        warning: `Omnichannel 세트는 DPA만 호환되어 자동 제외됨: ${skippedOmni.join(", ")}`,
      }),
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
