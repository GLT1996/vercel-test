"use client";

import { useState } from "react";
import * as XLSX from "xlsx";

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
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          setError("Failed to read file.");
          return;
        }
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);
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
