import JsonFormatter from "../components/JsonFormatter";
import JsonStringEscape from "../components/JsonStringEscape";
import JsonToExcel from "@/app/components/JsonToExcel";

export default function JsonFormatterPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full flex-col justify-start py-10 px-4 bg-white dark:bg-black md:px-8 lg:px-16">
        <div className="grid w-full grid-cols-1 gap-10 md:grid-cols-2 md:items-start">
          <JsonFormatter />
          <JsonStringEscape />
          <JsonToExcel/>
        </div>
      </main>
    </div>
  );
}
