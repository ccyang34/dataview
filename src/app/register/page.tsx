"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarChart2, Mail, Lock, ArrowLeft, User } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function RegisterPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        if (password !== confirmPassword) {
            setError("两次输入的密码不一致");
            setIsLoading(false);
            return;
        }

        if (password.length < 6) {
            setError("密码长度至少为 6 位");
            setIsLoading(false);
            return;
        }

        try {
            const { data, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name,
                    },
                },
            });

            if (authError) {
                throw authError;
            }

            if (data.user) {
                // 创建用户配置
                await supabase.from("profiles").insert({
                    id: data.user.id,
                    email: data.user.email,
                    name,
                    role: "user",
                });

                setSuccess(true);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "注册失败，请稍后重试");
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-[var(--background)] flex items-center justify-center px-4">
                <div className="w-full max-w-md">
                    <div className="card p-8 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--secondary)]/10 flex items-center justify-center">
                            <Mail className="w-8 h-8 text-[var(--secondary)]" />
                        </div>
                        <h1 className="text-xl font-semibold mb-2">验证您的邮箱</h1>
                        <p className="text-[var(--muted)] mb-6">
                            我们已向 <strong>{email}</strong> 发送了一封验证邮件，请点击邮件中的链接完成注册。
                        </p>
                        <Link href="/login" className="btn btn-primary">
                            返回登录
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

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

                    <h1 className="text-xl font-semibold text-center mb-2">创建账户</h1>
                    <p className="text-[var(--muted)] text-center text-sm mb-6">
                        注册以开始使用 DataView
                    </p>

                    {/* Register Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="p-3 rounded-lg bg-[var(--danger)]/10 text-[var(--danger)] text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium mb-2">姓名</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted)]" />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="input pl-10"
                                    placeholder="您的姓名"
                                    required
                                />
                            </div>
                        </div>

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
                                    placeholder="至少 6 位密码"
                                    required
                                    minLength={6}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">确认密码</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted)]" />
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="input pl-10"
                                    placeholder="再次输入密码"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full btn btn-primary cursor-pointer disabled:opacity-50"
                        >
                            {isLoading ? "注册中..." : "创建账户"}
                        </button>
                    </form>

                    <p className="text-center text-sm text-[var(--muted)] mt-6">
                        已有账户？{" "}
                        <Link
                            href="/login"
                            className="text-[var(--primary)] hover:underline"
                        >
                            立即登录
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
