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
      // 비디오: FormData로 직접 Meta API에 전송 (원본 File 객체 사용)
      const metaFormData = new FormData();
      metaFormData.append("access_token", accessToken);
      metaFormData.append("title", file.name);
      metaFormData.append("source", file);  // 원본 File 객체 직접 사용 (MIME type 유지)

      const response = await fetch(`${GRAPH_API_BASE}/${adAccountId}/advideos`, {
        method: "POST",
        body: metaFormData,  // Content-Type 자동 설정 (multipart/form-data)
      });

      const result = await safeJsonParse(response, "Video upload");
      return NextResponse.json({ videoId: result.id });
    }

    // 이미지: FormData로 직접 Meta API에 전송 (원본 File 객체 사용)
    const imageFormData = new FormData();
    imageFormData.append("access_token", accessToken);
    imageFormData.append("source", file);  // 원본 File 객체 직접 사용 (MIME type 유지)
    imageFormData.append("name", file.name);

    const response = await fetch(`${GRAPH_API_BASE}/${adAccountId}/adimages`, {
      method: "POST",
      body: imageFormData,  // Content-Type 자동 설정 (multipart/form-data)
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
