"use client";

import { useState } from "react";
import ExcelJS from "exceljs";

export default function JsonToExcel() {
  const [jsonInput, setJsonInput] = useState<string>(
    `[
  {
    "id": "1",
    "name": "John Doe",
    "email": "john.doe@example.com"
  },
  {
    "id": "2",
    "name": "Jane Smith",
    "email": "jane.smith@example.com"
  }
]`
  );
  const [error, setError] = useState<string>("");
  const [fileName, setFileName] = useState<string>("exported_data");

  const handleExport = async () => {
    setError("");
    if (!jsonInput.trim()) {
      setError("JSON input cannot be empty.");
      return;
    }

    let data: unknown;
    try {
      data = JSON.parse(jsonInput);
    } catch {
      setError("Invalid JSON format. Please check the input.");
      return;
    }

    if (!Array.isArray(data)) {
      setError("The JSON data must be an array of objects.");
      return;
    }
    if (data.length === 0) {
      setError("The JSON array cannot be empty.");
      return;
    }
    if (typeof data[0] !== "object" || data[0] === null) {
      setError("The JSON array must contain objects.");
      return;
    }

    try {
      const rows = data as Array<Record<string, unknown>>;

      // Use union of keys across rows to avoid dropping columns.
      const headerSet = new Set<string>();
      for (const r of rows) {
        for (const k of Object.keys(r)) headerSet.add(k);
      }
      const headers = Array.from(headerSet);

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet1");

      worksheet.addRow(headers);
      for (const r of rows) {
        worksheet.addRow(headers.map((h) => (r[h] == null ? "" : String(r[h]))));
      }

      // Basic formatting: freeze header row + auto width (bounded)
      worksheet.views = [{ state: "frozen", ySplit: 1 }];
      headers.forEach((h, idx) => {
        const col = worksheet.getColumn(idx + 1);
        const maxLen = Math.min(
          50,
          Math.max(
            String(h).length,
            ...worksheet
              .getColumn(idx + 1)
              .values.slice(2)
              .map((v) => (v == null ? 0 : String(v).length))
          )
        );
        col.width = Math.max(10, maxLen + 2);
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const finalFileName = fileName.trim() ? `${fileName.trim()}.xlsx` : "exported_data.xlsx";

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = finalFileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "An unknown error occurred during Excel generation.";
      setError(`Failed to generate Excel file: ${msg}`);
    }
  };

  const clear = () => {
    setJsonInput("");
    setError("");
  };

  return (
    <div className="w-full max-w-3xl space-y-4 mx-auto">
      <div>
        <h2 className="text-xl font-semibold">JSON to Excel Converter</h2>
        <p className="text-sm text-gray-500">
          Paste a JSON array of objects to generate and download an Excel (.xlsx) file.
        </p>
      </div>

      <div className="rounded border border-black/10 dark:border-white/20 bg-white dark:bg-neutral-900 p-4 space-y-3">
        <textarea
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          placeholder="Paste your JSON array here..."
          className="w-full h-60 rounded border border-gray-300 p-3 font-mono text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label htmlFor="filename" className="text-sm text-gray-600 dark:text-gray-300">File Name:</label>
            <input
                id="filename"
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="exported_data"
                className="w-full sm:w-auto flex-grow rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
        </div>

        {error && (
          <div className="mt-3 text-sm text-red-600">Error: {error}</div>
        )}

        <div className="mt-3 flex gap-2">
          <button
            onClick={handleExport}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Export to Excel
          </button>
          <button
            onClick={clear}
            className="rounded bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
