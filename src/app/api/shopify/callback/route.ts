import { NextRequest, NextResponse } from "next/server";
import { storeRegistry } from "@/lib/store-registry";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const shop = searchParams.get("shop");
  const code = searchParams.get("code");
  const name = searchParams.get("name");
  const description = searchParams.get("description");

  if (!shop || !code) {
    return NextResponse.json({ error: "Missing shop or code parameter" }, { status: 400 });
  }

  // In a real app, we would exchange the code for an access token
  // const accessToken = await exchangeCodeForToken(shop, code);
  const accessToken = `shpat_mock_${Math.random().toString(36).substring(7)}`;

  // Save the store in our registry
  storeRegistry.add({
    shopUrl: shop,
    name: name || undefined,
    description: description || undefined,
    accessToken: accessToken,
    isConnected: true
  });

  // Redirect the user to the stores page
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return NextResponse.redirect(`${appUrl}/stores`);
}
