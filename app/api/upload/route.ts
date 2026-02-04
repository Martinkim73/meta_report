import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const GRAPH_API_VERSION = "v22.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

interface ClientConfig {
  access_token: string;
  ad_account_id: string;
  target_campaigns: string[];
  landing_url?: string;
  page_id?: string;
  instagram_actor_id?: string;
}

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

interface UploadRequest {
  type: "DA" | "VA";
  clientName: string;
  adsetIds?: string[];
  creatives: CreativePayload[];
}

async function getClientConfig(clientName: string): Promise<ClientConfig | null> {
  try {
    const clientsPath = path.join(process.cwd(), "clients.json");
    const data = await fs.readFile(clientsPath, "utf-8");
    const clients = JSON.parse(data);
    return clients[clientName] || null;
  } catch {
    return null;
  }
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

// Create Ad Creative (simplified - uses first media asset)
async function createAdCreative(
  adAccountId: string,
  accessToken: string,
  creative: CreativePayload,
  mediaAssets: { hash?: string; videoId?: string; slot: string }[],
  config: ClientConfig,
  isVideo: boolean
): Promise<string> {
  const url = `${GRAPH_API_BASE}/${adAccountId}/adcreatives`;

  const link = config.landing_url || "https://example.com";

  // Build object_story_spec based on media type
  let objectStorySpec;

  if (isVideo) {
    // Video ad
    objectStorySpec = {
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
  } else {
    // Image ad
    objectStorySpec = {
      page_id: config.page_id,
      link_data: {
        link,
        message: creative.body,
        name: creative.title,
        image_hash: mediaAssets[0]?.hash,
        call_to_action: { type: "LEARN_MORE" },
      },
    };
  }

  // Instagram actor ID는 별도로 추가 (선택적)
  // Meta 앱이 라이브 모드일 때만 작동

  const creativeData = {
    access_token: accessToken,
    name: creative.name,
    object_story_spec: objectStorySpec,
  };

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
    const body: UploadRequest = await request.json();
    const { type, clientName, adsetIds, creatives } = body;

    // Get client config
    const config = await getClientConfig(clientName);
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
      adIds: string[];
    }[] = [];

    // Use provided adsetIds or fall back to auto-detection
    let adsets: { id: string; name: string }[];

    if (adsetIds && adsetIds.length > 0) {
      // Use manually selected adsets
      adsets = adsetIds.map((id) => ({ id, name: id }));
    } else {
      // Fall back to auto-detection from target campaigns
      adsets = await getActiveAdsets(
        config.ad_account_id,
        config.access_token,
        config.target_campaigns
      );
    }

    if (adsets.length === 0) {
      return NextResponse.json(
        { error: "광고세트를 선택해주세요" },
        { status: 400 }
      );
    }

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

      // Create ad creative
      const creativeId = await createAdCreative(
        config.ad_account_id,
        config.access_token,
        creative,
        mediaAssets,
        config,
        isVideo
      );

      // Create ads in each active adset
      const adIds: string[] = [];
      for (const adset of adsets) {
        const adId = await createAd(
          config.ad_account_id,
          config.access_token,
          adset.id,
          creativeId,
          `${creative.name}_${adset.name}`
        );
        adIds.push(adId);
      }

      results.push({
        creativeName: creative.name,
        creativeId,
        adIds,
      });
    }

    return NextResponse.json({
      success: true,
      message: `${results.length}개 소재가 등록되었습니다`,
      results,
      adsetsUsed: adsets.map((a) => a.name),
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
