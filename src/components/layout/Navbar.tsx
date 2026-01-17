"use client";

import Link from "next/link";
import { useState } from "react";
import { BarChart2, Menu, X, Moon, Sun, User, LogIn } from "lucide-react";

interface NavbarProps {
    user?: { name: string; email: string } | null;
}

export function Navbar({ user }: NavbarProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isDark, setIsDark] = useState(false);

    const toggleTheme = () => {
        setIsDark(!isDark);
        document.documentElement.classList.toggle("dark");
    };

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--card)]/80 backdrop-blur-lg border-b border-[var(--border)]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 cursor-pointer">
                        <BarChart2 className="w-6 h-6 text-[var(--primary)]" />
                        <span className="font-semibold text-lg">DataView</span>
                    </Link>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center gap-6">
                        <Link
                            href="/dashboard"
                            className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                        >
                            仪表板
                        </Link>
                        <Link
                            href="/charts"
                            className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                        >
                            图表
                        </Link>
                        <Link
                            href="/analysis/crush-margin"
                            className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                        >
                            大豆榨利分析
                        </Link>

                        <Link
                            href="/embed"
                            className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                        >
                            嵌入
                        </Link>
                        <Link
                            href="/warehouse"
                            className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                        >
                            数据仓库
                        </Link>
                    </div>

                    {/* Right Actions */}
                    <div className="hidden md:flex items-center gap-3">
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-lg hover:bg-[var(--card-hover)] transition-colors cursor-pointer"
                            aria-label="切换主题"
                        >
                            {isDark ? (
                                <Sun className="w-5 h-5" />
                            ) : (
                                <Moon className="w-5 h-5" />
                            )}
                        </button>

                        {user ? (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--card-hover)]">
                                <User className="w-4 h-4" />
                                <span className="text-sm">{user.name}</span>
                            </div>
                        ) : (
                            <Link
                                href="/login"
                                className="btn btn-primary text-sm cursor-pointer"
                            >
                                <LogIn className="w-4 h-4" />
                                登录
                            </Link>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="md:hidden p-2 rounded-lg hover:bg-[var(--card-hover)] cursor-pointer"
                    >
                        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {
                isOpen && (
                    <div className="md:hidden bg-[var(--card)] border-b border-[var(--border)] animate-in">
                        <div className="px-4 py-4 space-y-3">
                            <Link
                                href="/dashboard"
                                className="block py-2 text-[var(--muted)] hover:text-[var(--foreground)]"
                                onClick={() => setIsOpen(false)}
                            >
                                仪表板
                            </Link>
                            <Link
                                href="/charts"
                                className="block py-2 text-[var(--muted)] hover:text-[var(--foreground)]"
                                onClick={() => setIsOpen(false)}
                            >
                                图表
                            </Link>
                            <Link
                                href="/analysis/crush-margin"
                                className="block py-2 text-[var(--muted)] hover:text-[var(--foreground)]"
                                onClick={() => setIsOpen(false)}
                            >
                                大豆榨利分析
                            </Link>
                            <Link
                                href="/embed"
                                className="block py-2 text-[var(--muted)] hover:text-[var(--foreground)]"
                                onClick={() => setIsOpen(false)}
                            >
                                嵌入
                            </Link>
                            <Link
                                href="/warehouse"
                                className="block py-2 text-[var(--muted)] hover:text-[var(--foreground)]"
                                onClick={() => setIsOpen(false)}
                            >
                                数据仓库
                            </Link>
                            <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between">
                                <button
                                    onClick={toggleTheme}
                                    className="flex items-center gap-2 py-2 cursor-pointer"
                                >
                                    {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                                    <span>{isDark ? "浅色模式" : "深色模式"}</span>
                                </button>
                                {!user && (
                                    <Link href="/login" className="btn btn-primary text-sm">
                                        登录
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
        </nav >
    );
}
