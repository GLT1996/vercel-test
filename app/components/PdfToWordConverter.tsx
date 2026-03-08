"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type ApiErrorResponse = {
  message?: string;
  code?: string;
  details?: string;
  debugId?: string;
};

export default function PdfToWordConverter() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [errorDetails, setErrorDetails] = useState("");
  const [debugId, setDebugId] = useState("");
  const [downloading, setDownloading] = useState(false);

  const buttonLabel = useMemo(() => {
    if (downloading) return "Converting...";
    return "Convert and Download";
  }, [downloading]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    setFile(nextFile);
    setError("");
    setErrorDetails("");
    setDebugId("");
    setStatus(nextFile ? `Selected: ${nextFile.name}` : "");
  };

  const handleConvert = async () => {
    if (!file) {
      setError("Please choose a PDF file first.");
      return;
    }

    setDownloading(true);
    setError("");
    setErrorDetails("");
    setDebugId("");
    setStatus("Extracting text from PDF and generating a Word document...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/pdf-to-word", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as ApiErrorResponse | null;
        const message = data?.message || "Conversion failed.";
        const detailParts = [
          data?.code ? `Code: ${data.code}` : "",
          data?.details ? `Details: ${data.details}` : "",
          data?.debugId ? `Debug ID: ${data.debugId}` : "",
        ].filter(Boolean);

        setError(message);
        setErrorDetails(detailParts.join(" | "));
        setDebugId(data?.debugId || "");
        setStatus("");
        return;
      }

      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") || "";
      const matched = disposition.match(/filename\*=UTF-8''([^;]+)/i);
      const fileName = matched
        ? decodeURIComponent(matched[1])
        : `${file.name.replace(/\.pdf$/i, "")}.docx`;
      const responseDebugId = response.headers.get("x-debug-id") || "";

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      setStatus(`Done: ${fileName}`);
      setDebugId(responseDebugId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Conversion failed.";
      setError(message);
      setErrorDetails("");
      setDebugId("");
      setStatus("");
    } finally {
      setDownloading(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setError("");
    setErrorDetails("");
    setDebugId("");
    setStatus("");
    const input = document.getElementById("pdf-to-word-input") as HTMLInputElement | null;
    if (input) input.value = "";
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full flex-col items-center justify-center bg-white px-4 py-10 dark:bg-black md:px-8 lg:px-16">
        <div className="w-full max-w-3xl space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                PDF to Word
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Upload a PDF, extract its text, and download a Word-compatible
                `.docx` file.
              </p>
            </div>
            <Link
              href="/"
              className="text-sm underline text-zinc-700 dark:text-zinc-300"
            >
              Back Home
            </Link>
          </div>

          <div className="rounded border border-black/10 bg-white p-4 dark:border-white/20 dark:bg-neutral-900">
            <div className="space-y-4">
              <input
                id="pdf-to-word-input"
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
              />

              {status ? (
                <div className="rounded border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
                  {status}
                </div>
              ) : null}

              {error ? (
                <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
                  <div className="font-medium">{error}</div>
                  {errorDetails ? (
                    <div className="mt-1 text-xs leading-5 opacity-90">{errorDetails}</div>
                  ) : null}
                </div>
              ) : null}

              {debugId && !error ? (
                <div className="rounded border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
                  Debug ID: {debugId}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleConvert}
                  disabled={downloading}
                  className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {buttonLabel}
                </button>
                <button
                  onClick={handleClear}
                  className="rounded bg-gray-200 px-4 py-2 text-sm text-gray-800 hover:bg-gray-300"
                >
                  Clear
                </button>
              </div>

              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                This converter uses the existing `pdf-parse` dependency, so it
                works best for text-based PDFs. Complex layout, images, and tables
                are not preserved as-is.
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
