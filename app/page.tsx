import Link from "next/link";
import { prisma } from "../lib/prisma";

export default async function Home() {
  const users = await prisma.user.findMany({
    select: { email: true },
    orderBy: { id: "asc" },
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <Link
            href="/login"
            className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[158px]"
          >
            Login
          </Link>

          <div className="mt-8 w-full">
            <h2 className="text-lg font-semibold mb-2">Registered Users</h2>
            {users.length === 0 ? (
              <p className="text-sm text-gray-500">No users yet.</p>
            ) : (
              <ul className="list-disc pl-5 space-y-1">
                {users.map((u) => (
                  <li key={u.email} className="text-sm">
                    {u.email}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
