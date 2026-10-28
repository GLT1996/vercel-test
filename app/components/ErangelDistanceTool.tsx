"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  MapPoint,
  MortarRangeState,
  Size,
  ViewLimits,
  ViewTransform,
} from "@/lib/erangel";
import {
  ERANGEL_MAP_PX,
  GRID_CELLS_PER_AXIS,
  MORTAR_MAX_RANGE_METERS,
  MORTAR_MIN_RANGE_METERS,
  clampPoint,
  clampView,
  distanceMeters,
  fitView,
  formatKilometers,
  formatMeters,
  getMortarRangeState,
  getViewLimits,
  gridReference,
  mapPointToScreen,
  metersToMapPx,
  screenToMapPoint,
  zoomViewAt,
} from "@/lib/erangel";

interface Measurement {
  a: MapPoint | null;
  b: MapPoint | null;
  next: "A" | "B";
}

type Gesture =
  | {
      kind: "pending";
      pointerId: number;
      start: MapPoint;
      startView: ViewTransform;
    }
  | {
      kind: "pan";
      pointerId: number;
      start: MapPoint;
      startView: ViewTransform;
    }
  | {
      kind: "point";
      pointerId: number;
      target: "A" | "B";
      view: ViewTransform;
    }
  | {
      kind: "pinch";
      pointerId1: number;
      pointerId2: number;
      startDistance: number;
      anchorMap: MapPoint;
      startView: ViewTransform;
    };

const MARKER_HIT_RADIUS = 22;
const CLICK_THRESHOLD_MOUSE = 5;
const CLICK_THRESHOLD_TOUCH = 10;
const ZOOM_STEP = 1.4;
const CELL_SIZE_PX = ERANGEL_MAP_PX / GRID_CELLS_PER_AXIS;
const MINOR_CELL_SIZE_PX = CELL_SIZE_PX / 10;

const buttonBaseClass =
  "rounded border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButtonClass = `${buttonBaseClass} border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700`;
const activeButtonClass = `${buttonBaseClass} border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-950/50 dark:text-blue-300`;

function pointerDistance(a: MapPoint, b: MapPoint) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export default function ErangelDistanceTool() {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<ViewTransform | null>(null);
  const viewportSizeRef = useRef<Size>({ width: 0, height: 0 });
  const limitsRef = useRef<ViewLimits>({ minScale: 1, maxScale: 1 });
  const gestureRef = useRef<Gesture | null>(null);
  const pointersRef = useRef<Map<number, MapPoint>>(new Map());
  const userAdjustedRef = useRef(false);

  const [view, setView] = useState<ViewTransform | null>(null);
  const [viewportSize, setViewportSize] = useState<Size>({ width: 0, height: 0 });
  const [measurement, setMeasurement] = useState<Measurement>({
    a: null,
    b: null,
    next: "A",
  });
  const [showGrid, setShowGrid] = useState(true);
  const [showMaxRange, setShowMaxRange] = useState(true);
  const [showMinRange, setShowMinRange] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageRetryKey, setImageRetryKey] = useState(0);

  const limits = useMemo(() => getViewLimits(viewportSize), [viewportSize]);

  useEffect(() => {
    limitsRef.current = limits;
  }, [limits]);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  // 首次进入和容器尺寸变化时适配地图；用户手动缩放/平移后尽量保持视野中心。
  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;

    const applySize = (width: number, height: number) => {
      if (width < 1 || height < 1) return;

      const previous = viewportSizeRef.current;
      const nextSize = { width, height };
      viewportSizeRef.current = nextSize;
      setViewportSize(nextSize);

      const nextLimits = getViewLimits(nextSize);
      limitsRef.current = nextLimits;

      setView((current) => {
        const fitted = fitView(nextSize);
        if (!current || !userAdjustedRef.current || previous.width < 1) {
          const next = clampView(fitted, nextSize, nextLimits);
          viewRef.current = next;
          return next;
        }

        const centerMap = screenToMapPoint(
          { x: previous.width / 2, y: previous.height / 2 },
          current
        );
        const scale = Math.min(
          nextLimits.maxScale,
          Math.max(nextLimits.minScale, current.scale)
        );
        const next = clampView(
          {
            scale,
            tx: width / 2 - centerMap.x * scale,
            ty: height / 2 - centerMap.y * scale,
          },
          nextSize,
          nextLimits
        );
        viewRef.current = next;
        return next;
      });
    };

    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) applySize(rect.width, rect.height);
    });
    observer.observe(element);

    const rect = element.getBoundingClientRect();
    applySize(rect.width, rect.height);

    return () => observer.disconnect();
  }, []);

  // React 的 onWheel 在部分浏览器中无法可靠 preventDefault，这里手动注册非 passive 监听。
  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;

    const handleWheel = (event: WheelEvent) => {
      const current = viewRef.current;
      const size = viewportSizeRef.current;
      if (!current || size.width < 1) return;

      event.preventDefault();

      const rect = element.getBoundingClientRect();
      const anchor = {
        x: event.clientX - rect.left - element.clientLeft,
        y: event.clientY - rect.top - element.clientTop,
      };
      const delta =
        event.deltaMode === 1
          ? event.deltaY * 16
          : event.deltaMode === 2
            ? event.deltaY * size.height
            : event.deltaY;
      const factor = Math.exp(
        -Math.max(-200, Math.min(200, delta)) * 0.0015
      );

      userAdjustedRef.current = true;
      setView((currentView) => {
        if (!currentView) return currentView;
        const next = zoomViewAt(
          currentView,
          anchor,
          factor,
          size,
          limitsRef.current
        );
        viewRef.current = next;
        return next;
      });
    };

    element.addEventListener("wheel", handleWheel, { passive: false });
    return () => element.removeEventListener("wheel", handleWheel);
  }, []);

  const getRelativePoint = (
    event: React.PointerEvent<HTMLDivElement>
  ): MapPoint => {
    const element = viewportRef.current;
    if (!element) return { x: 0, y: 0 };
    const rect = element.getBoundingClientRect();
    return {
      x: event.clientX - rect.left - element.clientLeft,
      y: event.clientY - rect.top - element.clientTop,
    };
  };

  const findMarkerAt = (
    point: MapPoint,
    currentView: ViewTransform
  ): "A" | "B" | null => {
    if (measurement.b) {
      const screen = mapPointToScreen(measurement.b, currentView);
      if (pointerDistance(point, screen) <= MARKER_HIT_RADIUS) return "B";
    }
    if (measurement.a) {
      const screen = mapPointToScreen(measurement.a, currentView);
      if (pointerDistance(point, screen) <= MARKER_HIT_RADIUS) return "A";
    }
    return null;
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!view || !imageLoaded || viewportSize.width < 1) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    const element = viewportRef.current;
    if (!element) return;

    const point = getRelativePoint(event);
    pointersRef.current.set(event.pointerId, point);
    try {
      element.setPointerCapture(event.pointerId);
    } catch {
      // 合成指针事件或浏览器不支持捕获时忽略；标点/平移不依赖指针捕获。
    }

    if (gestureRef.current?.kind === "pinch") return;
    if (pointersRef.current.size > 2) return;

    const currentView = viewRef.current ?? view;

    if (pointersRef.current.size === 2) {
      const entries = [...pointersRef.current.entries()];
      const first = entries[0];
      const second = entries[1];
      if (!first || !second) return;

      const [pointerId1, p1] = first;
      const [pointerId2, p2] = second;
      const midpoint = {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2,
      };

      gestureRef.current = {
        kind: "pinch",
        pointerId1,
        pointerId2,
        startDistance: pointerDistance(p1, p2),
        anchorMap: screenToMapPoint(midpoint, currentView),
        startView: currentView,
      };
      return;
    }

    if (gestureRef.current) return;

    const target = findMarkerAt(point, currentView);
    gestureRef.current = target
      ? {
          kind: "point",
          pointerId: event.pointerId,
          target,
          view: currentView,
        }
      : {
          kind: "pending",
          pointerId: event.pointerId,
          start: point,
          startView: currentView,
        };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const element = viewportRef.current;
    if (!element) return;

    const point = getRelativePoint(event);
    if (pointersRef.current.has(event.pointerId)) {
      pointersRef.current.set(event.pointerId, point);
    }

    const gesture = gestureRef.current;
    if (!gesture) return;

    if (gesture.kind === "pinch") {
      if (
        event.pointerId !== gesture.pointerId1 &&
        event.pointerId !== gesture.pointerId2
      ) {
        return;
      }

      const p1 = pointersRef.current.get(gesture.pointerId1);
      const p2 = pointersRef.current.get(gesture.pointerId2);
      if (!p1 || !p2 || gesture.startDistance < 1) return;

      const currentDistance = pointerDistance(p1, p2);
      const midpoint = {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2,
      };
      const currentLimits = limitsRef.current;
      const scale = Math.min(
        currentLimits.maxScale,
        Math.max(
          currentLimits.minScale,
          gesture.startView.scale * (currentDistance / gesture.startDistance)
        )
      );
      const next = clampView(
        {
          scale,
          tx: midpoint.x - gesture.anchorMap.x * scale,
          ty: midpoint.y - gesture.anchorMap.y * scale,
        },
        viewportSizeRef.current,
        currentLimits
      );

      userAdjustedRef.current = true;
      viewRef.current = next;
      setView(next);
      return;
    }

    if (gesture.pointerId !== event.pointerId) return;

    if (gesture.kind === "point") {
      const dragView = viewRef.current ?? gesture.view;
      const mapPoint = clampPoint(screenToMapPoint(point, dragView));
      setMeasurement((current) =>
        gesture.target === "A"
          ? { ...current, a: mapPoint }
          : { ...current, b: mapPoint }
      );
      return;
    }

    const dx = point.x - gesture.start.x;
    const dy = point.y - gesture.start.y;
    const threshold =
      event.pointerType === "touch"
        ? CLICK_THRESHOLD_TOUCH
        : CLICK_THRESHOLD_MOUSE;

    if (
      gesture.kind === "pending" &&
      pointerDistance(point, gesture.start) <= threshold
    ) {
      return;
    }

    if (gesture.kind === "pending") {
      gestureRef.current = {
        kind: "pan",
        pointerId: gesture.pointerId,
        start: gesture.start,
        startView: gesture.startView,
      };
    }

    userAdjustedRef.current = true;
    const currentLimits = limitsRef.current;
    const next = clampView(
      {
        scale: gesture.startView.scale,
        tx: gesture.startView.tx + dx,
        ty: gesture.startView.ty + dy,
      },
      viewportSizeRef.current,
      currentLimits
    );
    viewRef.current = next;
    setView(next);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const point = getRelativePoint(event);
    pointersRef.current.delete(event.pointerId);

    const gesture = gestureRef.current;

    if (!gesture) {
      if (pointersRef.current.size === 0) gestureRef.current = null;
      return;
    }

    if (gesture.kind === "pinch") {
      if (
        event.pointerId === gesture.pointerId1 ||
        event.pointerId === gesture.pointerId2
      ) {
        gestureRef.current = null;
      }
    } else if (gesture.pointerId === event.pointerId) {
      gestureRef.current = null;

      if (gesture.kind === "pending") {
        const threshold =
          event.pointerType === "touch"
            ? CLICK_THRESHOLD_TOUCH
            : CLICK_THRESHOLD_MOUSE;

        if (pointerDistance(point, gesture.start) <= threshold) {
          const currentView = viewRef.current ?? view;
          if (currentView) {
            const mapPoint = clampPoint(screenToMapPoint(point, currentView));
            setMeasurement((current) =>
              current.next === "A"
                ? { ...current, a: mapPoint, next: "B" }
                : { ...current, b: mapPoint, next: "A" }
            );
          }
        }
      }
    }

    if (pointersRef.current.size === 0) {
      gestureRef.current = null;
    }
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    gestureRef.current = null;
  };

  const zoomByFactor = (factor: number) => {
    const current = viewRef.current;
    const size = viewportSizeRef.current;
    if (!current || size.width < 1) return;

    userAdjustedRef.current = true;
    const anchor = { x: size.width / 2, y: size.height / 2 };
    const next = zoomViewAt(
      current,
      anchor,
      factor,
      size,
      limitsRef.current
    );
    viewRef.current = next;
    setView(next);
  };

  const resetView = () => {
    const size = viewportSizeRef.current;
    if (size.width < 1 || size.height < 1) return;

    userAdjustedRef.current = false;
    const nextLimits = getViewLimits(size);
    limitsRef.current = nextLimits;
    const next = clampView(fitView(size), size, nextLimits);
    viewRef.current = next;
    setView(next);
  };

  const clearPoints = () => {
    setMeasurement({ a: null, b: null, next: "A" });
  };

  const swapPoints = () => {
    setMeasurement((current) =>
      current.a && current.b
        ? { a: current.b, b: current.a, next: current.next }
        : current
    );
  };

  const retryImage = () => {
    setImageLoaded(false);
    setImageError(false);
    setImageRetryKey((key) => key + 1);
  };

  const distance =
    measurement.a && measurement.b
      ? distanceMeters(measurement.a, measurement.b)
      : null;
  const pointA = measurement.a;
  const pointB = measurement.b;
  const labelOffset = 22 / (view?.scale ?? 1);
  const labelPosition =
    pointA && pointB
      ? (() => {
          const dx = pointB.x - pointA.x;
          const dy = pointB.y - pointA.y;
          const length = Math.hypot(dx, dy);
          return {
            x:
              (pointA.x + pointB.x) / 2 +
              (length > 0 ? (-dy / length) * labelOffset : 0),
            y:
              (pointA.y + pointB.y) / 2 +
              (length > 0 ? (dx / length) * labelOffset : 0),
          };
        })()
      : null;
  const rangeState: MortarRangeState | null =
    distance !== null ? getMortarRangeState(distance) : null;
  const distanceLabel =
    distance === null
      ? ""
      : distance >= 1000
        ? formatKilometers(distance)
        : formatMeters(distance);
  const distanceLabelWidth = Math.max(58, distanceLabel.length * 9 + 18);
  const zoomPercent =
    view && limits.minScale > 0
      ? Math.round((view.scale / limits.minScale) * 100)
      : 100;

  let rangeStatusText = "";
  if (distance !== null && rangeState) {
    if (rangeState === "in-range") {
      rangeStatusText = `✓ 在迫击炮射程内（${MORTAR_MIN_RANGE_METERS}–${MORTAR_MAX_RANGE_METERS} 米）`;
    } else if (rangeState === "too-far") {
      rangeStatusText = `✗ 超出最大射程 ${MORTAR_MAX_RANGE_METERS} 米（超出 ${Math.round(
        distance - MORTAR_MAX_RANGE_METERS
      )} 米）`;
    } else {
      rangeStatusText = `✗ 低于最小射程 ${MORTAR_MIN_RANGE_METERS} 米`;
    }
  }

  const range700 = metersToMapPx(MORTAR_MAX_RANGE_METERS);
  const range121 = metersToMapPx(MORTAR_MIN_RANGE_METERS);
  const lineInRange = rangeState === "in-range";

  return (
    <div className="w-full space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={clearPoints}
              disabled={!measurement.a && !measurement.b}
              className={secondaryButtonClass}
            >
              清空
            </button>
            <button
              type="button"
              onClick={swapPoints}
              disabled={!measurement.a || !measurement.b}
              className={secondaryButtonClass}
            >
              交换 A/B
            </button>
            <button
              type="button"
              onClick={() => setShowGrid((value) => !value)}
              aria-pressed={showGrid}
              className={showGrid ? activeButtonClass : secondaryButtonClass}
            >
              网格
            </button>
            <button
              type="button"
              onClick={() => setShowMaxRange((value) => !value)}
              aria-pressed={showMaxRange}
              className={
                showMaxRange ? activeButtonClass : secondaryButtonClass
              }
            >
              700m 圈
            </button>
            <button
              type="button"
              onClick={() => setShowMinRange((value) => !value)}
              aria-pressed={showMinRange}
              className={
                showMinRange ? activeButtonClass : secondaryButtonClass
              }
            >
              121m 圈
            </button>
            <button
              type="button"
              onClick={resetView}
              className={secondaryButtonClass}
            >
              重置视图
            </button>

            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={() => zoomByFactor(1 / ZOOM_STEP)}
                aria-label="缩小地图"
                className={secondaryButtonClass}
              >
                −
              </button>
              <span className="min-w-14 text-center text-xs tabular-nums text-neutral-500">
                {zoomPercent}%
              </span>
              <button
                type="button"
                onClick={() => zoomByFactor(ZOOM_STEP)}
                aria-label="放大地图"
                className={secondaryButtonClass}
              >
                +
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span>下次点击放置：</span>
            <span
              className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-white ${
                measurement.next === "A" ? "bg-blue-500" : "bg-amber-500"
              }`}
            >
              {measurement.next}
            </span>
            <span className="text-neutral-400">·</span>
            <span>拖动标记可微调位置</span>
          </div>

          <div
            ref={viewportRef}
            data-testid="erangel-map"
            className="relative h-[60vh] min-h-[380px] w-full cursor-grab touch-none select-none overflow-hidden rounded-lg bg-neutral-200 active:cursor-grabbing dark:bg-neutral-950 lg:h-[72vh]"
            style={{ touchAction: "none" }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onContextMenu={(event) => event.preventDefault()}
            onDragStart={(event) => event.preventDefault()}
          >
            {view ? (
              <div
                data-testid="erangel-world"
                className="absolute left-0 top-0"
                style={{
                  width: ERANGEL_MAP_PX,
                  height: ERANGEL_MAP_PX,
                  transformOrigin: "0 0",
                  transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})`,
                  backgroundImage: "url(/images/erangel-thumb.jpg)",
                  backgroundSize: "100% 100%",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={imageRetryKey}
                  data-testid="erangel-image"
                  src="/images/erangel-8192.jpg"
                  alt="艾伦格高清地图"
                  width={ERANGEL_MAP_PX}
                  height={ERANGEL_MAP_PX}
                  draggable={false}
                  loading="eager"
                  decoding="async"
                  onLoad={() => {
                    setImageLoaded(true);
                    setImageError(false);
                  }}
                  onError={() => {
                    setImageError(true);
                    setImageLoaded(false);
                  }}
                  className="block h-full w-full transition-opacity duration-300"
                  style={{ opacity: imageLoaded ? 1 : 0 }}
                />

                <svg
                  width={ERANGEL_MAP_PX}
                  height={ERANGEL_MAP_PX}
                  viewBox={`0 0 ${ERANGEL_MAP_PX} ${ERANGEL_MAP_PX}`}
                  className="pointer-events-none absolute inset-0"
                  aria-hidden="true"
                >
                  <defs>
                    <pattern
                      id="erangel-major-grid"
                      width={CELL_SIZE_PX}
                      height={CELL_SIZE_PX}
                      patternUnits="userSpaceOnUse"
                    >
                      <path
                        d={`M ${CELL_SIZE_PX} 0 L 0 0 L 0 ${CELL_SIZE_PX}`}
                        fill="none"
                        stroke="rgba(0,0,0,0.35)"
                        strokeWidth={3 / view.scale}
                      />
                      <path
                        d={`M ${CELL_SIZE_PX} 0 L 0 0 L 0 ${CELL_SIZE_PX}`}
                        fill="none"
                        stroke="rgba(255,255,255,0.7)"
                        strokeWidth={1 / view.scale}
                      />
                    </pattern>
                    <pattern
                      id="erangel-minor-grid"
                      width={MINOR_CELL_SIZE_PX}
                      height={MINOR_CELL_SIZE_PX}
                      patternUnits="userSpaceOnUse"
                    >
                      <path
                        d={`M ${MINOR_CELL_SIZE_PX} 0 L 0 0 L 0 ${MINOR_CELL_SIZE_PX}`}
                        fill="none"
                        stroke="rgba(0,0,0,0.16)"
                        strokeWidth={2 / view.scale}
                      />
                      <path
                        d={`M ${MINOR_CELL_SIZE_PX} 0 L 0 0 L 0 ${MINOR_CELL_SIZE_PX}`}
                        fill="none"
                        stroke="rgba(255,255,255,0.3)"
                        strokeWidth={1 / view.scale}
                      />
                    </pattern>
                  </defs>

                  {showGrid ? (
                    <g>
                      <rect
                        data-testid="erangel-grid-major"
                        width={ERANGEL_MAP_PX}
                        height={ERANGEL_MAP_PX}
                        fill="url(#erangel-major-grid)"
                      />
                      {view.scale >= 0.25 ? (
                        <rect
                          data-testid="erangel-grid-minor"
                          width={ERANGEL_MAP_PX}
                          height={ERANGEL_MAP_PX}
                          fill="url(#erangel-minor-grid)"
                        />
                      ) : null}
                    </g>
                  ) : null}

                  {measurement.a && showMinRange ? (
                    <circle
                      data-testid="erangel-range-121"
                      cx={measurement.a.x}
                      cy={measurement.a.y}
                      r={range121}
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth={1.5 / view.scale}
                      strokeDasharray={`${6 / view.scale} ${4 / view.scale}`}
                    />
                  ) : null}

                  {measurement.a && showMaxRange ? (
                    <circle
                      data-testid="erangel-range-700"
                      cx={measurement.a.x}
                      cy={measurement.a.y}
                      r={range700}
                      fill="rgba(34,197,94,0.06)"
                      stroke="#22c55e"
                      strokeWidth={1.5 / view.scale}
                    />
                  ) : null}

                  {measurement.a &&
                  measurement.b &&
                  distance !== null &&
                  labelPosition ? (
                    <g>
                      <line
                        x1={measurement.a.x}
                        y1={measurement.a.y}
                        x2={measurement.b.x}
                        y2={measurement.b.y}
                        stroke="rgba(0,0,0,0.45)"
                        strokeWidth={4 / view.scale}
                      />
                      <line
                        data-testid="erangel-measure-line"
                        x1={measurement.a.x}
                        y1={measurement.a.y}
                        x2={measurement.b.x}
                        y2={measurement.b.y}
                        stroke={lineInRange ? "#22c55e" : "#ef4444"}
                        strokeWidth={2 / view.scale}
                      />
                      <g
                        transform={`translate(${labelPosition.x} ${
                          labelPosition.y
                        }) scale(${1 / view.scale})`}
                      >
                        <rect
                          x={-distanceLabelWidth / 2}
                          y={-14}
                          width={distanceLabelWidth}
                          height={28}
                          rx={7}
                          fill="rgba(17,24,39,0.9)"
                          stroke={lineInRange ? "#22c55e" : "#ef4444"}
                          strokeWidth={1}
                        />
                        <text
                          x={0}
                          y={0}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill="#ffffff"
                          fontSize={13}
                          fontWeight={600}
                        >
                          {distanceLabel}
                        </text>
                      </g>
                    </g>
                  ) : null}

                  {(["A", "B"] as const).map((key) => {
                    const point =
                      key === "A" ? measurement.a : measurement.b;
                    if (!point) return null;
                    const color = key === "A" ? "#3b82f6" : "#f59e0b";
                    return (
                      <g
                        key={key}
                        data-testid={`erangel-marker-${key.toLowerCase()}`}
                        transform={`translate(${point.x} ${point.y}) scale(${
                          1 / view.scale
                        })`}
                      >
                        <circle
                          r={13}
                          fill="rgba(255,255,255,0.92)"
                          stroke="rgba(0,0,0,0.3)"
                          strokeWidth={2}
                        />
                        <circle
                          r={9}
                          fill={color}
                          stroke="#ffffff"
                          strokeWidth={2}
                        />
                        <text
                          y={0.5}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill="#ffffff"
                          fontSize={11}
                          fontWeight={700}
                        >
                          {key}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            ) : null}

            <div className="pointer-events-none absolute left-3 top-3 z-10 max-w-[calc(100%-1.5rem)] rounded-md bg-black/60 px-2.5 py-1.5 text-xs leading-relaxed text-white backdrop-blur-sm">
              滚轮 / 双指缩放 · 拖动空白平移 · 点击放置 A/B · 拖动标记微调
            </div>

            {!imageError && (!imageLoaded || !view) ? (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-neutral-100/80 text-sm text-neutral-600 backdrop-blur-sm dark:bg-neutral-950/80 dark:text-neutral-300">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent" />
                <span>高清地图加载中…</span>
              </div>
            ) : null}

            {imageError ? (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-neutral-100/90 text-sm text-neutral-700 dark:bg-neutral-950/90 dark:text-neutral-200">
                <span>高清地图加载失败，请重试。</span>
                <button
                  type="button"
                  onClick={retryImage}
                  className="rounded bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
                >
                  重试
                </button>
              </div>
            ) : null}
          </div>

          <p className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
            提示：A 点默认为迫击炮位置，700m / 121m 射程圈以 A 为圆心；点击地图会替换「下次点击放置」提示中的点。
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="text-lg font-semibold">测量结果</h2>

            <div
              aria-live="polite"
              data-testid="erangel-distance"
              className="space-y-1"
            >
              {distance !== null ? (
                <>
                  <div className="text-4xl font-bold tabular-nums text-neutral-900 dark:text-neutral-50">
                    {Math.round(distance)}
                    <span className="ml-1 text-lg font-medium text-neutral-500">
                      米
                    </span>
                  </div>
                  <div className="text-sm text-neutral-500">
                    {distance >= 1000
                      ? `${(distance / 1000).toFixed(2)} km · `
                      : ""}
                    ≈ {(distance / 100).toFixed(1)} 个 100m 小格
                  </div>
                </>
              ) : (
                <div className="text-sm text-neutral-500">
                  {measurement.a
                    ? "已设置 A 点，请点击地图设置 B 点"
                    : "点击地图设置 A 点"}
                </div>
              )}
            </div>

            {rangeState ? (
              <div
                data-testid="erangel-range-status"
                className={`rounded px-3 py-2 text-sm font-medium ${
                  rangeState === "in-range"
                    ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                    : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                }`}
              >
                {rangeStatusText}
              </div>
            ) : null}

            <div className="space-y-2 border-t border-neutral-200 pt-3 text-sm dark:border-neutral-800">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[11px] font-bold text-white">
                    A
                  </span>
                  迫击炮位
                </span>
                <span
                  data-testid="erangel-grid-a"
                  className="font-mono text-neutral-600 dark:text-neutral-300"
                >
                  {measurement.a ? gridReference(measurement.a) : "未设置"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[11px] font-bold text-white">
                    B
                  </span>
                  目标点
                </span>
                <span
                  data-testid="erangel-grid-b"
                  className="font-mono text-neutral-600 dark:text-neutral-300"
                >
                  {measurement.b ? gridReference(measurement.b) : "未设置"}
                </span>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
              仅计算地图水平直线距离；坡地请按游戏内密位修正（低打高加，高打低减）。
            </p>
          </div>

          <div className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="text-lg font-semibold">迫击炮辅助</h2>
            <div className="space-y-1 text-sm text-neutral-600 dark:text-neutral-300">
              <div className="flex justify-between gap-2">
                <span>有效射程</span>
                <span className="font-medium">
                  {MORTAR_MIN_RANGE_METERS}–{MORTAR_MAX_RANGE_METERS} 米
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span>射程圈圆心</span>
                <span className="font-medium">A 点</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-neutral-500">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-4 rounded bg-green-500" />
                700m 最大射程
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-4 rounded bg-red-500" />
                121m 最小射程
              </span>
            </div>
            <p className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
              每个 1km 大格含 10×10 个 100m 小格。距离超出 121–700 米时迫击炮无法有效命中。
            </p>
          </div>

          <div className="space-y-2 rounded-lg border border-neutral-200 bg-white p-4 text-sm leading-relaxed text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
              操作说明
            </h2>
            <p>· 单击地图依次放置 A、B 点；再次点击会替换提示中的点。</p>
            <p>· 拖动空白区域平移，滚轮或双指缩放；拖动 A/B 标记可微调。</p>
            <p>
              · 网格：横向 A–H，纵向 I–P，每个大格 1 km；格内两位数字表示
              100m 小格（如 DO55）。
            </p>
            <p>· 地图按官方 8×8 km 艾伦格标定，8192px 约 1 米/像素。</p>
          </div>
        </div>
      </div>

      <p className="text-xs text-neutral-400 dark:text-neutral-500">
        地图素材版权归 KRAFTON, Inc. 所有；本工具为非官方粉丝辅助工具，仅用于游戏内测距参考。
      </p>
    </div>
  );
}
