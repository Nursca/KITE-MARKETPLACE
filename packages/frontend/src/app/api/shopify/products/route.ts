import { NextRequest, NextResponse } from "next/server";
import { storeRegistry, shopifyClient } from "@kite/x402-sdk";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get("storeId");

  if (!storeId) {
    return NextResponse.json({ error: "Missing storeId parameter" }, { status: 400 });
  }

  const store = storeRegistry.get(storeId);
  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  // Pass the store's credentials to the real Shopify API
  if (!store.accessToken) {
    return NextResponse.json({ error: "Store access token missing" }, { status: 401 });
  }

  try {
    const products = await shopifyClient.searchProducts(store.shopUrl, store.accessToken, "");
    
    return NextResponse.json({ 
      success: true,
      shopUrl: store.shopUrl,
      products 
    });
  } catch (error: any) {
    console.error("Failed to fetch products:", error);
    return NextResponse.json({ error: "Failed to fetch products from Shopify" }, { status: 500 });
  }
}
