export const CROP_WIDTH = 480;
export const CROP_HEIGHT = 620;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function createCropTransform(sourceWidth, sourceHeight) {
  if (!(sourceWidth > 0 && sourceHeight > 0)) throw new Error("Invalid photo dimensions.");
  const minScale = Math.max(CROP_WIDTH / sourceWidth, CROP_HEIGHT / sourceHeight);
  return {
    sourceWidth, sourceHeight, minScale, maxScale: minScale * 4,
    scale: minScale,
    x: (CROP_WIDTH - sourceWidth * minScale) / 2,
    y: (CROP_HEIGHT - sourceHeight * minScale) / 2
  };
}

export function constrainCropTransform(state) {
  const scale = clamp(state.scale, state.minScale, state.maxScale);
  return {
    ...state, scale,
    x: clamp(state.x, CROP_WIDTH - state.sourceWidth * scale, 0),
    y: clamp(state.y, CROP_HEIGHT - state.sourceHeight * scale, 0)
  };
}

export function applyCropGesture(state, previous, current) {
  const ratio = previous.distance > 0 && current.distance > 0 ? current.distance / previous.distance : 1;
  const scale = clamp(state.scale * ratio, state.minScale, state.maxScale);
  const anchorX = (previous.x - state.x) / state.scale;
  const anchorY = (previous.y - state.y) / state.scale;
  return constrainCropTransform({ ...state, scale, x: current.x - anchorX * scale, y: current.y - anchorY * scale });
}

export function getCropFrame(width, height) {
  const availableWidth = Math.max(1, width - 40);
  const availableHeight = Math.max(1, height - 40);
  const frameWidth = Math.min(availableWidth, availableHeight * CROP_WIDTH / CROP_HEIGHT);
  const frameHeight = frameWidth * CROP_HEIGHT / CROP_WIDTH;
  return { x: (width - frameWidth) / 2, y: (height - frameHeight) / 2, width: frameWidth, height: frameHeight, scale: frameWidth / CROP_WIDTH };
}

export function getCropGesture(points, bounds) {
  if (!points.length || !(bounds.width > 0 && bounds.height > 0)) return null;
  const frame = getCropFrame(bounds.width, bounds.height);
  const first = points[0];
  const second = points[1] || first;
  return {
    x: ((first.x + second.x) / 2 - bounds.left - frame.x) / frame.scale,
    y: ((first.y + second.y) / 2 - bounds.top - frame.y) / frame.scale,
    distance: points.length > 1 ? Math.hypot(first.x - second.x, first.y - second.y) / frame.scale : 0
  };
}
