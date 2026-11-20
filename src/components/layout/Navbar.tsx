"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BarChart2, Menu, X, Moon, Sun, User, LogIn } from "lucide-react";

interface NavbarProps {
    user?: { name: string; email: string } | null;
}

const NAV_ITEMS = [
    { href: "/analysis/crush-margin", label: "大豆榨利分析" },
    { href: "/analysis/soybean-oil-y01", label: "豆油主力分析" },
    { href: "/analysis/palm-oil-p01", label: "棕榈油主力分析" },
    { href: "/database", label: "研究数据库" },
    { href: "/analysis/oil-shape-research", label: "油脂形态研究" },
];

export function Navbar({ user }: NavbarProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isDark, setIsDark] = useState(false);
    const pathname = usePathname() || "";

    const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

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
                    <div className="hidden md:flex items-center gap-6 h-full">
                        {NAV_ITEMS.map(item => {
                            const active = isActive(item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    aria-current={active ? "page" : undefined}
                                    className={`relative flex items-center h-full text-sm whitespace-nowrap transition-colors cursor-pointer ${active
                                        ? "text-[var(--primary)] font-semibold after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-[var(--primary)]"
                                        : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
                                >
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>

                    {/* Right Actions */}
                    <div className="hidden md:flex items-center gap-3">
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-lg hover:bg-[var(--card-hover)] transition-colors cursor-pointer"
                            aria-label="切换主题"
                        >
                            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>

                        {user ? (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--card-hover)]">
                                <User className="w-4 h-4" />
                                <span className="text-sm">{user.name}</span>
                            </div>
                        ) : (
                            <Link href="/login" className="btn btn-primary text-sm cursor-pointer">
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
            {isOpen && (
                <div className="md:hidden bg-[var(--card)] border-b border-[var(--border)] animate-in">
                    <div className="px-4 py-4 space-y-2">
                        {NAV_ITEMS.map(item => {
                            const active = isActive(item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    aria-current={active ? "page" : undefined}
                                    onClick={() => setIsOpen(false)}
                                    className={`block py-2 pl-3 pr-2 rounded-r-md border-l-2 transition-colors ${active
                                        ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)] font-semibold"
                                        : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card-hover)]"}`}
                                >
                                    {item.label}
                                </Link>
                            );
                        })}
                        <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between">
                            <button onClick={toggleTheme} className="flex items-center gap-2 py-2 cursor-pointer">
                                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                                <span>{isDark ? "浅色模式" : "深色模式"}</span>
                            </button>
                            {!user && <Link href="/login" className="btn btn-primary text-sm">登录</Link>}
                        </div>
                    </div>
                </div>
            )}
        </nav >
    );
}
