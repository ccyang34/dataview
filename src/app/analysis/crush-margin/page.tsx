
"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { CrushMarginDashboard } from "@/components/charts/CrushMarginChart";
import { CrushMarginData } from "@/lib/crush-margin";
import { RefreshCw } from "lucide-react";

export default function AnalysisPage() {
    const [data, setData] = useState<CrushMarginData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchData = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/crush-margin");
            if (!res.ok) {
                throw new Error(`API Error: ${res.status}`);
            }
            const json = await res.json();
            if (json.success) {
                setData(json.data);
            } else {
                throw new Error(json.error || "Failed to fetch data");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "未知错误");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <div className="min-h-screen bg-[var(--background)]">
            <Navbar />

            <main className="pt-20 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold">深度分析</h1>
                        <p className="text-[var(--muted)] mt-1">大豆压榨利润与基差深度分析</p>
                    </div>
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="btn btn-secondary self-start sm:self-auto cursor-pointer disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        {loading ? "加载中..." : "刷新数据"}
                    </button>
                </div>

                {error && (
                    <div className="p-4 mb-8 bg-[var(--danger)]/10 text-[var(--danger)] rounded-lg">
                        错误: {error}
                    </div>
                )}

                {!loading && !error && (
                    <CrushMarginDashboard data={data} />
                )}

                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)]"></div>
                    </div>
                )}
            </main>
        </div>
    );
}
