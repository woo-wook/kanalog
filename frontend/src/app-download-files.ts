import { createReadStream } from "node:fs";
import { lstat, readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { Readable } from "node:stream";
import { z } from "zod";
import type { AndroidDownload } from "./app-downloads";

const manifestSchema = z.object({
  schemaVersion: z.literal(1),
  android: z.object({
    file: z.string().regex(/^kanalog-android-[a-f0-9]{12}\.apk$/),
    version: z
      .string()
      .regex(/^\d+\.\d+\.\d+(?:[-+][a-zA-Z0-9.-]+)?$/)
      .max(64),
    bytes: z
      .number()
      .int()
      .positive()
      .max(250 * 1024 * 1024),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    builtAt: z.string().datetime(),
  }),
});
function downloadRoot() {
  return (
    process.env.APP_DOWNLOAD_ROOT ||
    resolve(process.cwd(), "../public-downloads")
  );
}

/** Only the inspected public artifact in the current manifest is exposed. */
export async function readAndroidDownload(
  root = downloadRoot(),
): Promise<AndroidDownload | null> {
  try {
    const manifestPath = join(root, "manifest.json");
    const manifestStat = await lstat(manifestPath);
    if (!manifestStat.isFile() || manifestStat.size > 32 * 1024) return null;
    const parsed = manifestSchema.safeParse(
      JSON.parse(await readFile(manifestPath, "utf8")),
    );
    if (!parsed.success) return null;
    const artifact = parsed.data.android;
    if (artifact.file !== `kanalog-android-${artifact.sha256.slice(0, 12)}.apk`)
      return null;
    const file = await lstat(join(root, artifact.file));
    return file.isFile() && file.size === artifact.bytes ? artifact : null;
  } catch {
    return null;
  }
}

export async function downloadResponse(
  request: Request,
  file: string,
  root = downloadRoot(),
): Promise<Response> {
  const artifact = await readAndroidDownload(root);
  if (!artifact || file !== artifact.file)
    return new Response(null, {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  const headers = new Headers({
    "Content-Type": "application/vnd.android.package-archive",
    "Content-Disposition": `attachment; filename="${artifact.file}"`,
    "X-Content-Type-Options": "nosniff",
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
    ETag: `"${artifact.sha256}"`,
  });
  let start = 0,
    end = artifact.bytes - 1;
  const range = request.method === "HEAD" ? null : request.headers.get("Range");
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (match && (match[1] || match[2])) {
      start = match[1]
        ? Number(match[1])
        : Math.max(0, artifact.bytes - Number(match[2]));
      end = match[1] && match[2] ? Math.min(Number(match[2]), end) : end;
    }
    if (
      !match ||
      (!match[1] && !match[2]) ||
      (!match[1] && Number(match[2]) === 0) ||
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(end) ||
      start > end ||
      start >= artifact.bytes
    ) {
      headers.set("Content-Range", `bytes */${artifact.bytes}`);
      headers.set("Content-Length", "0");
      return new Response(null, { status: 416, headers });
    }
    headers.set("Content-Range", `bytes ${start}-${end}/${artifact.bytes}`);
  }
  headers.set("Content-Length", String(end - start + 1));
  if (request.method === "HEAD") return new Response(null, { headers });
  const body = Readable.toWeb(
    createReadStream(join(root, file), { start, end }),
  ) as ReadableStream<Uint8Array>;
  return new Response(body, { status: range ? 206 : 200, headers });
}
