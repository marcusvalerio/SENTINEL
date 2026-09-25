import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { globalSearch } from "@/server/search/search";

/** GET /api/search?q= — a route handler (not a server action) so requests can run in parallel and be aborted. */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const q = request.nextUrl.searchParams.get("q") ?? "";
  try {
    const result = await globalSearch(user.id, q);
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[search] failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "search_failed" }, { status: 500 });
  }
}
