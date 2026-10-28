export const ERANGEL_MAP_PX = 8192;
export const ERANGEL_SIZE_METERS = 8000;
export const METERS_PER_MAP_PX = ERANGEL_SIZE_METERS / ERANGEL_MAP_PX;
export const MORTAR_MIN_RANGE_METERS = 121;
export const MORTAR_MAX_RANGE_METERS = 700;
export const GRID_CELLS_PER_AXIS = 8;
export const DEFAULT_FIT_PADDING = 8;

export interface MapPoint {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface ViewTransform {
  scale: number;
  tx: number;
  ty: number;
}

export interface ViewLimits {
  minScale: number;
  maxScale: number;
}

export type MortarRangeState = "in-range" | "too-close" | "too-far";

const COLUMN_LABELS = "ABCDEFGH";
const ROW_LABELS = "IJKLMNOP";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function metersPerMapPx(imageSize = ERANGEL_MAP_PX) {
  return ERANGEL_SIZE_METERS / imageSize;
}

export function metersToMapPx(meters: number, imageSize = ERANGEL_MAP_PX) {
  return meters / metersPerMapPx(imageSize);
}

export function distanceMeters(a: MapPoint, b: MapPoint, imageSize = ERANGEL_MAP_PX) {
  return Math.hypot(b.x - a.x, b.y - a.y) * metersPerMapPx(imageSize);
}

export function clampPoint(point: MapPoint, imageSize = ERANGEL_MAP_PX): MapPoint {
  return {
    x: clamp(point.x, 0, imageSize),
    y: clamp(point.y, 0, imageSize),
  };
}

/**
 * PUBG 地图网格：列 A-H（西→东），行 I-P（北→南），
 * 每个大格再分 10x10 小格，格内用两位数字表示，如 "DO55"。
 */
export function gridReference(point: MapPoint, imageSize = ERANGEL_MAP_PX) {
  const clamped = clampPoint(point, imageSize);
  const cellSize = imageSize / GRID_CELLS_PER_AXIS;
  const col = Math.min(GRID_CELLS_PER_AXIS - 1, Math.floor(clamped.x / cellSize));
  const row = Math.min(GRID_CELLS_PER_AXIS - 1, Math.floor(clamped.y / cellSize));
  const innerX = Math.min(9, Math.floor(((clamped.x - col * cellSize) / cellSize) * 10));
  const innerY = Math.min(9, Math.floor(((clamped.y - row * cellSize) / cellSize) * 10));

  return `${COLUMN_LABELS.charAt(col)}${ROW_LABELS.charAt(row)}${innerX}${innerY}`;
}

export function getMortarRangeState(distance: number): MortarRangeState {
  if (distance < MORTAR_MIN_RANGE_METERS) return "too-close";
  if (distance > MORTAR_MAX_RANGE_METERS) return "too-far";
  return "in-range";
}

export function screenToMapPoint(point: MapPoint, view: ViewTransform): MapPoint {
  return {
    x: (point.x - view.tx) / view.scale,
    y: (point.y - view.ty) / view.scale,
  };
}

export function mapPointToScreen(point: MapPoint, view: ViewTransform): MapPoint {
  return {
    x: point.x * view.scale + view.tx,
    y: point.y * view.scale + view.ty,
  };
}

export function fitView(
  viewport: Size,
  imageSize = ERANGEL_MAP_PX,
  padding = DEFAULT_FIT_PADDING
): ViewTransform {
  if (viewport.width <= 0 || viewport.height <= 0) {
    return { scale: 1, tx: 0, ty: 0 };
  }

  const availableWidth = Math.max(1, viewport.width - padding * 2);
  const availableHeight = Math.max(1, viewport.height - padding * 2);
  const scale = Math.min(availableWidth, availableHeight) / imageSize;

  return {
    scale,
    tx: (viewport.width - imageSize * scale) / 2,
    ty: (viewport.height - imageSize * scale) / 2,
  };
}

export function getViewLimits(viewport: Size, imageSize = ERANGEL_MAP_PX): ViewLimits {
  const fitScale = fitView(viewport, imageSize).scale;
  return {
    minScale: fitScale,
    maxScale: Math.min(1.5, fitScale * 16),
  };
}

export function clampView(
  view: ViewTransform,
  viewport: Size,
  limits: ViewLimits,
  imageSize = ERANGEL_MAP_PX
): ViewTransform {
  const scale = clamp(view.scale, limits.minScale, limits.maxScale);
  const scaledSize = imageSize * scale;

  const tx =
    scaledSize <= viewport.width
      ? (viewport.width - scaledSize) / 2
      : clamp(view.tx, viewport.width - scaledSize, 0);
  const ty =
    scaledSize <= viewport.height
      ? (viewport.height - scaledSize) / 2
      : clamp(view.ty, viewport.height - scaledSize, 0);

  return { scale, tx, ty };
}

export function zoomViewAt(
  view: ViewTransform,
  anchorScreen: MapPoint,
  factor: number,
  viewport: Size,
  limits: ViewLimits,
  imageSize = ERANGEL_MAP_PX
): ViewTransform {
  const anchorMap = screenToMapPoint(anchorScreen, view);
  const nextScale = clamp(view.scale * factor, limits.minScale, limits.maxScale);

  return clampView(
    {
      scale: nextScale,
      tx: anchorScreen.x - anchorMap.x * nextScale,
      ty: anchorScreen.y - anchorMap.y * nextScale,
    },
    viewport,
    limits,
    imageSize
  );
}

export function formatMeters(meters: number) {
  return `${Math.round(meters)} 米`;
}

export function formatKilometers(meters: number) {
  return `${(meters / 1000).toFixed(2)} km`;
}
