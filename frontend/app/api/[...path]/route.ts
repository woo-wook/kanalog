// Same-origin transport proxy only. All authentication and application rules live in Kotlin.
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ path: string[] }> };
async function proxy(request: Request, { params }: Context): Promise<Response> {
  const base = process.env.BACKEND_API_URL ?? "http://localhost:8080";
  const { path } = await params;
  const incoming = new URL(request.url);
  const target = new URL(
    `/api/${path.map(encodeURIComponent).join("/")}${incoming.search}`,
    base,
  );
  const headers = new Headers();
  for (const name of [
    "accept",
    "content-type",
    "cookie",
    "x-csrf-token",
    "origin",
    "range",
    "if-range",
    "x-request-id",
  ]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method)
        ? undefined
        : await request.arrayBuffer(),
      cache: "no-store",
      signal: AbortSignal.timeout(60_000),
    });
    const outgoing = new Headers();
    for (const name of [
      "content-type",
      "content-range",
      "accept-ranges",
      "set-cookie",
      "cache-control",
      "etag",
    ]) {
      const value = upstream.headers.get(name);
      if (value) outgoing.set(name, value);
    }
    outgoing.set("Cache-Control", "private, no-store");
    return new Response(request.method === "HEAD" ? null : upstream.body, {
      status: upstream.status,
      headers: outgoing,
    });
  } catch {
    return Response.json(
      {
        code: "BACKEND_UNAVAILABLE",
        message: "서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.",
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
export const HEAD = proxy;
