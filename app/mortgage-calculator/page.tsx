import MortgageCalculator from "../components/MortgageCalculator";
import PositionCalculator from "../components/PositionCalculator";

export default function MortgageCalculatorPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full flex-col justify-start py-10 px-4 bg-white dark:bg-black md:px-8 lg:px-16">
        <MortgageCalculator />
        <div className="my-6 w-full border-t border-black/10 dark:border-white/20" />
        <PositionCalculator />
      </main>
    </div>
  );
}

