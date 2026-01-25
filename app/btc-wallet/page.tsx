import BtcWalletGenerator from '../components/BtcWalletGenerator';

export default function BtcWalletPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-zinc-50 font-sans dark:bg-black">
        <main className="flex min-h-screen w-full flex-col items-center justify-center py-10 px-4 bg-white dark:bg-black md:px-8 lg:px-16">
            <h1 className="text-2xl font-bold mb-4">BTC Wallet Generator</h1>
            <BtcWalletGenerator />
        </main>
    </div>
  );
}
