"use client";

import React, { useState, useEffect } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    ReferenceLine,
} from "recharts";

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

// 年份颜色映射 - 从最近年份到最远年份使用不同颜色
const YEAR_COLORS: Record<number, string> = {
    2026: '#E91E63', // 粉红
    2025: '#2962FF', // 蓝色
    2024: '#00BCD4', // 青色
    2023: '#4CAF50', // 绿色
    2022: '#FF9800', // 橙色
    2021: '#9C27B0', // 紫色
    2020: '#795548', // 棕色
    2019: '#607D8B', // 灰蓝
};

// 获取年份颜色，如果没有预设则生成
const getYearColor = (year: number): string => {
    if (YEAR_COLORS[year]) return YEAR_COLORS[year];
    // 生成一个基于年份的随机颜色
    const hue = ((year * 137) % 360);
    return `hsl(${hue}, 70%, 50%)`;
};

// 解析日期获取月-日格式 (用于X轴)
const getMonthDay = (dateStr: string): string => {
    const parts = dateStr.split('-');
    if (parts.length >= 3) {
        return `${parts[1]}-${parts[2]}`;
    }
    return dateStr;
};

// 获取年份
const getYear = (dateStr: string): number => {
    return parseInt(dateStr.split('-')[0], 10);
};

// 将数据按年份分组并转换为复合图表格式
const transformDataForChart = (data: YearlyDataPoint[]) => {
    // 1. 获取所有出现的年份
    const years = [...new Set(data.map(d => getYear(d.date)))].sort((a, b) => b - a);

    // 2. 按月-日分组数据
    const groupedByMonthDay: Record<string, Record<number, number>> = {};

    data.forEach(item => {
        const monthDay = getMonthDay(item.date);
        const year = getYear(item.date);

        if (!groupedByMonthDay[monthDay]) {
            groupedByMonthDay[monthDay] = {};
        }
        groupedByMonthDay[monthDay][year] = item.value;
    });

    // 3. 转换为图表数据格式，按月-日排序
    const chartData = Object.entries(groupedByMonthDay)
        .map(([monthDay, yearValues]) => ({
            monthDay,
            ...yearValues,
        }))
        .sort((a, b) => a.monthDay.localeCompare(b.monthDay));

    return { chartData, years };
};

export function YearlyComparisonChart({
    data,
    title = "年度复合对比图",
    valueLabel = "数值",
    height = 400,
}: YearlyComparisonChartProps) {
    const [isMobile, setIsMobile] = useState(false);
    const [showAll, setShowAll] = useState(false); // 默认显示近6年
    const [hiddenYears, setHiddenYears] = useState<Set<number>>(new Set()); // 隐藏的年份

    // 处理图例点击
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleLegendClick = (data: any) => {
        const dataKey = data?.dataKey || data?.value;
        if (!dataKey) return;
        const year = parseInt(String(dataKey), 10);
        if (isNaN(year)) return;
        setHiddenYears(prev => {
            const newSet = new Set(prev);
            if (newSet.has(year)) {
                newSet.delete(year);
            } else {
                newSet.add(year);
            }
            return newSet;
        });
    };

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    if (!data || data.length === 0) {
        return <div className="text-center py-20 text-[var(--muted)]">暂无数据</div>;
    }

    // 获取所有年份
    const allYears = [...new Set(data.map(d => getYear(d.date)))].sort((a, b) => b - a);

    // 根据 showAll 状态筛选年份（默认近6年）
    const displayYears = showAll ? allYears : allYears.slice(0, 6);

    // 筛选数据
    const filteredData = showAll ? data : data.filter(d => displayYears.includes(getYear(d.date)));

    const { chartData, years } = transformDataForChart(filteredData);

    // 计算数据统计（基于筛选后的数据）
    const allValues = filteredData.map(d => d.value);
    const maxValue = Math.max(...allValues);
    const minValue = Math.min(...allValues);
    const avgValue = allValues.reduce((a, b) => a + b, 0) / allValues.length;

    // 计算每年的最新值
    const latestByYear: Record<number, { date: string; value: number }> = {};
    filteredData.forEach(item => {
        const year = getYear(item.date);
        if (!latestByYear[year] || item.date > latestByYear[year].date) {
            latestByYear[year] = { date: item.date, value: item.value };
        }
    });

    return (
        <div className="space-y-4">
            {/* 标题和统计信息 */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                <div className="flex items-center gap-3">
                    <div>
                        <h3 className="text-lg font-semibold">{title}</h3>
                        <p className="text-xs text-[var(--muted)]">
                            显示 {years.length} / {allYears.length} 个年份 | {filteredData.length} 条数据
                        </p>
                    </div>
                    {/* 切换按钮 */}
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
                <div className="flex flex-wrap gap-2">
                    {years.slice(0, 4).map(year => (
                        <div
                            key={year}
                            className="text-xs px-2 py-1 rounded-md"
                            style={{
                                backgroundColor: `${getYearColor(year)}20`,
                                color: getYearColor(year),
                                border: `1px solid ${getYearColor(year)}40`
                            }}
                        >
                            {year}: {latestByYear[year]?.value.toFixed(0) ?? '-'}
                        </div>
                    ))}
                </div>
            </div>

            {/* 图表 */}
            <div className="card p-2 md:p-4">
                <div style={{ height: isMobile ? 280 : height }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={chartData}
                            margin={{
                                top: 10,
                                right: isMobile ? 10 : 30,
                                left: isMobile ? 0 : 10,
                                bottom: 10
                            }}
                        >
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="var(--border)"
                                opacity={0.3}
                            />
                            <XAxis
                                dataKey="monthDay"
                                stroke="var(--muted)"
                                fontSize={isMobile ? 9 : 11}
                                interval={isMobile ? Math.floor(chartData.length / 6) : Math.floor(chartData.length / 12)}
                                minTickGap={isMobile ? 40 : 30}
                            />
                            <YAxis
                                stroke="var(--muted)"
                                fontSize={isMobile ? 9 : 11}
                                width={isMobile ? 35 : 50}
                                domain={['auto', 'auto']}
                                tickFormatter={(v) => v.toFixed(0)}
                            />
                            <Tooltip
                                trigger={isMobile ? 'click' : 'hover'}
                                contentStyle={{
                                    background: "var(--card)",
                                    border: "1px solid var(--border)",
                                    borderRadius: "8px",
                                    fontSize: 12,
                                    padding: "8px 12px"
                                }}
                                labelFormatter={(label) => `日期: ${label}`}
                                formatter={(value, name) => {
                                    const numValue = typeof value === 'number' ? value : 0;
                                    return [`${numValue.toFixed(0)} 元/吨`, `${name}年`];
                                }}
                            />
                            <Legend
                                verticalAlign="top"
                                height={isMobile ? 60 : 50}
                                iconSize={isMobile ? 8 : 12}
                                wrapperStyle={{ fontSize: isMobile ? '9px' : '11px', cursor: 'pointer' }}
                                onClick={handleLegendClick}
                                content={({ payload }) => (
                                    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 px-2">
                                        {payload?.map((entry, index) => {
                                            const year = parseInt(String(entry.value), 10);
                                            const isHidden = hiddenYears.has(year);
                                            return (
                                                <span
                                                    key={`legend-${index}`}
                                                    onClick={() => handleLegendClick({ value: entry.value })}
                                                    className="flex items-center gap-1 cursor-pointer transition-opacity"
                                                    style={{ opacity: isHidden ? 0.4 : 1, WebkitTapHighlightColor: 'transparent' }}
                                                >
                                                    <span
                                                        className="inline-block w-3 h-0.5 rounded"
                                                        style={{
                                                            backgroundColor: isHidden ? '#ccc' : getYearColor(year),
                                                            textDecoration: isHidden ? 'line-through' : 'none'
                                                        }}
                                                    />
                                                    <span style={{
                                                        color: isHidden ? '#999' : 'var(--foreground)',
                                                        textDecoration: isHidden ? 'line-through' : 'none'
                                                    }}>
                                                        {year}年
                                                    </span>
                                                </span>
                                            );
                                        })}
                                    </div>
                                )}
                            />
                            {/* 零线 */}
                            <ReferenceLine
                                y={0}
                                stroke="#EF4444"
                                strokeWidth={1.5}
                                strokeDasharray="5 5"
                            />
                            {/* 均值线 */}
                            <ReferenceLine
                                y={avgValue}
                                stroke="#6B7280"
                                strokeWidth={1}
                                strokeDasharray="3 3"
                                label={{
                                    value: `均值: ${avgValue.toFixed(0)}`,
                                    position: 'right',
                                    fontSize: 10,
                                    fill: '#6B7280'
                                }}
                            />
                            {/* 为每个年份添加一条线 */}
                            {years.map((year, index) => (
                                <Line
                                    key={year}
                                    type="monotone"
                                    dataKey={year.toString()}
                                    name={year.toString()}
                                    stroke={getYearColor(year)}
                                    strokeWidth={index === 0 ? 2.5 : 1.5}
                                    dot={false}
                                    connectNulls
                                    opacity={hiddenYears.has(year) ? 0 : (index === 0 ? 1 : 0.7)}
                                    hide={hiddenYears.has(year)}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* 底部统计 */}
                <div className="flex justify-between text-xs text-[var(--muted)] mt-3 px-2 border-t border-[var(--border)] pt-3">
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
