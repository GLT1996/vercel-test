import JsonFormatter from "../components/JsonFormatter";
import JsonStringEscape from "../components/JsonStringEscape";
import JsonToExcel from "@/app/components/JsonToExcel";
import ExcelToJson from "@/app/components/ExcelToJson";

export default function JsonFormatterPage() {
  const navLinks = [
    { id: "json-formatter", title: "JSON Formatter" },
    { id: "json-to-excel", title: "JSON to Excel" },
    { id: "excel-to-json", title: "Excel to JSON" },
    { id: "json-string-escape", title: "JSON String Escape/Unescape" },
  ];

  return (
    <div className="flex min-h-screen w-full justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="w-full max-w-4xl px-4 py-10 md:px-8 lg:px-16">
        <div className="mb-12 p-4 rounded-lg border bg-card text-card-foreground">
          <h2 className="text-lg font-semibold mb-4">快速导航</h2>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {navLinks.map(link => (
              <li key={link.id}>
                <a href={`#${link.id}`} className="text-blue-600 hover:underline dark:text-blue-400">
                  {link.title}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-12">
          <section id="json-formatter" className="scroll-mt-20">
            <JsonFormatter />
          </section>
          <hr className="border-t border-zinc-200 dark:border-zinc-800" />
          <section id="json-to-excel" className="scroll-mt-20">
            <JsonToExcel />
          </section>
          <hr className="border-t border-zinc-200 dark:border-zinc-800" />
          <section id="excel-to-json" className="scroll-mt-20">
            <ExcelToJson />
          </section>
          <hr className="border-t border-zinc-200 dark:border-zinc-800" />
          <section id="json-string-escape" className="scroll-mt-20">
            <JsonStringEscape />
          </section>
        </div>
      </main>
    </div>
  );
}
