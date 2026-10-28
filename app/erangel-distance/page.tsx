import ErangelDistanceTool from "../components/ErangelDistanceTool";

export default function ErangelDistancePage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full flex-col justify-start py-10 px-4 bg-white dark:bg-black md:px-8 lg:px-16">
        <div className="mx-auto w-full max-w-6xl space-y-4">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
            PUBG 艾伦格地图测距
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            在高清艾伦格地图上点击两个位置，测量直线距离；内置 1km
            网格与迫击炮 121–700 米射程辅助。
          </p>
          <ErangelDistanceTool />
        </div>
      </main>
    </div>
  );
}
