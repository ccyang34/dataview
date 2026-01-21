
"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { CrushMarginDashboard, PositionData, OilComparisonData } from "@/components/charts/CrushMarginChart";
import { YearlyComparisonChart, YearlyDataPoint } from "@/components/charts/YearlyComparisonChart";
import { CrushMarginData } from "@/lib/crush-margin";
import { RefreshCw, Calendar } from "lucide-react";

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
    const [oilData, setOilData] = useState<OilComparisonData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedPeriod, setSelectedPeriod] = useState(365); // Default to 1 year

    const fetchAllData = async () => {
        setLoading(true);
        setError("");
        try {
            // Fetch all data in parallel
            const [marginRes, positionRes, oilRes] = await Promise.all([
                fetch("/api/crush-margin"),
                fetch("/api/position"),
                fetch("/api/oil-comparison"),
            ]);

            // Handle margin data
            if (!marginRes.ok) throw new Error(`Margin API Error: ${marginRes.status}`);
            const marginJson = await marginRes.json();
            if (marginJson.success) {
                setRawData(marginJson.data);
            } else {
                throw new Error(marginJson.error || "Failed to fetch margin data");
            }

            // Handle position data (optional, don't fail if missing)
            if (positionRes.ok) {
                const positionJson = await positionRes.json();
                if (positionJson.success) {
                    setPositionData(positionJson.data || []);
                }
            }

            // Handle oil comparison data (optional)
            if (oilRes.ok) {
                const oilJson = await oilRes.json();
                if (oilJson.success) {
                    setOilData(oilJson.data || []);
                }
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : "未知错误");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    // Filter data based on selected period
    const getFilteredData = <T extends { date: string }>(data: T[], days: number): T[] => {
        if (days >= 9999 || data.length === 0) return data;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        return data.filter(item => new Date(item.date) >= cutoffDate);
    };

    const filteredMarginData = getFilteredData(rawData, selectedPeriod);
    const filteredPositionData = getFilteredData(positionData, selectedPeriod);
    const filteredOilData = getFilteredData(oilData, selectedPeriod);

    // Get period label for title
    const periodLabel = TIME_PERIODS.find(p => p.days === selectedPeriod)?.label || "自定义";

    return (
        <div className="min-h-screen bg-[var(--background)]">
            <Navbar />

            <main className="pt-20 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4 mb-6">
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full sm:w-auto pb-1 sm:pb-0">
                        {/* Time Period Selector */}
                        <div className="flex items-center gap-1 bg-[var(--card)] rounded-lg p-1 border border-[var(--border)] shrink-0">
                            <Calendar className="w-4 h-4 text-[var(--muted)] ml-1 sm:ml-2" />
                            {TIME_PERIODS.map((period) => (
                                <button
                                    key={period.days}
                                    onClick={() => setSelectedPeriod(period.days)}
                                    className={`px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm rounded-md transition-colors cursor-pointer whitespace-nowrap ${selectedPeriod === period.days
                                        ? "bg-[var(--primary)] text-white"
                                        : "hover:bg-[var(--border)]"
                                        }`}
                                >
                                    {period.label}
                                </button>
                            ))}
                        </div>
                        {/* Refresh Button */}
                        <button
                            onClick={fetchAllData}
                            disabled={loading}
                            className="btn btn-secondary cursor-pointer disabled:opacity-50 px-2 py-1 text-xs sm:px-4 sm:py-2 sm:text-sm shrink-0"
                        >
                            <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${loading ? 'animate-spin' : ''}`} />
                            <span className={`${loading ? 'inline' : 'hidden sm:inline'}`}>
                                {loading ? "..." : "刷新"}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Error State */}
                {error && (
                    <div className="p-4 mb-6 bg-[var(--danger)]/10 text-[var(--danger)] rounded-lg">
                        ❌ 错误: {error}
                    </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)]"></div>
                        <p className="mt-4 text-[var(--muted)]">正在加载数据...</p>
                    </div>
                )}

                {/* Charts Dashboard */}
                {!loading && !error && (
                    <CrushMarginDashboard
                        data={filteredMarginData}
                        positionData={filteredPositionData}
                        oilData={filteredOilData}
                        title={`大豆压榨利润分析 - ${periodLabel}`}
                    />
                )}

                {/* Data Source Info */}
                {!loading && !error && (
                    <div className="mt-8 p-4 bg-[var(--card)] rounded-lg border border-[var(--border)]">
                        <h4 className="text-sm font-medium mb-2">📊 计算说明</h4>
                        <div className="text-xs text-[var(--muted)] space-y-1">
                            <p>榨利 = (豆油现货价格 × 18.5% + 豆粕现货价格 × 78.5%) - 豆二价格 - 150(压榨成本)</p>
                            <p>数据源：交易法门(基差/持仓) / Sina(期货价格)</p>
                            <p>共 {filteredMarginData.length} 条榨利数据 | {filteredPositionData.length} 条持仓数据 | {filteredOilData.length} 条油脂对比数据</p>
                        </div>
                    </div>
                )}

                {/* 现货榨利年度复合折线图 - 使用全部数据，不受时间筛选影响 */}
                {!loading && !error && rawData.length > 0 && (
                    <div className="mt-8">
                        <YearlyComparisonChart
                            data={rawData.map(d => ({ date: d.date, value: d.grossMargin }))}
                            title="现货榨利年度复合对比"
                            valueLabel="榨利"
                            height={360}
                        />
                    </div>
                )}

                {/* 豆油现货价格年度复合折线图 */}
                {!loading && !error && rawData.length > 0 && (
                    <div className="mt-8">
                        <YearlyComparisonChart
                            data={rawData.map(d => ({
                                date: d.date,
                                value: d.soybeanOilPrice + d.soybeanOilBasis // 豆油现货 = 期货 + 基差
                            }))}
                            title="豆油现货价格年度复合对比"
                            valueLabel="价格"
                            height={360}
                        />
                    </div>
                )}
            </main>
        </div>
    );
}
