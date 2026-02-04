import { NextRequest, NextResponse } from "next/server";
import { getClient, ClientConfig } from "@/lib/redis";

export const runtime = "nodejs";

const GRAPH_API_VERSION = "v22.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

interface MediaUpload {
  slot: string;
  ratio: string;
  base64: string;
  filename: string;
  mimeType: string;
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


// Upload image to Meta and get image hash
async function uploadImage(
  adAccountId: string,
  accessToken: string,
  base64Data: string,
  filename: string
): Promise<{ hash: string; url: string }> {
  const url = `${GRAPH_API_BASE}/${adAccountId}/adimages`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      access_token: accessToken,
      bytes: base64Data,
      name: filename,
    }),
  });

  const result = await response.json();

  if (result.error) {
    const errorDetail = result.error.error_user_msg || result.error.message;
    throw new Error(`Image upload failed: ${errorDetail}`);
  }

  // Response format: { images: { [key]: { hash, url } } }
  const images = result.images;
  if (!images) {
    throw new Error("No image data in response");
  }

  // Get first image from response (key can be 'bytes' or filename)
  const imageData = Object.values(images)[0] as { hash: string; url: string };
  return { hash: imageData.hash, url: imageData.url };
}

// Upload video to Meta and get video ID
async function uploadVideo(
  adAccountId: string,
  accessToken: string,
  base64Data: string,
  filename: string
): Promise<string> {
  const url = `${GRAPH_API_BASE}/${adAccountId}/advideos`;

  // For videos, we use the source parameter with base64
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      access_token: accessToken,
      source: base64Data,
      title: filename,
    }),
  });

  const result = await response.json();

  if (result.error) {
    throw new Error(`Video upload failed: ${result.error.message}`);
  }

  return result.id;
}

// Slot to placement mapping
// Facebook positions: feed, story, marketplace, video_feeds, search, instream_video, right_hand_column
// Instagram positions: stream (피드), story, explore, explore_home, reels, shop, ig_search, profile_feed
const SLOT_PLACEMENTS: Record<string, string[]> = {
  "피드 이미지": ["facebook_feed", "instagram_stream"],
  "스토리 이미지": ["facebook_story", "instagram_story"],
  "릴스 이미지": ["instagram_reels", "facebook_reels"],
  "기본 이미지": ["instagram_explore", "instagram_explore_home", "facebook_marketplace"],
  // VA slots
  "기본 영상": ["facebook_feed", "instagram_stream"],
  "스토리/릴스 영상": ["facebook_story", "instagram_story", "instagram_reels", "facebook_reels"],
  "피드 영상": ["facebook_feed", "instagram_stream"],
};

// Create Ad Creative with asset_feed_spec for multi-image support
async function createAdCreative(
  adAccountId: string,
  accessToken: string,
  creative: CreativePayload,
  mediaAssets: { hash?: string; videoId?: string; slot: string }[],
  config: ClientConfig,
  isVideo: boolean,
  isOmnichannel: boolean = false
): Promise<string> {
  const url = `${GRAPH_API_BASE}/${adAccountId}/adcreatives`;
  const link = config.landing_url || "https://example.com";

  let creativeData: Record<string, unknown>;

  if (isVideo) {
    // Video: 단일 영상 사용 (asset_feed_spec은 이미지에 더 적합)
    const objectStorySpec: Record<string, unknown> = {
      page_id: config.page_id,
      video_data: {
        video_id: mediaAssets[0]?.videoId,
        message: creative.body,
        title: creative.title,
        call_to_action: {
          type: "LEARN_MORE",
          value: { link },
        },
      },
    };

    if (config.instagram_actor_id) {
      objectStorySpec.instagram_actor_id = config.instagram_actor_id;
    }

    creativeData = {
      access_token: accessToken,
      name: creative.name,
      object_story_spec: objectStorySpec,
    };
  } else {
    // Image: link_data 방식 (첫 번째 이미지 사용)
    const firstImage = mediaAssets.find((m) => m.hash);
    if (!firstImage?.hash) {
      throw new Error("No image hash available");
    }

    const objectStorySpec: Record<string, unknown> = {
      page_id: config.page_id,
      link_data: {
        image_hash: firstImage.hash,
        link,
        message: creative.body,
        name: creative.title,
        call_to_action: { type: "LEARN_MORE" },
      },
    };

    // TODO: instagram_actor_id 지원 - 현재 Meta API 호환성 이슈로 비활성화
    // Instagram 노출은 광고세트 타겟팅으로 처리됨
    // if (config.instagram_actor_id) {
    //   objectStorySpec.instagram_actor_id = config.instagram_actor_id;
    // }

    creativeData = {
      access_token: accessToken,
      name: creative.name,
      object_story_spec: objectStorySpec,
    };

    // 옴니채널 광고세트용 object_store_url 추가
    if (isOmnichannel) {
      creativeData.object_store_url = link;
    }
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

    // Separate omnichannel and regular adsets
    const regularAdsets = targetAdsets.filter((a) => !a.isOmnichannel);
    const omnichannelAdsets = targetAdsets.filter((a) => a.isOmnichannel);

    // Process each creative
    for (const creative of creatives) {
      const mediaAssets: { hash?: string; videoId?: string; slot: string }[] = [];

      // Upload media files
      for (const media of creative.media) {
        if (isVideo) {
          const videoId = await uploadVideo(
            config.ad_account_id,
            config.access_token,
            media.base64,
            media.filename
          );
          mediaAssets.push({ videoId, slot: media.slot });
        } else {
          const { hash } = await uploadImage(
            config.ad_account_id,
            config.access_token,
            media.base64,
            media.filename
          );
          mediaAssets.push({ hash, slot: media.slot });
        }
      }

      const adIds: string[] = [];
      let creativeId = "";
      let omnichannelCreativeId = "";

      // Create creative for regular adsets
      if (regularAdsets.length > 0) {
        creativeId = await createAdCreative(
          config.ad_account_id,
          config.access_token,
          creative,
          mediaAssets,
          config,
          isVideo,
          false
        );

        // Create ads in regular adsets
        for (const adset of regularAdsets) {
          const adId = await createAd(
            config.ad_account_id,
            config.access_token,
            adset.id,
            creativeId,
            `${creative.name}_${adset.name}`
          );
          adIds.push(adId);
        }
      }

      // Create separate creative for omnichannel adsets (needs object_store_url)
      if (omnichannelAdsets.length > 0) {
        omnichannelCreativeId = await createAdCreative(
          config.ad_account_id,
          config.access_token,
          { ...creative, name: `${creative.name}_omni` },
          mediaAssets,
          config,
          isVideo,
          true
        );

        // Create ads in omnichannel adsets
        for (const adset of omnichannelAdsets) {
          const adId = await createAd(
            config.ad_account_id,
            config.access_token,
            adset.id,
            omnichannelCreativeId,
            `${creative.name}_${adset.name}`
          );
          adIds.push(adId);
        }
      }

      results.push({
        creativeName: creative.name,
        creativeId: creativeId || omnichannelCreativeId,
        ...(omnichannelCreativeId && { omnichannelCreativeId }),
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
