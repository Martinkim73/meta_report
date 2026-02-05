import { NextRequest, NextResponse } from "next/server";
import { getClient } from "@/lib/redis";

export const runtime = "nodejs";

const GRAPH_API_VERSION = "v22.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export async function GET(request: NextRequest) {
  const clientName = request.nextUrl.searchParams.get("client");
  const campaignId = request.nextUrl.searchParams.get("campaign_id");

  if (!clientName) {
    return NextResponse.json({ error: "Client name required" }, { status: 400 });
  }

  if (!campaignId) {
    return NextResponse.json({ error: "Campaign ID required" }, { status: 400 });
  }

  const config = await getClient(clientName);
  if (!config) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  try {
    // Get adsets from campaign
    const adsetsUrl = `${GRAPH_API_BASE}/${campaignId}/adsets?fields=id,name,status,destination_type,promoted_object&limit=100&access_token=${config.access_token}`;
    const adsetsRes = await fetch(adsetsUrl);
    const adsetsData = await adsetsRes.json();

    if (adsetsData.error) {
      throw new Error(adsetsData.error.message);
    }

    // Filter and mark which ones are compatible
    const adsets = (adsetsData.data || []).map((a: {
      id: string;
      name: string;
      status: string;
      destination_type: string;
      promoted_object?: { omnichannel_object?: unknown };
    }) => {
      const isOmnichannel = !!a.promoted_object?.omnichannel_object;
      const isApp = a.destination_type === "APP";

      return {
        id: a.id,
        name: a.name,
        status: a.status,
        isOmnichannel,
        isApp,
        compatible: !isOmnichannel, // APP도 호환, Omnichannel만 제외
        warning: isOmnichannel ? "Omnichannel (DPA 전용)" : null,
      };
    });

    return NextResponse.json({ adsets });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get adsets" },
      { status: 500 }
    );
  }
}
