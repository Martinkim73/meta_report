import { NextRequest, NextResponse } from "next/server";
import { getClient } from "@/lib/redis";
import { safeJsonParse } from "@/lib/api-helpers";

export const runtime = "nodejs";

const GRAPH_API_VERSION = "v22.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export async function POST(request: NextRequest) {
  try {
    // FormData로 파일 수신 (Base64 인코딩 없음 - Vercel 4.5MB 제한 우회!)
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const clientName = formData.get("clientName") as string;
    const mediaType = formData.get("mediaType") as string;

    if (!file || !clientName || !mediaType) {
      return NextResponse.json(
        { error: "Missing required fields: file, clientName, mediaType" },
        { status: 400 }
      );
    }

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
      // 비디오: FormData로 직접 Meta API에 전송
      const videoBuffer = await file.arrayBuffer();
      const blob = new Blob([videoBuffer]);

      const metaFormData = new FormData();
      metaFormData.append("access_token", accessToken);
      metaFormData.append("title", file.name);
      metaFormData.append("source", blob, file.name);

      const response = await fetch(`${GRAPH_API_BASE}/${adAccountId}/advideos`, {
        method: "POST",
        body: metaFormData,
      });

      const result = await safeJsonParse(response, "Video upload");
      return NextResponse.json({ videoId: result.id });
    }

    // 이미지: Base64로 변환 후 Meta API에 전송 (Meta API 요구사항)
    const imageBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(imageBuffer);
    let binary = "";
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    const base64 = btoa(binary);

    const response = await fetch(`${GRAPH_API_BASE}/${adAccountId}/adimages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_token: accessToken,
        bytes: base64,
        name: file.name,
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
