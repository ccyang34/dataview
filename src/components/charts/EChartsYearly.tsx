"use client";

import React, { useState, useEffect, useMemo } from "react";
import ReactECharts from "echarts-for-react";
import * as echarts from "echarts";

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

// Year colors
const YEAR_COLORS: Record<number, string> = {
    2026: '#E91E63', // Pink
    2025: '#2962FF', // Blue
    2024: '#00BCD4', // Cyan
    2023: '#4CAF50', // Green
    2022: '#FF9800', // Orange
    2021: '#9C27B0', // Purple
    2020: '#795548', // Brown
    2019: '#607D8B', // Blue Grey
};

const getYearColor = (year: number): string => {
    if (YEAR_COLORS[year]) return YEAR_COLORS[year];
    const hue = ((year * 137) % 360);
    return `hsl(${hue}, 70%, 50%)`;
};

const getMonthDay = (dateStr: string): string => {
    const parts = dateStr.split('-');
    if (parts.length >= 3) return `${parts[1]}-${parts[2]}`;
    return dateStr;
};

const getYear = (dateStr: string): number => {
    return parseInt(dateStr.split('-')[0], 10);
};

export function EChartsYearly({
    data,
    title = "年度复合对比图",
    valueLabel = "数值",
    height = 400,
}: YearlyComparisonChartProps) {
    const [isMobile, setIsMobile] = useState(false);
    const [showAll, setShowAll] = useState(false); // Default show recent 6 years

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    if (!data || data.length === 0) {
        return <div className="text-center py-20 text-[var(--muted)]">暂无数据</div>;
    }

    // 1. Prepare Data
    const { years, chartData, displayYears, latestValues, minValue, maxValue, avgValue, groupedByMonthDay } = useMemo(() => {
        const uniqueYears = [...new Set(data.map(d => getYear(d.date)))].sort((a, b) => b - a);
        const displayYears = showAll ? uniqueYears : uniqueYears.slice(0, 6);

        // Filter data based on visibility
        const filteredData = data.filter(d => displayYears.includes(getYear(d.date)));

        // Group by MonthDay
        const groupedByMonthDay: Record<string, Record<number, number>> = {};
        const allValues: number[] = [];
        const latestValues: Record<number, number> = {};

        filteredData.forEach(item => {
            const md = getMonthDay(item.date);
            const y = getYear(item.date);
            if (!groupedByMonthDay[md]) groupedByMonthDay[md] = {};
            groupedByMonthDay[md][y] = item.value;
            allValues.push(item.value);

            // Track latest value per year
            // Assuming data is somewhat ordered or we just overwrite
            // But better logic: find the one with max date per year
            // Simple overwrite works if sorted by date, but safer to check
            // Actually 'data' might not be sorted by date? Usually is from DB.
            latestValues[y] = item.value;
        });

        // X-Axis Category (All unique month-days sorted)
        // To be safe, generate a full 365 days list or just use what exists?
        // Recharts version used exists. ECharts category axis works same.
        const chartDataKeys = Object.keys(groupedByMonthDay).sort();

        // Stats
        const maxV = allValues.length ? Math.max(...allValues) : 0;
        const minV = allValues.length ? Math.min(...allValues) : 0;
        const avgV = allValues.length ? allValues.reduce((a, b) => a + b, 0) / allValues.length : 0;

        return {
            years: uniqueYears,
            displayYears,
            chartData: chartDataKeys, // X Axis Labels
            groupedByMonthDay,
            latestValues,
            maxValue: maxV,
            minValue: minV,
            avgValue: avgV
        };
    }, [data, showAll]);

    // 2. Generate ECharts Option
    const getOption = () => {
        const series = displayYears.map((year, index) => {
            // Map x-axis labels to values for this year
            const seriesData = chartData.map(md => {
                const val = years.includes(year) ? groupedByMonthDay[md]?.[year] : undefined;
                return val; // ECharts handles undefined as gap
            });

            return {
                name: year.toString(),
                type: 'line',
                data: seriesData,
                symbol: 'none',
                connectNulls: true, // Handle missing days
                lineStyle: {
                    color: getYearColor(year),
                    width: index === 0 ? 3 : 1.5 // Highlight most recent year
                },
                itemStyle: { color: getYearColor(year) },
                // Show only first few in legend to save space? Standard legend handles scrolling
            };
        });

        return {
            title: { show: false }, // Using custom header
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'var(--card)',
                borderColor: 'var(--border)',
                textStyle: { color: 'var(--foreground)', fontSize: 12 },
                formatter: (params: any) => {
                    let html = `<div>日期: ${params[0].axisValue}</div>`;
                    // Sort by year descending for tooltip
                    const sortedParams = [...params].sort((a, b) => parseInt(b.seriesName) - parseInt(a.seriesName));

                    sortedParams.forEach((p: any) => {
                        if (p.value !== undefined) {
                            html += `<div style="display:flex;justify-content:space-between;min-width:120px;gap:8px">
                                <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background-color:${p.color};margin-right:4px"></span>${p.seriesName}</span>
                                <strong>${p.value.toFixed(0)}</strong>
                             </div>`;
                        }
                    });
                    return html;
                }
            },
            legend: {
                data: displayYears.map(y => y.toString()),
                top: 0,
                type: 'scroll', // Handle many years
                pageTextStyle: { color: 'var(--foreground)' }
            },
            grid: {
                left: isMobile ? '0%' : '5%',
                right: isMobile ? '1%' : '5%',
                top: isMobile ? 30 : 40,
                bottom: '0%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: chartData,
                axisLabel: {
                    fontSize: isMobile ? 9 : 11,
                    color: 'var(--muted)'
                },
                axisLine: { lineStyle: { color: 'var(--border)' } }
            },
            yAxis: {
                type: 'value',
                scale: true,
                axisLabel: {
                    fontSize: isMobile ? 9 : 11,
                    color: 'var(--muted)'
                },
                splitLine: { lineStyle: { type: 'dashed', opacity: 0.3 } }
            },
            series: [
                ...series,
                // Mean Line (MarkLine)
                {
                    type: 'line',
                    markLine: {
                        silent: true,
                        data: [{ yAxis: avgValue }],
                        label: { formatter: `均值: ${avgValue.toFixed(0)}`, position: 'insideEndTop', color: 'gray' },
                        lineStyle: { color: 'gray', type: 'dashed' },
                        symbol: 'none'
                    }
                },
                // Zero Line
                {
                    type: 'line',
                    markLine: {
                        silent: true,
                        data: [{ yAxis: 0 }],
                        label: { show: false },
                        lineStyle: { color: '#EF4444', type: 'dashed' },
                        symbol: 'none'
                    }
                }
            ]
        };
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                <div className="flex items-center gap-3">
                    <div>
                        <h3 className="text-lg font-semibold">{title}</h3>
                        <p className="text-xs text-[var(--muted)]">
                            显示 {displayYears.length} / {years.length} 个年份
                        </p>
                    </div>
                    <button
                        onClick={() => setShowAll(!showAll)}
                        className={`px-3 py-1 text-xs rounded-md border transition-colors cursor-pointer ${showAll
                            ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                            : 'bg-[var(--card)] text-[var(--muted)] border-[var(--border)] hover:border-[var(--primary)]'
                            }`}
                    >
                        {showAll ? '显示近6年' : '显示全部'}
                    </button>
                </div>
                {/* Year Tags */}
                <div className="flex flex-wrap gap-2">
                    {displayYears.slice(0, 4).map(year => (
                        <div
                            key={year}
                            className="text-xs px-2 py-1 rounded-md"
                            style={{
                                backgroundColor: `${getYearColor(year)}20`,
                                color: getYearColor(year),
                                border: `1px solid ${getYearColor(year)}40`
                            }}
                        >
                            {year}: {latestValues[year]?.toFixed(0) ?? '-'}
                        </div>
                    ))}
                </div>
            </div>

            <div className="card p-0 pb-2 md:p-4">
                <div style={{ height: isMobile ? 280 : height }}>
                    <ReactECharts
                        option={getOption()}
                        style={{ height: '100%', width: '100%' }}
                        opts={{ renderer: 'svg' }}
                    />
                </div>
                {/* Footer Stats */}
                <div className="flex justify-between text-xs text-[var(--muted)] mt-1 mb-2 px-2 md:mt-3 border-t border-[var(--border)] pt-2 md:pt-3">
                    <span>
                        最高: <span className="text-green-600 font-medium">{maxValue.toFixed(0)}</span>
                    </span>
                    <span>
                        均值: <span className="font-medium">{avgValue.toFixed(0)}</span>
                    </span>
                    <span>
                        最低: <span className="text-red-600 font-medium">{minValue.toFixed(0)}</span>
                    </span>
                </div>
            </div>
        </div>
    );
}
