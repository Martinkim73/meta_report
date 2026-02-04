import { NextRequest, NextResponse } from "next/server";
import { getClient } from "@/lib/redis";

const GRAPH_API_VERSION = "v22.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export async function GET(request: NextRequest) {
  const clientName = request.nextUrl.searchParams.get("client");

  if (!clientName) {
    return NextResponse.json({ error: "Client name required" }, { status: 400 });
  }

  const config = await getClient(clientName);
  if (!config) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  try {
    // Get all campaigns
    const campaignsUrl = `${GRAPH_API_BASE}/${config.ad_account_id}/campaigns?fields=id,name,status&limit=100&access_token=${config.access_token}`;
    const campaignsRes = await fetch(campaignsUrl);
    const campaignsData = await campaignsRes.json();

    if (campaignsData.error) {
      throw new Error(campaignsData.error.message);
    }

    // Filter to show only ACTIVE and PAUSED campaigns
    const campaigns = (campaignsData.data || [])
      .filter((c: { status: string }) => c.status === "ACTIVE" || c.status === "PAUSED")
      .map((c: { id: string; name: string; status: string }) => ({
        id: c.id,
        name: c.name,
        status: c.status,
      }));

    return NextResponse.json({ campaigns });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get campaigns" },
      { status: 500 }
    );
  }
}
