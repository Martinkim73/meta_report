import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const clientsPath = path.join(process.cwd(), "clients.json");

async function readClients(): Promise<Record<string, unknown>> {
  try {
    const data = await fs.readFile(clientsPath, "utf-8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function writeClients(clients: Record<string, unknown>): Promise<void> {
  await fs.writeFile(clientsPath, JSON.stringify(clients, null, 2), "utf-8");
}

export async function GET() {
  try {
    const clients = await readClients();
    // Return client names and basic info (not tokens)
    const clientList = Object.entries(clients).map(([name, config]) => ({
      name,
      adAccountId: (config as Record<string, unknown>).ad_account_id,
      targetCampaigns: (config as Record<string, unknown>).target_campaigns,
    }));

    return NextResponse.json({ clients: clientList });
  } catch {
    return NextResponse.json({ clients: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      accessToken,
      adAccountId,
      targetCampaigns,
      minSpend,
      lowRoasThreshold,
      budgetRulePct,
      discordWebhook,
      pageId,
      instagramActorId,
      landingUrl,
    } = body;

    if (!name || !accessToken || !adAccountId) {
      return NextResponse.json(
        { error: "필수 항목을 입력해주세요 (이름, 토큰, 계정 ID)" },
        { status: 400 }
      );
    }

    const clients = await readClients();

    // Add new client
    clients[name] = {
      access_token: accessToken,
      ad_account_id: adAccountId,
      target_campaigns: targetCampaigns
        ? targetCampaigns.split("\n").filter((c: string) => c.trim())
        : [],
      min_spend: minSpend || 250000,
      low_roas_threshold: lowRoasThreshold || 85,
      budget_rule_pct: budgetRulePct || 50,
      discord_webhook: discordWebhook || "",
      page_id: pageId || "",
      instagram_actor_id: instagramActorId || "",
      landing_url: landingUrl || "",
    };

    await writeClients(clients);

    return NextResponse.json({ success: true, message: `${name} 광고주가 추가되었습니다` });
  } catch (error) {
    console.error("Error adding client:", error);
    return NextResponse.json(
      { error: "광고주 추가 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name");

    if (!name) {
      return NextResponse.json(
        { error: "광고주 이름이 필요합니다" },
        { status: 400 }
      );
    }

    const clients = await readClients();

    if (!clients[name]) {
      return NextResponse.json(
        { error: "존재하지 않는 광고주입니다" },
        { status: 404 }
      );
    }

    delete clients[name];
    await writeClients(clients);

    return NextResponse.json({ success: true, message: `${name} 광고주가 삭제되었습니다` });
  } catch (error) {
    console.error("Error deleting client:", error);
    return NextResponse.json(
      { error: "광고주 삭제 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
