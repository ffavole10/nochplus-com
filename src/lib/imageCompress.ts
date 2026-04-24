// Client-side image compression for field-capture photo uploads.
// Targets ~1-2MB JPEG, max 2048px on longest side, quality 0.85.

export async function compressImage(
  file: File,
  opts: { maxDim?: number; quality?: number } = {},
): Promise<Blob> {
  const maxDim = opts.maxDim ?? 2048;
  const quality = opts.quality ?? 0.85;

  // Browsers without createImageBitmap fall back to no-op
  if (typeof createImageBitmap !== "function") return file;

  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;

  if (width > maxDim || height > maxDim) {
    if (width >= height) {
      height = Math.round((height * maxDim) / width);
      width = maxDim;
    } else {
      width = Math.round((width * maxDim) / height);
      height = maxDim;
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);

  return await new Promise<Blob>((resolve) => {
    canvas.toBlob(
      (b) => resolve(b ?? file),
      "image/jpeg",
      quality,
    );
  });
}

export function randomSuffix(len = 6) {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, len);
}
