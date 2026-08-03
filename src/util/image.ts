export function createImageBitmapSafe(
  blob?: Blob | null | undefined,
): Promise<ImageBitmap | null> {
  if (!blob) return Promise.resolve(null);
  return createImageBitmap(blob);
}
export function createImageDataUrlSafe(
  blob?: Blob | null | undefined,
): Promise<string | null> {
  if (!blob) return Promise.resolve(null);
  return createImageDataUrl(blob);
}

export function createImageDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(blob);
  });
}
