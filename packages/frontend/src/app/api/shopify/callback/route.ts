import { NextRequest, NextResponse } from "next/server";
import { storeRegistry } from "@kite/x402-sdk";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const shop = searchParams.get("shop");
  const code = searchParams.get("code");
  const stateRaw = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    return NextResponse.json({ error: errorDescription || error }, { status: 400 });
  }

  if (!shop || !code) {
    return NextResponse.json({ error: "Missing shop or code parameter" }, { status: 400 });
  }

  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
     return NextResponse.json({ error: "Shopify credentials not configured" }, { status: 500 });
  }

  // Parse state
  let name = "";
  let description = "";
  if (stateRaw) {
    try {
       const statePayload = JSON.parse(Buffer.from(stateRaw, 'base64').toString('utf8'));
       name = statePayload.name;
       description = statePayload.description;
    } catch(e) {
       console.error("Failed to parse state param:", e);
    }
  }

  try {
    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
         client_id: clientId,
         client_secret: clientSecret,
         code: code,
      }),
    });

    if (!tokenResponse.ok) {
       const errorText = await tokenResponse.text();
       throw new Error(`Failed to exchange token: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Save the store in our registry
    storeRegistry.add({
      shopUrl: shop,
      name: name || undefined,
      description: description || undefined,
      accessToken: accessToken,
      isConnected: true
    });

    // Redirect the user to the stores page
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
    return NextResponse.redirect(`${appUrl}/stores`);

  } catch (err: any) {
    console.error("Shopify OAuth error:", err);
    return NextResponse.json({ error: err.message || "Internal server error during OAuth exchange" }, { status: 500 });
  }
}
