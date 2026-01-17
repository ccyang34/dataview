"use client";

import React, { useState, useEffect } from "react";
import { Database, Table, Eye, Search, Lock, ChevronRight, AlertCircle, Loader2 } from "lucide-react";

interface DbItem {
    name: string;
    type: string;
    schema: string;
}

interface TableData {
    columns: string[];
    data: any[];
}

export default function WarehousePage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const [items, setItems] = useState<DbItem[]>([]);
    const [filteredItems, setFilteredItems] = useState<DbItem[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeItem, setActiveItem] = useState<DbItem | null>(null);
    const [tableData, setTableData] = useState<TableData | null>(null);
    const [isLoadingItems, setIsLoadingItems] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(false);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === "c") {
            setIsAuthenticated(true);
            setError("");
            fetchItems();
        } else {
            setError("密码错误");
        }
    };

    const fetchItems = async () => {
        setIsLoadingItems(true);
        try {
            const res = await fetch("/api/warehouse/tables");
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setItems(data);
            setFilteredItems(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoadingItems(false);
        }
    };

    const fetchTableData = async (item: DbItem) => {
        setActiveItem(item);
        setIsLoadingData(true);
        try {
            const res = await fetch(`/api/warehouse/data?table=${item.name}`);
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setTableData(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoadingData(false);
        }
    };

    useEffect(() => {
        const filtered = items.filter(item =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredItems(filtered);
    }, [searchQuery, items]);

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-radial-gradient">
                <div className="w-full max-w-md p-8 glass-morphism animate-in fade-in zoom-in duration-300">
                    <div className="flex flex-col items-center text-center mb-8">
                        <div className="p-4 bg-[var(--primary)]/10 rounded-2xl mb-4">
                            <Lock className="w-8 h-8 text-[var(--primary)]" />
                        </div>
                        <h1 className="text-2xl font-bold mb-2">数据仓库预览</h1>
                        <p className="text-[var(--muted)]">请输入访问密码以继续</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-[var(--card)] border border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all"
                                placeholder="访问密码"
                                autoFocus
                            />
                        </div>
                        {error && (
                            <div className="flex items-center gap-2 text-red-500 text-sm p-3 bg-red-500/10 rounded-lg">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}
                        <button
                            type="submit"
                            className="w-full py-3 rounded-xl bg-[var(--primary)] text-white font-semibold hover:opacity-90 transition-all shadow-lg active:scale-[0.98]"
                        >
                            验证并进入
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="pt-20 min-h-screen px-4 md:px-8 max-w-[1600px] mx-auto pb-8">
            <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-6 items-start">

                {/* Sidebar */}
                <aside className="glass-morphism h-[calc(100vh-120px)] flex flex-col p-4 overflow-hidden">
                    <div className="flex items-center gap-2 mb-6 px-2">
                        <Database className="w-6 h-6 text-[var(--primary)]" />
                        <h2 className="text-lg font-bold">浏览仓库</h2>
                    </div>

                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                        <input
                            type="text"
                            placeholder="搜索表或视图..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]"
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                        {isLoadingItems ? (
                            <div className="flex flex-col items-center justify-center h-40 gap-2 text-[var(--muted)]">
                                <Loader2 className="w-6 h-6 animate-spin" />
                                <span className="text-sm">读取架构中...</span>
                            </div>
                        ) : (
                            filteredItems.map((item) => (
                                <button
                                    key={`${item.schema}.${item.name}`}
                                    onClick={() => fetchTableData(item)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-all group ${activeItem?.name === item.name
                                            ? "bg-[var(--primary)] text-white shadow-md scale-[1.02]"
                                            : "hover:bg-[var(--card-hover)] text-[var(--muted)] hover:text-[var(--foreground)]"
                                        }`}
                                >
                                    {item.type === 'BASE TABLE' ? (
                                        <Table className="w-4 h-4 flex-shrink-0" />
                                    ) : (
                                        <Eye className="w-4 h-4 flex-shrink-0" />
                                    )}
                                    <div className="flex-1 truncate">
                                        <div className="truncate font-medium">{item.name}</div>
                                        <div className={`text-[10px] ${activeItem?.name === item.name ? "text-white/70" : "text-[var(--muted)]"}`}>
                                            {item.schema} · {item.type === 'BASE TABLE' ? '数据表' : '视图'}
                                        </div>
                                    </div>
                                    <ChevronRight className={`w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity ${activeItem?.name === item.name ? "opacity-100" : ""}`} />
                                </button>
                            ))
                        )}
                    </div>
                </aside>

                {/* Main Content */}
                <main className="glass-morphism min-h-[calc(100vh-120px)] flex flex-col overflow-hidden">
                    {activeItem ? (
                        <>
                            <div className="p-6 border-b border-[var(--border)] flex items-center justify-between bg-[var(--card)]/30">
                                <div>
                                    <h2 className="text-xl font-bold flex items-center gap-2">
                                        {activeItem.name}
                                        <span className="text-xs px-2 py-1 bg-[var(--primary)]/10 text-[var(--primary)] rounded-full">
                                            {activeItem.type === 'BASE TABLE' ? '数据表' : '视图'}
                                        </span>
                                    </h2>
                                    <p className="text-sm text-[var(--muted)] mt-1">
                                        Schema: {activeItem.schema} | 仅展示前100行数据
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-[var(--muted)]">
                                        {tableData?.data.length || 0} 行记录
                                    </span>
                                </div>
                            </div>

                            <div className="flex-1 overflow-auto custom-scrollbar p-6">
                                {isLoadingData ? (
                                    <div className="flex flex-col items-center justify-center h-full gap-4 text-[var(--muted)] animate-in fade-in">
                                        <Loader2 className="w-10 h-10 animate-spin text-[var(--primary)]" />
                                        <p>正在读取数据，请稍候...</p>
                                    </div>
                                ) : tableData ? (
                                    <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                                        <table className="w-full text-sm text-left border-collapse">
                                            <thead className="sticky top-0 bg-[var(--card)] border-b border-[var(--border)] z-10">
                                                <tr>
                                                    {tableData.columns.map(col => (
                                                        <th key={col} className="px-4 py-3 font-semibold text-[var(--muted)] whitespace-nowrap bg-[var(--card)]">
                                                            {col}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--border)]">
                                                {tableData.data.map((row, i) => (
                                                    <tr key={i} className="hover:bg-[var(--card-hover)] transition-colors">
                                                        {tableData.columns.map(col => (
                                                            <td key={col} className="px-4 py-3 text-[var(--muted)] whitespace-nowrap">
                                                                {row[col]?.toString() ?? <span className="opacity-20">NULL</span>}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-[var(--muted)]">
                                        <Database className="w-16 h-16 opacity-10 mb-4" />
                                        <p>无法加载数据</p>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                            <div className="w-24 h-24 bg-[var(--primary)]/5 rounded-full flex items-center justify-center mb-6">
                                <Database className="w-12 h-12 text-[var(--primary)]/20" />
                            </div>
                            <h2 className="text-2xl font-bold mb-2">欢迎浏览数据仓库</h2>
                            <p className="text-[var(--muted)] max-w-md mx-auto">
                                请在左侧列表中选择一个数据表或视图，即可实时预览其中的数据内容。
                            </p>
                        </div>
                    )}
                </main>

            </div>

            <style jsx>{`
                .glass-morphism {
                    background: var(--card-glow);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border: 1px solid var(--border);
                    border-radius: 24px;
                    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.05);
                }

                .bg-radial-gradient {
                    background: radial-gradient(circle at top right, var(--primary-glow), transparent),
                                radial-gradient(circle at bottom left, var(--secondary-glow), transparent);
                    background-color: var(--background);
                }

                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: var(--border);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: var(--primary);
                }
            `}</style>
        </div>
    );
}
