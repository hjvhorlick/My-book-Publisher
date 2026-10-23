/**
 * Pure geometry for the built-in image editor. The editor shows a viewport
 * locked to the photo slot's aspect ratio; the author zooms and drags the
 * picture inside it. These helpers convert that simple interaction into the
 * exact source rectangle to draw on the export canvas, so the saved image
 * is the correct shape and size for its space on the page.
 */

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 3;

/** Image dimensions after a 90°-step rotation. */
export function rotatedSize(width, height, rotation = 0) {
  const quarterTurn = ((Number(rotation) || 0) % 180 + 180) % 180 === 90;
  return quarterTurn
    ? { width: height, height: width }
    : { width, height };
}

/**
 * Scale needed for the (rotated) image to completely cover a viewport of
 * the slot's aspect, before the author's extra zoom is applied.
 */
export function coverScale(imageWidth, imageHeight, aspectRatio, rotation = 0) {
  const rotated = rotatedSize(imageWidth, imageHeight, rotation);
  // Viewport is aspect×1 — cover means both dimensions are filled.
  return Math.max(aspectRatio / rotated.width, 1 / rotated.height);
}

/**
 * Clamp a pan offset (fractions of viewport size, 0 = centred) so the
 * picture always covers the frame — no empty edges can be saved.
 *
 * offsetX/offsetY are expressed in viewport units where the viewport is
 * aspectRatio wide and 1 high. The displayed image size in the same units
 * is (rotatedWidth × scale) by (rotatedHeight × scale).
 */
export function clampPan({ offsetX = 0, offsetY = 0, imageWidth, imageHeight, aspectRatio, zoom = 1, rotation = 0 }) {
  const rotated = rotatedSize(imageWidth, imageHeight, rotation);
  const scale = coverScale(imageWidth, imageHeight, aspectRatio, rotation) * Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
  const displayedWidth = rotated.width * scale;
  const displayedHeight = rotated.height * scale;
  const maxX = Math.max(0, (displayedWidth - aspectRatio) / 2);
  const maxY = Math.max(0, (displayedHeight - 1) / 2);
  return {
    offsetX: Math.max(-maxX, Math.min(maxX, offsetX)),
    offsetY: Math.max(-maxY, Math.min(maxY, offsetY)),
    maxX,
    maxY
  };
}

/**
 * The rectangle of the *original* image that is visible in the frame.
 * Returns { sx, sy, sw, sh } in original-image pixels, already accounting
 * for rotation in 90° steps and horizontal flip (flip is applied at draw
 * time, so it does not change the crop rectangle's size, only mirroring).
 */
export function visibleSourceRect({ imageWidth, imageHeight, aspectRatio, zoom = 1, offsetX = 0, offsetY = 0, rotation = 0 }) {
  const rotated = rotatedSize(imageWidth, imageHeight, rotation);
  const scale = coverScale(imageWidth, imageHeight, aspectRatio, rotation) * Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
  // Visible window size in rotated-image pixels:
  const visibleWidth = aspectRatio / scale;
  const visibleHeight = 1 / scale;
  const centerX = rotated.width / 2 - offsetX / scale;
  const centerY = rotated.height / 2 - offsetY / scale;
  const rx = Math.max(0, Math.min(rotated.width - visibleWidth, centerX - visibleWidth / 2));
  const ry = Math.max(0, Math.min(rotated.height - visibleHeight, centerY - visibleHeight / 2));

  // Map the rotated-space rectangle back to original-image coordinates.
  const turns = ((Number(rotation) || 0) % 360 + 360) % 360;
  if (turns === 90) {
    return { sx: ry, sy: imageHeight - (rx + visibleWidth), sw: visibleHeight, sh: visibleWidth };
  }
  if (turns === 180) {
    return { sx: imageWidth - (rx + visibleWidth), sy: imageHeight - (ry + visibleHeight), sw: visibleWidth, sh: visibleHeight };
  }
  if (turns === 270) {
    return { sx: imageWidth - (ry + visibleHeight), sy: rx, sw: visibleHeight, sh: visibleWidth };
  }
  return { sx: rx, sy: ry, sw: visibleWidth, sh: visibleHeight };
}

/** Output pixel size for the cropped file, honouring the slot's print recommendation. */
export function outputSizeForSlot(rule, sourceRect) {
  const recommendedWidth = Math.max(320, rule?.recommendedWidth || 1200);
  // Never upscale beyond what the source crop actually contains.
  const width = Math.min(recommendedWidth, Math.max(320, Math.round(sourceRect?.sw || recommendedWidth)));
  const aspect = rule?.aspectRatio || 1.5;
  return { width, height: Math.max(1, Math.round(width / aspect)) };
}

/** CSS/canvas filter string for the editor's gentle photo adjustments. */
export function filterString({ brightness = 100, contrast = 100, saturation = 100 } = {}) {
  const pct = (value) => Math.max(20, Math.min(200, Number(value) || 100)) / 100;
  return `brightness(${pct(brightness)}) contrast(${pct(contrast)}) saturate(${pct(saturation)})`;
}

/**
 * Draw the edited image onto a canvas at the slot's output size.
 * Browser-only (needs an HTMLImageElement + canvas); kept here so the
 * component stays a thin shell around tested math.
 */
export function renderCroppedCanvas(image, canvas, { rule, zoom, offsetX, offsetY, rotation, flipHorizontal, adjustments }) {
  const rect = visibleSourceRect({
    imageWidth: image.naturalWidth,
    imageHeight: image.naturalHeight,
    aspectRatio: rule.aspectRatio,
    zoom,
    offsetX,
    offsetY,
    rotation
  });
  const size = outputSizeForSlot(rule, rect);
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  try { ctx.filter = filterString(adjustments); } catch { /* older engines */ }

  // Draw the (possibly rotated) full image into an offscreen step when
  // rotated, then blit the visible rotated-space window. For 0° we can
  // crop directly from the source rectangle.
  const turns = ((Number(rotation) || 0) % 360 + 360) % 360;
  if (flipHorizontal) {
    ctx.translate(size.width, 0);
    ctx.scale(-1, 1);
  }
  if (turns === 0) {
    ctx.drawImage(image, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, size.width, size.height);
  } else {
    const rotated = rotatedSize(image.naturalWidth, image.naturalHeight, turns);
    const offscreen = document.createElement('canvas');
    offscreen.width = rotated.width;
    offscreen.height = rotated.height;
    const octx = offscreen.getContext('2d');
    octx.translate(rotated.width / 2, rotated.height / 2);
    octx.rotate((turns * Math.PI) / 180);
    octx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
    const scale = coverScale(image.naturalWidth, image.naturalHeight, rule.aspectRatio, turns) * Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
    const visibleWidth = rule.aspectRatio / scale;
    const visibleHeight = 1 / scale;
    const rx = Math.max(0, Math.min(rotated.width - visibleWidth, rotated.width / 2 - offsetX / scale - visibleWidth / 2));
    const ry = Math.max(0, Math.min(rotated.height - visibleHeight, rotated.height / 2 - offsetY / scale - visibleHeight / 2));
    ctx.drawImage(offscreen, rx, ry, visibleWidth, visibleHeight, 0, 0, size.width, size.height);
  }
  return { canvas, size, rect };
}
