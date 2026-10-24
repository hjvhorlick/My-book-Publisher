/**
 * Shrink an image (File, Blob, data URL, or same-origin path) down to a bounded
 * JPEG data URL so it stays light enough to live inside project coverConfig.
 */
function loadImage(source) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read that image.'));
    if (typeof source === 'string') {
      img.src = source;
    } else if (source instanceof Blob || source instanceof File) {
      const url = URL.createObjectURL(source);
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Could not read that image.'));
      };
      img.src = url;
    } else {
      reject(new Error('Unsupported image source.'));
    }
  });
}

export async function shrinkImageToDataUrl(source, { maxDim = 1600, quality = 0.82 } = {}) {
  const img = await loadImage(source);
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  if (!width || !height) {
    throw new Error('That image has no readable dimensions.');
  }
  const scale = Math.min(1, maxDim / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}
