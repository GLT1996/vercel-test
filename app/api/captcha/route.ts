import { NextResponse } from "next/server";
import svgCaptcha from "svg-captcha";
import { encrypt } from "@/lib/session";
import path from "path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // 防止在 Edge Runtime 运行导致 node_modules 资源/文件系统不可用

export async function GET() {
  try {
    console.log("Generating captcha...");

    // 尝试加载字体，优先使用 public 下的，备选 node_modules
    const possiblePaths = [
        path.join(process.cwd(), 'public', 'fonts', 'Comismsh.ttf'),
        path.resolve(process.cwd(), 'node_modules', 'svg-captcha', 'fonts', 'Comismsh.ttf'),
    ];

    let fontLoaded = false;
    for (const p of possiblePaths) {
        try {
            svgCaptcha.loadFont(p);
            console.log("Font loaded from:", p);
            fontLoaded = true;
            break;
        } catch (e) {
            // Ignore error and try next path
        }
    }

    if (!fontLoaded) {
         console.warn("Failed to load captcha font from explicit paths. Fallback to default (which might fail).");
    }

    // 改用数学验证码：一般不依赖外部字体文件，规避 Comismsh.ttf 读取问题
    const captcha = svgCaptcha.createMathExpr({
      mathMin: 1,
      mathMax: 9,
      mathOperator: "+", // 固定为加法，避免更复杂表达式带来的渲染差异
      noise: 3,
      color: true,
      width: 120,
      height: 40,
      background: "#f0f0f0",
    });
    console.log("Generated captcha text:", captcha.text);
    // Create a JWT with the captcha text, expiring in 5 minutes
    const expires = new Date(Date.now() + 5 * 60 * 1000);
    const token = await encrypt({ captcha: captcha.text, expires });

    const response = new NextResponse(captcha.data, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "no-store, max-age=0",
      },
    });

    // Set the token as an HTTP-only cookie
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

    // 明确提示：如果仍然是 fonts/Comismsh.ttf 的 ENOENT，说明运行环境仍在触发字体文件读取
    return NextResponse.json(
      {
        message: "Internal Server Error",
        error: msg,
        hint:
          msg.includes("Comismsh.ttf") || msg.includes("svg-captcha\\fonts")
            ? "当前环境仍触发 svg-captcha 字体文件读取。建议：1) 确认该路由仅在 Node.js runtime；2) 升级/降级 svg-captcha；3) 换用不依赖本地字体文件的验证码实现（例如生成 PNG/base64 或自行渲染 SVG）。"
            : undefined,
      },
      { status: 500 }
    );
  }
}
