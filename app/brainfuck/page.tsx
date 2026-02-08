import { BrainfuckInterpreter } from '../components/BrainfuckInterpreter';

export default function BrainfuckPage() {
  return (
    <div className="flex min-h-screen w-full items-start justify-center bg-zinc-50 font-sans dark:bg-black p-4">
      <main className="w-full max-w-4xl">
        <BrainfuckInterpreter />
      </main>
    </div>
  );
}
