"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// 格式化日期为 YYYY-MM-DD
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// 格式化时间为 HH:MM:SS
function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

// 计算地球和月球位置
function calculatePositions(date: Date) {
  // 参考 epoch：2000-01-01
  const refDate = new Date("2000-01-01T00:00:00Z");
  const daysSinceRef = (date.getTime() - refDate.getTime()) / (24 * 60 * 60 * 1000);

  // 地球绕太阳公转周期 365.25 天
  const earthAngle = daysSinceRef * 2 * Math.PI / 365.25;
  const earthX = Math.cos(earthAngle);
  const earthY = Math.sin(earthAngle);

  // 月球相位计算
  // 参考满月日期：2000年1月21日（第一个满月）
  // 满月时 phaseAngle = 0，新月时 phaseAngle = π
  const fullMoonRef = new Date("2000-01-21T00:00:00Z");
  const daysSinceFullMoon = (date.getTime() - fullMoonRef.getTime()) / (24 * 60 * 60 * 1000);

  // 月球相位角度（满月=0，新月=π）
  // 这样 illumination = (1 + cos(phase)) / 2，满月=1，新月=0
  const moonPhaseAngle = (daysSinceFullMoon * 2 * Math.PI / 29.53) % (2 * Math.PI);

  // 月球相对于地球的位置
  // 满月时(phaseAngle=0)：月球在地球外侧，背离太阳
  // 新月时(phaseAngle=π)：月球在太阳和地球之间
  const moonRelAngle = earthAngle + moonPhaseAngle;
  const moonRelX = 0.05 * Math.cos(moonRelAngle);
  const moonRelY = 0.05 * Math.sin(moonRelAngle);

  return {
    earth: { x: earthX, y: earthY, angle: earthAngle },
    moon: {
      x: earthX + moonRelX,
      y: earthY + moonRelY,
      relX: moonRelX,
      relY: moonRelY,
      phaseAngle: moonPhaseAngle,
    },
  };
}

// 获取月相名称（phaseAngle: 0=满月, π=新月）
function getMoonPhaseName(phaseAngle: number): string {
  const deg = ((phaseAngle * 180 / Math.PI) % 360 + 360) % 360;
  // 满月=0°, 下弦月=90°, 新月=180°, 上弦月=270°
  if (deg < 22.5 || deg >= 337.5) return "满月";
  if (deg < 67.5) return "亏凸月";
  if (deg < 112.5) return "下弦月";
  if (deg < 157.5) return "残月";
  if (deg < 202.5) return "新月";
  if (deg < 247.5) return "峨眉月";
  if (deg < 292.5) return "上弦月";
  return "盈凸月";
}

// 绘制太阳
function drawSun(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  // 发光效果
  const gradient = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 2.5);
  gradient.addColorStop(0, "rgba(255, 200, 50, 1)");
  gradient.addColorStop(0.3, "rgba(255, 150, 0, 0.6)");
  gradient.addColorStop(0.6, "rgba(255, 100, 0, 0.2)");
  gradient.addColorStop(1, "rgba(255, 50, 0, 0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, r * 2.5, 0, 2 * Math.PI);
  ctx.fill();

  // 太阳本体
  const sunGradient = ctx.createRadialGradient(x - r * 0.2, y - r * 0.2, 0, x, y, r);
  sunGradient.addColorStop(0, "#ffff88");
  sunGradient.addColorStop(0.5, "#ffdd44");
  sunGradient.addColorStop(1, "#ffaa00");
  ctx.fillStyle = sunGradient;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fill();
}

// 绘制地球
function drawEarth(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  // 大气层发光
  const glowGradient = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 1.5);
  glowGradient.addColorStop(0, "rgba(100, 150, 255, 0.3)");
  glowGradient.addColorStop(1, "rgba(100, 150, 255, 0)");
  ctx.fillStyle = glowGradient;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.5, 0, 2 * Math.PI);
  ctx.fill();

  // 地球本体
  const earthGradient = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
  earthGradient.addColorStop(0, "#6699ff");
  earthGradient.addColorStop(0.4, "#4477dd");
  earthGradient.addColorStop(1, "#2255aa");
  ctx.fillStyle = earthGradient;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fill();
}

// 绘制月球
function drawMoon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  const moonGradient = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
  moonGradient.addColorStop(0, "#dddddd");
  moonGradient.addColorStop(0.5, "#aaaaaa");
  moonGradient.addColorStop(1, "#888888");
  ctx.fillStyle = moonGradient;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fill();
}

// 绘制月相观测图（北半球视角）
function drawMoonPhase(ctx: CanvasRenderingContext2D, phaseAngle: number, x: number, y: number, r: number) {
  // phaseAngle: 0 = 满月，π/2 = 下弦月，π = 新月，3π/2 = 上弦月

  ctx.fillStyle = "#000020";
  ctx.fillRect(x - r - 10, y - r - 10, 2 * r + 20, 2 * r + 20);

  // 确保 phase 在 [0, 2π) 范围内
  const phase = ((phaseAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const illumination = (1 + Math.cos(phase)) / 2;

  // terminator 椭圆水平半径：rx = r * |cos(phase)|
  // 这是正确的公式，使得 terminator 在 phase=π/2 时为直线(rx=0)
  const rx = r * Math.abs(Math.cos(phase));

  // 先画全圆暗面
  ctx.fillStyle = "#333333";
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fill();

  // 新月：全暗
  if (illumination < 0.03) return;

  // 满月：全亮
  if (illumination > 0.97) {
    ctx.fillStyle = "#e8e8e8";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fill();
    return;
  }

  // 下弦月/上弦月：rx≈0，terminator 是直线，直接画半圆
  if (rx < 0.02 * r) {
    ctx.fillStyle = "#e8e8e8";
    ctx.beginPath();
    if (phase < Math.PI) {
      // 下弦月：左半圆
      ctx.arc(x, y, r, Math.PI / 2, 3 * Math.PI / 2, true);
    } else {
      // 上弦月：右半圆
      ctx.arc(x, y, r, 3 * Math.PI / 2, Math.PI / 2, true);
    }
    ctx.fill();
    return;
  }

  ctx.fillStyle = "#e8e8e8";

  if (phase < Math.PI) {
    // 左侧亮面
    if (illumination > 0.5) {
      // 亏凸月：亮面宽度=r+rx，暗面宽度=r-rx（右侧边缘）
      // 先画全圆亮面
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.fill();

      // 暗面：arc(右半圆,顺时针) + ellipse(右凸,逆时针)，方向相反，evenodd交集
      ctx.fillStyle = "#333333";
      ctx.beginPath();
      ctx.arc(x, y, r, Math.PI / 2, 3 * Math.PI / 2, false); // 终点=3π/2
      ctx.ellipse(x, y, rx, r, 0, 3 * Math.PI / 2, Math.PI / 2, true); // 起点=3π/2，右凸
      ctx.fill("evenodd");
    } else {
      // 残月：亮面宽度=r-rx（左侧边缘）
      // arc(左半圆,逆时针) + ellipse(左凸,顺时针)，方向相反，evenodd交集
      ctx.beginPath();
      ctx.arc(x, y, r, Math.PI / 2, 3 * Math.PI / 2, true); // 终点=3π/2
      ctx.ellipse(x, y, rx, r, 0, 3 * Math.PI / 2, Math.PI / 2, false); // 起点=3π/2，左凸
      ctx.fill("evenodd");
    }
  } else {
    // 右侧亮面
    if (illumination > 0.5) {
      // 盈凸月：亮面宽度=r+rx，暗面宽度=r-rx（左侧边缘）
      // 先画全圆亮面
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.fill();

      // 暗面：ellipse(左凸,顺时针) + arc(左半圆,逆时针)，方向相反，evenodd交集
      // 注意：ellipse 先画，终点连接 arc 起点
      ctx.fillStyle = "#333333";
      ctx.beginPath();
      ctx.ellipse(x, y, rx, r, 0, 3 * Math.PI / 2, Math.PI / 2, false); // 终点=π/2，左凸
      ctx.arc(x, y, r, Math.PI / 2, 3 * Math.PI / 2, true); // 起点=π/2，左半圆
      ctx.fill("evenodd");
    } else {
      // 峨眉月：亮面宽度=r-rx（右侧边缘）
      // arc(右半圆,逆时针) + ellipse(左凸,顺时针)，方向相反，evenodd交集
      ctx.beginPath();
      ctx.arc(x, y, r, 3 * Math.PI / 2, Math.PI / 2, true); // 终点=π/2
      ctx.ellipse(x, y, rx, r, 0, Math.PI / 2, 3 * Math.PI / 2, false); // 起点=π/2，左凸
      ctx.fill("evenodd");
    }
  }

  // 绘制月球表面纹理
  ctx.fillStyle = "rgba(150, 150, 150, 0.3)";
  ctx.beginPath();
  ctx.arc(x - r * 0.3, y - r * 0.2, r * 0.15, 0, 2 * Math.PI);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + r * 0.2, y + r * 0.3, r * 0.1, 0, 2 * Math.PI);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x - r * 0.1, y + r * 0.4, r * 0.08, 0, 2 * Math.PI);
  ctx.fill();
}

// 渲染 Canvas
function renderCanvas(canvas: HTMLCanvasElement, date: Date) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  const centerX = width / 2;
  const centerY = height / 2;

  // 尺寸比例
  const sunRadius = 30;
  const earthOrbitRadius = Math.min(width, height) * 0.35;
  const earthRadius = 12;
  const moonOrbitRadius = 40;
  const moonRadius = 5;

  // 清空画布 - 深色太空背景
  ctx.fillStyle = "#000020";
  ctx.fillRect(0, 0, width, height);

  // 绘制一些星星背景
  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  for (let i = 0; i < 50; i++) {
    const starX = (Math.sin(i * 123.456) * 0.5 + 0.5) * width;
    const starY = (Math.cos(i * 789.012) * 0.5 + 0.5) * height;
    const starSize = Math.random() * 1.5 + 0.5;
    ctx.beginPath();
    ctx.arc(starX, starY, starSize, 0, 2 * Math.PI);
    ctx.fill();
  }

  // 计算位置
  const positions = calculatePositions(date);

  // 绘制地球轨道
  ctx.strokeStyle = "rgba(100, 150, 255, 0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(centerX, centerY, earthOrbitRadius, 0, 2 * Math.PI);
  ctx.stroke();

  // 绘制太阳
  drawSun(ctx, centerX, centerY, sunRadius);

  // 计算地球屏幕位置
  const earthScreenX = centerX + positions.earth.x * earthOrbitRadius;
  const earthScreenY = centerY + positions.earth.y * earthOrbitRadius;

  // 绘制月球轨道（围绕地球）
  ctx.strokeStyle = "rgba(200, 200, 200, 0.25)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(earthScreenX, earthScreenY, moonOrbitRadius, 0, 2 * Math.PI);
  ctx.stroke();

  // 绘制地球
  drawEarth(ctx, earthScreenX, earthScreenY, earthRadius);

  // 计算月球屏幕位置
  const moonScreenX = earthScreenX + positions.moon.relX * moonOrbitRadius / 0.05;
  const moonScreenY = earthScreenY + positions.moon.relY * moonOrbitRadius / 0.05;

  // 绘制月球
  drawMoon(ctx, moonScreenX, moonScreenY, moonRadius);

  // 绘制标签
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("太阳", centerX, centerY + sunRadius + 18);
  ctx.fillText("地球", earthScreenX, earthScreenY + earthRadius + 15);
  ctx.fillText("月球", moonScreenX, moonScreenY + moonRadius + 12);

  // 绘制从太阳到地球的连线（可选，帮助观察位置关系）
  ctx.strokeStyle = "rgba(255, 200, 100, 0.15)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(earthScreenX, earthScreenY);
  ctx.stroke();
}

export default function SolarSystemSimulator() {
  const [inputDate, setInputDate] = useState<string>("");
  const [inputTime, setInputTime] = useState<string>("");
  const [simDate, setSimDate] = useState<Date>(new Date());
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const moonPhaseCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const moonPhaseContainerRef = useRef<HTMLDivElement>(null);
  const simDateRef = useRef<Date>(simDate);

  // 初始化设置为当前时间
  useEffect(() => {
    const now = new Date();
    setInputDate(formatDate(now));
    setInputTime(formatTime(now));
    setSimDate(now);
  }, []);

  // 同步 simDateRef
  useEffect(() => {
    simDateRef.current = simDate;
  }, [simDate]);

  // 设置 Canvas 尺寸
  useEffect(() => {
    const updateCanvasSize = () => {
      if (canvasRef.current && containerRef.current) {
        const width = containerRef.current.clientWidth;
        const height = Math.min(500, width * 0.75);
        canvasRef.current.width = width;
        canvasRef.current.height = height;
        renderCanvas(canvasRef.current, simDate);
      }
      // 月相 Canvas
      if (moonPhaseCanvasRef.current && moonPhaseContainerRef.current) {
        const size = Math.min(moonPhaseContainerRef.current.clientWidth, 200);
        moonPhaseCanvasRef.current.width = size;
        moonPhaseCanvasRef.current.height = size;
        const positions = calculatePositions(simDate);
        const ctx = moonPhaseCanvasRef.current.getContext("2d");
        if (ctx) {
          drawMoonPhase(ctx, positions.moon.phaseAngle, size / 2, size / 2, size * 0.35);
        }
      }
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);
    return () => window.removeEventListener("resize", updateCanvasSize);
  }, [simDate]);

  // 静态渲染
  useEffect(() => {
    if (!isPlaying && canvasRef.current) {
      renderCanvas(canvasRef.current, simDate);
    }
    // 渲染月相
    if (moonPhaseCanvasRef.current) {
      const positions = calculatePositions(simDate);
      const ctx = moonPhaseCanvasRef.current.getContext("2d");
      if (ctx) {
        const size = moonPhaseCanvasRef.current.width;
        drawMoonPhase(ctx, positions.moon.phaseAngle, size / 2, size / 2, size * 0.35);
      }
    }
  }, [simDate, isPlaying]);

  // 动画循环
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!isPlaying || !canvas) return;

    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      // 每秒流逝 speed 天
      const newTime = new Date(simDateRef.current.getTime() + deltaTime * speed * 24 * 60 * 60 * 1000);
      simDateRef.current = newTime;
      setSimDate(newTime);
      renderCanvas(canvas, newTime);

      // 同时渲染月相
      if (moonPhaseCanvasRef.current) {
        const positions = calculatePositions(newTime);
        const ctx = moonPhaseCanvasRef.current.getContext("2d");
        if (ctx) {
          const size = moonPhaseCanvasRef.current.width;
          drawMoonPhase(ctx, positions.moon.phaseAngle, size / 2, size / 2, size * 0.35);
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [isPlaying, speed]);

  // 设置为当前时间
  const setToNow = useCallback(() => {
    const now = new Date();
    setInputDate(formatDate(now));
    setInputTime(formatTime(now));
    setSimDate(now);
    setIsPlaying(false);
  }, []);

  // 处理日期输入变化
  const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputDate(e.target.value);
    if (e.target.value && inputTime) {
      const newDate = new Date(`${e.target.value}T${inputTime}`);
      if (!isNaN(newDate.getTime())) {
        setSimDate(newDate);
        setIsPlaying(false);
      }
    }
  }, [inputTime]);

  // 处理时间输入变化
  const handleTimeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputTime(e.target.value);
    if (inputDate && e.target.value) {
      const newDate = new Date(`${inputDate}T${e.target.value}`);
      if (!isNaN(newDate.getTime())) {
        setSimDate(newDate);
        setIsPlaying(false);
      }
    }
  }, [inputDate]);

  // 切换播放状态
  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  // 重置到输入时间
  const resetTime = useCallback(() => {
    if (inputDate && inputTime) {
      const resetDate = new Date(`${inputDate}T${inputTime}`);
      if (!isNaN(resetDate.getTime())) {
        setSimDate(resetDate);
      }
    }
    setIsPlaying(false);
  }, [inputDate, inputTime]);

  // 计算角度显示
  const positions = calculatePositions(simDate);
  const earthAngleDeg = ((positions.earth.angle * 180 / Math.PI) % 360 + 360) % 360;
  const moonPhaseDeg = ((positions.moon.phaseAngle * 180 / Math.PI) % 360 + 360) % 360;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* 标题 */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          太阳-地球-月球运转模拟
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          根据日期时间展示太阳、地球、月球的位置关系
        </p>
      </div>

      {/* 控制面板 */}
      <div className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 p-4 space-y-4">
        {/* 时间输入 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              日期
            </label>
            <input
              type="date"
              value={inputDate}
              onChange={handleDateChange}
              className="w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              时间
            </label>
            <input
              type="time"
              value={inputTime}
              onChange={handleTimeChange}
              step="1"
              className="w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              速度
            </label>
            <select
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            >
              <option value="1">1 天/秒</option>
              <option value="10">10 天/秒</option>
              <option value="100">100 天/秒</option>
              <option value="1000">1000 天/秒</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={setToNow}
              className="flex-1 rounded bg-neutral-200 px-3 py-2 text-sm font-medium hover:bg-neutral-300 dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:text-white"
            >
              当前时间
            </button>
          </div>
        </div>

        {/* 播放控制 */}
        <div className="flex items-center gap-4">
          <button
            onClick={togglePlay}
            className={`flex-1 rounded px-4 py-2 text-sm font-medium ${
              isPlaying
                ? "bg-orange-500 text-white hover:bg-orange-600"
                : "bg-blue-500 text-white hover:bg-blue-600"
            }`}
          >
            {isPlaying ? "暂停" : "播放"}
          </button>
          <button
            onClick={resetTime}
            className="flex-1 rounded bg-neutral-200 px-4 py-2 text-sm font-medium hover:bg-neutral-300 dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:text-white"
          >
            重置
          </button>
        </div>
      </div>

      {/* Canvas 显示区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 轨道模拟图 */}
        <div
          ref={containerRef}
          className="lg:col-span-2 rounded-lg border border-neutral-200 bg-black dark:border-neutral-800 overflow-hidden"
        >
          <canvas ref={canvasRef} className="w-full" style={{ display: "block" }} />
        </div>

        {/* 月相观测图 */}
        <div className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 p-4 flex flex-col items-center">
          <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            北半球观测月相
          </h3>
          <div
            ref={moonPhaseContainerRef}
            className="rounded-lg bg-black overflow-hidden w-full max-w-[200px]"
          >
            <canvas ref={moonPhaseCanvasRef} className="w-full" style={{ display: "block" }} />
          </div>
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400 text-center">
            当前月相：{getMoonPhaseName(calculatePositions(simDate).moon.phaseAngle)}
          </p>
        </div>
      </div>

      {/* 信息显示 */}
      <div className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-neutral-500 dark:text-neutral-400">模拟时间：</span>
            <span className="font-medium text-neutral-900 dark:text-white">
              {simDate.toLocaleString("zh-CN", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          </div>
          <div>
            <span className="text-neutral-500 dark:text-neutral-400">地球公转角度：</span>
            <span className="font-medium text-neutral-900 dark:text-white">
              {earthAngleDeg.toFixed(2)}°
            </span>
          </div>
          <div>
            <span className="text-neutral-500 dark:text-neutral-400">月球相位：</span>
            <span className="font-medium text-neutral-900 dark:text-white">
              {moonPhaseDeg.toFixed(2)}° ({getMoonPhaseName(positions.moon.phaseAngle)})
            </span>
          </div>
        </div>
      </div>

      {/* 说明 */}
      <div className="text-center text-xs text-neutral-500 dark:text-neutral-400 space-y-1">
        <p>地球公转周期：365.25 天 | 月球朔望月周期：29.53 天</p>
        <p>参考新月：2000-01-06（相位0=新月，相位180°=满月）</p>
      </div>
    </div>
  );
}