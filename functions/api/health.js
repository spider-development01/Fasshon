// functions/api/health.js
export async function onRequestGet(context) {
  const hasKey = !!context.env.FAL_KEY;
  return new Response(JSON.stringify({ ok: true, hasKey }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
