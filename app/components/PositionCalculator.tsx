"use client";

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

function formatNum(value: number, decimals = 8): string {
  // 去除末尾多余的零
  return parseFloat(value.toFixed(decimals)).toString();
}

function formatMoney(value: number): string {
  return value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export default function PositionCalculator() {
  const [holdingShares, setHoldingShares] = useState("");
  const [avgPrice, setAvgPrice] = useState("");
  const [currentPrice, setCurrentPrice] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [additionalShares, setAdditionalShares] = useState("");

  const { result, error } = useMemo(() => {
    const sStr = holdingShares.trim();
    const avgStr = avgPrice.trim();
    const curStr = currentPrice.trim();
    const tgtStr = targetPrice.trim();

    if (!sStr && !avgStr && !curStr && !tgtStr) {
      return { result: null, error: "" };
    }

    if (!sStr || !avgStr || !curStr || !tgtStr) {
      return { result: null, error: "请填写所有字段" };
    }

    const S = Number(sStr);
    const P_avg = Number(avgStr);
    const P_cur = Number(curStr);
    const P_target = Number(tgtStr);

    if (!Number.isFinite(S) || S <= 0) {
      return { result: null, error: "持有份额必须为正数" };
    }
    if (!Number.isFinite(P_avg) || P_avg <= 0) {
      return { result: null, error: "平均持仓价格必须为正数" };
    }
    if (!Number.isFinite(P_cur) || P_cur <= 0) {
      return { result: null, error: "当前价格必须为正数" };
    }
    if (!Number.isFinite(P_target) || P_target <= 0) {
      return { result: null, error: "目标价格必须为正数" };
    }

    // 目标价格等于当前价格时，无法通过买入改变均价到该目标
    if (P_target === P_cur) {
      return { result: null, error: "目标价格不能等于当前价格" };
    }

    // X = S * (P_avg - P_target) / (P_target - P_cur)
    const X = S * (P_avg - P_target) / (P_target - P_cur);

    if (X < 0) {
      // 说明目标价格不在合理范围内
      const direction = P_cur < P_avg ? "低于当前价格" : "高于当前价格";
      return {
        result: null,
        error: `目标价格需要${direction}且在当前价格和平均持仓价之间，才能通过以当前价格买入来达成`,
      };
    }

    if (!Number.isFinite(X)) {
      return { result: null, error: "计算结果超出范围" };
    }

    const totalCost = X * P_cur;
    const newTotalShares = S + X;
    const newAvgPrice = (S * P_avg + X * P_cur) / newTotalShares;

    return {
      result: {
        sharesToBuy: X,
        totalCost,
        newTotalShares,
        newAvgPrice,
      },
      error: "",
    };
  }, [holdingShares, avgPrice, currentPrice, targetPrice]);

  // 图表数据：不同目标价对应的需要增持份额
  const chartData = useMemo(() => {
    const sStr = holdingShares.trim();
    const avgStr = avgPrice.trim();
    const curStr = currentPrice.trim();

    if (!sStr || !avgStr || !curStr) return [];

    const S = Number(sStr);
    const P_avg = Number(avgStr);
    const P_cur = Number(curStr);

    if (!Number.isFinite(S) || S <= 0) return [];
    if (!Number.isFinite(P_avg) || P_avg <= 0) return [];
    if (!Number.isFinite(P_cur) || P_cur <= 0) return [];

    // 目标价格范围：当前价格到平均持仓价之间（仅在此区间内买入才有意义）
    const low = Math.min(P_cur, P_avg);
    const high = Math.max(P_cur, P_avg);

    // 为了避免分母为零和无穷大，在边界处略微缩进
    const margin = (high - low) * 0.02;
    const start = low + margin;
    const end = high - margin;

    if (start >= end) return [];

    const steps = 80;
    const stepSize = (end - start) / steps;
    const data: { targetPrice: number; sharesToBuy: number }[] = [];

    for (let i = 0; i <= steps; i++) {
      const P_target = start + i * stepSize;
      const X = S * (P_avg - P_target) / (P_target - P_cur);
      if (Number.isFinite(X) && X >= 0) {
        data.push({
          targetPrice: parseFloat(P_target.toFixed(2)),
          sharesToBuy: parseFloat(X.toFixed(8)),
        });
      }
    }

    return data;
  }, [holdingShares, avgPrice, currentPrice]);

  // 图表2数据：已知增持数量，不同目标价对应的增持价格
  // 公式：P_cur = ((S + X) * P_target - S * P_avg) / X
  const chartData2 = useMemo(() => {
    const sStr = holdingShares.trim();
    const avgStr = avgPrice.trim();
    const addStr = additionalShares.trim();

    if (!sStr || !avgStr || !addStr) return [];

    const S = Number(sStr);
    const P_avg = Number(avgStr);
    const X = Number(addStr);

    if (!Number.isFinite(S) || S <= 0) return [];
    if (!Number.isFinite(P_avg) || P_avg <= 0) return [];
    if (!Number.isFinite(X) || X <= 0) return [];

    // 目标价格范围：以平均持仓价为中心，上下浮动 50%
    const low = P_avg * 0.5;
    const high = P_avg * 1.5;

    const steps = 80;
    const stepSize = (high - low) / steps;
    const data: { targetPrice: number; buyPrice: number }[] = [];

    for (let i = 0; i <= steps; i++) {
      const P_target = low + i * stepSize;
      const P_cur = ((S + X) * P_target - S * P_avg) / X;
      if (Number.isFinite(P_cur) && P_cur > 0) {
        data.push({
          targetPrice: parseFloat(P_target.toFixed(2)),
          buyPrice: parseFloat(P_cur.toFixed(2)),
        });
      }
    }

    return data;
  }, [holdingShares, avgPrice, additionalShares]);

  const clear = () => {
    setHoldingShares("");
    setAvgPrice("");
    setCurrentPrice("");
    setTargetPrice("");
    setAdditionalShares("");
  };

  return (
    <div className="w-full max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">补仓计算器</h1>
          <p className="text-sm text-gray-500">
            计算需要以当前价格买入多少份额，才能将平均持仓价拉到目标价格
          </p>
        </div>
        <button
          type="button"
          onClick={clear}
          className="rounded border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200"
        >
          清空
        </button>
      </div>

      <div className="rounded border border-black/10 dark:border-white/20 bg-white dark:bg-neutral-900 p-4 space-y-4">
        {/* 输入区域 */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm text-gray-600 dark:text-gray-300">已持有份额</label>
            <input
              value={holdingShares}
              onChange={(e) => setHoldingShares(e.target.value)}
              placeholder="例如：0.5（支持小数）"
              type="number"
              min="0"
              step="any"
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="text-xs text-gray-500">支持小数，适用于 BTC 等加密货币</div>
          </div>

          <div className="space-y-1">
            <label className="text-sm text-gray-600 dark:text-gray-300">平均持仓价格</label>
            <input
              value={avgPrice}
              onChange={(e) => setAvgPrice(e.target.value)}
              placeholder="例如：95000"
              type="number"
              min="0"
              step="any"
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm text-gray-600 dark:text-gray-300">当前价格</label>
            <input
              value={currentPrice}
              onChange={(e) => setCurrentPrice(e.target.value)}
              placeholder="例如：80000"
              type="number"
              min="0"
              step="any"
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm text-gray-600 dark:text-gray-300">目标价格</label>
            <input
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              placeholder="例如：85000"
              type="number"
              min="0"
              step="any"
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="text-xs text-gray-500">希望将平均持仓价拉到的目标价</div>
          </div>
        </div>

        {error ? <div className="text-sm text-red-600">{error}</div> : null}

        {/* 计算结果 */}
        {result && (
          <div className="rounded border border-dashed border-gray-300 px-4 py-3 space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-0.5">
                <div className="text-xs text-gray-500">需要买入份额</div>
                <div className="text-lg font-semibold font-mono text-blue-700 dark:text-blue-400">
                  {formatNum(result.sharesToBuy)}
                </div>
              </div>
              <div className="space-y-0.5">
                <div className="text-xs text-gray-500">买入花费</div>
                <div className="text-lg font-semibold font-mono text-orange-600 dark:text-orange-400">
                  ¥{formatMoney(result.totalCost)}
                </div>
              </div>
              <div className="space-y-0.5">
                <div className="text-xs text-gray-500">买入后总份额</div>
                <div className="text-lg font-semibold font-mono text-gray-800 dark:text-gray-100">
                  {formatNum(result.newTotalShares)}
                </div>
              </div>
              <div className="space-y-0.5">
                <div className="text-xs text-gray-500">新平均持仓价</div>
                <div className="text-lg font-semibold font-mono text-green-700 dark:text-green-400">
                  ¥{formatMoney(result.newAvgPrice)}
                </div>
              </div>
            </div>

            <div className="text-xs text-gray-500 border-t border-gray-200 dark:border-neutral-700 pt-2">
              公式：需买入份额 = 持有份额 × (平均持仓价 - 目标价) ÷ (目标价 - 当前价格)
            </div>
          </div>
        )}
      </div>

      {/* 关系图 */}
      {chartData.length > 0 && (
        <div className="rounded border border-black/10 dark:border-white/20 bg-white dark:bg-neutral-900 p-4 space-y-3">
          <h2 className="text-lg font-semibold">目标价格 vs 需要增持份额</h2>
          <p className="text-xs text-gray-500">
            横轴为目标价格，纵轴为以当前价格需要买入的份额数量
          </p>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="targetPrice"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={(v: number) => v.toLocaleString()}
                  label={{ value: "目标价格", position: "insideBottomRight", offset: -5, fontSize: 12 }}
                  fontSize={11}
                />
                <YAxis
                  tickFormatter={(v: number) => formatNum(v, 4)}
                  label={{ value: "需买入份额", angle: -90, position: "insideLeft", offset: -5, fontSize: 12 }}
                  fontSize={11}
                />
                <Tooltip
                  formatter={(value) => [formatNum(Number(value)), "需买入份额"]}
                  labelFormatter={(label) => `目标价格: ${Number(label).toLocaleString()}`}
                />
                {/* 当前价格参考线 */}
                <ReferenceLine
                  x={Number(currentPrice)}
                  stroke="#ef4444"
                  strokeDasharray="5 5"
                  label={{ value: "当前价", fill: "#ef4444", fontSize: 11 }}
                />
                {/* 平均持仓价参考线 */}
                <ReferenceLine
                  x={Number(avgPrice)}
                  stroke="#f59e0b"
                  strokeDasharray="5 5"
                  label={{ value: "持仓价", fill: "#f59e0b", fontSize: 11 }}
                />
                {/* 用户选择的目标价参考线 */}
                {targetPrice.trim() && Number(targetPrice) > 0 && (
                  <ReferenceLine
                    x={Number(targetPrice)}
                    stroke="#22c55e"
                    strokeDasharray="5 5"
                    label={{ value: "目标价", fill: "#22c55e", fontSize: 11 }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="sharesToBuy"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 第二张图表：已知增持数量，目标价 vs 增持价格 */}
      <div className="rounded border border-black/10 dark:border-white/20 bg-white dark:bg-neutral-900 p-4 space-y-3">
        <h2 className="text-lg font-semibold">目标价格 vs 增持价格</h2>
        <p className="text-xs text-gray-500">
          已知增持数量，横轴为目标价格，纵轴为需要以什么价格买入才能达到该目标均价
        </p>
        <div className="space-y-1">
          <label className="text-sm text-gray-600 dark:text-gray-300">计划增持数量</label>
          <input
            value={additionalShares}
            onChange={(e) => setAdditionalShares(e.target.value)}
            placeholder="例如：0.2（支持小数）"
            type="number"
            min="0"
            step="any"
            className="w-full max-w-xs rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="text-xs text-gray-500">需先填写上方的「已持有份额」和「平均持仓价格」</div>
        </div>

        {chartData2.length > 0 && (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData2} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="targetPrice"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={(v: number) => v.toLocaleString()}
                  label={{ value: "目标价格", position: "insideBottomRight", offset: -5, fontSize: 12 }}
                  fontSize={11}
                />
                <YAxis
                  tickFormatter={(v: number) => v.toLocaleString()}
                  label={{ value: "增持价格", angle: -90, position: "insideLeft", offset: -5, fontSize: 12 }}
                  fontSize={11}
                />
                <Tooltip
                  formatter={(value) => [`¥${Number(value).toLocaleString()}`, "增持价格"]}
                  labelFormatter={(label) => `目标价格: ¥${Number(label).toLocaleString()}`}
                />
                {/* 平均持仓价参考线 */}
                <ReferenceLine
                  x={Number(avgPrice)}
                  stroke="#f59e0b"
                  strokeDasharray="5 5"
                  label={{ value: "持仓价", fill: "#f59e0b", fontSize: 11 }}
                />
                <Line
                  type="monotone"
                  dataKey="buyPrice"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

