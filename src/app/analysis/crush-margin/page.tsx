"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { EChartsCrushMargin, PositionData, OilComparisonData } from "@/components/charts/EChartsCrushMargin";
import { EChartsYearly, YearlyDataPoint } from "@/components/charts/EChartsYearly";
import { CrushMarginData } from "@/lib/crush-margin";
import { RefreshCw, Calendar, Info, Database } from "lucide-react";

// Time period options
const TIME_PERIODS = [
    { label: "半年", days: 180 },
    { label: "一年", days: 365 },
    { label: "两年", days: 730 },
    { label: "全部", days: 9999 },
];

export default function AnalysisPage() {
    const [rawData, setRawData] = useState<CrushMarginData[]>([]);
    const [positionData, setPositionData] = useState<PositionData[]>([]);
    const [positionContracts, setPositionContracts] = useState<string[]>([]);
    const [oilData, setOilData] = useState<OilComparisonData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedPeriod, setSelectedPeriod] = useState(365);

    const fetchAllData = async () => {
        setLoading(true);
        setError("");
        try {
            const [marginRes, positionRes, oilRes] = await Promise.all([
                fetch("/api/crush-margin"),
                fetch("/api/position"),
                fetch("/api/oil-comparison"),
            ]);

            if (!marginRes.ok) throw new Error(`Margin API Error: ${marginRes.status}`);
            const marginJson = await marginRes.json();
            if (marginJson.success) {
                setRawData(marginJson.data);
            } else {
                throw new Error(marginJson.error || "Failed to fetch margin data");
            }

            if (positionRes.ok) {
                const positionJson = await positionRes.json();
                if (positionJson.success) {
                    setPositionData(positionJson.data || []);
                    setPositionContracts(positionJson.meta?.contracts || []);
                }
            }
            if (oilRes.ok) {
                const oilJson = await oilRes.json();
                if (oilJson.success) setOilData(oilJson.data || []);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "未知错误");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAllData(); }, []);

    const getFilteredData = <T extends { date: string }>(data: T[], days: number): T[] => {
        if (days >= 9999 || data.length === 0) return data;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        return data.filter(item => new Date(item.date) >= cutoffDate);
    };

    const filteredMarginData = getFilteredData(rawData, selectedPeriod);
    const filteredPositionData = getFilteredData(positionData, selectedPeriod);
    const filteredOilData = getFilteredData(oilData, selectedPeriod);
    const periodLabel = TIME_PERIODS.find(p => p.days === selectedPeriod)?.label || "自定义";

    const yearlyData = (key: "grossMargin" | "oilSpot" | "oilBasis"): YearlyDataPoint[] =>
        rawData.map(d => ({
            date: d.date,
            value: key === "grossMargin" ? d.grossMargin : key === "oilSpot" ? d.soybeanOilPrice + d.soybeanOilBasis : d.soybeanOilBasis,
        }));

    const latestDate = rawData.length ? rawData[rawData.length - 1].date : "-";

    return (
        <div className="min-h-screen bg-[var(--background)]">
            <Navbar />

            <main className="pt-20 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">大豆压榨利润分析</h1>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--card-hover)] text-[var(--muted)] border border-[var(--border)]">
                                DCE · Y / M / B
                            </span>
                        </div>
                        <p className="text-xs sm:text-sm text-[var(--muted)]">
                            盘面 / 现货榨利 · 基差与油粕比 · 油脂板块与持仓联动　<span className="opacity-70">数据截止 {latestDate}</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0 w-full md:w-auto">
                        <div className="flex items-center gap-1 bg-[var(--card)] rounded-lg p-1 border border-[var(--border)] shrink-0">
                            <Calendar className="w-4 h-4 text-[var(--muted)] ml-1 sm:ml-2" />
                            {TIME_PERIODS.map(period => (
                                <button
                                    key={period.days}
                                    onClick={() => setSelectedPeriod(period.days)}
                                    className={`px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm rounded-md transition-colors cursor-pointer whitespace-nowrap ${selectedPeriod === period.days
                                        ? "bg-[var(--primary)] text-white"
                                        : "hover:bg-[var(--border)]"}`}
                                >
                                    {period.label}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={fetchAllData}
                            disabled={loading}
                            className="btn btn-secondary cursor-pointer disabled:opacity-50 px-2 py-1 text-xs sm:px-4 sm:py-2 sm:text-sm shrink-0"
                        >
                            <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${loading ? "animate-spin" : ""}`} />
                            <span className={`${loading ? "inline" : "hidden sm:inline"}`}>{loading ? "..." : "刷新"}</span>
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="p-4 mb-6 bg-[var(--danger)]/10 text-[var(--danger)] rounded-lg text-sm">
                        ❌ 加载失败：{error}
                    </div>
                )}

                {loading && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--primary)]" />
                        <p className="mt-4 text-sm text-[var(--muted)]">正在加载数据...</p>
                    </div>
                )}

                {!loading && !error && (
                    <EChartsCrushMargin
                        data={filteredMarginData}
                        positionData={filteredPositionData}
                        positionContracts={positionContracts}
                        oilData={filteredOilData}
                        title={periodLabel}
                    />
                )}

                {/* 说明 */}
                {!loading && !error && (
                    <div className="card p-3 sm:p-4 mt-6">
                        <div className="flex items-center gap-2 mb-2">
                            <Info className="w-4 h-4 text-[var(--primary)]" />
                            <h4 className="text-sm font-semibold">计算口径与数据源</h4>
                        </div>
                        <div className="text-xs text-[var(--muted)] space-y-1.5">
                            <p><span className="text-[var(--foreground)] font-medium">榨利公式：</span>(豆油现货价 × 18.5% + 豆粕现货价 × 78.5%) − 豆二价格 − 150（压榨成本）</p>
                            <p><span className="text-[var(--foreground)] font-medium">数据来源：</span>交易法门（基差 / 持仓）、新浪财经（期货价格）</p>
                            <p className="flex items-center gap-1.5"><Database className="w-3 h-3" />
                                当前区间：{filteredMarginData.length} 条榨利 · {filteredPositionData.length} 条持仓 · {filteredOilData.length} 条油脂对比</p>
                        </div>
                    </div>
                )}

                {/* 年度复合对比 */}
                {!loading && !error && rawData.length > 0 && (
                    <div className="mt-8">
                        <div className="flex items-center gap-2 mb-3">
                            <h2 className="text-base font-semibold">年度复合对比</h2>
                            <span className="text-[11px] text-[var(--muted)]">同一时间轴叠加多年，观察季节性规律</span>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <EChartsYearly data={yearlyData("grossMargin")} title="现货榨利" valueLabel="榨利" height={320} />
                            <EChartsYearly data={yearlyData("oilSpot")} title="豆油现货价格" valueLabel="价格" height={320} />
                            <div className="lg:col-span-2">
                                <EChartsYearly data={yearlyData("oilBasis")} title="豆油基差" valueLabel="基差" height={320} />
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
