import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Document, Packer, Paragraph, TextRun } from "docx";

export const runtime = "nodejs";

class MinimalDOMMatrix {
  a = 1;
  b = 0;
  c = 0;
  d = 1;
  e = 0;
  f = 0;

  constructor(init?: number[]) {
    if (Array.isArray(init) && init.length >= 6) {
      [this.a, this.b, this.c, this.d, this.e, this.f] = init;
    }
  }

  multiplySelf(other: { a: number; b: number; c: number; d: number; e: number; f: number }) {
    const a = this.a * other.a + this.c * other.b;
    const b = this.b * other.a + this.d * other.b;
    const c = this.a * other.c + this.c * other.d;
    const d = this.b * other.c + this.d * other.d;
    const e = this.a * other.e + this.c * other.f + this.e;
    const f = this.b * other.e + this.d * other.f + this.f;
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
    this.e = e;
    this.f = f;
    return this;
  }

  preMultiplySelf(other: { a: number; b: number; c: number; d: number; e: number; f: number }) {
    const matrix = new MinimalDOMMatrix([other.a, other.b, other.c, other.d, other.e, other.f]);
    matrix.multiplySelf(this);
    this.a = matrix.a;
    this.b = matrix.b;
    this.c = matrix.c;
    this.d = matrix.d;
    this.e = matrix.e;
    this.f = matrix.f;
    return this;
  }

  translate(tx = 0, ty = 0) {
    return this.multiplySelf(new MinimalDOMMatrix([1, 0, 0, 1, tx, ty]));
  }

  scale(scaleX = 1, scaleY = scaleX) {
    return this.multiplySelf(new MinimalDOMMatrix([scaleX, 0, 0, scaleY, 0, 0]));
  }

  invertSelf() {
    const det = this.a * this.d - this.b * this.c;
    if (!det) {
      this.a = 1;
      this.b = 0;
      this.c = 0;
      this.d = 1;
      this.e = 0;
      this.f = 0;
      return this;
    }

    const a = this.d / det;
    const b = -this.b / det;
    const c = -this.c / det;
    const d = this.a / det;
    const e = (this.c * this.f - this.d * this.e) / det;
    const f = (this.b * this.e - this.a * this.f) / det;
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
    this.e = e;
    this.f = f;
    return this;
  }
}

if (typeof globalThis.DOMMatrix === "undefined") {
  globalThis.DOMMatrix = MinimalDOMMatrix as typeof globalThis.DOMMatrix;
}

// pdf-parse/pdf.js needs a dedicated worker script for text extraction.
// In Next.js dev, bundling can make the library infer a transient
// `.next/dev/server/chunks/.../pdf.worker.mjs` path, which may not exist at
// runtime. Pinning the worker to the real file inside node_modules avoids that
// unstable auto-resolution path in both dev and build output.
const pdfWorkerPath = path.join(
  process.cwd(),
  "node_modules",
  "pdf-parse",
  "dist",
  "worker",
  "pdf.worker.mjs"
);

type ErrorCode =
  | "NO_FILE"
  | "INVALID_FILE_TYPE"
  | "EMPTY_FILE"
  | "NO_TEXT_EXTRACTED"
  | "PDF_PARSE_FAILED"
  | "DOCX_BUILD_FAILED"
  | "UNKNOWN_ERROR";

class ConversionError extends Error {
  code: ErrorCode;
  details?: string;
  status: number;

  constructor(code: ErrorCode, message: string, status = 400, details?: string) {
    super(message);
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

function sanitizeBaseName(fileName: string) {
  const withoutExt = fileName.replace(/\.pdf$/i, "") || "converted";
  return withoutExt.replace(/[^\w\u4e00-\u9fa5.-]+/g, "_");
}

function buildParagraphs(text: string) {
  const normalized = text.replace(/\r\n/g, "\n");
  const blocks = normalized
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (blocks.length === 0) {
    throw new ConversionError(
      "NO_TEXT_EXTRACTED",
      "No extractable text was found in this PDF.",
      422,
      "pdf-parse returned empty text output."
    );
  }

  return blocks.map((block) => {
    const lines = block.split("\n");
    const children: TextRun[] = [];

    lines.forEach((line, index) => {
      if (index > 0) children.push(new TextRun({ break: 1 }));
      children.push(new TextRun(line));
    });

    return new Paragraph({
      children,
      spacing: { after: 220 },
    });
  });
}

async function parsePdfText(buffer: Buffer) {
  const { PDFParse } = await import("pdf-parse");
  PDFParse.setWorker(pathToFileURL(pdfWorkerPath).href);
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    return result.text || "";
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    throw new ConversionError(
      "PDF_PARSE_FAILED",
      "Failed to read text from the PDF.",
      422,
      details
    );
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

async function buildDocxBuffer(fileName: string, text: string) {
  try {
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: buildParagraphs(text),
        },
      ],
    });

    return await Packer.toBuffer(doc);
  } catch (error) {
    if (error instanceof ConversionError) throw error;

    const details = error instanceof Error ? error.message : String(error);
    throw new ConversionError(
      "DOCX_BUILD_FAILED",
      "Failed to generate the Word document.",
      500,
      `${fileName}: ${details}`
    );
  }
}

function logInfo(debugId: string, stage: string, extra?: Record<string, unknown>) {
  console.info("[pdf-to-word]", { debugId, stage, ...extra });
}

function logError(debugId: string, stage: string, error: unknown, extra?: Record<string, unknown>) {
  const details = error instanceof Error ? error.message : String(error);
  console.error("[pdf-to-word]", { debugId, stage, details, ...extra, error });
}

export async function POST(request: NextRequest) {
  const debugId = crypto.randomUUID();

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new ConversionError("NO_FILE", "Please upload a PDF file.", 400);
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      throw new ConversionError("INVALID_FILE_TYPE", "Only PDF files are supported.", 400);
    }

    if (file.size === 0) {
      throw new ConversionError("EMPTY_FILE", "The uploaded PDF file is empty.", 400);
    }

    logInfo(debugId, "request_received", {
      fileName: file.name,
      fileSize: file.size,
      contentType: file.type || "unknown",
    });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    logInfo(debugId, "pdf_parse_started");
    const text = await parsePdfText(buffer);
    logInfo(debugId, "pdf_parse_completed", { extractedChars: text.length });

    logInfo(debugId, "docx_build_started");
    const docxBuffer = await buildDocxBuffer(file.name, text);
    const outputName = `${sanitizeBaseName(file.name)}.docx`;
    logInfo(debugId, "docx_build_completed", {
      outputName,
      outputBytes: docxBuffer.length,
    });

    return new NextResponse(new Uint8Array(docxBuffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(outputName)}`,
        "X-Debug-Id": debugId,
      },
    });
  } catch (error) {
    const known = error instanceof ConversionError ? error : null;
    const message = known?.message || "PDF conversion failed due to an unexpected error.";
    const status = known?.status || 500;
    const code = known?.code || "UNKNOWN_ERROR";
    const details =
      known?.details ||
      (error instanceof Error ? error.message : "Unexpected non-Error thrown.");

    logError(debugId, "request_failed", error, { code, status });

    return NextResponse.json(
      {
        message,
        code,
        details,
        debugId,
      },
      { status }
    );
  }
}
