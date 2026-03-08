const fs = require("fs");
const path = require("path");

const outDir = path.join(process.cwd(), "artifacts");
const outFile = path.join(outDir, "app-summary-one-page.pdf");

const page = {
  width: 595,
  height: 842,
  margin: 42,
};

function escapePdfText(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapText(text, maxChars) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines;
}

const sections = [
  {
    type: "title",
    text: "App Summary",
  },
  {
    type: "meta",
    text: "Repo: my-nextjs-app",
  },
  {
    type: "heading",
    text: "What It Is",
  },
  {
    type: "body",
    lines: wrapText(
      "A Next.js 16 web app that bundles browser-based utilities with a few server-backed workflows, including AI Q&A, email sending, user auth, and a real-time chat room.",
      88
    ),
  },
  {
    type: "body",
    lines: wrapText(
      "The repo reads like an internal toolbox or personal utility hub rather than a single-purpose product.",
      88
    ),
  },
  {
    type: "heading",
    text: "Who It Is For",
  },
  {
    type: "body",
    lines: wrapText(
      "Primary persona: developers or technical operators who need a lightweight web hub for data/text utilities, quick internal workflows, and a protected AI knowledge base. Persona is inferred from the route set and admin/auth features.",
      88
    ),
  },
  {
    type: "heading",
    text: "What It Does",
  },
  {
    type: "bullet",
    lines: wrapText("Provides utility pages for JSON formatting, Base64, text diff, time conversion, data filtering, EML viewing, Brainfuck, and calculators.", 82),
  },
  {
    type: "bullet",
    lines: wrapText("Supports AI Q&A over uploaded TXT, MD, and PDF files using chunking, embeddings, retrieval, and an LLM-backed answer route.", 82),
  },
  {
    type: "bullet",
    lines: wrapText("Offers login and registration flows with email verification, captcha, JWT cookie sessions, and admin-only user management.", 82),
  },
  {
    type: "bullet",
    lines: wrapText("Includes a token-based real-time chat room backed by persisted messages plus Server-Sent Events for live updates.", 82),
  },
  {
    type: "bullet",
    lines: wrapText("Sends email through Gmail SMTP with validation, attachment handling, and in-memory rate limiting.", 82),
  },
  {
    type: "bullet",
    lines: wrapText("Runs a daily mail cron endpoint that appends a BTC snapshot and chart when configured.", 82),
  },
  {
    type: "heading",
    text: "How It Works",
  },
  {
    type: "body",
    lines: wrapText(
      "App Router pages under app/* render the UI and call route handlers under app/api/*. Middleware protects /ai-qa and /api/ai-qa by validating a JWT session cookie. Route handlers use Prisma to read/write Postgres tables for users, verification tokens, chat messages, and document chunks.",
      88
    ),
  },
  {
    type: "body",
    lines: wrapText(
      "AI ingest flow: upload files -> parse PDF or text -> split into chunks -> generate embeddings with Google or OpenAI -> store vectors in DocumentChunk. AI chat flow: embed query -> score stored chunks with cosine similarity -> build context prompt -> call Gemini or GPT model. Chat flow: POST message -> save via Prisma -> notify in-process SSE bus -> /api/chat/stream pushes history and live events. Mail flow: UI or cron route -> validation and rate limit -> Nodemailer Gmail transport.",
      88
    ),
  },
  {
    type: "heading",
    text: "How To Run",
  },
  {
    type: "bullet",
    lines: wrapText("Create a .env with at least PRISMA_DATABASE_URL and a 32+ character JWT_SECRET. Add GMAIL_USER/GMAIL_APP_PASSWORD and GOOGLE_API_KEY or OPENAI_API_KEY only if using mail or AI features.", 82),
  },
  {
    type: "bullet",
    lines: wrapText("Install dependencies: npm install", 82),
  },
  {
    type: "bullet",
    lines: wrapText("Initialize Prisma for the local database: npm run prisma:generate and npm run prisma:migrate", 82),
  },
  {
    type: "bullet",
    lines: wrapText("Start the app: npm run dev, then open http://localhost:3000", 82),
  },
  {
    type: "body",
    lines: wrapText("Not found in repo: a single canonical env example file or seed script.", 88),
  },
];

let y = page.height - page.margin;
const stream = [];

function writeLine(text, x, fontSize, fontName) {
  stream.push(`BT`);
  stream.push(`/${fontName} ${fontSize} Tf`);
  stream.push(`1 0 0 1 ${x} ${y} Tm`);
  stream.push(`(${escapePdfText(text)}) Tj`);
  stream.push(`ET`);
}

for (const section of sections) {
  if (section.type === "title") {
    writeLine(section.text, page.margin, 22, "F1");
    y -= 24;
    continue;
  }

  if (section.type === "meta") {
    writeLine(section.text, page.margin, 10, "F3");
    y -= 22;
    continue;
  }

  if (section.type === "heading") {
    writeLine(section.text, page.margin, 13, "F2");
    y -= 16;
    continue;
  }

  if (section.type === "body") {
    for (const line of section.lines) {
      writeLine(line, page.margin, 10.5, "F1");
      y -= 13;
    }
    y -= 5;
    continue;
  }

  if (section.type === "bullet") {
    const [first, ...rest] = section.lines;
    writeLine(`- ${first}`, page.margin, 10.5, "F1");
    y -= 13;
    for (const line of rest) {
      writeLine(line, page.margin + 12, 10.5, "F1");
      y -= 13;
    }
    y -= 2;
  }
}

if (y < page.margin) {
  throw new Error(`Content overflowed the page. Final y=${y}`);
}

const content = stream.join("\n");
const objects = [];

function addObject(body) {
  objects.push(body);
  return objects.length;
}

const font1 = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
const font2 = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
const font3 = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>");
const contentObj = addObject(`<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}\nendstream`);
const pageObj = addObject(
  `<< /Type /Page /Parent 6 0 R /MediaBox [0 0 ${page.width} ${page.height}] /Resources << /Font << /F1 ${font1} 0 R /F2 ${font2} 0 R /F3 ${font3} 0 R >> >> /Contents ${contentObj} 0 R >>`
);
const pagesObj = addObject(`<< /Type /Pages /Kids [${pageObj} 0 R] /Count 1 >>`);
const catalogObj = addObject(`<< /Type /Catalog /Pages ${pagesObj} 0 R >>`);

let pdf = "%PDF-1.4\n";
const offsets = [0];

for (let i = 0; i < objects.length; i++) {
  offsets.push(Buffer.byteLength(pdf, "utf8"));
  pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
}

const xrefStart = Buffer.byteLength(pdf, "utf8");
pdf += `xref\n0 ${objects.length + 1}\n`;
pdf += "0000000000 65535 f \n";

for (let i = 1; i < offsets.length; i++) {
  pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
}

pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogObj} 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, pdf, "utf8");

console.log(outFile);
