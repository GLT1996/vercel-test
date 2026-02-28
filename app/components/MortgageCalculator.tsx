"use client";

import { useMemo, useState } from "react";

type RepaymentMethod = "equal-installment" | "equal-principal";

interface MonthlyDetail {
  month: number;
  payment: number;       // 当月还款总额
  principal: number;     // 当月还本金
  interest: number;      // 当月还利息
  remaining: number;     // 剩余本金
}

/**
 * 等额本息：每月还款额相同
 * 公式：M = P * r * (1+r)^n / ((1+r)^n - 1)
 */
function calcEqualInstallment(totalLoan: number, monthlyRate: number, months: number): MonthlyDetail[] {
  const result: MonthlyDetail[] = [];
  const pow = Math.pow(1 + monthlyRate, months);
  const monthlyPayment = totalLoan * monthlyRate * pow / (pow - 1);

  let remaining = totalLoan;
  for (let i = 1; i <= months; i++) {
    const interest = remaining * monthlyRate;
    const principal = monthlyPayment - interest;
    remaining = remaining - principal;
    result.push({
      month: i,
      payment: monthlyPayment,
      principal,
      interest,
      remaining: Math.max(remaining, 0),
    });
  }
  return result;
}

/**
 * 等额本金：每月本金相同，利息递减
 * 每月本金 = P / n
 * 每月利息 = 剩余本金 * r
 */
function calcEqualPrincipal(totalLoan: number, monthlyRate: number, months: number): MonthlyDetail[] {
  const result: MonthlyDetail[] = [];
  const monthlyPrincipal = totalLoan / months;

  let remaining = totalLoan;
  for (let i = 1; i <= months; i++) {
    const interest = remaining * monthlyRate;
    const payment = monthlyPrincipal + interest;
    remaining = remaining - monthlyPrincipal;
    result.push({
      month: i,
      payment,
      principal: monthlyPrincipal,
      interest,
      remaining: Math.max(remaining, 0),
    });
  }
  return result;
}

function formatMoney(value: number): string {
  return value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export default function MortgageCalculator() {
  const [loanAmount, setLoanAmount] = useState<string>("");
  const [annualRate, setAnnualRate] = useState<string>("");
  const [loanMonths, setLoanMonths] = useState<string>("");
  const [method, setMethod] = useState<RepaymentMethod>("equal-installment");
  const [showDetail, setShowDetail] = useState(false);

  const { details, error, summary } = useMemo(() => {
    const amountStr = loanAmount.trim();
    const rateStr = annualRate.trim();
    const monthsStr = loanMonths.trim();

    if (!amountStr && !rateStr && !monthsStr) {
      return { details: [], error: "", summary: null };
    }

    if (!amountStr || !rateStr || !monthsStr) {
      return { details: [], error: "请填写所有字段", summary: null };
    }

    const amount = Number(amountStr);
    const rate = Number(rateStr);
    const months = Number(monthsStr);

    if (!Number.isFinite(amount) || amount <= 0) {
      return { details: [], error: "贷款金额必须为正数", summary: null };
    }
    if (!Number.isFinite(rate) || rate <= 0) {
      return { details: [], error: "年利率必须为正数", summary: null };
    }
    if (!Number.isFinite(months) || months <= 0 || !Number.isInteger(months)) {
      return { details: [], error: "贷款周期必须为正整数（月）", summary: null };
    }

    const monthlyRate = rate / 100 / 12;

    const result =
      method === "equal-installment"
        ? calcEqualInstallment(amount, monthlyRate, months)
        : calcEqualPrincipal(amount, monthlyRate, months);

    const totalPayment = result.reduce((sum, d) => sum + d.payment, 0);
    const totalInterest = totalPayment - amount;

    return {
      details: result,
      error: "",
      summary: {
        totalPayment,
        totalInterest,
        firstMonthPayment: result[0]?.payment ?? 0,
        lastMonthPayment: result[result.length - 1]?.payment ?? 0,
      },
    };
  }, [loanAmount, annualRate, loanMonths, method]);

  const clear = () => {
    setLoanAmount("");
    setAnnualRate("");
    setLoanMonths("");
    setShowDetail(false);
  };

  return (
    <div className="w-full max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">房贷计算器</h1>
          <p className="text-sm text-gray-500">支持等额本息和等额本金两种还款方式</p>
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <label className="text-sm text-gray-600 dark:text-gray-300">贷款金额（元）</label>
            <input
              value={loanAmount}
              onChange={(e) => setLoanAmount(e.target.value)}
              placeholder="例如：1000000"
              type="number"
              min="0"
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm text-gray-600 dark:text-gray-300">年利率（%）</label>
            <input
              value={annualRate}
              onChange={(e) => setAnnualRate(e.target.value)}
              placeholder="例如：3.1"
              type="number"
              min="0"
              step="0.01"
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm text-gray-600 dark:text-gray-300">贷款周期（月）</label>
            <input
              value={loanMonths}
              onChange={(e) => setLoanMonths(e.target.value)}
              placeholder="例如：360（30年）"
              type="number"
              min="1"
              step="1"
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 还款方式选择 */}
        <div className="flex items-center gap-6">
          <span className="text-sm text-gray-600 dark:text-gray-300">还款方式：</span>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="method"
              checked={method === "equal-installment"}
              onChange={() => setMethod("equal-installment")}
              className="accent-blue-600"
            />
            <span className="text-sm">等额本息（每月还款相同）</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="method"
              checked={method === "equal-principal"}
              onChange={() => setMethod("equal-principal")}
              className="accent-blue-600"
            />
            <span className="text-sm">等额本金（每月本金相同）</span>
          </label>
        </div>

        {error ? <div className="text-sm text-red-600">{error}</div> : null}

        {/* 汇总结果 */}
        {summary && (
          <div className="rounded border border-dashed border-gray-300 px-4 py-3 space-y-2">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-0.5">
                <div className="text-xs text-gray-500">还款总额</div>
                <div className="text-lg font-semibold font-mono text-blue-700 dark:text-blue-400">
                  ¥{formatMoney(summary.totalPayment)}
                </div>
              </div>
              <div className="space-y-0.5">
                <div className="text-xs text-gray-500">总利息</div>
                <div className="text-lg font-semibold font-mono text-orange-600 dark:text-orange-400">
                  ¥{formatMoney(summary.totalInterest)}
                </div>
              </div>
              <div className="space-y-0.5">
                <div className="text-xs text-gray-500">首月还款</div>
                <div className="text-lg font-semibold font-mono text-gray-800 dark:text-gray-100">
                  ¥{formatMoney(summary.firstMonthPayment)}
                </div>
              </div>
              <div className="space-y-0.5">
                <div className="text-xs text-gray-500">末月还款</div>
                <div className="text-lg font-semibold font-mono text-gray-800 dark:text-gray-100">
                  ¥{formatMoney(summary.lastMonthPayment)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 还款明细表 */}
      {details.length > 0 && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowDetail(!showDetail)}
            className="text-sm text-blue-600 hover:underline"
          >
            {showDetail ? "收起还款明细 ▲" : "展开还款明细 ▼"}
          </button>

          {showDetail && (
            <div className="overflow-x-auto rounded border border-black/10 dark:border-white/20">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-neutral-800 text-left">
                    <th className="px-3 py-2 font-medium text-gray-600 dark:text-gray-300">期数</th>
                    <th className="px-3 py-2 font-medium text-gray-600 dark:text-gray-300">月供（元）</th>
                    <th className="px-3 py-2 font-medium text-gray-600 dark:text-gray-300">本金（元）</th>
                    <th className="px-3 py-2 font-medium text-gray-600 dark:text-gray-300">利息（元）</th>
                    <th className="px-3 py-2 font-medium text-gray-600 dark:text-gray-300">剩余本金（元）</th>
                  </tr>
                </thead>
                <tbody>
                  {details.map((d) => (
                    <tr
                      key={d.month}
                      className="border-t border-gray-100 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-800"
                    >
                      <td className="px-3 py-1.5 font-mono">{d.month}</td>
                      <td className="px-3 py-1.5 font-mono">{formatMoney(d.payment)}</td>
                      <td className="px-3 py-1.5 font-mono">{formatMoney(d.principal)}</td>
                      <td className="px-3 py-1.5 font-mono">{formatMoney(d.interest)}</td>
                      <td className="px-3 py-1.5 font-mono">{formatMoney(d.remaining)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

