import { NextRequest, NextResponse } from "next/server";
import { getClient } from "@/lib/redis";

const GRAPH_API_VERSION = "v22.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export async function GET(request: NextRequest) {
  const clientName = request.nextUrl.searchParams.get("client");
  const adsetId = request.nextUrl.searchParams.get("adset_id");

  if (!clientName) {
    return NextResponse.json({ error: "Client name required" }, { status: 400 });
  }

  const config = await getClient(clientName);
  if (!config) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  try {
    let adsUrl: string;

    if (adsetId) {
      // 특정 광고세트의 광고들
      adsUrl = `${GRAPH_API_BASE}/${adsetId}/ads?fields=id,name,status,creative{id,name,thumbnail_url,object_story_spec}&limit=100&access_token=${config.access_token}`;
    } else {
      // 광고 계정의 모든 광고
      adsUrl = `${GRAPH_API_BASE}/${config.ad_account_id}/ads?fields=id,name,status,adset_id,creative{id,name,thumbnail_url,object_story_spec}&limit=100&access_token=${config.access_token}`;
    }

    const adsRes = await fetch(adsUrl);
    const adsData = await adsRes.json();

    if (adsData.error) {
      throw new Error(adsData.error.message);
    }

    const ads = (adsData.data || []).map((ad: {
      id: string;
      name: string;
      status: string;
      adset_id?: string;
      creative?: {
        id: string;
        name: string;
        thumbnail_url?: string;
      };
    }) => ({
      id: ad.id,
      name: ad.name,
      status: ad.status,
      adsetId: ad.adset_id,
      creative: ad.creative ? {
        id: ad.creative.id,
        name: ad.creative.name,
        thumbnailUrl: ad.creative.thumbnail_url,
      } : null,
    }));

    return NextResponse.json({ ads });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get ads" },
      { status: 500 }
    );
  }
}
