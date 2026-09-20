import { aggregate } from "@/lib/serverSync";

export async function GET() {
  try {
    const district = await aggregate();
    return Response.json(district, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
    });
  } catch {
    return Response.json({ error: "Storage unavailable" }, { status: 503 });
  }
}
