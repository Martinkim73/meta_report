import { NextRequest, NextResponse } from "next/server";
import { getClient } from "@/lib/redis";
import { safeJsonParse } from "@/lib/api-helpers";

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
      // Meta API는 영상을 FormData로 업로드해야 함
      const videoBuffer = Buffer.from(base64, "base64");
      const blob = new Blob([videoBuffer]);

      const formData = new FormData();
      formData.append("access_token", accessToken);
      formData.append("title", filename);
      formData.append("source", blob, filename);

      const response = await fetch(`${GRAPH_API_BASE}/${adAccountId}/advideos`, {
        method: "POST",
        body: formData,
      });

      const result = await safeJsonParse(response, "Video upload");
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

    const result = await safeJsonParse(response, "Image upload");
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
