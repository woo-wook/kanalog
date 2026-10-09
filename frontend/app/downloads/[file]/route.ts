import { downloadResponse } from "@/app-download-files";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function serve(
  request: Request,
  context: { params: Promise<{ file: string }> },
) {
  return downloadResponse(request, (await context.params).file);
}
export const GET = serve;
export const HEAD = serve;
