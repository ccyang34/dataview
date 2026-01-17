"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarChart2, Mail, Lock, ArrowLeft, Github } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) {
                throw authError;
            }

            if (data.user) {
                router.push("/");
                router.refresh();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "登录失败，请检查邮箱和密码");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGithubLogin = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: "github",
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            });

            if (error) {
                throw error;
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "GitHub 登录失败");
        }
    };

    return (
        <div className="min-h-screen bg-[var(--background)] flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                {/* Back Link */}
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-[var(--muted)] hover:text-[var(--foreground)] mb-8 cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4" />
                    返回首页
                </Link>

                {/* Card */}
                <div className="card p-8">
                    {/* Logo */}
                    <div className="flex items-center justify-center gap-2 mb-6">
                        <BarChart2 className="w-8 h-8 text-[var(--primary)]" />
                        <span className="text-2xl font-semibold">DataView</span>
                    </div>

                    <h1 className="text-xl font-semibold text-center mb-2">欢迎回来</h1>
                    <p className="text-[var(--muted)] text-center text-sm mb-6">
                        登录您的账户以继续
                    </p>

                    {/* GitHub Login */}
                    <button
                        onClick={handleGithubLogin}
                        className="w-full btn btn-secondary mb-4 cursor-pointer"
                    >
                        <Github className="w-5 h-5" />
                        使用 GitHub 登录
                    </button>

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-[var(--border)]"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-[var(--card)] text-[var(--muted)]">
                                或使用邮箱登录
                            </span>
                        </div>
                    </div>

                    {/* Email Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="p-3 rounded-lg bg-[var(--danger)]/10 text-[var(--danger)] text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium mb-2">邮箱</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted)]" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="input pl-10"
                                    placeholder="your@email.com"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">密码</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted)]" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input pl-10"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="rounded cursor-pointer" />
                                <span>记住我</span>
                            </label>
                            <Link
                                href="/forgot-password"
                                className="text-[var(--primary)] hover:underline"
                            >
                                忘记密码？
                            </Link>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full btn btn-primary cursor-pointer disabled:opacity-50"
                        >
                            {isLoading ? "登录中..." : "登录"}
                        </button>
                    </form>

                    <p className="text-center text-sm text-[var(--muted)] mt-6">
                        还没有账户？{" "}
                        <Link
                            href="/register"
                            className="text-[var(--primary)] hover:underline"
                        >
                            立即注册
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
