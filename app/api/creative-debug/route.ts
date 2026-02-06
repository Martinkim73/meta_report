import { NextRequest, NextResponse } from "next/server";
import { getClient } from "@/lib/redis";

export const runtime = "nodejs";

const GRAPH_API_VERSION = "v22.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientName = searchParams.get("client");
    const creativeId = searchParams.get("creative_id");

    if (!clientName || !creativeId) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const config = await getClient(clientName);
    if (!config) {
      return NextResponse.json({ error: `Client "${clientName}" not found` }, { status: 404 });
    }

    const response = await fetch(
      `${GRAPH_API_BASE}/${creativeId}?fields=id,name,object_story_spec,asset_feed_spec&access_token=${config.access_token}`
    );

    const result = await response.json();

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Creative debug error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}
