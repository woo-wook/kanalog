type ModelFile = { bytes: number; sha256: string };

export async function downloadModel(
  url: string,
  file: ModelFile,
  progress: (received: number, total: number) => void,
): Promise<Uint8Array<ArrayBuffer>> {
  if (
    !Number.isSafeInteger(file.bytes) ||
    file.bytes <= 0 ||
    file.bytes > 512 * 1024 * 1024
  )
    throw new Error(
      "음성 파일 정보를 확인하지 못했습니다. 다시 시도해 주세요.",
    );
  const response = await fetch(`${url}?v=${encodeURIComponent(file.sha256)}`);
  if (!response.ok || !response.body)
    throw new Error(
      "음성 파일을 받지 못했습니다. 연결 상태를 확인하고 다시 눌러 주세요.",
    );
  const bytes = new Uint8Array(file.bytes);
  const reader = response.body.getReader();
  let received = 0;
  progress(0, file.bytes);
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (received + value.byteLength > bytes.byteLength)
        throw new Error(
          "음성 파일 크기가 올바르지 않습니다. 다시 시도해 주세요.",
        );
      bytes.set(value, received);
      received += value.byteLength;
      progress(received, file.bytes);
    }
    if (received !== file.bytes)
      throw new Error("음성 파일 다운로드가 중단됐습니다. 다시 눌러 주세요.");
    return bytes;
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    reader.releaseLock();
  }
}
