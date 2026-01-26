"use client";
import { useState } from "react";

export default function DataFilter() {
  const [sourceData, setSourceData] = useState("");
  const [filterData, setFilterData] = useState("");
  const [result, setResult] = useState("");

  const handleFilter = () => {
    const sourceLines = sourceData.split("\n");
    const filterLines = new Set(filterData.split("\n").filter(line => line.trim() !== ""));
    const filteredResult = sourceLines.filter(line => !filterLines.has(line));
    // Deduplicate the filtered result
    const deduplicatedResult = [...new Set(filteredResult)];
    setResult(deduplicatedResult.join("\n"));
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-center">数据去重工具</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="source-data" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
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
          <label htmlFor="filter-data" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
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
        </div>
      </div>
      <div className="mt-4 flex justify-center">
        <button
          onClick={handleFilter}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          开始去重
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
      </div>
    </div>
  );
}
