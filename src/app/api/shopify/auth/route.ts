import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const shop = searchParams.get("shop");
  const name = searchParams.get("name");
  const description = searchParams.get("description");

  if (!shop) {
    return NextResponse.json({ error: "Missing shop parameter" }, { status: 400 });
  }

  // In a real app, you would use SHOPIFY_API_KEY and SHOPIFY_SCOPES
  
  // For the sake of this demo, we'll redirect to our mock Shopify auth page
  const authMockUrl = new URL(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/shopify-auth-mock`);
  authMockUrl.searchParams.set("shop", shop);
  if (name) authMockUrl.searchParams.set("name", name);
  if (description) authMockUrl.searchParams.set("description", description);

  return NextResponse.redirect(authMockUrl.toString());
}
