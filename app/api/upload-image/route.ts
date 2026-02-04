import { NextRequest, NextResponse } from "next/server";
import { getClient } from "@/lib/redis";

export const runtime = "nodejs";

const GRAPH_API_VERSION = "v22.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export async function POST(request: NextRequest) {
  try {
    const arrayBuffer = await request.arrayBuffer();
    const { clientName, base64, filename, mediaType } = JSON.parse(
      Buffer.from(arrayBuffer).toString("utf-8")
    );

    const config = await getClient(clientName);
    if (!config) {
      return NextResponse.json(
        { error: `Client "${clientName}" not found` },
        { status: 404 }
      );
    }

    const adAccountId = config.ad_account_id;
    const accessToken = config.access_token;

    if (mediaType === "video") {
      const response = await fetch(`${GRAPH_API_BASE}/${adAccountId}/advideos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: accessToken,
          source: base64,
          title: filename,
        }),
      });
      const result = await response.json();
      if (result.error) {
        throw new Error(result.error.error_user_msg || result.error.message);
      }
      return NextResponse.json({ videoId: result.id });
    }

    // Image upload
    const response = await fetch(`${GRAPH_API_BASE}/${adAccountId}/adimages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_token: accessToken,
        bytes: base64,
        name: filename,
      }),
    });
    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.error_user_msg || result.error.message);
    }

    const images = result.images;
    if (!images) throw new Error("No image data in response");
    const imageData = Object.values(images)[0] as { hash: string; url: string };
    return NextResponse.json({ hash: imageData.hash, url: imageData.url });
  } catch (error) {
    console.error("Upload-image error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
