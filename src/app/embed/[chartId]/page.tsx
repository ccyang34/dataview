"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
    LineChart,
    AreaChartComponent,
    BarChartComponent,
    PieChartComponent,
    KLineChart,
} from "@/components/charts";

// 模拟图表数据（实际应从 API 获取）
const mockCharts: Record<string, { type: string; title: string; data: unknown[] }> = {
    demo1: {
        type: "area",
        title: "月度趋势",
        data: [
            { name: "1月", value: 4000 },
            { name: "2月", value: 3000 },
            { name: "3月", value: 5000 },
            { name: "4月", value: 2780 },
            { name: "5月", value: 1890 },
            { name: "6月", value: 2390 },
        ],
    },
    demo2: {
        type: "bar",
        title: "数据对比",
        data: [
            { name: "产品A", value: 4000 },
            { name: "产品B", value: 3000 },
            { name: "产品C", value: 2000 },
            { name: "产品D", value: 2780 },
        ],
    },
    demo3: {
        type: "kline",
        title: "股票走势",
        data: [
            { time: "2024-01-02", open: 100, high: 105, low: 98, close: 103, volume: 1200000 },
            { time: "2024-01-03", open: 103, high: 108, low: 102, close: 107, volume: 1500000 },
            { time: "2024-01-04", open: 107, high: 110, low: 105, close: 106, volume: 1100000 },
            { time: "2024-01-05", open: 106, high: 109, low: 104, close: 108, volume: 1300000 },
            { time: "2024-01-08", open: 108, high: 112, low: 107, close: 111, volume: 1600000 },
        ],
    },
};

export default function EmbedChartPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const chartId = params.chartId as string;

    // 嵌入参数
    const height = parseInt(searchParams.get("height") || "300");
    const theme = searchParams.get("theme") || "light";
    const showTitle = searchParams.get("showTitle") !== "false";

    const [chart, setChart] = useState<{ type: string; title: string; data: unknown[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        // 应用主题
        if (theme === "dark") {
            document.documentElement.classList.add("dark");
        }

        // 模拟 API 调用
        const fetchChart = async () => {
            try {
                // 实际应用中从 API 获取
                const chartData = mockCharts[chartId];
                if (chartData) {
                    setChart(chartData);
                } else {
                    setError("图表不存在");
                }
            } catch {
                setError("加载失败");
            } finally {
                setLoading(false);
            }
        };

        fetchChart();
    }, [chartId, theme]);

    if (loading) {
        return (
            <div
                className="flex items-center justify-center bg-[var(--card)]"
                style={{ height: `${height}px` }}
            >
                <span className="text-[var(--muted)]">加载中...</span>
            </div>
        );
    }

    if (error || !chart) {
        return (
            <div
                className="flex items-center justify-center bg-[var(--card)]"
                style={{ height: `${height}px` }}
            >
                <span className="text-[var(--danger)]">{error || "图表不存在"}</span>
            </div>
        );
    }

    const renderChart = () => {
        const data = chart.data as { name: string; value: number }[];
        const klineData = chart.data as { time: string; open: number; high: number; low: number; close: number; volume?: number }[];

        switch (chart.type) {
            case "line":
                return <LineChart data={data} height={showTitle ? height - 40 : height} />;
            case "area":
                return <AreaChartComponent data={data} height={showTitle ? height - 40 : height} />;
            case "bar":
                return <BarChartComponent data={data} height={showTitle ? height - 40 : height} />;
            case "pie":
                return <PieChartComponent data={data} height={showTitle ? height - 40 : height} />;
            case "kline":
                return <KLineChart data={klineData} height={showTitle ? height - 40 : height} />;
            default:
                return <div>不支持的图表类型</div>;
        }
    };

    return (
        <div className="bg-[var(--card)] p-4" style={{ height: `${height}px` }}>
            {showTitle && (
                <h3 className="font-medium text-sm mb-2">{chart.title}</h3>
            )}
            {renderChart()}
        </div>
    );
}
