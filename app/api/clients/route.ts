import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET() {
  try {
    const clientsPath = path.join(process.cwd(), "clients.json");
    const data = await fs.readFile(clientsPath, "utf-8");
    const clients = JSON.parse(data);

    // Return only client names (not sensitive data)
    const clientNames = Object.keys(clients);

    return NextResponse.json({ clients: clientNames });
  } catch {
    return NextResponse.json({ clients: [] });
  }
}
