"use client";

import React, { useState, useEffect, useMemo } from "react";
import ReactECharts from "echarts-for-react";

export interface YearlyDataPoint {
    date: string; // 原始日期 YYYY-MM-DD
    value: number; // 数值
}

interface YearlyComparisonChartProps {
    data: YearlyDataPoint[];
    title?: string;
    valueLabel?: string;
    height?: number;
}

/** 协调年度色板（深浅主题通用，相邻年份色相拉开） */
const YEAR_COLORS = [
    "#8B5CF6", // 紫
    "#3B82F6", // 蓝
    "#10B981", // 绿
    "#F59E0B", // 琥珀
    "#EC4899", // 粉
    "#0EA5E9", // 天蓝
    "#EAB308", // 黄
    "#6366F1", // 靛
    "#14B8A6", // 青
    "#F97316", // 橙
];
const colorOf = (idx: number) => YEAR_COLORS[idx % YEAR_COLORS.length];

/** 读取 CSS 变量（适配深浅主题） */
function useThemeColors() {
    const [t, setT] = useState({ fg: "#0F172A", muted: "#64748B", border: "#E2E8F0", card: "#FFFFFF" });
    useEffect(() => {
        const read = () => {
            const cs = getComputedStyle(document.documentElement);
            setT({
                fg: cs.getPropertyValue("--foreground").trim() || "#0F172A",
                muted: cs.getPropertyValue("--muted").trim() || "#64748B",
                border: cs.getPropertyValue("--border").trim() || "#E2E8F0",
                card: cs.getPropertyValue("--card").trim() || "#FFFFFF",
            });
        };
        read();
        window.addEventListener("resize", read);
        const obs = new MutationObserver(read);
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
        return () => { window.removeEventListener("resize", read); obs.disconnect(); };
    }, []);
    return t;
}

const getMonthDay = (dateStr: string) => {
    const parts = dateStr.split("-");
    return parts.length >= 3 ? `${parts[1]}-${parts[2]}` : dateStr;
};
const getYear = (dateStr: string) => parseInt(dateStr.split("-")[0], 10);

export function EChartsYearly({
    data,
    title = "年度复合对比图",
    valueLabel = "数值",
    height = 360,
}: YearlyComparisonChartProps) {
    const t = useThemeColors();
    const [isMobile, setIsMobile] = useState(false);
    const [showAll, setShowAll] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    const stats = useMemo(() => {
        const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
        const years = [...new Set(sorted.map(d => getYear(d.date)))].sort((a, b) => b - a);
        const displayYears = showAll ? years : years.slice(0, 6);
        const grouped: Record<string, Record<number, number>> = {};
        const latestValues: Record<number, number> = {};
        const allValues: number[] = [];
        for (const item of sorted) {
            const md = getMonthDay(item.date);
            const y = getYear(item.date);
            if (!grouped[md]) grouped[md] = {};
            grouped[md][y] = item.value;
            allValues.push(item.value);
            latestValues[y] = item.value; // 已按日期排序，最后一条即年内最新
        }
        const keys = Object.keys(grouped).sort();
        return {
            years, displayYears, keys, grouped, latestValues,
            max: allValues.length ? Math.max(...allValues) : 0,
            min: allValues.length ? Math.min(...allValues) : 0,
            avg: allValues.length ? allValues.reduce((a, b) => a + b, 0) / allValues.length : 0,
        };
    }, [data, showAll]);

    if (!data || data.length === 0) {
        return <div className="text-center py-12 text-[var(--muted)] text-sm">暂无数据</div>;
    }

    const { years, displayYears, keys, grouped, latestValues, max, min, avg } = stats;
    const colorFor = (year: number) => colorOf(years.indexOf(year) < 0 ? 0 : years.indexOf(year));

    const option = {
        backgroundColor: "transparent",
        textStyle: { color: t.fg },
        tooltip: {
            trigger: "axis", backgroundColor: t.card, borderColor: t.border, borderWidth: 1,
            textStyle: { color: t.fg, fontSize: 11 }, confine: true, padding: [6, 10],
            extraCssText: "box-shadow:0 6px 20px rgba(0,0,0,.12);border-radius:8px;",
            axisPointer: { type: "line", lineStyle: { color: t.muted, type: "dashed" } },
            formatter: (params: any) => {
                let html = `<div style="font-weight:600;margin-bottom:4px">${params[0]?.axisValue || ""}</div>`;
                [...params].sort((a: any, b: any) => parseInt(b.seriesName) - parseInt(a.seriesName)).forEach((p: any) => {
                    if (p.value == null) return;
                    html += `<div style="display:flex;justify-content:space-between;gap:16px;line-height:1.7">
                        <span><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${p.color};margin-right:5px"></span>${p.seriesName}</span>
                        <strong style="font-variant-numeric:tabular-nums">${Number(p.value).toFixed(0)}</strong></div>`;
                });
                return html;
            },
        },
        legend: {
            data: [...displayYears].reverse().map(y => y.toString()),
            top: 0, icon: "roundRect", itemWidth: 12, itemHeight: 7, itemGap: 12,
            textStyle: { fontSize: 11, color: t.muted },
        },
        grid: { left: 6, right: 10, top: 34, bottom: 26, containLabel: true },
        xAxis: {
            type: "category", data: keys, boundaryGap: false,
            axisLabel: { color: t.muted, fontSize: 10, hideOverlap: true },
            axisLine: { lineStyle: { color: t.border } }, axisTick: { show: false },
        },
        yAxis: {
            type: "value", scale: true,
            axisLabel: { color: t.muted, fontSize: 10 },
            splitLine: { lineStyle: { type: "dashed", color: t.border, opacity: .7 } },
            axisLine: { show: false },
        },
        series: [
            ...displayYears.map((year, idx) => ({
                name: year.toString(), type: "line", symbol: "none", smooth: true,
                data: keys.map(md => grouped[md]?.[year]),
                lineStyle: { color: colorFor(year), width: idx === 0 ? 2.4 : 1.6, opacity: idx === 0 ? 1 : .9 },
                itemStyle: { color: colorFor(year) },
                emphasis: { lineStyle: { width: 3 } },
                markLine: idx === 0 ? {
                    silent: true, symbol: "none",
                    data: [{ yAxis: avg, label: { formatter: `均值 ${avg.toFixed(0)}`, position: "insideEndTop", color: t.muted, fontSize: 10 },
                        lineStyle: { color: t.muted, type: "dashed", opacity: .6 } }],
                } : undefined,
            })),
        ],
    };

    return (
        <div className="card p-3 sm:p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                        <span className="w-1 h-4 rounded" style={{ backgroundColor: colorFor(displayYears[0]) }} />
                        {title}
                    </h3>
                    <button
                        onClick={() => setShowAll(!showAll)}
                        className={`px-2 py-0.5 text-[10px] rounded-md border transition-colors cursor-pointer ${showAll
                            ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                            : "bg-[var(--card)] text-[var(--muted)] border-[var(--border)] hover:border-[var(--primary)]"}`}
                    >
                        {showAll ? "近6年" : "全部"}
                    </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {displayYears.slice(0, 4).map(year => (
                        <span key={year} className="text-[10px] px-2 py-0.5 rounded-md tabular-nums"
                            style={{ backgroundColor: `${colorFor(year)}18`, color: colorFor(year), border: `1px solid ${colorFor(year)}38` }}>
                            {year}: {latestValues[year] != null ? latestValues[year].toFixed(0) : "-"}
                        </span>
                    ))}
                </div>
            </div>
            <div style={{ height: isMobile ? 280 : height }}>
                <ReactECharts option={option} style={{ height: "100%", width: "100%" }}
                    opts={{ renderer: "svg" }} notMerge={true} />
            </div>
            <div className="flex justify-between text-[11px] text-[var(--muted)] border-t border-[var(--border)] pt-2 mt-1 tabular-nums">
                <span>{valueLabel}最高 <b className="text-[var(--foreground)] font-medium">{max.toFixed(0)}</b></span>
                <span>均值 <b className="text-[var(--foreground)] font-medium">{avg.toFixed(0)}</b></span>
                <span>{valueLabel}最低 <b className="text-[var(--foreground)] font-medium">{min.toFixed(0)}</b></span>
            </div>
        </div>
    );
}
