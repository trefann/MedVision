import { MAX_BODY_BYTES, saveSnapshot, validate } from "@/lib/serverSync";

export async function POST(request: Request) {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return Response.json({ ok: false, error: "Payload too large" }, { status: 413 });

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const payload = validate(raw);
  if (typeof payload === "string") return Response.json({ ok: false, error: payload }, { status: 400 });

  try {
    await saveSnapshot(payload);
  } catch {
    return Response.json({ ok: false, error: "Storage unavailable" }, { status: 503 });
  }
  return Response.json({
    ok: true,
    receivedAt: payload.sentAt,
    counts: { patients: payload.patients.length, visits: payload.visits.length, referrals: payload.referrals.length },
  });
}
