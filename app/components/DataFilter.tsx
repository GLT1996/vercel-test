"use client";
import { useState } from "react";

export default function DataFilter() {
  const [sourceData, setSourceData] = useState("");
  const [filterData, setFilterData] = useState("");
  const [result, setResult] = useState("");
  const [filterNumericOnly, setFilterNumericOnly] = useState(false);
  const [stats, setStats] = useState({
    sourceCount: 0,
    filterCount: 0,
    deduplicatedCount: 0, // New stat
    resultCount: 0,
  });

  const handleFilter = () => {
    const sourceLines = sourceData
      .split("\n")
      .map((line) => line.trimEnd())
      .filter((line) => line.trim() !== "");

    const filterLines = filterData
      .split("\n")
      .map((line) => line.trimEnd())
      .filter((line) => line.trim() !== "");

    const filterLinesSet = new Set(filterLines);

    const isNumericOnly = (line: string) => {
      const t = line.trim();
      // 支持：整数/小数/正负号。空字符串已在上面过滤。
      return /^[-+]?\d+(?:\.\d+)?$/.test(t);
    };

    // 先计算哪些被过滤掉（来自“过滤数据” + 可选的“数字行”）
    const linesFilteredOut = sourceLines.filter((line) => {
      if (filterLinesSet.has(line)) return true;
      if (filterNumericOnly && !isNumericOnly(line)) return true;
      return false;
    });

    const linesKept = sourceLines.filter((line) => !linesFilteredOut.includes(line));

    const deduplicatedResult = [...new Set(linesKept)];
    setResult(deduplicatedResult.join("\n"));
    setStats({
      sourceCount: sourceLines.length,
      filterCount: linesFilteredOut.length,
      deduplicatedCount: linesKept.length - deduplicatedResult.length, // Calculate new stat
      resultCount: deduplicatedResult.length,
    });
  };

  const handleExport = async () => {
    if (!result) {
        alert("没有可导出的数据。");
        return;
    }

    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('去重结果');

    const data = result.split('\n').map(line => ([line]));

    worksheet.addRows(data);

    try {
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'data_filter_result.xlsx';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error("导出 Excel 失败:", error);
        alert("导出 Excel 失败。");
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-center">数据去重工具</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="source-data"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            源数据 (每行一条)
          </label>
          <textarea
            id="source-data"
            rows={10}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            value={sourceData}
            onChange={(e) => setSourceData(e.target.value)}
            placeholder="在此输入源数据"
          />
        </div>
        <div>
          <label
            htmlFor="filter-data"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            过滤数据 (每行一条)
          </label>
          <textarea
            id="filter-data"
            rows={10}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            value={filterData}
            onChange={(e) => setFilterData(e.target.value)}
            placeholder="在此输入要过滤掉的数据"
          />

          <label className="mt-2 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 select-none">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={filterNumericOnly}
              onChange={(e) => setFilterNumericOnly(e.target.checked)}
            />
            过滤掉源数据中“非纯数字”的行（计入过滤数据数量）
          </label>
        </div>
      </div>
      <div className="mt-4 flex justify-center gap-4">
        <button
          onClick={handleFilter}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          开始去重
        </button>
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          导出为 Excel
        </button>
      </div>
      <div className="mt-4">
        <label htmlFor="result-data" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          结果
        </label>
        <textarea
          id="result-data"
          rows={10}
          readOnly
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          value={result}
          placeholder="去重结果将显示在这里"
        />
        <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          源数据: {stats.sourceCount} 条 | 过滤数据: {stats.filterCount} 条 | 因重复移除: {stats.deduplicatedCount} 条 | 最终结果: {stats.resultCount} 条
        </div>
      </div>
    </div>
  );
}
