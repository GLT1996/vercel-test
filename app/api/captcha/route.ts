import { NextResponse } from "next/server";
import { encrypt } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function generateMathCaptchaSvg(opts?: {
  width?: number;
  height?: number;
  background?: string;
  noise?: number;
}) {
  const width = opts?.width ?? 120;
  const height = opts?.height ?? 40;
  const background = opts?.background ?? "#f0f0f0";
  const noise = opts?.noise ?? 6;

  const a = randomInt(1, 9);
  const b = randomInt(1, 9);
  const text = String(a + b);
  const equation = `${a} + ${b} = ?`;

  // 简单干扰线
  const lines: string[] = [];
  for (let i = 0; i < noise; i++) {
    const x1 = randomInt(0, width);
    const y1 = randomInt(0, height);
    const x2 = randomInt(0, width);
    const y2 = randomInt(0, height);
    const stroke = `rgba(${randomInt(0, 120)},${randomInt(0, 120)},${randomInt(
      0,
      120
    )},0.35)`;
    lines.push(
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="1"/>`
    );
  }

  // 重要：使用系统字体，不读取任何本地 .ttf 文件
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="${escapeXml(background)}" />
  ${lines.join("\n  ")}
  <text x="10" y="26"
        font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial"
        font-size="18" font-weight="700" fill="#111">
    ${escapeXml(equation)}
  </text>
</svg>`;

  return { text, data: svg };
}

export async function GET() {
  try {
    const captcha = generateMathCaptchaSvg({
      width: 140,
      height: 40,
      background: "#f0f0f0",
      noise: 6,
    });

    const expires = new Date(Date.now() + 5 * 60 * 1000);
    const token = await encrypt({ captcha: captcha.text, expires });

    const response = new NextResponse(captcha.data, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "no-store, max-age=0",
      },
    });

    response.cookies.set("captcha_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      expires,
      path: "/",
      sameSite: "strict",
    });

    return response;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error generating captcha:", error);

    return NextResponse.json(
      {
        message: "Internal Server Error",
        error: msg,
      },
      { status: 500 }
    );
  }
}
