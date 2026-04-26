import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const shop = searchParams.get("shop");
  const name = searchParams.get("name");
  const description = searchParams.get("description");

  if (!shop) {
    return NextResponse.json({ error: "Missing shop parameter" }, { status: 400 });
  }

  const clientId = process.env.SHOPIFY_CLIENT_ID;
  if (!clientId) {
     return NextResponse.json({ error: "Shopify Client ID not configured" }, { status: 500 });
  }

  const scopes = "read_products,write_orders,read_orders";
  
  // Use app URL from env or fallback to req.url origin
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  const redirectUri = `${appUrl}/api/shopify/callback`;

  // Provide state to preserve metadata and CSRF token
  const statePayload = {
     name: name || "",
     description: description || "",
     nonce: Math.random().toString(36).substring(7),
  };
  // Base64 encode state (using standard btoa-like utility since we're in Edge/Next wrapper)
  const state = Buffer.from(JSON.stringify(statePayload)).toString('base64');

  const authorizeUrl = `https://${shop}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

  return NextResponse.redirect(authorizeUrl);
}
