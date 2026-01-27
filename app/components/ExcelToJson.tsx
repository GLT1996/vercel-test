"use client";

import { useState } from "react";
import type { CellValue } from "exceljs";

export default function ExcelToJson() {
  const [jsonOutput, setJsonOutput] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    setJsonOutput("");
    setFileName("");

    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const ExcelJS = await import("exceljs");
        const data = e.target?.result;
        if (!data) {
          setError("Failed to read file.");
          return;
        }

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(data as ArrayBuffer);

        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
          setError("No worksheets found in the Excel file.");
          return;
        }

        // Convert worksheet rows to JSON.
        // Assumes the first row is the header.
        const headerRow = worksheet.getRow(1);
        const headerValues = Array.isArray(headerRow.values) ? headerRow.values : [];
        const headers = (headerValues as CellValue[])
          .slice(1)
          .map((v: CellValue) => (v == null ? "" : String(v)))
          .map((h: string) => h.trim());

        const json: Record<string, string>[] = [];
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;
          const rowValues = Array.isArray(row.values) ? row.values : [];
          const values = (rowValues as CellValue[]).slice(1);

          // Skip completely empty rows
          const hasAnyValue = values.some((v: CellValue) => v != null && String(v).trim() !== "");
          if (!hasAnyValue) return;

          const obj: Record<string, string> = {};
          for (let i = 0; i < headers.length; i++) {
            const key = headers[i] || `col_${i + 1}`;
            const cell = values[i];
            obj[key] = cell == null ? "" : String(cell);
          }
          json.push(obj);
        });

        setJsonOutput(JSON.stringify(json, null, 2));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "An unknown error occurred.";
        setError(`Failed to process Excel file: ${msg}`);
      }
    };
    reader.onerror = () => {
        setError("Error reading file.");
    }
    reader.readAsArrayBuffer(file);
  };

  const clear = () => {
    setJsonOutput("");
    setError("");
    setFileName("");
    // Also reset the file input
    const input = document.getElementById('file-input') as HTMLInputElement;
    if (input) {
        input.value = "";
    }
  };

  return (
    <div className="w-full max-w-3xl space-y-4 mx-auto">
      <div>
        <h2 className="text-xl font-semibold">Excel to JSON Converter</h2>
        <p className="text-sm text-gray-500">
          Import an Excel (.xlsx) file to convert it into a JSON array.
        </p>
      </div>

      <div className="rounded border border-black/10 dark:border-white/20 bg-white dark:bg-neutral-900 p-4 space-y-3">
        <div className="flex items-center gap-2">
            <input
                id="file-input"
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
        </div>
        
        {fileName && (
            <div className="text-sm text-gray-600 dark:text-gray-300">
                Processed file: <span className="font-medium">{fileName}</span>
            </div>
        )}

        <textarea
          value={jsonOutput}
          readOnly
          placeholder="JSON output will appear here..."
          className="w-full h-60 rounded border border-gray-300 p-3 font-mono text-sm bg-gray-50 outline-none"
        />

        {error && (
          <div className="mt-3 text-sm text-red-600">Error: {error}</div>
        )}

        <div className="mt-3 flex gap-2">
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
