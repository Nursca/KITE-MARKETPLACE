import { NextRequest, NextResponse } from "next/server";
import { storeRegistry } from "@/lib/store-registry";

export async function GET() {
  const stores = storeRegistry.list();
  return NextResponse.json({ stores });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { id, action } = body;

  if (action === "remove") {
    storeRegistry.remove(id);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
