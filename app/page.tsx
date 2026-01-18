import Link from "next/link";

export default async function Home() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full flex-col items-center justify-center py-10 px-4 bg-white dark:bg-black md:px-8 lg:px-16">
        <div className="flex flex-col items-center gap-6 text-center">
          <Link
              href="/json-formatter"
              className="flex h-12 w-full max-w-xs items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:max-w-xs"
          >
            JSON序列化格式化工具
          </Link>

          <Link
              href="/base64"
              className="flex h-12 w-full max-w-xs items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:max-w-xs"
          >
            Base64编码解码工具
          </Link>

          <Link
              href="/text-diff"
              className="flex h-12 w-full max-w-xs items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:max-w-xs"
          >
            文本差异对比工具
          </Link>
          <Link
              href="/time-converter"
              className="flex h-12 w-full max-w-xs items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:max-w-xs"
          >
            时间戳转换工具
          </Link>
          <Link
              href="/log-calculator"
              className="flex h-12 w-full max-w-xs items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:max-w-xs"
          >
            对数计算器（logₐ(b)）
          </Link>
          <Link
              href="/send-email"
              className="flex h-12 w-full max-w-xs items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:max-w-xs"
          >
            发邮件工具（Gmail）
          </Link>
        </div>
      </main>
    </div>
  );
}
