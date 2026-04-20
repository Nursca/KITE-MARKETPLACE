import { NextRequest, NextResponse } from "next/server";
import { storeRegistry } from "@/lib/store-registry";
import { shopifyClient } from "@/lib/shopify";

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

  // In a real app, we would use the store's accessToken to fetch from Shopify
  // For this demo, we'll return mock products from shopifyClient
  const products = await shopifyClient.searchProducts("");
  
  return NextResponse.json({ 
    success: true,
    shopUrl: store.shopUrl,
    products 
  });
}
