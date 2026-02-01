"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type User = {
  id: string;
  username: string;
  email: string | null;
  createdAt: string;
};

const TabButton = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    className={`w-1/2 py-2 text-sm font-medium transition-colors ${
      active
        ? "border-b-2 border-black dark:border-white text-black dark:text-white"
        : "text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white"
    }`}
  >
    {children}
  </button>
);

function Login() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else {
        setError("Failed to fetch users.");
      }
    } catch {
      setError("An error occurred while fetching users.");
    }
  };

  useEffect(() => {
    if (showAdminPanel) {
      fetchUsers();
    }
  }, [showAdminPanel]);

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        const res = await fetch(`/api/admin/users/${userId}`, {
          method: "DELETE",
        });
        if (res.ok) {
          setMessage("User deleted successfully.");
          fetchUsers(); // Refresh the user list
        } else {
          const data = await res.json();
          setError(data.message || "Failed to delete user.");
        }
      } catch {
        setError("An error occurred while deleting the user.");
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError("请输入用户名和密码");
      return;
    }

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        if (username === "admin") {
          setIsAdmin(true);
          setShowAdminPanel(true);
        } else {
          router.push(from || "/ai-qa");
          router.refresh();
        }
      } else {
        const data = await res.json();
        setError(data.message || "登录失败");
      }
    } catch {
      setError("发生错误，请稍后再试");
    }
  };

  const handleSendCode = async () => {
    setError("");
    setMessage("");

    if (!email) {
      setError("请输入邮箱地址");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("请输入有效的邮箱地址");
      return;
    }

    try {
      const res = await fetch("/api/auth/send-verification-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("验证码已发送，请检查您的邮箱。");
        setIsCodeSent(true);
      } else {
        setError(data.message || "发送验证码失败");
      }
    } catch {
      setError("发送验证码时出错");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!username || !email || !password || !verificationCode) {
      setError("请填写所有字段");
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password, verificationCode }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("注册成功！现在您可以登录了。");
        setIsRegistering(false);
        setUsername(username);
        setPassword("");
        setError("");
      } else {
        setError(data.message || "注册失败");
      }
    } catch {
      setError("注册时发生错误");
    }
  };

  if (showAdminPanel) {
    return (
      <div className="flex min-h-screen w-full items-start justify-center bg-zinc-50 font-sans dark:bg-black p-4">
        <div className="w-full max-w-4xl p-8 bg-white dark:bg-[#111] rounded-lg shadow-md border border-zinc-200 dark:border-zinc-800">
          <h1 className="text-2xl font-bold text-center mb-6">Admin Panel</h1>
          {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}
          {message && <p className="text-green-500 text-sm text-center mb-4">{message}</p>}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
              <thead className="bg-zinc-50 dark:bg-zinc-800">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Username</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Email</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Created At</th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Delete</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-[#111] divide-y divide-zinc-200 dark:divide-zinc-700">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-zinc-900 dark:text-zinc-100">{user.username}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500 dark:text-zinc-400">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500 dark:text-zinc-400">{new Date(user.createdAt).toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:text-red-900 dark:hover:text-red-400">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={() => setShowAdminPanel(false)} className="mt-6 w-full py-2 px-4 bg-zinc-200 text-black dark:bg-zinc-800 dark:text-white rounded-md hover:opacity-90">
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <div className="w-full max-w-md p-8 bg-white dark:bg-[#111] rounded-lg shadow-md border border-zinc-200 dark:border-zinc-800">
        <div className="flex mb-6">
          <TabButton
            active={!isRegistering}
            onClick={() => setIsRegistering(false)}
          >
            登录
          </TabButton>
          <TabButton
            active={isRegistering}
            onClick={() => setIsRegistering(true)}
          >
            注册
          </TabButton>
        </div>

        {isRegistering ? (
          // Registration Form
          <form onSubmit={handleRegister} className="space-y-4">
            <h1 className="text-xl font-bold text-center text-zinc-900 dark:text-zinc-100">
              创建账户
            </h1>
            <div>
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                用户名
              </label>
              <input
                type="text"
                placeholder="设置用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="mt-1 w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                邮箱
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="输入邮箱"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700"
                />
                <button
                  type="button"
                  onClick={handleSendCode}
                  className="px-4 py-2 border rounded-md text-sm whitespace-nowrap bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                >
                  {isCodeSent ? "重新发送" : "发送验证码"}
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                验证码
              </label>
              <input
                type="text"
                placeholder="输入6位验证码"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                required
                className="mt-1 w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                密码
              </label>
              <input
                type="password"
                placeholder="设置密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700"
              />
            </div>
            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}
            {message && (
              <p className="text-green-500 text-sm text-center">{message}</p>
            )}
            <button
              type="submit"
              className="w-full py-2 px-4 bg-black text-white dark:bg-white dark:text-black rounded-md hover:opacity-90 transition-opacity font-medium"
            >
              注册
            </button>
          </form>
        ) : (
          // Login Form
          <form onSubmit={handleLogin} className="space-y-4">
            <h1 className="text-xl font-bold text-center text-zinc-900 dark:text-zinc-100">
              访问受限
            </h1>
            <p className="mb-4 text-center text-zinc-500 dark:text-zinc-400">
              请输入用户名和密码以继续
            </p>
            <div>
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                用户名
              </label>
              <input
                type="text"
                placeholder="请输入用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                密码
              </label>
              <input
                type="password"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700"
              />
            </div>
            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}
            <button
              type="submit"
              className="w-full py-2 px-4 bg-black text-white dark:bg-white dark:text-black rounded-md hover:opacity-90 transition-opacity font-medium"
            >
              登录
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Login />
    </Suspense>
  );
}
