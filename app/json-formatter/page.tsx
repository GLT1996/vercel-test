import JsonFormatter from "../components/JsonFormatter";

export default function JsonFormatterPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full flex-col justify-start py-10 px-4 bg-white dark:bg-black md:px-8 lg:px-16">
        <JsonFormatter />
      </main>
    </div>
  );
}
